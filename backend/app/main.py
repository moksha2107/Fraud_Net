import csv as csvmod
import json
import os
import random
from datetime import datetime, timedelta
from pathlib import Path
from typing import List

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db, create_tables, User, Prediction, PendingUser
from app.schemas import (
    UserRegister, Token, TransactionInput, PredictionResponse,
    PredictionHistory, ModelMetrics, DashboardStats, ShapEntry
)
from app.auth import hash_password, verify_password, create_access_token, get_current_user
from app.predictor import predict, get_model_metrics
from app.otp import generate_otp, send_otp_email
from app.config import settings

app = FastAPI(
    title="FraudNet API",
    description="Real-time credit card fraud detection with ensemble ML + SHAP explainability",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    create_tables()


# ─── Auth ────────────────────────────────────────────────────────────────────

@app.post("/auth/register", status_code=status.HTTP_201_CREATED)
def register(body: UserRegister, db: Session = Depends(get_db)):
    """Step 1: validate, store pending user, send OTP."""
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Remove any stale pending entry for this user/email
    db.query(PendingUser).filter(
        (PendingUser.username == body.username) | (PendingUser.email == body.email)
    ).delete()
    db.commit()

    otp = generate_otp()
    pending = PendingUser(
        username=body.username,
        email=body.email,
        hashed_password=hash_password(body.password),
        otp=otp,
    )
    db.add(pending)
    db.commit()

    email_sent = send_otp_email(body.email, body.username, otp)
    return {
        "message": "OTP sent — check your email (or terminal in dev mode)",
        "email_sent": email_sent,
        "username": body.username,
    }


@app.post("/auth/verify-otp", status_code=status.HTTP_201_CREATED)
def verify_otp(body: dict, db: Session = Depends(get_db)):
    """Step 2: verify OTP and create the real user account."""
    username = body.get("username", "").strip()
    otp      = body.get("otp", "").strip()

    pending = db.query(PendingUser).filter(PendingUser.username == username).first()
    if not pending:
        raise HTTPException(status_code=404, detail="No pending registration for this username")

    # Expire after OTP_EXPIRE_MINUTES
    age = (datetime.utcnow() - pending.created_at).total_seconds() / 60
    if age > settings.OTP_EXPIRE_MINUTES:
        db.delete(pending)
        db.commit()
        raise HTTPException(status_code=400, detail="OTP expired — please register again")

    if pending.otp != otp:
        raise HTTPException(status_code=400, detail="Incorrect OTP")

    user = User(
        username=pending.username,
        email=pending.email,
        hashed_password=pending.hashed_password,
    )
    db.add(user)
    db.delete(pending)
    db.commit()
    return {"message": "Account verified and created", "username": user.username}


@app.post("/auth/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(
        data={"sub": user.username},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {"access_token": token, "token_type": "bearer"}


@app.get("/auth/me")
def me(current_user: User = Depends(get_current_user)):
    return {"username": current_user.username, "email": current_user.email}


# ─── Prediction ───────────────────────────────────────────────────────────────

@app.post("/predict", response_model=PredictionResponse)
def predict_transaction(
    tx: TransactionInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    risk_score, verdict, confidence, shap_entries = predict(tx)

    # Top risk factors: top-3 SHAP features with direction
    top_risk_factors = []
    for entry in shap_entries[:3]:
        direction = "increases" if entry.shap_value > 0 else "decreases"
        top_risk_factors.append(
            f"{entry.feature} (value={entry.value:.3f}) {direction} fraud risk"
        )

    # Persist to DB
    record = Prediction(
        user_id=current_user.id,
        risk_score=risk_score,
        verdict=verdict,
        confidence=confidence,
        model_used="StackingEnsemble",
        input_data=tx.model_dump_json(),
        shap_values=json.dumps([e.model_dump() for e in shap_entries]),
    )
    db.add(record)
    db.commit()

    return PredictionResponse(
        risk_score=risk_score,
        verdict=verdict,
        confidence=confidence,
        model_used="StackingEnsemble",
        shap_explanation=shap_entries,
        top_risk_factors=top_risk_factors,
    )


# ─── History ─────────────────────────────────────────────────────────────────

@app.get("/history", response_model=List[PredictionHistory])
def history(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    records = (
        db.query(Prediction)
        .filter(Prediction.user_id == current_user.id)
        .order_by(Prediction.created_at.desc())
        .limit(limit)
        .all()
    )
    return records


# ─── Stats ───────────────────────────────────────────────────────────────────

@app.get("/stats", response_model=DashboardStats)
def stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Prediction).filter(Prediction.user_id == current_user.id)
    total = q.count()
    fraud = q.filter(Prediction.verdict == "FRAUD").count()
    legitimate = total - fraud
    avg_risk = db.query(func.avg(Prediction.risk_score)).filter(
        Prediction.user_id == current_user.id
    ).scalar() or 0.0

    return DashboardStats(
        total_predictions=total,
        fraud_detected=fraud,
        legitimate=legitimate,
        avg_risk_score=round(float(avg_risk), 2),
        fraud_rate=round(fraud / total * 100, 2) if total > 0 else 0.0,
    )


# ─── Model Metrics ───────────────────────────────────────────────────────────

@app.get("/models", response_model=List[ModelMetrics])
def model_metrics(_: User = Depends(get_current_user)):
    raw = get_model_metrics()
    if not raw:
        raise HTTPException(
            status_code=404,
            detail="No model metrics found. Run `python ml/train.py` first.",
        )
    return [ModelMetrics(**m) for m in raw]


# ─── Sample ──────────────────────────────────────────────────────────────────

@app.get("/predict/sample")
def sample_transaction(_: User = Depends(get_current_user)):
    """Return a random real row from creditcard.csv as a TransactionInput."""
    # Resolve path relative to this file (works regardless of CWD)
    csv_path = (Path(__file__).resolve().parent.parent / "data" / "creditcard.csv")

    if not csv_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Dataset not found at {csv_path}. Place creditcard.csv in backend/data/",
        )

    # Stratified reservoir sampling: maintain one reservoir per class (fraud / legit).
    # The dataset has ~284k legitimate rows but only ~492 fraud rows, so plain
    # reservoir sampling would almost never return fraud. By keeping separate
    # reservoirs we get a true 50/50 split on every button click.
    legit_row = None;  legit_count = 0
    fraud_row = None;  fraud_count = 0
    header    = None
    try:
        with csv_path.open(encoding="utf-8-sig", newline="") as f:
            reader = csvmod.reader(f)
            header = next(reader)           # column names, unquoted by csv module
            class_idx = header.index("Class")
            for row_vals in reader:
                if row_vals[class_idx] == "1":
                    fraud_count += 1
                    if random.randint(1, fraud_count) == 1:
                        fraud_row = row_vals
                else:
                    legit_count += 1
                    if random.randint(1, legit_count) == 1:
                        legit_row = row_vals
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error reading dataset: {exc}")

    # 50/50 pick between a fraud and a legitimate transaction
    selected = fraud_row if (random.random() < 0.5 and fraud_row) else legit_row
    if not selected:

        raise HTTPException(status_code=500, detail="Dataset appears empty")
    if not header:
        raise HTTPException(status_code=500, detail="Could not read CSV header")

    row = dict(zip(header, selected))
    try:
        time_val = float(row["Time"])
        keys = ["v1","v2","v3","v4","v7","v9","v10","v11","v12","v14","v16","v17","v18","v19","v20"]
        result = {
            "amount":      round(float(row["Amount"]), 4),
            "hour_of_day": round((time_val // 3600) % 24, 0),
            "day_of_week": round((time_val // 86400) % 7, 0),
            "is_fraud":    int(float(row["Class"])),
        }
        for k in keys:
            col = k[0].upper() + k[1:]   # v1 → V1, v10 → V10
            result[k] = round(float(row[col]), 6)
    except (KeyError, ValueError) as exc:
        raise HTTPException(status_code=500, detail=f"CSV parse error: {exc}")

    return result


# ─── Scan-complete email notification ────────────────────────────────────────

@app.post("/notify/scan-complete")
def notify_scan_complete(
    body: dict,
    current_user: User = Depends(get_current_user),
):
    """
    Send an email summary after a batch / card-history scan completes.
    Expects body: { total, fraud, legit, avg_risk, highest_risk, scan_type }
    """
    total       = body.get("total", 0)
    fraud       = body.get("fraud", 0)
    legit       = body.get("legit", 0)
    avg_risk    = body.get("avg_risk", 0)
    highest     = body.get("highest_risk", 0)
    scan_type   = body.get("scan_type", "Batch")
    to_email    = current_user.email
    username    = current_user.username

    # Always log to console (works in dev without SMTP)
    print(f"\n{'='*55}")
    print(f"  [{scan_type}] Scan complete — {username} ({to_email})")
    print(f"  Total: {total}  |  Fraud: {fraud}  |  Legit: {legit}")
    print(f"  Avg risk: {avg_risk}%  |  Highest: {highest}%")
    print(f"{'='*55}\n")

    if not settings.SMTP_EMAIL or not settings.SMTP_PASSWORD:
        return {"sent": False, "reason": "SMTP not configured — results printed to console"}

    fraud_color  = "#ff3d5a" if fraud > 0 else "#00ff88"
    fraud_label  = f"<strong style='color:{fraud_color};'>{fraud} FRAUD</strong>"
    fraud_rate   = round(fraud / total * 100, 1) if total > 0 else 0

    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;
                background:#0a0f1a;color:#e2eaf6;border-radius:12px;overflow:hidden;">
      <div style="background:#00ff88;padding:20px 30px;">
        <h1 style="margin:0;color:#000;font-size:22px;letter-spacing:3px;
                   font-family:monospace;">FRAUD<span>NET</span></h1>
        <p style="margin:4px 0 0;color:#003322;font-size:13px;">{scan_type} Scan Complete</p>
      </div>
      <div style="padding:32px 30px;">
        <p style="margin:0 0 8px;">Hi <strong>{username}</strong>,</p>
        <p style="color:#6b7fa3;margin:0 0 24px;">
          Your <strong style="color:#e2eaf6;">{scan_type}</strong> scan finished.
          Here is the summary:
        </p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <tr style="background:#05080f;">
            <td style="padding:12px 16px;border:1px solid #1e2a3a;color:#6b7fa3;font-size:13px;">Total transactions</td>
            <td style="padding:12px 16px;border:1px solid #1e2a3a;font-family:monospace;font-size:16px;font-weight:700;">{total}</td>
          </tr>
          <tr>
            <td style="padding:12px 16px;border:1px solid #1e2a3a;color:#6b7fa3;font-size:13px;">Fraud detected</td>
            <td style="padding:12px 16px;border:1px solid #1e2a3a;font-family:monospace;font-size:16px;">{fraud_label} ({fraud_rate}%)</td>
          </tr>
          <tr style="background:#05080f;">
            <td style="padding:12px 16px;border:1px solid #1e2a3a;color:#6b7fa3;font-size:13px;">Legitimate</td>
            <td style="padding:12px 16px;border:1px solid #1e2a3a;font-family:monospace;font-size:16px;color:#00ff88;">{legit}</td>
          </tr>
          <tr>
            <td style="padding:12px 16px;border:1px solid #1e2a3a;color:#6b7fa3;font-size:13px;">Average risk score</td>
            <td style="padding:12px 16px;border:1px solid #1e2a3a;font-family:monospace;font-size:16px;">{avg_risk}%</td>
          </tr>
          <tr style="background:#05080f;">
            <td style="padding:12px 16px;border:1px solid #1e2a3a;color:#6b7fa3;font-size:13px;">Highest risk score</td>
            <td style="padding:12px 16px;border:1px solid #1e2a3a;font-family:monospace;font-size:16px;color:#ff3d5a;">{highest}%</td>
          </tr>
        </table>
        {"<div style='background:rgba(255,61,90,0.1);border:1px solid rgba(255,61,90,0.3);border-radius:8px;padding:14px;margin-bottom:20px;'><p style='margin:0;color:#ff8090;font-size:13px;'>⚠ Fraud transactions were detected. Log in to FraudNet to review the flagged transactions in detail.</p></div>" if fraud > 0 else "<div style='background:rgba(0,255,136,0.06);border:1px solid rgba(0,255,136,0.2);border-radius:8px;padding:14px;margin-bottom:20px;'><p style='margin:0;color:#00ff88;font-size:13px;'>✓ No fraud detected in this scan.</p></div>"}
        <p style="color:#3d5068;font-size:12px;margin:0;">
          This notification was generated automatically by FraudNet.
        </p>
      </div>
    </div>
    """

    try:
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        import smtplib

        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"FraudNet — {scan_type} Scan Complete ({fraud} fraud found)"
        msg["From"]    = f"FraudNet <{settings.SMTP_EMAIL}>"
        msg["To"]      = to_email
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP("smtp.gmail.com", 587, timeout=10) as server:
            server.starttls()
            server.login(settings.SMTP_EMAIL, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_EMAIL, to_email, msg.as_string())

        return {"sent": True, "to": to_email}
    except Exception as e:
        print(f"[notify] Email send failed: {e}")
        return {"sent": False, "reason": str(e)}


# ─── Health ──────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}
