# backend/app/api/game.py

from fastapi import APIRouter
import json
import re

from app.services import vector_service
from app.services.ai_service import get_client, SMART_MODEL

router = APIRouter()

GENERAL_KNOWLEDGE_PROMPT = """Generate 10 multiple choice quiz questions on interesting general knowledge topics.

Return ONLY a JSON array. No markdown, no explanation, just raw JSON.

Format:
[{"question":"...","options":["A. ...","B. ...","C. ...","D. ..."],"answer":"A"}]

Make questions fun, varied and educational. Topics can include science, history, geography, sports, technology."""


@router.post("/game/questions")
def get_game_questions():
    client = get_client()

    chunks = vector_service.stored_chunks

    if chunks:
        context = "\n\n".join(chunks[:6])
        prompt = f"""Generate 10 multiple choice quiz questions from the text below.

Return ONLY a JSON array. No markdown, no explanation, just raw JSON.

Format:
[{{"question":"...","options":["A. ...","B. ...","C. ...","D. ..."],"answer":"A"}}]

Rules:
- Keep questions short (max 12 words)
- Keep options short (max 6 words each)
- Make them factual and clear

Text:
{context}"""
    else:
        prompt = GENERAL_KNOWLEDGE_PROMPT

    try:
        response = client.chat.completions.create(
            model=SMART_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
            max_tokens=2000
        )

        output = response.choices[0].message.content.strip()
        output = re.sub(r"```(?:json)?", "", output).strip()
        output = output.strip("`").strip()

        match = re.search(r'\[.*\]', output, re.DOTALL)
        if match:
            output = match.group()

        questions = json.loads(output)

        # Clean up — strip "A. " prefix from options if present
        for q in questions:
            q["options"] = [
                re.sub(r'^[A-D]\.\s*', '', opt).strip()
                for opt in q["options"]
            ]
            # Normalize answer to index 0-3
            ans = q.get("answer", "A")
            if isinstance(ans, str) and ans.upper() in ["A","B","C","D"]:
                q["answer_index"] = ord(ans.upper()) - ord("A")
            else:
                q["answer_index"] = 0

        return {"questions": questions}

    except Exception as e:
        print("GAME ERROR:", e)
        return {"error": f"Failed to load questions: {str(e)}"}