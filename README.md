# 📚 QuickBrief

An AI-powered study assistant that lets you upload documents and instantly chat with them, generate flashcards, take quizzes, get study plans, extract keywords, and more.

>  **Work in Progress** — Core features are functional. Supabase integration and session persistence are actively being added. See [What's Not Done Yet](#-whats-not-done-yet) below.

---

## What It Does

- Upload a PDF, DOCX, TXT, or Markdown file
- Chat with your document using different AI modes (Teacher, Exam, Simple, Revision)
- Generate flashcards, quizzes, keyword lists, and practice questions from the document
- Get an AI-generated study plan
- Play a balloon word game using content from your document
- Save important AI responses as notes
- Listen to AI answers with text-to-speech
- Ask questions by voice with speech-to-text
- Chat history saved per user — pick up where you left off

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, Tailwind CSS, TypeScript |
| Backend | FastAPI (Python) |
| AI / LLM | Groq API |
| Embeddings | `sentence-transformers/all-MiniLM-L6-v2` (local) |
| Vector Search | FAISS (in-memory) |
| Database | Supabase (PostgreSQL) |
| Auth | JWT (python-jose) |
| File Parsing | pdfplumber, python-docx |

---

## Project Structure

```
QuickBrief/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py          # Register / Login / JWT
│   │   │   ├── chat.py          # Main chat with document
│   │   │   ├── upload.py        # File upload + FAISS indexing
│   │   │   ├── summarize.py     # Document summarization
│   │   │   ├── flashcards.py    # Flashcard generation
│   │   │   ├── quiz.py          # Quiz generation
│   │   │   ├── questions.py     # Practice question generation
│   │   │   ├── keywords.py      # Keyword extraction
│   │   │   ├── planner.py       # Study plan generation
│   │   │   ├── game.py          # Balloon word game
│   │   │   └── sessions.py      # Chat history (save / load / delete)
│   │   ├── services/
│   │   │   ├── ai_service.py    # Groq API calls
│   │   │   ├── vector_service.py # FAISS index + embeddings
│   │   │   ├── pdf_service.py   # Text extraction
│   │   │   ├── chunk_service.py # Text chunking
│   │   │   ├── cache_service.py # In-memory response cache
│   │   │   └── db_service.py    # Supabase client
│   │   └── main.py
│   ├── requirements.txt
│   └── .env                     # ← you create this (see setup)
│
└── frontend/
    ├── app/
    │   ├── page.tsx             # Main chat page
    │   ├── login/               # Login page
    │   ├── flashcards/
    │   ├── quiz/
    │   ├── questions/
    │   ├── keywords/
    │   ├── planner/
    │   ├── notes/
    │   └── game/
    └── .env.local               # ← optional frontend env
```

---

## Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier works)
- A [Groq](https://console.groq.com) API key (free)

---

### 1. Supabase — Create Tables

Go to your Supabase project → SQL Editor and run:

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Uploaded documents (optional metadata)
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_type TEXT,
  chunk_count INT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat sessions (history)
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Chat',
  messages JSONB NOT NULL DEFAULT '[]',
  document_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id, updated_at DESC);
CREATE INDEX idx_documents_user ON documents(user_id);
```

> RLS is **disabled** by design — the FastAPI backend uses the service role key and handles all access control itself.

---

### 2. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv

# Windows
venv\Scripts\activate
# Mac / Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

Create `backend/.env`:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
JWT_SECRET=any-long-random-string
GROQ_API_KEY=your-groq-api-key
```

Start the backend:

```bash
uvicorn app.main:app --reload
```

---

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```


---

## How to Use

1. Open `http://localhost:3000` → Register an account
2. Click **+** in the chat input to upload a file (PDF, DOCX, TXT, MD)
3. Wait for the upload confirmation, then start asking questions
4. Switch AI modes in the sidebar (Teacher, Exam, Simple, Revision)
5. Use the top nav buttons to open Flashcards, Quiz, Keywords etc. — they all use the current document
6. Click **back** in any feature page to return to your chat exactly where you left it
7. Past chats appear in the **Chat History** section of the sidebar — click any to reload it
8. Click **+ New Chat** to start fresh

---

## API Endpoints

| Method | Route | Description |
|---|---|---|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Login, returns JWT |
| POST | `/upload` | Upload document file |
| GET | `/status` | Check if document is indexed |
| POST | `/chat` | Chat with document |
| POST | `/summarize` | Summarize document |
| POST | `/flashcards` | Generate flashcards |
| POST | `/quiz` | Generate quiz questions |
| POST | `/questions` | Generate practice questions |
| POST | `/keywords` | Extract keywords |
| POST | `/planner` | Generate study plan |
| GET | `/sessions` | Get all chat sessions for user |
| GET | `/sessions/{id}` | Load a specific session |
| POST | `/sessions` | Save / update a session |
| DELETE | `/sessions/{id}` | Delete a session |

---

## ⚠️ What's Not Done Yet

- **Only one document at a time** — uploading a new file replaces the previous one in memory. Multi-document support is not yet built.
- **Document not re-loaded from history** — when you click a past chat, the messages restore correctly but the document is not re-indexed. You need to re-upload the file to use AI features (flashcards, quiz etc.) on it again.
- **No user dashboard** — there's no profile page, usage stats, or settings screen yet.
- **Notes feature** — the save-as-note button calls `/notes` but a full notes management page may still need work.
- **Mobile sidebar** — the sidebar is hidden on mobile (`md:hidden`). A mobile drawer/hamburger menu is not yet implemented.
- **No deployment config** — no Dockerfile, no Vercel config, no production environment setup. Currently local-only.
- **No email verification** — users can register with any email, no verification step.
- **Password reset** — not implemented.
- **Rate limiting** — no rate limiting on API endpoints yet.

---

## Known Behaviours

- The embedding model (`all-MiniLM-L6-v2`) loads on backend startup — first boot takes a few seconds, the warning about `embeddings.position_ids` is harmless and can be ignored.
- The vector store (FAISS) is in-memory — it resets if the backend restarts. Re-upload your document after restarting the server.
- Chat auto-saves to Supabase 1.5 seconds after each message.
- Session state persists across page navigation within the same browser tab using `sessionStorage`.
