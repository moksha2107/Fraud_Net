from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from app.config import settings

engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id            = Column(Integer, primary_key=True, index=True)
    username      = Column(String, unique=True, index=True)
    email         = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    created_at    = Column(DateTime, default=datetime.utcnow)


class PendingUser(Base):
    """Stores registration attempts awaiting OTP verification."""
    __tablename__ = "pending_users"
    id              = Column(Integer, primary_key=True, index=True)
    username        = Column(String, unique=True, index=True)
    email           = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    otp             = Column(String)
    created_at      = Column(DateTime, default=datetime.utcnow)


class Prediction(Base):
    __tablename__ = "predictions"
    id            = Column(Integer, primary_key=True, index=True)
    user_id       = Column(Integer)
    risk_score    = Column(Float)
    verdict       = Column(String)
    confidence    = Column(Float)
    model_used    = Column(String)
    input_data    = Column(Text)
    shap_values   = Column(Text)
    created_at    = Column(DateTime, default=datetime.utcnow)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    Base.metadata.create_all(bind=engine)
