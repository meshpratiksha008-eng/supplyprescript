import sqlite3

conn = sqlite3.connect("supplyprescript.db")
conn.execute("UPDATE users SET failed_attempts=0, locked_until=NULL WHERE username='admin'")
conn.commit()
conn.close()
print("Unlocked.")