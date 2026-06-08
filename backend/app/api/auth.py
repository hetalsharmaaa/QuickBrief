# backend/app/api/auth.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from jose import jwt
from datetime import datetime, timedelta
import hashlib
import os

from app.services.db_service import get_db

router = APIRouter()

SECRET_KEY = os.getenv("JWT_SECRET", "QuickBrief-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days


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
    db = get_db()

    # Check if email already exists
    existing = db.table("users").select("email").eq("email", req.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = hash_password(req.password)
    result = db.table("users").insert({
        "name": req.name,
        "email": req.email,
        "password_hash": hashed
    }).execute()

    user = result.data[0]
    token = create_token({"sub": req.email, "name": req.name, "user_id": str(user["id"])})
    return {"token": token, "name": req.name, "email": req.email}


@router.post("/auth/login")
def login(req: LoginRequest):
    db = get_db()

    result = db.table("users").select("*").eq("email", req.email).execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user = result.data[0]
    if not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token({"sub": req.email, "name": user["name"], "user_id": str(user["id"])})
    return {"token": token, "name": user["name"], "email": req.email}


@router.get("/auth/me")
def get_me(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return {
            "email": payload.get("sub"),
            "name": payload.get("name"),
            "user_id": payload.get("user_id")
        }
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")