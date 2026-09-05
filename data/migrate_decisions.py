import sqlite3
conn = sqlite3.connect("supplyprescript.db")

columns_to_add = [
    ("decided_by", "TEXT"),
    ("idempotency_key", "TEXT"),
    ("prediction_error_pct", "FLOAT"),
    ("dollar_error", "FLOAT"),
    ("flagged_outlier", "BOOLEAN"),
    ("status", "TEXT DEFAULT 'executed'"),
    ("approved_by", "TEXT"),
    ("approved_at", "TEXT"),
]

for col, coltype in columns_to_add:
    try:
        conn.execute(f"ALTER TABLE decisions ADD COLUMN {col} {coltype}")
        print(f"Added column: {col}")
    except sqlite3.OperationalError as e:
        print(f"Skipped {col}: {e}")

conn.commit()
conn.close()