# 📚 QuickBrief

**QuickBrief** is an AI-powered study assistant that transforms your documents into an interactive learning experience. Upload your study material and instantly chat with it, generate flashcards, take quizzes, extract insights, and more.

> 🚧 **Work in Progress**
> Core features are functional. Supabase integration and session persistence are actively being improved. See [What's Not Done Yet](#-whats-not-done-yet).

---

## 🚀 Features

* 📄 Upload documents (PDF, DOCX, TXT, Markdown)
* 💬 Chat with your document using multiple AI modes:

  * Teacher
  * Exam
  * Simple
  * Revision
* 🧠 Generate:

  * Flashcards
  * Quizzes
  * Practice questions
  * Keywords
* 📅 Create personalized AI study plans
* 🎮 Play a balloon word game based on document content
* 📝 Save important responses as notes
* 🔊 Text-to-speech (listen to answers)
* 🎤 Speech-to-text (ask questions via voice)
* 💾 Persistent chat history per user

---

## 🛠 Tech Stack

| Layer         | Technology                                 |
| ------------- | ------------------------------------------ |
| Frontend      | Next.js 14, Tailwind CSS, TypeScript       |
| Backend       | FastAPI (Python)                           |
| AI / LLM      | Groq API                                   |
| Embeddings    | sentence-transformers (`all-MiniLM-L6-v2`) |
| Vector Search | FAISS (in-memory)                          |
| Database      | Supabase (PostgreSQL)                      |
| Auth          | JWT (`python-jose`)                        |
| File Parsing  | pdfplumber, python-docx                    |

---

## 📁 Project Structure

```
QuickBrief/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── services/
│   │   └── main.py
│   ├── requirements.txt
│   └── .env
│
└── frontend/
    ├── app/
    └── .env.local
```

---

## ⚙️ Setup Guide

### Prerequisites

* Python 3.10+
* Node.js 18+
* Supabase account (free tier works)
* Groq API key

---

### 1️⃣ Supabase Setup

Run the following SQL in your Supabase SQL Editor:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_type TEXT,
  chunk_count INT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'New Chat',
  messages JSONB DEFAULT '[]',
  document_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id, updated_at DESC);
CREATE INDEX idx_documents_user ON documents(user_id);
```

> ⚠️ Row Level Security (RLS) is disabled intentionally. Access control is handled by the backend using the service role key.

---

### 2️⃣ Backend Setup

```bash
cd backend

python -m venv venv

# Activate environment
# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
```

Create `.env` file:

```env
SUPABASE_URL=your-url
SUPABASE_SERVICE_KEY=your-service-key
JWT_SECRET=your-secret
GROQ_API_KEY=your-api-key
```

Run backend:

```bash
uvicorn app.main:app --reload
```

---

### 3️⃣ Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

## 🧑‍💻 Usage

1. Open `http://localhost:3000`
2. Register/Login
3. Upload a document
4. Start chatting with it
5. Switch AI modes from sidebar
6. Explore features like Flashcards, Quiz, Keywords
7. Access previous chats via Chat History
8. Start fresh with **+ New Chat**

---

## 🔌 API Endpoints

| Method | Endpoint         | Description         |
| ------ | ---------------- | ------------------- |
| POST   | `/auth/register` | Register user       |
| POST   | `/auth/login`    | Login               |
| POST   | `/upload`        | Upload document     |
| GET    | `/status`        | Check indexing      |
| POST   | `/chat`          | Chat with document  |
| POST   | `/summarize`     | Summarize           |
| POST   | `/flashcards`    | Generate flashcards |
| POST   | `/quiz`          | Generate quiz       |
| POST   | `/questions`     | Practice questions  |
| POST   | `/keywords`      | Extract keywords    |
| POST   | `/planner`       | Study plan          |
| GET    | `/sessions`      | Get sessions        |
| GET    | `/sessions/{id}` | Load session        |
| POST   | `/sessions`      | Save/update session |
| DELETE | `/sessions/{id}` | Delete session      |

---

## ⚠️ What's Not Done Yet

* Single document only (no multi-doc support)
* Document not restored when loading past sessions
* No dashboard/profile page
* Notes feature incomplete
* No mobile sidebar UI
* No deployment setup (Docker/Vercel)
* No email verification
* No password reset
* No rate limiting

---

## 🧪 Known Behaviors

* Embedding model loads on startup (initial delay expected)
* FAISS is in-memory → resets on restart
* Chat auto-saves after ~1.5 seconds
* Session state stored in browser `sessionStorage`

---

## 📌 Future Improvements

* Multi-document support
* Persistent vector storage
* Full notes management system
* Mobile responsiveness
* Production deployment setup
* User analytics/dashboard

---

## 🤝 Contributing

Contributions, ideas, and feedback are welcome. Feel free to fork the repo and submit a PR.

---

## 📄 License

This project is currently not licensed. Add a license before public distribution.
