from api.db import SessionLocal, Decision
from datetime import datetime, timedelta
from collections import defaultdict
import random

# Realistic variance per option: (min_multiplier, max_multiplier)
NOISE_BY_OPTION = {
    "Air Freight": (0.95, 1.15),
    "Secondary Supplier": (1.00, 1.35),
    "Delay Launch": (0.90, 1.05),
}
DEFAULT_NOISE = (1.0, 1.3)

MIN_AGE = timedelta(days=1)
OUTLIER_THRESHOLD = 0.5  # 50% overrun/underrun


def evaluate_pending_decisions(dry_run=False):
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

    if dry_run:
        print(f"[DRY RUN] Would evaluate {len(pending)} decisions. No changes made.")
        db.close()
        return

    evaluated = 0
    skipped = 0
    outliers = 0
    errors_by_option = defaultdict(list)
    dollar_errors = []

    for d in pending:
        try:
            lo, hi = NOISE_BY_OPTION.get(d.chosen_option, DEFAULT_NOISE)
            d.actual_cost = d.predicted_cost * random.uniform(lo, hi)
            d.evaluated_at = datetime.utcnow()

            error_pct = (d.actual_cost - d.predicted_cost) / d.predicted_cost
            d.prediction_error_pct = error_pct

            dollar_error = d.actual_cost - d.predicted_cost
            d.dollar_error = dollar_error
            dollar_errors.append(dollar_error)

            is_outlier = abs(error_pct) > OUTLIER_THRESHOLD
            d.flagged_outlier = is_outlier
            if is_outlier:
                outliers += 1

            errors_by_option[d.chosen_option or "Unknown"].append(error_pct)
            evaluated += 1
        except Exception as e:
            print(f"Skipped decision id={getattr(d, 'id', '?')}: {e}")
            skipped += 1
            continue

    db.commit()
    db.close()

    all_errors = [e for errs in errors_by_option.values() for e in errs]
    avg_overrun = sum(all_errors) / len(all_errors) if all_errors else 0
    total_dollar_error = sum(dollar_errors)

    print(f"Evaluated {evaluated} decisions, skipped {skipped}, flagged {outliers} outliers.")
    print(f"Overall average predicted-vs-actual overrun: {avg_overrun:+.1%}")
    print(f"Total dollar error this batch: ${total_dollar_error:+,.2f}")
    print("\nBreakdown by option:")
    for option, errs in errors_by_option.items():
        opt_avg = sum(errs) / len(errs)
        print(f"  {option:<20} avg overrun {opt_avg:+.1%}  ({len(errs)} decisions)")


if __name__ == "__main__":
    import sys
    evaluate_pending_decisions(dry_run="--dry-run" in sys.argv)