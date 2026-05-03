# Fraud_Net

### Deep Learning Ensemble with Data Resampling for Credit Card Fraud Detection

[![Python 3.11](https://img.shields.io/badge/python-3.11-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-REST%20API-teal.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/frontend-React%2018-blue.svg)](https://react.dev/)
[![SHAP](https://img.shields.io/badge/explainability-SHAP-orange.svg)](https://shap.readthedocs.io/)
[![MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

---

## Problem Statement

Financial fraud detection is a fundamentally imbalanced classification problem. In the Kaggle ULB Credit Card dataset, only **492 out of 284,807 transactions (0.172%)** are fraudulent — a 578:1 class ratio that causes most standard classifiers to simply predict "legitimate" for everything and still achieve 99.8% accuracy, while missing nearly all actual fraud.

This project tackles three core challenges:

1. **Class imbalance** — standard training collapses to the majority class
2. **Model interpretability** — banks require explanations for every flagged transaction
3. **Deployment gap** — most research stops at the notebook; real systems need APIs and UIs

---

## Approach

Rather than a single model, Fraud_Net uses a **two-stage learning architecture**:

**Stage 1 — Base Learners**
Three gradient boosting models are trained independently on SMOTEENN-resampled data:
- XGBoost (400 estimators, depth 6, AUCPR objective)
- LightGBM (class-balanced, leaf-wise growth)
- CatBoost (auto class weights, ordered boosting)

Each model produces a fraud probability score via 5-fold cross-validation.

**Stage 2 — Meta Learner**
The three probability scores `[p_xgb, p_lgb, p_cat]` are fed as features into a Logistic Regression meta-learner, which learns the optimal combination — consistently outperforming any single booster.

**Resampling — SMOTEENN**
Before training, the minority class is upsampled using SMOTE (k-NN interpolation) and cleaned using Edited Nearest Neighbours (ENN), which removes ambiguous samples near the decision boundary. This two-step approach avoids the noise introduced by pure oversampling.

**Explainability — SHAP**
Every prediction is accompanied by SHAP (SHapley Additive exPlanations) values from a TreeExplainer, showing each feature's contribution to the fraud score — making the model auditable and analyst-friendly.

---

## Results & Findings

The stacking ensemble consistently outperforms all individual base learners:

```
Model              Precision   Recall    F1       PR-AUC
─────────────────────────────────────────────────────────
XGBoost              0.8197    0.8571   0.8380    0.8221
LightGBM             0.8088    0.8673   0.8370    0.8334
CatBoost             0.8354    0.8571   0.8461    0.8267
Stacking Ensemble    0.8534    0.8878   0.8703    0.8499  ← best
```

**Key findings:**
- Stacking improves Recall by **+3.07%** over the next best single model (LightGBM)
- SMOTEENN resampling improves Recall by **~12%** compared to no-resampling baseline
- PR-AUC is used as the primary metric — ROC-AUC is misleadingly optimistic at 0.17% fraud rate
- Cost-sensitive evaluation (missed fraud = $500, false alert = $5) confirms stacking saves **$1,025** vs worst individual model
- Top SHAP features: `v14`, `v4`, `v12`, `v10`, `amount`

---

## Dataset

**Source:** [Kaggle — Credit Card Fraud Detection (ULB)](https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud)

| Property | Value |
|---|---|
| Total transactions | 284,807 |
| Fraudulent | 492 (0.172%) |
| Features | 28 PCA components (V1–V28) + Time + Amount |
| Selected features | 15 V-components + Amount + hour_of_day + day_of_week |
| Scaler | RobustScaler (median + IQR — outlier resistant) |
| Split | 80% train / 20% test (stratified) |

The dataset is not included in the repository. Download it from Kaggle and place at `backend/data/creditcard.csv`.

---

## Installation & Setup

**Requirements:** Python 3.11+ · Node.js 18+ · Git

### Clone

```bash
git clone https://github.com/moksha2107/Fraud_Net.git
cd Fraud_Net
```

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env           # Add your SECRET_KEY and optional SMTP credentials
python ml/train.py --data data/creditcard.csv
python run.py                  # Starts on http://localhost:8001
```

### Frontend

```bash
cd frontend
npm install
npm run dev                    # Starts on http://localhost:5173
```

> All `/api/*` calls from the frontend are automatically proxied to the backend via Vite's dev server proxy — no manual CORS configuration needed.

---

## System Overview

```
Browser (React SPA)
       │
       ▼  HTTP + JWT
FastAPI Backend  ──► SQLite (users, predictions)
       │
       ▼
  Predictor
  ├── RobustScaler.transform(X)
  ├── XGBoost.predict_proba(X)  ──┐
  ├── LightGBM.predict_proba(X) ──┼──► LogisticRegression → p̂
  ├── CatBoost.predict_proba(X) ──┘
  └── SHAP.TreeExplainer → feature attributions
       │
       ▼
  { verdict, confidence, risk_score, shap_values }
```

The frontend never sees raw model internals — every response includes a plain-language verdict (`FRAUD` / `LEGITIMATE`), a 0–100 risk score, confidence percentage, and ranked SHAP attributions.

---

## Application Pages

| Page | Description |
|---|---|
| Landing | Public intro page with project overview |
| Register / Login | OTP-verified registration, JWT-based login |
| Smart Analyzer | User-friendly transaction form → risk gauge + SHAP chart |
| Predict | Raw 18-feature input form for direct model access |
| Dashboard | Live stats — fraud rate, total predictions, avg risk score |
| Model Comparison | Side-by-side metrics for all 4 models |
| History | Last 50 predictions with sortable table |
| Algorithm | Visual walkthrough of the full ML pipeline |
| Batch Analyze | Submit multiple transactions at once |

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

```
SECRET_KEY=<long-random-string>          # JWT signing key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
DATABASE_URL=sqlite:///./fraudnet.db
SMTP_EMAIL=<gmail>                       # Optional — for OTP emails
SMTP_PASSWORD=<gmail-app-password>       # Optional — use App Password, not account password
OTP_EXPIRE_MINUTES=10
```

If SMTP credentials are not set, OTPs are printed to the console instead — useful for local development.

---

## Acknowledgements

- [XGBoost](https://xgboost.readthedocs.io/) — Chen & Guestrin, 2016
- [LightGBM](https://lightgbm.readthedocs.io/) — Ke et al., 2017
- [CatBoost](https://catboost.ai/) — Prokhorenkova et al., 2018
- [SHAP](https://shap.readthedocs.io/) — Lundberg & Lee, 2017
- [SMOTE](https://imbalanced-learn.org/) — Chawla et al., 2002
- Dataset — Dal Pozzolo et al., ULB Machine Learning Group

---

## License

MIT
