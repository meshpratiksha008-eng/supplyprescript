from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean
from sqlalchemy.orm import declarative_base, sessionmaker
import datetime

# SQLite: just a local file, created automatically. No server needed.
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
    prediction_error_pct = Column(Float, nullable=True)   # NEW
    dollar_error = Column(Float, nullable=True)   # NEW
    flagged_outlier = Column(Boolean, nullable=True)
    flagged_outlier = Column(Boolean, nullable=True)       # NEW