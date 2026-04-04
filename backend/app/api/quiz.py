# backend/app/api/quiz.py

from fastapi import APIRouter
from pydantic import BaseModel
import json
import re

from app.services import vector_service
from app.services.ai_service import get_client, SMART_MODEL

router = APIRouter()


class QuizRequest(BaseModel):
    num_questions: int = 5


@router.post("/quiz")
def generate_quiz(request: QuizRequest):
    chunks = vector_service.stored_chunks

    if not chunks:
        return {"error": "No document uploaded"}

    client = get_client()
    context = "\n\n".join(chunks[:5])

    prompt = f"""Generate {request.num_questions} MCQ questions from the text below.

Return ONLY a JSON array. No explanation, no markdown, no code blocks. Just the raw JSON.

Format:
[{{"question":"...","options":["A. ...","B. ...","C. ...","D. ..."],"answer":"A","explanation":"..."}}]

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

        quiz = json.loads(output)
        return {"quiz": quiz}

    except Exception as e:
        print("QUIZ ERROR:", e)
        return {"error": f"Quiz generation failed: {str(e)}"}