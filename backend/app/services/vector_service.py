# backend/app/services/vector_service.py

from sentence_transformers import SentenceTransformer
import faiss
import numpy as np

model = None
index = None
stored_chunks = []
is_ready = False  # ✅ track if document is loaded


def get_model():
    global model
    if model is None:
        print("Loading embedding model...")
        model = SentenceTransformer("all-MiniLM-L6-v2")  # faster + better
        print("Model loaded ✅")
    return model


def store_in_faiss(chunks):
    global index, stored_chunks, is_ready

    is_ready = False
    model = get_model()

    embeddings = model.encode(chunks, show_progress_bar=False)

    dim = len(embeddings[0])
    index = faiss.IndexFlatL2(dim)
    index.add(np.array(embeddings))

    stored_chunks = chunks
    is_ready = True
    print(f"✅ Stored {len(chunks)} chunks in FAISS")


def search(query, k=3):
    global index, stored_chunks

    if index is None or not stored_chunks:
        return []

    model = get_model()
    query_embedding = model.encode([query])
    distances, indices = index.search(np.array(query_embedding), k)
    results = [stored_chunks[i] for i in indices[0] if i < len(stored_chunks)]
    return results