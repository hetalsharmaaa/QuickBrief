# backend/app/api/questions.py

from fastapi import APIRouter
from pydantic import BaseModel
import json
import re

from app.services import vector_service
from app.services.ai_service import get_client, SMART_MODEL

router = APIRouter()


class QuestionRequest(BaseModel):
    num_questions: int = 5
    question_type: str = "mcq"


@router.post("/questions")
def generate_questions(request: QuestionRequest):
    chunks = vector_service.stored_chunks

    if not chunks:
        return {"error": "No document uploaded yet"}

    client = get_client()
    context = "\n\n".join(chunks[:5])

    if request.question_type == "mcq":
        prompt = f"""Generate {request.num_questions} MCQ questions from the text below.

Return ONLY a JSON array. No explanation, no markdown, no code blocks. Just raw JSON.

Format:
[{{"question":"...","options":["A. ...","B. ...","C. ...","D. ..."],"answer":"A","explanation":"..."}}]

Text:
{context}"""
    else:
        prompt = f"""Generate {request.num_questions} short answer questions from the text below.

Return ONLY a JSON array. No explanation, no markdown, no code blocks. Just raw JSON.

Format:
[{{"question":"...","answer":"..."}}]

Text:
{context}"""

    try:
        response = client.chat.completions.create(
            model=SMART_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=2000
        )

        output = response.choices[0].message.content.strip()
        output = re.sub(r"```(?:json)?", "", output).strip()
        output = output.strip("`").strip()

        match = re.search(r'\[.*\]', output, re.DOTALL)
        if match:
            output = match.group()

        questions = json.loads(output)
        return {"questions": questions, "type": request.question_type}

    except Exception as e:
        print("QUESTION GEN ERROR:", e)
        return {"error": f"Question generation failed: {str(e)}"}