"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

const MODES = [
  { id: "default", label: "💬 Default", desc: "Helpful tutor", color: "#8B5CF6" },
  { id: "teacher", label: "👨‍🏫 Teacher", desc: "In-depth explanation", color: "#3B82F6" },
  { id: "simple", label: "🧒 Simple", desc: "Like I'm 10", color: "#F59E0B" },
  { id: "exam", label: "🧠 Exam", desc: "Exam-ready answers", color: "#EF4444" },
  { id: "revision", label: "⚡ Revision", desc: "Quick bullet points", color: "#10B981" },
];

type Note = {
  id: string;
  content: string;
  source: "manual" | "ai";
  timestamp: string;
  tag: string;
};

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [mode, setMode] = useState("default");
  const [showModes, setShowModes] = useState(false);
  const [savedMsgIds, setSavedMsgIds] = useState<Set<number>>(new Set());
  const [userName, setUserName] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [listening, setListening] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("sb_token");
    const name = localStorage.getItem("sb_name");
    if (!token) {
      router.push("/login");
    } else {
      setUserName(name || "User");
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) setMicSupported(true);
  }, []);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      recognitionRef.current?.stop();
    };
  }, []);

  const handleLogout = () => {
    window.speechSynthesis?.cancel();
    recognitionRef.current?.stop();
    localStorage.removeItem("sb_token");
    localStorage.removeItem("sb_name");
    router.push("/login");
  };

  const handleSpeak = (text: string, index: number) => {
    if (!window.speechSynthesis) return;
    if (speakingIndex === index) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;
    const detectLang = (t: string): string => {
      if (/[\u0900-\u097F]/.test(t)) return "hi-IN";
      if (/[\u0600-\u06FF]/.test(t)) return "ar-SA";
      if (/[\u4E00-\u9FFF]/.test(t)) return "zh-CN";
      if (/[\u3040-\u309F\u30A0-\u30FF]/.test(t)) return "ja-JP";
      if (/[\uAC00-\uD7AF]/.test(t)) return "ko-KR";
      if (/[\u0400-\u04FF]/.test(t)) return "ru-RU";
      return "en-US";
    };
    const detectedLang = detectLang(text);
    utterance.lang = detectedLang;
    const voices = window.speechSynthesis.getVoices();
    const matchingVoice =
      voices.find((v) => v.lang === detectedLang) ||
      voices.find((v) => v.lang.startsWith(detectedLang.split("-")[0])) ||
      voices.find((v) => v.lang.startsWith("en")) ||
      voices[0];
    if (matchingVoice) utterance.voice = matchingVoice;
    utterance.onstart = () => setSpeakingIndex(index);
    utterance.onend = () => setSpeakingIndex(null);
    utterance.onerror = () => setSpeakingIndex(null);
    window.speechSynthesis.speak(utterance);
  };

  const handleMic = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setListening(true);
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results).map((result: any) => result[0].transcript).join("");
      setInput(transcript);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
      }
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
  };

  const handleInput = (e: any) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const saveAsNote = async (content: string, index: number) => {
    try {
      await fetch("http://127.0.0.1:8000/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("sb_token") || ""}`,
        },
        body: JSON.stringify({ content, tag: "important", source: "ai" }),
      });
      setSavedMsgIds((prev) => new Set(prev).add(index));
    } catch (e) {
      console.error("Could not save note", e);
    }
  };

  const handleSend = async () => {
    if (!input && !file) return;
    if (listening) { recognitionRef.current?.stop(); setListening(false); }

    let newMessages = [...messages];
    if (file) newMessages.push({ role: "user", type: "file", content: file.name });
    if (input) newMessages.push({ role: "user", type: "text", content: input });

    setMessages(newMessages);
    setLoading(true);

    if (file) {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("http://127.0.0.1:8000/upload", {
        method: "POST",
        body: formData,
        headers: { Authorization: `Bearer ${localStorage.getItem("sb_token") || ""}` },
      });
      const uploadData = await uploadRes.json();
      if (uploadData.error) {
        setMessages((prev) => [...prev, { role: "assistant", type: "text", content: `❌ ${uploadData.error}` }]);
      } else {
        let ready = false;
        for (let i = 0; i < 10; i++) {
          const statusRes = await fetch("http://127.0.0.1:8000/status");
          const statusData = await statusRes.json();
          if (statusData.ready) { ready = true; break; }
          await new Promise((r) => setTimeout(r, 500));
        }
        setMessages((prev) => [...prev, {
          role: "assistant", type: "text",
          content: ready
            ? `✅ "${file.name}" uploaded and ready! (${uploadData.chunks_created} chunks in ${uploadData.processing_time_seconds}s)\n\nAsk me anything or click ⚡ Summarize PDF.`
            : `⚠️ File uploaded but still processing. Wait a moment then ask your question.`,
        }]);
      }
    }

    if (input) {
      const res = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: input, mode }),
      });
      const data = await res.json();
      const activeMode = MODES.find((m) => m.id === mode);
      setMessages((prev) => [...prev, {
        role: "assistant", type: "text",
        content: data.answer || data.error,
        mode: activeMode?.label,
        modeColor: activeMode?.color,
      }]);
    }

    setLoading(false);
    setInput("");
    setFile(null);
  };

  const handleSummarize = async () => {
    setSummarizing(true);
    setMessages((prev) => [...prev, { role: "user", type: "text", content: "Give me a summary of the document." }]);
    const res = await fetch("http://127.0.0.1:8000/summarize", { method: "POST" });
    const data = await res.json();
    setMessages((prev) => [...prev, { role: "assistant", type: "text", content: data.summary || data.error }]);
    setSummarizing(false);
  };

  const handleKeyDown = (e: any) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const activeMode = MODES.find((m) => m.id === mode);

  return (
    <div className="flex h-screen text-white overflow-hidden" style={{ background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)" }}>

      {/* ── SIDEBAR ── */}
      <div className="w-64 flex-shrink-0 hidden md:flex flex-col justify-between p-4 border-r border-white/10"
        style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)" }}>
        <div className="space-y-3">

          {/* Logo */}
          <div className="flex items-center gap-2 px-2 py-3 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
              style={{ background: "linear-gradient(135deg, #8B5CF6, #3B82F6)" }}>
              📚
            </div>
            <span className="font-bold text-lg bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, #a78bfa, #60a5fa)" }}>
              QuickBrief
            </span>
          </div>

          {/* Action buttons */}
          <button onClick={() => setMessages([])}
            className="w-full px-4 py-2.5 rounded-xl text-sm font-medium text-gray-300 border border-white/10 hover:border-white/30 hover:bg-white/5 transition-all">
            + New Chat
          </button>

          <button onClick={handleSummarize} disabled={summarizing}
            className="w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #F59E0B, #EF4444)", boxShadow: summarizing ? "none" : "0 0 20px rgba(245,158,11,0.3)" }}>
            {summarizing ? "⏳ Summarizing..." : "⚡ Summarize PDF"}
          </button>

          {/* AI Mode */}
          <div className="pt-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest px-2 mb-2">AI Mode</p>
            <div className="space-y-1">
              {MODES.map((m) => (
                <button key={m.id} onClick={() => setMode(m.id)}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all"
                  style={mode === m.id ? {
                    background: `linear-gradient(135deg, ${m.color}33, ${m.color}11)`,
                    borderLeft: `3px solid ${m.color}`,
                    color: "#fff",
                  } : { color: "#9ca3af" }}>
                  <span className="font-medium">{m.label}</span>
                  <span className="block text-xs mt-0.5" style={{ color: mode === m.id ? m.color : "#6b7280" }}>{m.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tools */}
          <div className="pt-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest px-2 mb-2">Tools</p>
            <div className="space-y-0.5">
              {[
                { href: "/game", icon: "🎈", label: "Balloon Game" },
                { href: "/quiz", icon: "🧠", label: "Quiz" },
                { href: "/questions", icon: "❓", label: "Questions" },
                { href: "/keywords", icon: "🔑", label: "Keywords" },
                { href: "/flashcards", icon: "🃏", label: "Flashcards" },
                { href: "/planner", icon: "🗓️", label: "Study Planner" },
                { href: "/notes", icon: "📝", label: "My Notes" },
              ].map((tool) => (
                <a key={tool.href} href={tool.href}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all">
                  <span>{tool.icon}</span>
                  <span>{tool.label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* User */}
        <div className="border-t border-white/10 pt-3">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: "linear-gradient(135deg, #8B5CF6, #3B82F6)" }}>
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-gray-300 truncate max-w-[100px]">{userName}</span>
            </div>
            <button onClick={handleLogout} className="text-xs text-gray-600 hover:text-red-400 transition px-2 py-1 rounded-lg hover:bg-red-400/10">
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.02)", backdropFilter: "blur(20px)" }}>

          <div className="flex items-center gap-2 md:hidden">
            <span className="font-bold bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, #a78bfa, #60a5fa)" }}>
              📚 QuickBrief
            </span>
          </div>

          <div className="hidden md:block" />

          <div className="flex gap-2 items-center flex-wrap justify-end">
            {/* Mobile mode toggle */}
            <div className="relative md:hidden">
              <button onClick={() => setShowModes(!showModes)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium border border-white/20 hover:border-white/40 transition"
                style={{ background: `${activeMode?.color}22`, color: activeMode?.color }}>
                {activeMode?.label}
              </button>
              {showModes && (
                <div className="absolute right-0 top-10 rounded-2xl p-2 z-50 w-48 shadow-2xl border border-white/10"
                  style={{ background: "rgba(15,12,41,0.95)", backdropFilter: "blur(20px)" }}>
                  {MODES.map((m) => (
                    <button key={m.id} onClick={() => { setMode(m.id); setShowModes(false); }}
                      className="w-full text-left px-3 py-2 rounded-xl text-sm transition"
                      style={mode === m.id ? { background: `${m.color}22`, color: m.color } : { color: "#9ca3af" }}>
                      {m.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {[
              { href: "/game", label: "🎈 Game", bg: "linear-gradient(135deg, #EC4899, #8B5CF6)" },
              { href: "/planner", label: "🗓️ Planner", bg: "linear-gradient(135deg, #10B981, #3B82F6)" },
              { href: "/flashcards", label: "🃏 Flashcards", bg: "linear-gradient(135deg, #F59E0B, #EF4444)" },
              { href: "/notes", label: "📝 Notes", bg: "linear-gradient(135deg, #6B7280, #4B5563)" },
              { href: "/keywords", label: "🔑 Keywords", bg: "linear-gradient(135deg, #F59E0B, #F97316)" },
              { href: "/questions", label: "❓ Questions", bg: "linear-gradient(135deg, #3B82F6, #06B6D4)" },
              { href: "/quiz", label: "🧠 Quiz", bg: "linear-gradient(135deg, #8B5CF6, #EC4899)" },
            ].map((btn) => (
              <a key={btn.href} href={btn.href}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition-all hover:scale-105 hover:shadow-lg"
                style={{ background: btn.bg }}>
                {btn.label}
              </a>
            ))}

            {/* Mobile user */}
            <div className="relative md:hidden">
              <button onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: "linear-gradient(135deg, #8B5CF6, #3B82F6)" }}>
                {userName.charAt(0).toUpperCase()}
              </button>
              {showUserMenu && (
                <div className="absolute right-0 top-10 rounded-xl p-3 z-50 w-40 shadow-xl border border-white/10"
                  style={{ background: "rgba(15,12,41,0.95)" }}>
                  <p className="text-xs text-gray-400 mb-2 truncate">{userName}</p>
                  <button onClick={handleLogout} className="w-full text-left text-sm text-red-400 hover:text-red-300">
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mode banner */}
        {mode !== "default" && (
          <div className="text-xs text-center py-1.5 flex-shrink-0 font-medium"
            style={{ background: `${activeMode?.color}22`, color: activeMode?.color, borderBottom: `1px solid ${activeMode?.color}33` }}>
            {activeMode?.label} mode active — {activeMode?.desc}
          </div>
        )}

        {/* Listening banner */}
        {listening && (
          <div className="text-xs text-center py-2 flex-shrink-0 flex items-center justify-center gap-2"
            style={{ background: "rgba(239,68,68,0.15)", color: "#fca5a5", borderBottom: "1px solid rgba(239,68,68,0.3)" }}>
            <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse inline-block" />
            Listening... speak your question, then click mic to stop
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

            {/* Welcome screen */}
            {messages.length === 0 && (
              <div className="text-center mt-16 space-y-4">
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mx-auto"
                  style={{ background: "linear-gradient(135deg, #8B5CF6, #3B82F6)", boxShadow: "0 0 60px rgba(139,92,246,0.4)" }}>
                  📚
                </div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent"
                  style={{ backgroundImage: "linear-gradient(135deg, #a78bfa, #60a5fa, #34d399)" }}>
                  Hi {userName}! I'm QuickBrief
                </h1>
                <p className="text-gray-400 text-sm max-w-sm mx-auto leading-relaxed">
                  Upload a file using the <span className="text-white font-semibold">+</span> button, then ask me anything about it.
                </p>
                <div className="flex items-center justify-center gap-6 text-xs text-gray-500 mt-4">
                  <span>🎤 Speak questions</span>
                  <span>🔊 Listen to answers</span>
                  <span>📌 Save notes</span>
                </div>

                {/* Feature cards */}
                <div className="grid grid-cols-2 gap-3 mt-8 max-w-md mx-auto">
                  {[
                    { icon: "🧠", label: "Quiz Mode", desc: "Test your knowledge" },
                    { icon: "🃏", label: "Flashcards", desc: "Quick revision" },
                    { icon: "🗓️", label: "Study Plan", desc: "AI-powered schedule" },
                    { icon: "🎈", label: "Balloon Game", desc: "Learn while playing" },
                  ].map((f) => (
                    <div key={f.label} className="rounded-2xl p-4 text-left border border-white/5 hover:border-white/10 transition"
                      style={{ background: "rgba(255,255,255,0.03)" }}>
                      <div className="text-2xl mb-1">{f.icon}</div>
                      <p className="text-sm font-medium text-white">{f.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>

                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1"
                    style={{ background: "linear-gradient(135deg, #8B5CF6, #3B82F6)" }}>
                    AI
                  </div>
                )}

                <div className="flex flex-col gap-1 max-w-2xl">
                  <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                    msg.role === "user" ? "rounded-tr-sm" : "rounded-tl-sm"
                  }`}
                    style={msg.role === "user" ? {
                      background: "linear-gradient(135deg, #8B5CF6, #3B82F6)",
                      boxShadow: "0 4px 20px rgba(139,92,246,0.3)",
                    } : {
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      backdropFilter: "blur(10px)",
                    }}>
                    {msg.mode && (
                      <span className="block text-xs font-semibold mb-1.5 opacity-80" style={{ color: msg.modeColor || "#a78bfa" }}>
                        {msg.mode}
                      </span>
                    )}
                    {msg.type === "file" ? (
                      <span className="text-blue-300 flex items-center gap-2">📄 {msg.content}</span>
                    ) : msg.content}
                  </div>

                  {/* Action buttons */}
                  {msg.role === "assistant" && msg.type === "text" && (
                    <div className="flex gap-2 px-1">
                      <button onClick={() => handleSpeak(msg.content, i)}
                        className="text-xs px-2.5 py-1 rounded-lg transition"
                        style={speakingIndex === i
                          ? { background: "rgba(59,130,246,0.2)", color: "#60a5fa" }
                          : { color: "#6b7280" }}
                        onMouseEnter={(e) => { if (speakingIndex !== i) (e.target as HTMLElement).style.color = "#60a5fa"; }}
                        onMouseLeave={(e) => { if (speakingIndex !== i) (e.target as HTMLElement).style.color = "#6b7280"; }}>
                        {speakingIndex === i ? "🔊 Speaking..." : "🔊 Listen"}
                      </button>
                      <button onClick={() => saveAsNote(msg.content, i)}
                        className="text-xs px-2.5 py-1 rounded-lg transition"
                        style={savedMsgIds.has(i)
                          ? { background: "rgba(16,185,129,0.2)", color: "#34d399" }
                          : { color: "#6b7280" }}>
                        {savedMsgIds.has(i) ? "✅ Saved" : "📌 Save"}
                      </button>
                    </div>
                  )}
                </div>

                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1"
                    style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}>
                    {userName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            ))}

            {/* Thinking indicator */}
            {(loading || summarizing) && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #8B5CF6, #3B82F6)" }}>
                  AI
                </div>
                <div className="rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>

        {/* ── INPUT BAR ── */}
        <div className="flex-shrink-0 p-4 border-t border-white/10"
          style={{ background: "rgba(255,255,255,0.02)", backdropFilter: "blur(20px)" }}>
          <div className="max-w-3xl mx-auto">
            {file && (
              <div className="mb-2 text-xs flex justify-between items-center px-3 py-1.5 rounded-lg border border-white/10"
                style={{ background: "rgba(255,255,255,0.05)" }}>
                <span className="text-blue-300">📄 {file.name}</span>
                <button onClick={() => setFile(null)} className="text-red-400 hover:text-red-300 ml-2">✖</button>
              </div>
            )}

            <div className="flex items-end gap-2 rounded-2xl px-4 py-3 border transition-all"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 0 30px rgba(139,92,246,0.1)",
              }}>
              <input type="file" accept=".pdf,.docx,.txt,.md" ref={fileInputRef}
                onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" />

              <button onClick={() => fileInputRef.current?.click()}
                className="text-gray-400 hover:text-white text-xl font-bold pb-0.5 transition w-6 flex-shrink-0">
                +
              </button>

              <textarea ref={textareaRef} value={input} onChange={handleInput} onKeyDown={handleKeyDown}
                placeholder={listening ? "🎤 Listening..." : `Ask in ${activeMode?.label} mode...`}
                className="flex-1 bg-transparent resize-none outline-none text-sm max-h-40 text-white placeholder-gray-500"
                rows={1} />

              {micSupported && (
                <button onClick={handleMic}
                  className="pb-0.5 text-lg transition flex-shrink-0"
                  style={{ color: listening ? "#f87171" : "#6b7280" }}>
                  🎤
                </button>
              )}

              <button onClick={handleSend} disabled={loading}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105 disabled:opacity-50 flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #8B5CF6, #3B82F6)", boxShadow: "0 0 20px rgba(139,92,246,0.4)" }}>
                ➤
              </button>
            </div>

            <p className="text-xs text-gray-600 mt-2 text-center">
              QuickBrief can make mistakes. Always verify important info.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}