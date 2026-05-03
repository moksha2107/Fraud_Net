"""
OTP email sending for registration verification.
Uses Gmail SMTP. Requires SMTP_EMAIL and SMTP_PASSWORD in .env
(use a Gmail App Password, not your account password).
"""
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings


def generate_otp() -> str:
    """6-digit numeric OTP."""
    return str(secrets.randbelow(900000) + 100000)


def send_otp_email(to_email: str, username: str, otp: str) -> bool:
    """
    Send OTP to the given email.
    Returns True on success, False on failure (missing config / SMTP error).
    Always prints OTP to console so development works without SMTP.
    """
    print(f"\n{'='*50}")
    print(f"  OTP for {username} ({to_email}) : {otp}")
    print(f"{'='*50}\n")

    if not settings.SMTP_EMAIL or not settings.SMTP_PASSWORD:
        return False  # no credentials — OTP printed above is enough for dev

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "FraudNet — Verify your account"
        msg["From"]    = f"FraudNet <{settings.SMTP_EMAIL}>"
        msg["To"]      = to_email

        html = f"""
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;
                    background:#0a0f1a;color:#e2eaf6;border-radius:12px;overflow:hidden;">
          <div style="background:#00ff88;padding:20px 30px;">
            <h1 style="margin:0;color:#000;font-size:22px;letter-spacing:3px;
                       font-family:monospace;">FRAUD<span>NET</span></h1>
          </div>
          <div style="padding:32px 30px;">
            <p style="margin:0 0 8px;">Hi <strong>{username}</strong>,</p>
            <p style="color:#6b7fa3;margin:0 0 28px;">
              Use the code below to verify your FraudNet account.
              It expires in <strong style="color:#e2eaf6;">10 minutes</strong>.
            </p>
            <div style="background:#05080f;border:1px solid #1e2a3a;border-radius:10px;
                        padding:24px;text-align:center;margin-bottom:28px;">
              <span style="font-family:monospace;font-size:40px;font-weight:700;
                           letter-spacing:10px;color:#00ff88;">{otp}</span>
            </div>
            <p style="color:#3d5068;font-size:12px;margin:0;">
              If you didn't request this, ignore this email.
            </p>
          </div>
        </div>
        """

        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP("smtp.gmail.com", 587, timeout=10) as server:
            server.starttls()
            server.login(settings.SMTP_EMAIL, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_EMAIL, to_email, msg.as_string())

        return True
    except Exception as e:
        print(f"[OTP] Email send failed: {e}")
        return False
