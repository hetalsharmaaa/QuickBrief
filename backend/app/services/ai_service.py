# backend/app/services/ai_service.py

from groq import Groq
import os


def get_client():
    return Groq(api_key=os.getenv("GROQ_API_KEY"))


MODE_PROMPTS = {
    "teacher": "When explaining study content, act as an experienced professor with examples and analogies. For casual conversation, just respond normally like a friendly human.",
    "simple": "When explaining study content, use very simple words like explaining to a 10-year-old. For casual conversation, just respond normally and briefly.",
    "exam": "When explaining study content, give concise bullet-point exam-ready answers. For casual conversation, just respond normally.",
    "revision": "When explaining study content, summarize in 3-5 bullet points only. For casual conversation, just respond normally.",
    "default": "You are a helpful study assistant. For casual conversation respond briefly and naturally. Only give detailed responses when the user asks a real question.",
}

SYSTEM_PROMPT = """You are StudyBuddy, a helpful AI study assistant.

IMPORTANT RULES:
- For greetings like "hi", "hello", "hey", "what's up" — respond with just 1 short friendly sentence. Nothing more.
- For casual small talk — keep it brief and natural, like a friend texting back.
- For questions about the uploaded document — give a helpful, relevant answer.
- For study/concept questions — apply the active mode style.
- NEVER over-explain simple things. NEVER write essays about greetings.
"""


def generate_answer(context_chunks, question, mode="default"):
    client = get_client()

    mode_instruction = MODE_PROMPTS.get(mode, MODE_PROMPTS["default"])

    if not context_chunks or len(context_chunks) == 0:
        user_prompt = f"{mode_instruction}\n\nRespond to: {question}"
    else:
        context = "\n\n".join(context_chunks[:3])
        user_prompt = f"""{mode_instruction}

Use the context below to answer the question. If the question is unrelated to the context, answer from your own knowledge.

CONTEXT:
{context}

QUESTION:
{question}"""

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.5
    )

    return response.choices[0].message.content