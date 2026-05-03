import os
import json
import numpy as np
import joblib
import shap
from typing import Tuple, List, Dict, Any
from app.schemas import TransactionInput, ShapEntry

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "ml", "models")
FEATURE_NAMES = [
    "amount", "hour_of_day", "day_of_week",
    "v1", "v2", "v3", "v4", "v7", "v9", "v10",
    "v11", "v12", "v14", "v16", "v17", "v18", "v19", "v20"
]


def _load_artifacts():
    model_path  = os.path.join(MODEL_DIR, "ensemble.pkl")
    scaler_path = os.path.join(MODEL_DIR, "scaler.pkl")
    if not os.path.exists(model_path):
        raise FileNotFoundError(
            "Model not found. Run `python ml/train.py` first to train the models."
        )
    model  = joblib.load(model_path)
    scaler = joblib.load(scaler_path)
    return model, scaler


def transaction_to_array(tx: TransactionInput) -> np.ndarray:
    return np.array([[
        tx.amount, tx.hour_of_day, tx.day_of_week,
        tx.v1, tx.v2, tx.v3, tx.v4, tx.v7, tx.v9, tx.v10,
        tx.v11, tx.v12, tx.v14, tx.v16, tx.v17, tx.v18, tx.v19, tx.v20
    ]])


def predict(tx: TransactionInput) -> Tuple[float, str, float, List[ShapEntry]]:
    model, scaler = _load_artifacts()

    X_raw = transaction_to_array(tx)
    X     = scaler.transform(X_raw)

    proba      = float(model.predict_proba(X)[0][1])
    risk_score = round(proba * 100, 2)
    verdict    = "FRAUD" if proba >= 0.5 else "LEGITIMATE"
    confidence = proba if proba >= 0.5 else 1 - proba

    # SHAP explanation
    shap_entries = _explain(model, scaler, X_raw)
    return risk_score, verdict, confidence, shap_entries


def _explain(model, scaler, X_raw: np.ndarray) -> List[ShapEntry]:
    """
    Compute SHAP values using a base tree estimator from the StackingClassifier.
    TreeExplainer cannot handle the full stacking model (meta-learner is
    LogisticRegression), so we extract the best available tree-based base
    estimator and run SHAP on that instead.
    """
    X_scaled = scaler.transform(X_raw)

    # Try each base estimator in order: XGBoost → LightGBM → CatBoost
    base_model = None
    if hasattr(model, "estimators_") and model.estimators_:
        for est in model.estimators_:
            # unwrap Pipeline steps if needed
            candidate = est[-1] if hasattr(est, "__getitem__") else est
            try:
                shap.TreeExplainer(candidate)   # probe — will raise if unsupported
                base_model = candidate
                break
            except Exception:
                continue

    if base_model is None:
        # No tree base model found — return zeros
        return [
            ShapEntry(feature=FEATURE_NAMES[i], value=float(X_raw[0][i]), shap_value=0.0)
            for i in range(len(FEATURE_NAMES))
        ]

    try:
        explainer = shap.TreeExplainer(base_model)
        shap_vals = explainer.shap_values(X_scaled)

        # Binary classifiers may return [class0_vals, class1_vals]
        if isinstance(shap_vals, list) and len(shap_vals) == 2:
            sv = np.array(shap_vals[1][0])
        elif isinstance(shap_vals, np.ndarray) and shap_vals.ndim == 3:
            # shape (1, n_features, 2) — take class-1 slice
            sv = shap_vals[0, :, 1]
        else:
            sv = np.array(shap_vals[0] if shap_vals.ndim > 1 else shap_vals)

        entries = [
            ShapEntry(
                feature=FEATURE_NAMES[i],
                value=float(X_raw[0][i]),
                shap_value=float(sv[i]),
            )
            for i in range(len(FEATURE_NAMES))
        ]
        entries.sort(key=lambda e: abs(e.shap_value), reverse=True)
        return entries

    except Exception as exc:
        print(f"[SHAP] explainer failed on base model: {exc}")
        return [
            ShapEntry(feature=FEATURE_NAMES[i], value=float(X_raw[0][i]), shap_value=0.0)
            for i in range(len(FEATURE_NAMES))
        ]


def get_model_metrics() -> List[Dict[str, Any]]:
    metrics_path = os.path.join(MODEL_DIR, "metrics.json")
    if not os.path.exists(metrics_path):
        return []
    with open(metrics_path) as f:
        return json.load(f)
