# backend/app/api/flashcards.py

from fastapi import APIRouter
from pydantic import BaseModel
import json
import re

from app.services import vector_service
from app.services.ai_service import get_client, SMART_MODEL
from app.services.cache_service import get as cache_get, set as cache_set

router = APIRouter()


class FlashcardRequest(BaseModel):
    num_cards: int = 10


@router.post("/flashcards")
def generate_flashcards(request: FlashcardRequest):
    chunks = vector_service.stored_chunks

    if not chunks:
        return {"error": "No document uploaded yet"}

    context = "\n\n".join(chunks[:6])

    # ✅ Check cache
    cache_key = {"context": context[:500], "num_cards": request.num_cards}
    cached = cache_get("flashcards", cache_key)
    if cached:
        return cached

    client = get_client()

    prompt = f"""Generate {request.num_cards} flashcards from the text below.

Each flashcard has a front (question/term) and back (answer/definition).

Return ONLY a JSON array. No markdown, no explanation, just raw JSON.

Format:
[{{"front": "What is...?", "back": "It is...", "category": "definition"}}]

Categories to use: definition, concept, formula, date, person, process

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

        cards = json.loads(output)
        result = {"flashcards": cards}
        cache_set("flashcards", cache_key, result)
        return result

    except Exception as e:
        print("FLASHCARD ERROR:", e)
        return {"error": f"Flashcard generation failed: {str(e)}"}