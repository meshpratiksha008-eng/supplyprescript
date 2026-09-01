from api.db import SessionLocal, Decision
from datetime import datetime, timedelta
import random

# Realistic variance per option: (min_multiplier, max_multiplier)
# Air Freight: reliable/expensive -> tight variance
# Secondary Supplier: new vendor risk -> wider variance
# Delay Launch: cheapest, least exposure -> can even come in under estimate
NOISE_BY_OPTION = {
    "Air Freight": (0.95, 1.15),
    "Secondary Supplier": (1.00, 1.35),
    "Delay Launch": (0.90, 1.05),
}
DEFAULT_NOISE = (1.0, 1.3)

# Don't evaluate a decision the same day it was executed —
# real invoice/ERP data wouldn't be available yet.
MIN_AGE = timedelta(seconds=0)


def evaluate_pending_decisions():
    db = SessionLocal()
    cutoff = datetime.utcnow() - MIN_AGE

    pending = (
        db.query(Decision)
        .filter(Decision.actual_cost.is_(None))
        .filter(Decision.executed_at <= cutoff)
        .all()
    )

    if not pending:
        print("No decisions ready to evaluate.")
        db.close()
        return

    evaluated = 0
    skipped = 0
    overruns = []

    for d in pending:
        try:
            lo, hi = NOISE_BY_OPTION.get(d.chosen_option, DEFAULT_NOISE)
            # In production this pulls a real invoice/ERP record.
            d.actual_cost = d.predicted_cost * random.uniform(lo, hi)
            d.evaluated_at = datetime.utcnow()
            overruns.append(d.actual_cost / d.predicted_cost - 1)
            evaluated += 1
        except Exception as e:
            print(f"Skipped decision id={getattr(d, 'id', '?')}: {e}")
            skipped += 1
            continue

    db.commit()
    db.close()

    avg_overrun = sum(overruns) / len(overruns) if overruns else 0
    print(f"Evaluated {evaluated} decisions, skipped {skipped}.")
    print(f"Average predicted-vs-actual overrun: {avg_overrun:+.1%}")


if __name__ == "__main__":
    evaluate_pending_decisions()