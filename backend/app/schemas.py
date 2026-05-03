from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime


class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class TransactionInput(BaseModel):
    # Core PCA features (V1-V28 subset) + Amount + Time-based features
    amount: float
    hour_of_day: float          # 0-23
    day_of_week: float          # 0-6
    v1: float
    v2: float
    v3: float
    v4: float
    v7: float
    v9: float
    v10: float
    v11: float
    v12: float
    v14: float
    v16: float
    v17: float
    v18: float
    v19: float
    v20: float

    model_config = {"json_schema_extra": {"example": {
        "amount": 149.62, "hour_of_day": 14.0, "day_of_week": 2.0,
        "v1": -1.36, "v2": -0.07, "v3": 2.54, "v4": 1.38,
        "v7": 0.24, "v9": 0.36, "v10": 0.09, "v11": -0.55,
        "v12": -0.62, "v14": -0.31, "v16": -0.47,
        "v17": 0.21, "v18": 0.02, "v19": 0.40, "v20": 0.25
    }}}


class ShapEntry(BaseModel):
    feature: str
    value: float
    shap_value: float


class PredictionResponse(BaseModel):
    risk_score: float           # 0–100
    verdict: str                # FRAUD / LEGITIMATE
    confidence: float           # 0–1
    model_used: str
    shap_explanation: List[ShapEntry]
    top_risk_factors: List[str]


class PredictionHistory(BaseModel):
    id: int
    risk_score: float
    verdict: str
    confidence: float
    model_used: str
    created_at: datetime

    class Config:
        from_attributes = True


class ModelMetrics(BaseModel):
    name: str
    accuracy: float
    precision: float
    recall: float
    f1: float
    roc_auc: float
    pr_auc: float


class DashboardStats(BaseModel):
    total_predictions: int
    fraud_detected: int
    legitimate: int
    avg_risk_score: float
    fraud_rate: float
