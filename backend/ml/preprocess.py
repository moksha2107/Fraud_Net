"""
Feature engineering pipeline for FraudNet.
Reads the raw Kaggle creditcard.csv and produces train/test splits
with selected PCA features, time-derived features, and amount scaling.
"""

import os
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import RobustScaler
import joblib

# Features selected by correlation / importance analysis
SELECTED_V = ["V1", "V2", "V3", "V4", "V7", "V9", "V10",
              "V11", "V12", "V14", "V16", "V17", "V18", "V19", "V20"]

FEATURE_COLS = ["Amount", "hour_of_day", "day_of_week"] + SELECTED_V

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")


def load_and_engineer(csv_path: str) -> pd.DataFrame:
    df = pd.read_csv(csv_path)

    # Time-based features (Time column = seconds from first transaction)
    df["hour_of_day"] = (df["Time"] // 3600) % 24
    df["day_of_week"] = (df["Time"] // 86400) % 7

    # Rename to lowercase to match API schema
    df.rename(columns={
        "Amount": "amount",
        **{v: v.lower() for v in SELECTED_V},
    }, inplace=True)

    feature_cols_lower = ["amount", "hour_of_day", "day_of_week"] + [v.lower() for v in SELECTED_V]
    return df[feature_cols_lower + ["Class"]]


def build_splits(csv_path: str, test_size: float = 0.2, random_state: int = 42):
    df = load_and_engineer(csv_path)
    X = df.drop("Class", axis=1).values
    y = df["Class"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, stratify=y, random_state=random_state
    )

    scaler = RobustScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s  = scaler.transform(X_test)

    os.makedirs(MODELS_DIR, exist_ok=True)
    joblib.dump(scaler, os.path.join(MODELS_DIR, "scaler.pkl"))

    return X_train_s, X_test_s, y_train, y_test, scaler
