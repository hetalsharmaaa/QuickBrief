# backend/app/api/planner.py

from fastapi import APIRouter
from pydantic import BaseModel
import json
import re

from app.services import vector_service
from app.services.ai_service import get_client

router = APIRouter()


class PlannerRequest(BaseModel):
    days: int = 7
    hours_per_day: float = 2.0
    goal: str = "exam preparation"


@router.post("/planner")
def generate_plan(request: PlannerRequest):
    chunks = vector_service.stored_chunks

    if not chunks:
        return {"error": "No document uploaded yet"}

    client = get_client()

    # Sample from beginning, middle and end for full coverage
    total = len(chunks)
    sampled = chunks[:3] + chunks[total//2:total//2+3] + chunks[-3:]
    context = "\n\n".join(sampled)

    prompt = f"""You are a study planner AI.

Based on the content below, create a {request.days}-day study plan.
Student has {request.hours_per_day} hours per day.
Goal: {request.goal}

Return ONLY a JSON object. No markdown, no explanation, just raw JSON.

Format:
{{
  "title": "Study Plan Title",
  "total_days": {request.days},
  "daily_hours": {request.hours_per_day},
  "goal": "{request.goal}",
  "days": [
    {{
      "day": 1,
      "title": "Day title",
      "topics": ["topic 1", "topic 2"],
      "tasks": ["Read chapter on...", "Make notes on...", "Practice questions on..."],
      "tip": "A useful study tip for this day"
    }}
  ],
  "overall_tips": ["tip1", "tip2", "tip3"]
}}

Rules:
- Distribute topics evenly across days
- Start with fundamentals, build up complexity
- Include review days
- Keep tasks realistic for {request.hours_per_day} hours
- Make tips specific and actionable

Document content:
{context}"""

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
            max_tokens=3000
        )

        output = response.choices[0].message.content.strip()
        print("RAW PLANNER OUTPUT:", output[:200])

        output = re.sub(r"```(?:json)?", "", output).strip()
        output = output.strip("`").strip()

        match = re.search(r'\{.*\}', output, re.DOTALL)
        if match:
            output = match.group()

        plan = json.loads(output)
        return {"plan": plan}

    except Exception as e:
        print("PLANNER ERROR:", e)
        return {"error": f"Plan generation failed: {str(e)}"}