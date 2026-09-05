import sqlite3
conn = sqlite3.connect("supplyprescript.db")
try:
    conn.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'operator'")
    print("Added role column, defaulted existing users to 'operator'")
except sqlite3.OperationalError as e:
    print(f"Skipped: {e}")
conn.commit()
conn.close()