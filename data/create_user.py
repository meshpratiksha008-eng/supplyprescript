import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.auth import hash_password, User
from api.db import SessionLocal

username = input("Username: ")
password = input("Password: ")

db = SessionLocal()
db.add(User(username=username, hashed_password=hash_password(password)))
db.commit()
db.close()
print(f"User '{username}' created.")