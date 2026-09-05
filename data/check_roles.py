import sqlite3
conn = sqlite3.connect("supplyprescript.db")
rows = conn.execute("SELECT username, role FROM users").fetchall()
for row in rows:
    print(row)
conn.close()