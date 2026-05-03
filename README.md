# FraudNet — Real-time Credit Card Fraud Detection

Modern FinTech fraud detection system built for a final-year thesis.
Stack: **FastAPI** · **React + Vite** · **XGBoost / LightGBM / CatBoost** · **SHAP** · **SMOTEENN**

---

## Architecture

```
FraudNet/
├── backend/
│   ├── app/
│   │   ├── main.py         # FastAPI routes
│   │   ├── auth.py         # JWT authentication
│   │   ├── predictor.py    # Model inference + SHAP
│   │   ├── schemas.py      # Pydantic models
│   │   ├── database.py     # SQLAlchemy (SQLite)
│   │   └── config.py       # Settings via .env
│   ├── ml/
│   │   ├── train.py        # Training script
│   │   ├── preprocess.py   # Feature engineering
│   │   └── models/         # Saved .pkl files (after training)
│   ├── data/               # Place creditcard.csv here
│   ├── requirements.txt
│   └── run.py
└── frontend/
    ├── src/
    │   ├── pages/          # Dashboard, Predict, Models, History
    │   ├── components/     # Layout, Navbar
    │   └── api.js          # Axios client
    ├── package.json
    └── vite.config.js
```

---

## Setup

### 1 — Dataset

Download the Kaggle Credit Card Fraud dataset and place it at:

```
backend/data/creditcard.csv
```

Source: https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud

---

### 2 — Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and set a strong SECRET_KEY

# Train the models (takes ~5–10 minutes)
python ml/train.py --data data/creditcard.csv

# Start the API server
python run.py
```

API available at: http://localhost:8000
Interactive docs: http://localhost:8000/docs

---

### 3 — Frontend

```bash
cd frontend

npm install
npm run dev
```

App available at: http://localhost:5173

---

## API Endpoints

| Method | Endpoint          | Auth | Description                        |
|--------|-------------------|------|------------------------------------|
| POST   | /auth/register    | —    | Create account                     |
| POST   | /auth/login       | —    | Login, receive JWT token           |
| GET    | /auth/me          | JWT  | Current user info                  |
| POST   | /predict          | JWT  | Analyse transaction + SHAP         |
| GET    | /history          | JWT  | Prediction history (last 50)       |
| GET    | /stats            | JWT  | Dashboard statistics               |
| GET    | /models           | JWT  | Model comparison metrics           |
| GET    | /health           | —    | Health check                       |

---

## ML Models

| Model            | Notes                                              |
|------------------|----------------------------------------------------|
| XGBoost          | Gradient boosting, scale_pos_weight for imbalance  |
| LightGBM         | Fast GBDT, class_weight="balanced"                 |
| CatBoost         | Categorical boosting, auto class weights           |
| StackingEnsemble | XGB + LGB + CAT → Logistic Regression meta learner |

**Resampling**: SMOTEENN (SMOTE oversampling + Edited Nearest Neighbours cleaning)
**Explainability**: SHAP TreeExplainer — per-prediction feature attribution
**Evaluation**: PR-AUC (primary), ROC-AUC, Recall, Cost-sensitive loss (FN×$500 + FP×$5)

---

## Features Used

The model uses 18 features extracted from the Kaggle dataset:

- `amount` — transaction amount
- `hour_of_day` — derived from Time column (0–23)
- `day_of_week` — derived from Time column (0–6)
- `v1, v2, v3, v4, v7, v9, v10, v11, v12, v14, v16, v17, v18, v19, v20` — PCA components selected by importance

---

## Thesis Notes

- **Why PR-AUC over ROC-AUC?** With ~0.17% fraud rate, ROC-AUC can be misleadingly high. PR-AUC measures precision-recall trade-off on the minority class.
- **Why SMOTEENN?** Pure SMOTE can generate noisy borderline samples. ENN cleaning removes ambiguous synthetic points.
- **Why Stacking?** Combines complementary strengths of tree-based boosters via a learned meta learner, consistently outperforming individual models.
- **Cost-sensitive evaluation** models the real-world asymmetry: missing fraud is far more expensive than a false alert.
