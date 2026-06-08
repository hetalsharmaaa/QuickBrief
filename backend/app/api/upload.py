# backend/app/api/upload.py

from fastapi import APIRouter, UploadFile, File
import os
import time

from app.services.pdf_service import extract_text
from app.services.chunk_service import chunk_text
from app.services.vector_service import store_in_faiss
from app.services.cache_service import clear as clear_cache
from app.services.db_service import get_db

router = APIRouter()

UPLOAD_DIR = "uploads"

if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md"}


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    start_time = time.time()

    filename = file.filename or "upload"
    ext = os.path.splitext(filename)[1].lower()

    if ext not in ALLOWED_EXTENSIONS:
        return {"error": f"Unsupported file type '{ext}'. Supported: PDF, DOCX, TXT, MD"}

    file_path = os.path.join(UPLOAD_DIR, filename)

    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    try:
        extracted_text = extract_text(file_path)
    except Exception as e:
        return {"error": f"Could not extract text: {str(e)}"}

    if not extracted_text.strip():
        return {"error": "No text could be extracted from this file."}

    chunks = chunk_text(extracted_text)

    clear_cache()
    store_in_faiss(chunks)

    # ✅ Save to Supabase — indented inside the function
    try:
        db = get_db()
        db.table("documents").insert({
            "filename": filename,
            "file_type": ext,
            "chunk_count": len(chunks)
        }).execute()
    except Exception as e:
        print(f"⚠️ Could not save document to DB: {e}")

    end_time = time.time()

    return {
        "success": True,
        "filename": filename,
        "chunks_created": len(chunks),
        "processing_time_seconds": round(end_time - start_time, 2),
    }


@router.get("/status")
def get_status():
    from app.services import vector_service
    return {
        "ready": vector_service.is_ready,
        "chunks": len(vector_service.stored_chunks)
    }