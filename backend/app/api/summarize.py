# backend/app/api/summarize.py

from fastapi import APIRouter
from app.services import vector_service
from app.services.ai_service import get_client

router = APIRouter()


@router.post("/summarize")
def summarize():
    # ✅ Access the module directly so we always get the latest stored_chunks
    chunks = vector_service.stored_chunks

    if not chunks:
        return {"error": "No document uploaded yet"}

    client = get_client()

    context = "\n\n".join(chunks[:8])

    prompt = f"""You are a smart study assistant.

Read the following text and give a clear TL;DR summary.

FORMAT your response like this:
📌 **Main Topic:** (one line)

📝 **Key Points:**
- Point 1
- Point 2
- Point 3
- (up to 6 points)

⚡ **Quick Takeaway:** (one sentence)

TEXT:
{context}
"""

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        )
        summary = response.choices[0].message.content
        return {"summary": summary}

    except Exception as e:
        print("SUMMARY ERROR:", e)
        return {"error": "Summary generation failed"}