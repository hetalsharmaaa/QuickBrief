# backend/app/main.py

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.api import upload, chat, quiz, summarize, questions, keywords, auth, flashcards, planner, game


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("⏳ Preloading embedding model...")
    from app.services.vector_service import get_model
    get_model()
    print("✅ Model ready!")
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router)
app.include_router(chat.router)
app.include_router(quiz.router)
app.include_router(summarize.router)
app.include_router(questions.router)
app.include_router(keywords.router)
app.include_router(auth.router)
app.include_router(flashcards.router)
app.include_router(planner.router)
app.include_router(game.router)


@app.get("/")
def home():
    return {"message": "Studybuddy backend running"}


@app.get("/status")
def get_status():
    from app.services import vector_service
    return {
        "ready": vector_service.is_ready,
        "chunks": len(vector_service.stored_chunks)
    }


@app.get("/cache/stats")
def cache_stats():
    from app.services.cache_service import stats
    return stats()


@app.post("/cache/clear")
def cache_clear():
    from app.services.cache_service import clear
    clear()
    return {"message": "Cache cleared"}


@app.post("/upload/reset")
def reset_upload():
    """Clear everything when a new file is uploaded"""
    from app.services import vector_service
    from app.services.cache_service import clear
    vector_service.stored_chunks = []
    vector_service.is_ready = False
    vector_service.index = None
    clear()
    return {"message": "Reset complete"}