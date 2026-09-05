from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
import datetime

DATABASE_URL = "sqlite:///./supplyprescript.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

class Decision(Base):
    __tablename__ = "decisions"
    id = Column(Integer, primary_key=True)
    shipment_id = Column(Integer)
    predicted_delay_days = Column(Float)
    chosen_option = Column(String)
    predicted_cost = Column(Float)
    actual_cost = Column(Float, nullable=True)
    executed_at = Column(DateTime, default=datetime.datetime.utcnow)
    evaluated_at = Column(DateTime, nullable=True)
    prediction_error_pct = Column(Float, nullable=True)
    dollar_error = Column(Float, nullable=True)
    flagged_outlier = Column(Boolean, nullable=True)
    decided_by = Column(String, nullable=True)
    idempotency_key = Column(String, nullable=True, unique=True)

class ExecutionAttempt(Base):
    __tablename__ = "execution_attempts"
    id = Column(Integer, primary_key=True)
    username = Column(String, nullable=True)
    shipment_id = Column(Integer, nullable=True)
    success = Column(Integer)
    reason = Column(String, nullable=True)
    attempted_at = Column(DateTime, default=datetime.datetime.utcnow)

Base.metadata.create_all(engine)