# backend/app/api/chat.py

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from app.services.vector_service import search
from app.services.ai_service import generate_answer

router = APIRouter()


class ChatRequest(BaseModel):
    question: str
    mode: Optional[str] = "default"


@router.post("/chat")
def chat(request: ChatRequest):
    question = request.question
    mode = request.mode

    chunks = search(question)

    answer = generate_answer(chunks, question, mode)

    return {"answer": answer}