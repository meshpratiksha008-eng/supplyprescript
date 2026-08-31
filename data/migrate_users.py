import sqlite3

conn = sqlite3.connect("supplyprescript.db")
for col, coltype in [("failed_attempts", "INTEGER DEFAULT 0"),
                      ("locked_until", "TEXT"),
                      ("last_login", "TEXT")]:
    try:
        conn.execute(f"ALTER TABLE users ADD COLUMN {col} {coltype}")
        print(f"Added column: {col}")
    except sqlite3.OperationalError as e:
        print(f"Skipped {col}: {e}")
conn.commit()
conn.close()