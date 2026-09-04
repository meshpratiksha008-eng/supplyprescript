import pandas as pd, joblib, xgboost as xgb
from api.db import SessionLocal, Decision

def retrain_if_needed(threshold=5):
    db = SessionLocal()
    evaluated = db.query(Decision).filter(Decision.actual_cost.isnot(None)).all()
    db.close()
    if len(evaluated) < threshold:
        print(f"Only {len(evaluated)} evaluated decisions, skipping retrain.")
        return

    df = pd.DataFrame([{
        "predicted_delay_days": e.predicted_delay_days,
        "predicted_cost": e.predicted_cost,
        "actual_cost": e.actual_cost,
    } for e in evaluated])

    bundle = joblib.load("ml/model.pkl")
    X = df[["predicted_delay_days", "predicted_cost"]]
    y = df["actual_cost"]
    corrector = xgb.XGBRegressor(n_estimators=100)
    corrector.fit(X, y)
    bundle["cost_corrector"] = corrector
    joblib.dump(bundle, "ml/model.pkl")
    print("Retrained cost-correction model.")

if __name__ == "__main__":
    retrain_if_needed()