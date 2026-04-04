# backend/app/api/keywords.py

from fastapi import APIRouter
import json
import re

from app.services import vector_service
from app.services.ai_service import get_client, SMART_MODEL

router = APIRouter()


@router.get("/keywords")
def get_keywords():
    chunks = vector_service.stored_chunks

    if not chunks:
        return {"error": "No document uploaded yet"}

    client = get_client()
    context = "\n\n".join(chunks[:5])

    prompt = f"""Analyze the text below and extract important keywords and concepts.

Return ONLY a JSON object. No markdown, no explanation, just raw JSON.

Format:
{{
  "keywords": ["word1", "word2", "word3"],
  "definitions": [{{"term": "...", "definition": "..."}}],
  "important_topics": ["topic1", "topic2", "topic3"],
  "formulas": ["formula1", "formula2"]
}}

Rules:
- keywords: 10-15 most important single words or short phrases
- definitions: up to 5 key terms with their definitions from the text
- important_topics: 3-5 main topics covered
- formulas: any mathematical/scientific formulas found (empty array if none)

Text:
{context}"""

    try:
        response = client.chat.completions.create(
            model=SMART_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=1000
        )

        output = response.choices[0].message.content.strip()
        output = re.sub(r"```(?:json)?", "", output).strip()
        output = output.strip("`").strip()

        match = re.search(r'\{.*\}', output, re.DOTALL)
        if match:
            output = match.group()

        data = json.loads(output)
        return data

    except Exception as e:
        print("KEYWORDS ERROR:", e)
        return {"error": f"Keyword extraction failed: {str(e)}"}