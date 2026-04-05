# backend/app/api/game.py

from fastapi import APIRouter
import json
import re

from app.services import vector_service
from app.services.ai_service import get_client, SMART_MODEL
from app.services.cache_service import get as cache_get, set as cache_set

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

    cache_key = {"type": "pdf" if chunks else "general", "context": "".join(chunks[:3])[:300]}
    cached = cache_get("game", cache_key)
    if cached:
        return cached

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

        for q in questions:
            q["options"] = [
                re.sub(r'^[A-D]\.\s*', '', opt).strip()
                for opt in q["options"]
            ]
            ans = q.get("answer", "A")
            if isinstance(ans, str) and ans.upper() in ["A", "B", "C", "D"]:
                q["answer_index"] = ord(ans.upper()) - ord("A")
            else:
                q["answer_index"] = 0

        result = {"questions": questions}
        cache_set("game", cache_key, result)
        return result

    except Exception as e:
        print("GAME ERROR:", e)
        return {"error": f"Failed to load questions: {str(e)}"}