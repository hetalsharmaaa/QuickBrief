# backend/app/services/chunk_service.py

def chunk_text(text: str, chunk_size: int = 1500, overlap: int = 200):
    """
    Larger chunks = fewer total chunks = faster FAISS indexing.
    1500 chars ≈ 100-150 words per chunk.
    """
    # Clean up excessive whitespace first
    import re
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r' {2,}', ' ', text)
    text = text.strip()

    chunks = []
    start = 0
    text_length = len(text)

    while start < text_length:
        end = start + chunk_size
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start += chunk_size - overlap

    # Cap at 100 chunks max — beyond this FAISS indexing gets slow
    # and the AI only uses the top 3-5 anyway
    if len(chunks) > 100:
        print(f"⚠️ Trimmed chunks from {len(chunks)} to 100")
        chunks = chunks[:100]

    return chunks