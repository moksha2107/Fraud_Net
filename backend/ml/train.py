"""
FraudNet — Training Script
==========================
Trains XGBoost, LightGBM, CatBoost base models + a stacking ensemble
using SMOTEENN for class imbalance. Saves:
  - ml/models/ensemble.pkl   (StackingClassifier)
  - ml/models/scaler.pkl     (RobustScaler — also saved by preprocess.py)
  - ml/models/metrics.json   (per-model evaluation results)

Usage:
    cd backend
    python ml/train.py --data path/to/creditcard.csv
"""

import os
import sys
import json
import argparse
import warnings
import numpy as np
import joblib

from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import StackingClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, roc_auc_score, average_precision_score,
    confusion_matrix, classification_report
)
from imblearn.combine import SMOTEENN

import xgboost as xgb
import lightgbm as lgb
from catboost import CatBoostClassifier

warnings.filterwarnings("ignore")

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from ml.preprocess import build_splits


# ── Helpers ──────────────────────────────────────────────────────────────────

def evaluate(name: str, model, X_test, y_test) -> dict:
    y_pred  = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    metrics = {
        "name":      name,
        "accuracy":  round(accuracy_score(y_test, y_pred), 4),
        "precision": round(precision_score(y_test, y_pred, zero_division=0), 4),
        "recall":    round(recall_score(y_test, y_pred, zero_division=0), 4),
        "f1":        round(f1_score(y_test, y_pred, zero_division=0), 4),
        "roc_auc":   round(roc_auc_score(y_test, y_proba), 4),
        "pr_auc":    round(average_precision_score(y_test, y_proba), 4),
    }

    cm = confusion_matrix(y_test, y_pred)
    tn, fp, fn, tp = cm.ravel()
    # Cost-sensitive: assume $500 avg fraud loss, $5 per false positive review
    cost = fn * 500 + fp * 5
    metrics["cost_sensitive_loss"] = int(cost)
    metrics["true_positives"]  = int(tp)
    metrics["false_negatives"] = int(fn)
    metrics["false_positives"] = int(fp)

    print(f"\n{'─'*50}")
    print(f"  {name}")
    print(f"  ROC-AUC : {metrics['roc_auc']}  |  PR-AUC : {metrics['pr_auc']}")
    print(f"  Recall  : {metrics['recall']}   |  F1     : {metrics['f1']}")
    print(f"  Cost    : ${cost:,}  (FN×$500 + FP×$5)")
    print(classification_report(y_test, y_pred, target_names=["Legit", "Fraud"]))

    return metrics


# ── Main ─────────────────────────────────────────────────────────────────────

def main(csv_path: str):
    print("► Loading and engineering features …")
    X_train, X_test, y_train, y_test, _ = build_splits(csv_path)

    print(f"  Train: {X_train.shape}  |  Fraud rate: {y_train.mean()*100:.3f}%")
    print(f"  Test : {X_test.shape}   |  Fraud rate: {y_test.mean()*100:.3f}%")

    # ── Resample with SMOTEENN ────────────────────────────────────────────
    print("\n► Applying SMOTEENN resampling …")
    smoteenn = SMOTEENN(random_state=42)
    X_res, y_res = smoteenn.fit_resample(X_train, y_train)
    print(f"  After SMOTEENN: {X_res.shape}  |  Fraud rate: {y_res.mean()*100:.2f}%")

    # ── Base models ───────────────────────────────────────────────────────
    xgb_clf = xgb.XGBClassifier(
        n_estimators=400,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        eval_metric="aucpr",
        random_state=42,
        n_jobs=-1,
    )

    lgb_clf = lgb.LGBMClassifier(
        n_estimators=400,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
        verbose=-1,
    )

    cat_clf = CatBoostClassifier(
        iterations=400,
        depth=6,
        learning_rate=0.05,
        auto_class_weights="Balanced",
        eval_metric="AUC",
        random_seed=42,
        verbose=0,
    )

    # ── Train base models individually ───────────────────────────────────
    all_metrics = []

    print("\n► Training XGBoost …")
    xgb_clf.fit(X_res, y_res)
    all_metrics.append(evaluate("XGBoost", xgb_clf, X_test, y_test))

    print("\n► Training LightGBM …")
    lgb_clf.fit(X_res, y_res)
    all_metrics.append(evaluate("LightGBM", lgb_clf, X_test, y_test))

    print("\n► Training CatBoost …")
    cat_clf.fit(X_res, y_res)
    all_metrics.append(evaluate("CatBoost", cat_clf, X_test, y_test))

    # ── Stacking Ensemble ─────────────────────────────────────────────────
    print("\n► Building Stacking Ensemble …")
    estimators = [
        ("xgb", xgb_clf),
        ("lgb", lgb_clf),
        ("cat", cat_clf),
    ]
    meta_learner = LogisticRegression(C=1.0, max_iter=1000, random_state=42)
    ensemble = StackingClassifier(
        estimators=estimators,
        final_estimator=meta_learner,
        cv=5,
        stack_method="predict_proba",
        n_jobs=-1,
    )
    ensemble.fit(X_res, y_res)
    all_metrics.append(evaluate("StackingEnsemble", ensemble, X_test, y_test))

    # ── Save artifacts ────────────────────────────────────────────────────
    os.makedirs(MODELS_DIR, exist_ok=True)
    joblib.dump(ensemble, os.path.join(MODELS_DIR, "ensemble.pkl"))
    print(f"\n✓ Saved ensemble → {MODELS_DIR}/ensemble.pkl")

    metrics_path = os.path.join(MODELS_DIR, "metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(all_metrics, f, indent=2)
    print(f"✓ Saved metrics  → {metrics_path}")

    # ── Summary ───────────────────────────────────────────────────────────
    print("\n" + "═" * 50)
    print("  MODEL COMPARISON SUMMARY")
    print("═" * 50)
    header = f"  {'Model':<20} {'ROC-AUC':>8} {'PR-AUC':>8} {'Recall':>8} {'F1':>8}"
    print(header)
    print("  " + "─" * 48)
    for m in all_metrics:
        print(f"  {m['name']:<20} {m['roc_auc']:>8.4f} {m['pr_auc']:>8.4f} "
              f"{m['recall']:>8.4f} {m['f1']:>8.4f}")
    print("═" * 50)
    print("\n✓ Training complete.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train FraudNet ensemble")
    parser.add_argument(
        "--data",
        default=os.path.join(os.path.dirname(__file__), "..", "data", "creditcard.csv"),
        help="Path to creditcard.csv (Kaggle dataset)",
    )
    args = parser.parse_args()

    if not os.path.exists(args.data):
        print(f"[ERROR] Dataset not found: {args.data}")
        print("  Download from: https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud")
        print("  Place it in backend/data/creditcard.csv  or pass --data <path>")
        sys.exit(1)

    main(args.data)
