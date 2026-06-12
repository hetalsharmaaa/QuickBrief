"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

const MODES = [
  { id: "default",  label: "Default",  desc: "Helpful tutor",        icon: "○" },
  { id: "teacher",  label: "Teacher",  desc: "In-depth explanation",  icon: "○" },
  { id: "simple",   label: "Simple",   desc: "Like I'm 10",           icon: "○" },
  { id: "exam",     label: "Exam",     desc: "Exam-ready answers",    icon: "○" },
  { id: "revision", label: "Revision", desc: "Quick bullet points",   icon: "○" },
];

const NAV = [
  { href: "/game",      label: "Game" },
  { href: "/planner",   label: "Planner" },
  { href: "/flashcards",label: "Flashcards" },
  { href: "/notes",     label: "Notes" },
  { href: "/keywords",  label: "Keywords" },
  { href: "/questions", label: "Questions" },
  { href: "/quiz",      label: "Quiz" },
];

export default function ChatPage() {
  const router = useRouter();

  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [mode, setMode] = useState("default");
  const [savedMsgIds, setSavedMsgIds] = useState<Set<number>>(new Set());
  const [userName, setUserName] = useState("");
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [listening, setListening] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [currentDocName, setCurrentDocName] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const saveTimerRef = useRef<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("sb_token");
    const name = localStorage.getItem("sb_name");
    if (!token) { router.push("/login"); return; }
    setUserName(name || "User");
    fetchSessions();
    const savedId = sessionStorage.getItem("active_session_id");
    const savedMsgs = sessionStorage.getItem("active_session_messages");
    const savedDoc = sessionStorage.getItem("active_doc_name");
    if (savedId && savedMsgs) {
      try {
        setActiveSessionId(savedId);
        setMessages(JSON.parse(savedMsgs));
        if (savedDoc) setCurrentDocName(savedDoc);
      } catch {}
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) setMicSupported(true);
  }, []);

  useEffect(() => () => { window.speechSynthesis?.cancel(); recognitionRef.current?.stop(); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { if (messages.length > 0) sessionStorage.setItem("active_session_messages", JSON.stringify(messages)); }, [messages]);
  useEffect(() => { if (activeSessionId) sessionStorage.setItem("active_session_id", activeSessionId); }, [activeSessionId]);
  useEffect(() => { if (currentDocName) sessionStorage.setItem("active_doc_name", currentDocName); }, [currentDocName]);

  const fetchSessions = async () => {
    const token = localStorage.getItem("sb_token");
    if (!token) return;
    setSessionsLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/sessions", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch {}
    setSessionsLoading(false);
  };

  const loadSession = async (sessionId: string) => {
    const token = localStorage.getItem("sb_token");
    if (!token) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/sessions/${sessionId}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      const msgs = data.messages || [];
      const doc = data.document_name || null;
      setMessages(msgs);
      setActiveSessionId(sessionId);
      setCurrentDocName(doc);
      sessionStorage.setItem("active_session_id", sessionId);
      sessionStorage.setItem("active_session_messages", JSON.stringify(msgs));
      if (doc) sessionStorage.setItem("active_doc_name", doc);
    } catch {}
  };

  const autoSave = (msgs: any[], docName: string | null, sessionId: string | null) => {
    if (msgs.length === 0) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const token = localStorage.getItem("sb_token");
      if (!token) return;
      const first = msgs.find((m) => m.role === "user");
      const title = first ? first.content.slice(0, 45) + (first.content.length > 45 ? "..." : "") : "New Chat";
      try {
        const res = await fetch("http://127.0.0.1:8000/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ session_id: sessionId, title, messages: msgs, document_name: docName }),
        });
        const data = await res.json();
        if (!sessionId && data.session_id) {
          setActiveSessionId(data.session_id);
          sessionStorage.setItem("active_session_id", data.session_id);
        }
        fetchSessions();
      } catch {}
    }, 1500);
  };

  const startNewChat = () => {
    setMessages([]); setActiveSessionId(null); setCurrentDocName(null); setSavedMsgIds(new Set());
    sessionStorage.removeItem("active_session_id");
    sessionStorage.removeItem("active_session_messages");
    sessionStorage.removeItem("active_doc_name");
  };

  const deleteSession = async (sessionId: string) => {
    const token = localStorage.getItem("sb_token");
    if (!token) return;
    await fetch(`http://127.0.0.1:8000/sessions/${sessionId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (activeSessionId === sessionId) startNewChat();
    fetchSessions();
  };

  const handleLogout = () => {
    window.speechSynthesis?.cancel();
    recognitionRef.current?.stop();
    localStorage.removeItem("sb_token");
    localStorage.removeItem("sb_name");
    sessionStorage.clear();
    router.push("/login");
  };

  const handleSpeak = (text: string, index: number) => {
    if (!window.speechSynthesis) return;
    if (speakingIndex === index) { window.speechSynthesis.cancel(); setSpeakingIndex(null); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95; u.pitch = 1; u.volume = 1;
    u.onstart = () => setSpeakingIndex(index);
    u.onend = () => setSpeakingIndex(null);
    u.onerror = () => setSpeakingIndex(null);
    window.speechSynthesis.speak(u);
  };

  const handleMic = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    const r = new SR();
    recognitionRef.current = r;
    r.lang = "en-US"; r.interimResults = true; r.continuous = false;
    r.onstart = () => setListening(true);
    r.onresult = (e: any) => {
      const t = Array.from(e.results).map((x: any) => x[0].transcript).join("");
      setInput(t);
      if (textareaRef.current) { textareaRef.current.style.height = "auto"; textareaRef.current.style.height = textareaRef.current.scrollHeight + "px"; }
    };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    r.start();
  };

  const handleInput = (e: any) => {
    setInput(e.target.value);
    if (textareaRef.current) { textareaRef.current.style.height = "auto"; textareaRef.current.style.height = textareaRef.current.scrollHeight + "px"; }
  };

  const saveAsNote = async (content: string, index: number) => {
    try {
      await fetch("http://127.0.0.1:8000/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("sb_token") || ""}` },
        body: JSON.stringify({ content, tag: "important", source: "ai" }),
      });
      setSavedMsgIds((prev) => new Set(prev).add(index));
    } catch {}
  };

  const handleSend = async () => {
    if (!input && !file) return;
    if (listening) { recognitionRef.current?.stop(); setListening(false); }

    let newMessages = [...messages];
    if (file) newMessages.push({ role: "user", type: "file", content: file.name });
    if (input) newMessages.push({ role: "user", type: "text", content: input });
    setMessages(newMessages);
    setLoading(true);
    let docName = currentDocName;

    if (file) {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("http://127.0.0.1:8000/upload", {
        method: "POST", body: formData,
        headers: { Authorization: `Bearer ${localStorage.getItem("sb_token") || ""}` },
      });
      const uploadData = await uploadRes.json();
      if (uploadData.error) {
        setMessages((prev) => { const u = [...prev, { role: "assistant", type: "text", content: `Error: ${uploadData.error}` }]; autoSave(u, docName, activeSessionId); return u; });
      } else {
        docName = file.name; setCurrentDocName(file.name); sessionStorage.setItem("active_doc_name", file.name);
        let ready = false;
        for (let i = 0; i < 10; i++) {
          const s = await fetch("http://127.0.0.1:8000/status");
          const sd = await s.json();
          if (sd.ready) { ready = true; break; }
          await new Promise((r) => setTimeout(r, 500));
        }
        setMessages((prev) => {
          const u = [...prev, {
            role: "assistant", type: "text",
            content: ready
              ? `"${file.name}" is ready — ${uploadData.chunks_created} chunks indexed in ${uploadData.processing_time_seconds}s. Ask me anything.`
              : `File uploaded but still processing. Give it a moment then ask your question.`,
          }];
          autoSave(u, docName, activeSessionId); return u;
        });
      }
    }

    if (input) {
      const res = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: input, mode }),
      });
      const data = await res.json();
      setMessages((prev) => {
        const u = [...prev, { role: "assistant", type: "text", content: data.answer || data.error, mode }];
        autoSave(u, docName, activeSessionId); return u;
      });
    }

    setLoading(false); setInput(""); setFile(null);
  };

  const handleSummarize = async () => {
    setSummarizing(true);
    setMessages((prev) => [...prev, { role: "user", type: "text", content: "Summarize the document." }]);
    const res = await fetch("http://127.0.0.1:8000/summarize", { method: "POST" });
    const data = await res.json();
    setMessages((prev) => {
      const u = [...prev, { role: "assistant", type: "text", content: data.summary || data.error }];
      autoSave(u, currentDocName, activeSessionId); return u;
    });
    setSummarizing(false);
  };

  const handleKeyDown = (e: any) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } };
  const activeMode = MODES.find((m) => m.id === mode);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)", color: "var(--text)" }}>

      {/* ── SIDEBAR ── */}
      <div
        className="w-56 flex-shrink-0 hidden md:flex flex-col border-r"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
          </div>
          <span className="font-semibold text-sm" style={{ color: "var(--text)" }}>QuickBrief</span>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-5">

          {/* Actions */}
          <div className="space-y-1.5">
            <button
              onClick={startNewChat}
              className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all"
              style={{ color: "var(--subtle)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--muted)"; (e.currentTarget as HTMLElement).style.color = "var(--text)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--subtle)"; }}
            >
              + New Chat
            </button>
            <button
              onClick={handleSummarize}
              disabled={summarizing}
              className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all disabled:opacity-40"
              style={{ color: "var(--subtle)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--muted)"; (e.currentTarget as HTMLElement).style.color = "var(--text)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--subtle)"; }}
            >
              {summarizing ? "Summarizing..." : "Summarize PDF"}
            </button>
          </div>

          {/* AI Mode */}
          <div>
            <p className="text-xs font-medium px-3 mb-1.5 uppercase tracking-wider" style={{ color: "var(--muted)" }}>Mode</p>
            <div className="space-y-0.5">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all"
                  style={
                    mode === m.id
                      ? { background: "rgba(99,102,241,0.15)", color: "var(--text)", borderLeft: "2px solid var(--accent)" }
                      : { color: "var(--subtle)", borderLeft: "2px solid transparent" }
                  }
                >
                  {m.label}
                  <span className="block text-xs mt-0.5" style={{ color: mode === m.id ? "var(--subtle)" : "var(--muted)" }}>{m.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Chat History */}
          <div>
            <p className="text-xs font-medium px-3 mb-1.5 uppercase tracking-wider" style={{ color: "var(--muted)" }}>History</p>
            {sessionsLoading ? (
              <p className="text-xs px-3 py-1" style={{ color: "var(--muted)" }}>Loading...</p>
            ) : sessions.length === 0 ? (
              <p className="text-xs px-3 py-1" style={{ color: "var(--muted)" }}>No chats yet</p>
            ) : (
              <div className="space-y-0.5">
                {sessions.map((s: any) => (
                  <div
                    key={s.id}
                    className="group flex items-start justify-between px-3 py-2 rounded-lg cursor-pointer transition-all"
                    style={
                      activeSessionId === s.id
                        ? { background: "rgba(99,102,241,0.15)", borderLeft: "2px solid var(--accent)" }
                        : { borderLeft: "2px solid transparent" }
                    }
                    onMouseEnter={(e) => { if (activeSessionId !== s.id) (e.currentTarget as HTMLElement).style.background = "var(--bg)"; }}
                    onMouseLeave={(e) => { if (activeSessionId !== s.id) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    onClick={() => loadSession(s.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: "var(--text)" }}>{s.title}</p>
                      {s.document_name && (
                        <p className="text-xs truncate mt-0.5" style={{ color: "var(--muted)" }}>{s.document_name}</p>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                      className="opacity-0 group-hover:opacity-100 text-xs ml-1 transition-all flex-shrink-0"
                      style={{ color: "var(--muted)" }}
                      onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#f87171")}
                      onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "var(--muted)")}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* User — pinned bottom */}
        <div className="p-3 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
                style={{ background: "var(--muted)", color: "var(--text)" }}
              >
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm truncate max-w-[90px]" style={{ color: "var(--text)" }}>{userName}</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs transition"
              style={{ color: "var(--muted)" }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#f87171")}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "var(--muted)")}
            >
              Out
            </button>
          </div>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Topbar */}
        <div
          className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2">
            {/* mobile logo */}
            <span className="font-semibold text-sm md:hidden" style={{ color: "var(--text)" }}>QuickBrief</span>
            {/* active mode pill */}
            {mode !== "default" && (
              <span
                className="hidden md:inline text-xs px-2 py-0.5 rounded-md"
                style={{ background: "rgba(99,102,241,0.15)", color: "var(--accent)" }}
              >
                {activeMode?.label}
              </span>
            )}
            {currentDocName && (
              <span className="hidden md:inline text-xs truncate max-w-48" style={{ color: "var(--subtle)" }}>
                {currentDocName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{ color: "var(--subtle)", background: "transparent" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--muted)"; (e.currentTarget as HTMLElement).style.color = "var(--text)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--subtle)"; }}
              >
                {n.label}
              </a>
            ))}
          </div>
        </div>

        {/* Listening banner */}
        {listening && (
          <div className="text-xs text-center py-1.5 flex items-center justify-center gap-2 flex-shrink-0"
            style={{ background: "rgba(239,68,68,0.08)", color: "#f87171", borderBottom: "1px solid rgba(239,68,68,0.2)" }}>
            <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse inline-block" />
            Listening — speak now, click mic to stop
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

            {/* Empty state */}
            {messages.length === 0 && (
              <div className="text-center mt-20 space-y-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--subtle)" }}>
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                  </svg>
                </div>
                <p className="text-base font-medium" style={{ color: "var(--text)" }}>Hi {userName}</p>
                <p className="text-sm" style={{ color: "var(--subtle)" }}>
                  Upload a file with <span style={{ color: "var(--text)" }}>+</span>, then ask anything about it.
                </p>
                <div className="grid grid-cols-2 gap-2 mt-8 max-w-sm mx-auto text-left">
                  {[
                    ["Flashcards", "Auto-generated from your doc"],
                    ["Quiz", "Test yourself with MCQs"],
                    ["Study Plan", "AI-built revision schedule"],
                    ["Keywords", "Key terms extracted instantly"],
                  ].map(([title, desc]) => (
                    <div key={title} className="p-3 rounded-xl border text-sm" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                      <p className="font-medium mb-0.5" style={{ color: "var(--text)" }}>{title}</p>
                      <p className="text-xs" style={{ color: "var(--subtle)" }}>{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Message list */}
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5"
                    style={{ background: "var(--accent)", color: "#fff" }}
                  >
                    AI
                  </div>
                )}

                <div className="flex flex-col gap-1 max-w-xl">
                  <div
                    className="rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line"
                    style={
                      msg.role === "user"
                        ? { background: "var(--muted)", color: "var(--text)", borderRadius: "16px 4px 16px 16px" }
                        : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: "4px 16px 16px 16px" }
                    }
                  >
                    {msg.mode && msg.mode !== "default" && (
                      <span className="block text-xs mb-1.5 font-medium" style={{ color: "var(--accent)" }}>
                        {msg.mode}
                      </span>
                    )}
                    {msg.type === "file" ? (
                      <span style={{ color: "var(--subtle)" }}>↑ {msg.content}</span>
                    ) : msg.content}
                  </div>

                  {msg.role === "assistant" && msg.type === "text" && (
                    <div className="flex gap-1 px-1">
                      <button
                        onClick={() => handleSpeak(msg.content, i)}
                        className="text-xs px-2 py-1 rounded-md transition-all"
                        style={{ color: speakingIndex === i ? "var(--accent)" : "var(--muted)" }}
                        onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "var(--subtle)")}
                        onMouseLeave={(e) => ((e.target as HTMLElement).style.color = speakingIndex === i ? "var(--accent)" : "var(--muted)")}
                      >
                        {speakingIndex === i ? "■ Stop" : "▶ Listen"}
                      </button>
                      <button
                        onClick={() => saveAsNote(msg.content, i)}
                        className="text-xs px-2 py-1 rounded-md transition-all"
                        style={{ color: savedMsgIds.has(i) ? "var(--accent)" : "var(--muted)" }}
                      >
                        {savedMsgIds.has(i) ? "Saved" : "Save note"}
                      </button>
                    </div>
                  )}
                </div>

                {msg.role === "user" && (
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5"
                    style={{ background: "var(--muted)", color: "var(--text)" }}
                  >
                    {userName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {(loading || summarizing) && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold flex-shrink-0" style={{ background: "var(--accent)", color: "#fff" }}>AI</div>
                <div className="px-4 py-3 rounded-2xl flex items-center gap-1.5" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "4px 16px 16px 16px" }}>
                  {[0, 150, 300].map((d) => (
                    <span key={d} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--muted)", animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>

        {/* ── INPUT BAR ── */}
        <div className="flex-shrink-0 p-4 border-t" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="max-w-2xl mx-auto">
            {file && (
              <div
                className="mb-2 text-xs flex justify-between items-center px-3 py-1.5 rounded-lg"
                style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--subtle)" }}
              >
                <span>↑ {file.name}</span>
                <button onClick={() => setFile(null)} style={{ color: "var(--muted)" }} onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#f87171")} onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "var(--muted)")}>✕</button>
              </div>
            )}

            <div
              className="flex items-end gap-2 rounded-xl px-4 py-3 transition-all"
              style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
            >
              <input type="file" accept=".pdf,.docx,.txt,.md" ref={fileInputRef} onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-lg font-light pb-0.5 transition flex-shrink-0"
                style={{ color: "var(--muted)" }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "var(--text)")}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "var(--muted)")}
              >
                +
              </button>

              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder={listening ? "Listening..." : `Message (${activeMode?.label} mode)`}
                className="flex-1 bg-transparent resize-none outline-none text-sm max-h-40"
                style={{ color: "var(--text)" }}
                rows={1}
              />

              {micSupported && (
                <button
                  onClick={handleMic}
                  className="pb-0.5 text-sm transition flex-shrink-0"
                  style={{ color: listening ? "#f87171" : "var(--muted)" }}
                >
                  {listening ? "◉" : "⏺"}
                </button>
              )}

              <button
                onClick={handleSend}
                disabled={loading}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-40 flex-shrink-0"
                style={{ background: "var(--accent)", color: "#fff" }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.background = "var(--accent-hover)")}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.background = "var(--accent)")}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}