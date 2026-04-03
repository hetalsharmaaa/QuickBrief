# backend/app/api/auth.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from jose import jwt
from datetime import datetime, timedelta
import hashlib
import os

router = APIRouter()

SECRET_KEY = os.getenv("JWT_SECRET", "studybuddy-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# In-memory user store (Phase 4 will replace with real DB)
fake_users_db: dict = {}


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(plain: str, hashed: str) -> bool:
    return hashlib.sha256(plain.encode()).hexdigest() == hashed


def create_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


@router.post("/auth/register")
def register(req: RegisterRequest):
    if req.email in fake_users_db:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = hash_password(req.password)
    fake_users_db[req.email] = {"name": req.name, "email": req.email, "password": hashed}

    token = create_token({"sub": req.email, "name": req.name})
    return {"token": token, "name": req.name, "email": req.email}


@router.post("/auth/login")
def login(req: LoginRequest):
    user = fake_users_db.get(req.email)
    if not user or not verify_password(req.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token({"sub": req.email, "name": user["name"]})
    return {"token": token, "name": user["name"], "email": req.email}


@router.get("/auth/me")
def get_me(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        name = payload.get("name")
        return {"email": email, "name": name}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
##```

##This drops `passlib` entirely and uses Python's built-in `hashlib` (SHA-256) — no compatibility issues, no extra packages needed. It's perfectly fine for this stage; Phase 4 can upgrade to proper bcrypt when you add a real database.

### Fix 2 — also remove `passlib` from `requirements.txt`

##Delete this line:
##```
##passlib[bcrypt]==1.7.4