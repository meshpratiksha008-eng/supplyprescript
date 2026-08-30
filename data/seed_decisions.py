import argparse
import random
import sqlite3
import requests
import pandas as pd

parser = argparse.ArgumentParser()
parser.add_argument("--reset", action="store_true", help="Clear existing decisions before seeding")
parser.add_argument("--count", type=int, default=20)
parser.add_argument("--dry-run", action="store_true", help="Preview without hitting the API")
args = parser.parse_args()

DB_PATH = "supplyprescript.db"
API_URL = "http://localhost:8000/execute-decision"
options = ["A", "B", "C"]
option_weights = [0.5, 0.3, 0.2]  # A = cheapest/most common, C = rare/expensive

SCENARIOS = [
    {"label": "high_risk_caught", "cost_range": (12000, 15000), "delay_range": (20, 30)},
    {"label": "routine_low_cost", "cost_range": (500, 2000), "delay_range": (1, 5)},
    {"label": "moderate_judgment_call", "cost_range": (4000, 9000), "delay_range": (8, 15)},
]

# 1. Reset if requested
if args.reset and not args.dry_run:
    conn = sqlite3.connect(DB_PATH)
    conn.execute("DELETE FROM decisions")
    conn.commit()
    conn.close()
    print("Cleared existing decisions.")

# 2. Load real shipment rows; synthesize shipment_id from row position (no such column in CSV)
shipments = pd.read_csv("data/shipments.csv")
shipments["shipment_id"] = shipments.index + 1
sample = shipments.sample(n=min(args.count, len(shipments)), random_state=42)

# 3. Seed
success, failed = 0, 0
chosen_counts = {"A": 0, "B": 0, "C": 0}
costs = []

for _, row in sample.iterrows():
    scenario = random.choice(SCENARIOS)
    predicted_cost = round(random.uniform(*scenario["cost_range"]), 2)
    chosen = random.choices(options, weights=option_weights)[0]

    params = {
        "shipment_id": int(row["shipment_id"]),
        "chosen_option": chosen,
        "predicted_cost": predicted_cost,
        "predicted_delay_days": round(float(row["delay_days"]), 1),
    }

    if args.dry_run:
        print(f"  [dry-run] would seed: {params}  (scenario: {scenario['label']})")
        continue

    try:
        resp = requests.post(API_URL, params=params, timeout=5)
        resp.raise_for_status()
        success += 1
        chosen_counts[chosen] += 1
        costs.append(predicted_cost)
    except requests.exceptions.RequestException as e:
        failed += 1
        print(f"  ⚠️ shipment {params['shipment_id']} failed: {e}")

if args.dry_run:
    print(f"\nDry run complete — {len(sample)} decisions would be seeded. No changes made.")
else:
    # 4. Spread executed_at timestamps across the last 21 days so charts/tables show a real trend
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        UPDATE decisions SET executed_at = datetime('now', '-' || (ABS(RANDOM()) % 21) || ' days')
    """)
    conn.commit()
    conn.close()

    print(f"\nSeeded {success} decisions ({failed} failed)")
    if success:
        print(f"  Option distribution: A={chosen_counts['A']}, B={chosen_counts['B']}, C={chosen_counts['C']}")
        print(f"  Cost range: ${min(costs):,.0f} – ${max(costs):,.0f}")