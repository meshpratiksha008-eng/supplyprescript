import argparse
import random
import sqlite3
import requests
import pandas as pd

parser = argparse.ArgumentParser()
parser.add_argument("--reset", action="store_true", help="Clear existing decisions before seeding")
parser.add_argument("--count", type=int, default=20)
args = parser.parse_args()

DB_PATH = "supplyprescript.db"
API_URL = "http://localhost:8000/execute-decision"
options = ["A", "B", "C"]
fake_users = ["ops_alice", "ops_ben", "ops_carla"]

# 1. Reset if requested
if args.reset:
    conn = sqlite3.connect(DB_PATH)
    conn.execute("DELETE FROM decisions")
    conn.commit()
    conn.close()
    print("Cleared existing decisions.")

# 2. Pull real shipment rows — no shipment_id column exists, so use row position (1-based) as the ID,
# matching how the rest of the app (e.g. /prescribe/{shipment_id}) already refers to shipments.
shipments = pd.read_csv("data/shipments.csv")
shipments["shipment_id"] = shipments.index + 1
sample = shipments.sample(n=min(args.count, len(shipments)), random_state=42)

# 3. Seed with error handling + progress feedback
success, failed = 0, 0
for _, row in sample.iterrows():
    try:
        resp = requests.post(API_URL, params={
            "shipment_id": int(row["shipment_id"]),
            "chosen_option": random.choice(options),
            "predicted_cost": round(random.uniform(500, 15000), 2),
            "predicted_delay_days": round(float(row["delay_days"]), 1),
            "decided_by": random.choice(fake_users),
        }, timeout=5)
        resp.raise_for_status()
        success += 1
    except requests.exceptions.RequestException as e:
        failed += 1
        print(f"  ⚠️ shipment {int(row['shipment_id'])} failed: {e}")

print(f"Seeded {success} decisions ({failed} failed).")