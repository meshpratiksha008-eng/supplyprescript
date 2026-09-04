import argparse
import datetime
import shutil

import joblib
import pandas as pd
import xgboost as xgb
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import train_test_split

from api.db import SessionLocal, Decision, RetrainLog

MODEL_PATH = "ml/model.pkl"

# Rough estimate of shipment volume per month — used only to translate
# accuracy improvement into a dollar figure for business reporting.
# Adjust to match real shipment volume once known.
AVG_SHIPMENTS_PER_MONTH = 150


def _log_run(db, num_evaluated, mae_before=None, mae_after=None,
             deployed=False, estimated_monthly_savings=None, notes=""):
    entry = RetrainLog(
        num_evaluated=num_evaluated,
        mae_before=mae_before,
        mae_after=mae_after,
        deployed=1 if deployed else 0,
        estimated_monthly_savings=estimated_monthly_savings,
        notes=notes,
    )
    db.add(entry)
    db.commit()


def retrain_if_needed(threshold=5, dry_run=False):
    """
    Retrain the cost-correction model once enough evaluated decisions
    exist. threshold=5 is for local testing with seeded data;
    production should keep this at 50+.
    """
    db = SessionLocal()
    evaluated = db.query(Decision).filter(Decision.actual_cost.isnot(None)).all()
    num_evaluated = len(evaluated)

    if num_evaluated < threshold:
        msg = f"Only {num_evaluated} evaluated decisions, skipping retrain."
        print(msg)
        _log_run(db, num_evaluated, notes=f"skipped: below threshold ({threshold})")
        db.close()
        return

    df = pd.DataFrame([{
        "predicted_delay_days": e.predicted_delay_days,
        "predicted_cost": e.predicted_cost,
        "actual_cost": e.actual_cost,
    } for e in evaluated])

    X = df[["predicted_delay_days", "predicted_cost"]]
    y = df["actual_cost"]

    # Guard: no variance in outcomes means there's nothing meaningful to learn
    if y.std() == 0:
        print("No variance in actual_cost across evaluated decisions — skipping retrain.")
        _log_run(db, num_evaluated, notes="skipped: zero variance in actual_cost")
        db.close()
        return

    # Guard: too few rows for a meaningful train/test split
    if len(df) < 4:
        print("Not enough evaluated decisions for a train/test split — skipping retrain.")
        _log_run(db, num_evaluated, notes="skipped: too few rows for train/test split")
        db.close()
        return

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    corrector = xgb.XGBRegressor(n_estimators=100)
    corrector.fit(X_train, y_train)

    # Baseline: how far off the ORIGINAL prediction already was, on the holdout set
    mae_before = mean_absolute_error(y_test, X_test["predicted_cost"])
    # How far off the corrector's predictions are, on the same holdout set
    mae_after = mean_absolute_error(y_test, corrector.predict(X_test))

    # Translate the accuracy gain into a business-readable dollar figure
    mae_improvement = mae_before - mae_after
    estimated_monthly_savings = mae_improvement * AVG_SHIPMENTS_PER_MONTH

    print(f"Evaluated decisions used: {num_evaluated}")
    print(f"Holdout MAE before correction: {mae_before:.2f}")
    print(f"Holdout MAE after correction:  {mae_after:.2f}")
    print(f"Estimated cost-prediction improvement per shipment: ${mae_improvement:,.2f}")
    print(f"Estimated monthly impact (at {AVG_SHIPMENTS_PER_MONTH} shipments/month): "
          f"${estimated_monthly_savings:,.2f}")

    if dry_run:
        verdict = "would improve accuracy" if mae_after < mae_before else "would NOT improve accuracy"
        print(f"[DRY RUN] Retrain {verdict}. No files were changed.")
        _log_run(db, num_evaluated, mae_before, mae_after,
                  deployed=False, estimated_monthly_savings=estimated_monthly_savings,
                  notes=f"dry-run: {verdict}")
        db.close()
        return

    if mae_after >= mae_before:
        print("Retrain skipped — new corrector did not improve on holdout MAE.")
        _log_run(db, num_evaluated, mae_before, mae_after,
                  deployed=False, estimated_monthly_savings=estimated_monthly_savings,
                  notes="skipped: no MAE improvement")
        db.close()
        return

    # Back up the current model before overwriting it
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"ml/model_backup_{timestamp}.pkl"
    shutil.copy(MODEL_PATH, backup_path)
    print(f"Backed up current model to {backup_path}")

    bundle = joblib.load(MODEL_PATH)
    bundle["cost_corrector"] = corrector
    joblib.dump(bundle, MODEL_PATH)
    print("Retrained cost-correction model — improved accuracy.")

    _log_run(db, num_evaluated, mae_before, mae_after,
              deployed=True, estimated_monthly_savings=estimated_monthly_savings,
              notes="deployed")
    db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Retrain the cost-correction model if enough data exists.")
    parser.add_argument("--threshold", type=int, default=5, help="Minimum evaluated decisions required (default: 5 for local testing)")
    parser.add_argument("--dry-run", action="store_true", help="Report what would happen without changing any files")
    args = parser.parse_args()

    retrain_if_needed(threshold=args.threshold, dry_run=args.dry_run)