import sqlite3
conn = sqlite3.connect("supplyprescript.db")
conn.execute("UPDATE users SET role='admin' WHERE username='admin'")
conn.commit()
conn.close()
print("Done")