# backend/app/api/sessions.py

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from jose import jwt
import os

from app.services.db_service import get_db

router = APIRouter()

SECRET_KEY = os.getenv("JWT_SECRET", "QuickBrief-secret-key-change-in-production")
ALGORITHM = "HS256"


def get_user_id(authorization: str) -> str:
    try:
        token = authorization.replace("Bearer ", "")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("user_id")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


class SaveSessionRequest(BaseModel):
    session_id: Optional[str] = None   # None = create new, UUID = update existing
    title: str
    messages: list
    document_name: Optional[str] = None


@router.get("/sessions")
def get_sessions(authorization: str = Header(...)):
    user_id = get_user_id(authorization)
    db = get_db()
    result = db.table("chat_sessions") \
        .select("id, title, document_name, created_at, updated_at") \
        .eq("user_id", user_id) \
        .order("updated_at", desc=True) \
        .limit(50) \
        .execute()
    return {"sessions": result.data}


@router.get("/sessions/{session_id}")
def get_session(session_id: str, authorization: str = Header(...)):
    user_id = get_user_id(authorization)
    db = get_db()
    result = db.table("chat_sessions") \
        .select("*") \
        .eq("id", session_id) \
        .eq("user_id", user_id) \
        .execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Session not found")
    return result.data[0]


@router.post("/sessions")
def save_session(req: SaveSessionRequest, authorization: str = Header(...)):
    user_id = get_user_id(authorization)
    db = get_db()

    if req.session_id:
        # Update existing session
        db.table("chat_sessions").update({
            "title": req.title,
            "messages": req.messages,
            "document_name": req.document_name,
            "updated_at": "now()"
        }).eq("id", req.session_id).eq("user_id", user_id).execute()
        return {"session_id": req.session_id}
    else:
        # Create new session
        result = db.table("chat_sessions").insert({
            "user_id": user_id,
            "title": req.title,
            "messages": req.messages,
            "document_name": req.document_name,
        }).execute()
        return {"session_id": result.data[0]["id"]}


@router.delete("/sessions/{session_id}")
def delete_session(session_id: str, authorization: str = Header(...)):
    user_id = get_user_id(authorization)
    db = get_db()
    db.table("chat_sessions").delete() \
        .eq("id", session_id).eq("user_id", user_id).execute()
    return {"deleted": True}