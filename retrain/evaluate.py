from api.db import SessionLocal, Decision
import random

def evaluate_pending_decisions():
    db = SessionLocal()
    pending = db.query(Decision).filter(Decision.actual_cost.is_(None)).all()
    for d in pending:
        # In production this pulls a real invoice/ERP record.
        # Mock: actual cost is predicted +/- noise, like the $15k->$18k example.
        d.actual_cost = d.predicted_cost * random.uniform(1.0, 1.3)
        d.evaluated_at = __import__("datetime").datetime.utcnow()
    db.commit()
    db.close()

if __name__ == "__main__":
    evaluate_pending_decisions()