from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import Column, Integer, String, DateTime
from api.db import Base, engine, SessionLocal, ExecutionAttempt

SECRET_KEY = "dev-secret-change-this-before-any-real-deployment"
ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True)
    hashed_password = Column(String)
    failed_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)
    last_login = Column(DateTime, nullable=True)
    role = Column(String, default="operator")

class LoginAttempt(Base):
    __tablename__ = "login_attempts"
    id = Column(Integer, primary_key=True)
    username = Column(String)
    success = Column(Integer)
    timestamp = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(engine)

def verify_password(plain, hashed):
    return pwd_context.verify(plain, hashed)

def hash_password(plain):
    return pwd_context.hash(plain)

def create_token(username: str):
    expire = datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": username, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return username
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

def require_operator(current_user: str = Depends(get_current_user)):
    db = SessionLocal()
    user = db.query(User).filter(User.username == current_user).first()
    if not user or user.role not in ("operator", "admin"):
        db.add(ExecutionAttempt(username=current_user, success=0, reason="insufficient_role"))
        db.commit()
        db.close()
        raise HTTPException(status_code=403, detail="Insufficient permissions to execute decisions")
    db.close()
    return current_user

def require_admin(current_user: str = Depends(get_current_user)):
    db = SessionLocal()
    user = db.query(User).filter(User.username == current_user).first()
    db.close()
    if not user or user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin approval required")
    return current_user