import sys, os, re
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.auth import hash_password, User
from api.db import SessionLocal

def is_strong(pw):
    return len(pw) >= 8 and any(c.isdigit() for c in pw) and any(c.isalpha() for c in pw)

username = input("Username: ")
password = input("Password: ")

if not is_strong(password):
    print("Password must be at least 8 characters and include letters and numbers.")
    sys.exit(1)

db = SessionLocal()
db.add(User(username=username, hashed_password=hash_password(password)))
db.commit()
db.close()
print(f"User '{username}' created.")