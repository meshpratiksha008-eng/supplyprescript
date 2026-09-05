import sqlite3
conn = sqlite3.connect("supplyprescript.db")
try:
    conn.execute("ALTER TABLE decisions ADD COLUMN idempotency_key TEXT")
    print("Added idempotency_key")
except sqlite3.OperationalError as e:
    print(f"Skipped: {e}")
conn.commit()
conn.close()