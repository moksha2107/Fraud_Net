"""
Clears all users, pending registrations, and predictions from the database.
Safe to run while the backend is running (no file deletion needed).
Usage:  python reset_db.py
"""
import sys
from pathlib import Path

# Make sure app package is importable
sys.path.insert(0, str(Path(__file__).parent))

from app.database import engine, Base, User, PendingUser, Prediction
from sqlalchemy.orm import Session
from sqlalchemy import text

with Session(engine) as db:
    pending = db.query(PendingUser).delete()
    users   = db.query(User).delete()
    preds   = db.query(Prediction).delete()
    db.commit()
    print(f"Cleared: {users} user(s), {pending} pending registration(s), {preds} prediction(s)")

print("Database is clean. You can register a fresh account now.")
