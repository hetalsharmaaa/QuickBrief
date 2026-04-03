"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

const MODES = [
  { id: "default", label: "💬 Default", desc: "Helpful tutor" },
  { id: "teacher", label: "👨‍🏫 Teacher", desc: "In-depth explanation" },
  { id: "simple", label: "🧒 Simple", desc: "Like I'm 10" },
  { id: "exam", label: "🧠 Exam", desc: "Exam-ready answers" },
  { id: "revision", label: "⚡ Revision", desc: "Quick bullet points" },
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

  // ✅ Protect route
  useEffect(() => {
    const token = localStorage.getItem("sb_token");
    const name = localStorage.getItem("sb_name");
    if (!token) {
      router.push("/login");
    } else {
      setUserName(name || "User");
    }

    // Check mic/speech recognition support
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setMicSupported(true);
    }
  }, []);

  // ✅ Stop speech on unmount
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

  // ✅ Text to speech
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

    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find((v) => v.lang === "en-US" && v.name.toLowerCase().includes("female")) ||
      voices.find((v) => v.lang === "en-US") ||
      voices[0];

    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => setSpeakingIndex(index);
    utterance.onend = () => setSpeakingIndex(null);
    utterance.onerror = () => setSpeakingIndex(null);

    window.speechSynthesis.speak(utterance);
  };

  // ✅ Voice input
  const handleMic = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    // If already listening, stop
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

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join("");

      setInput(transcript);

      // Auto resize textarea
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height =
          textareaRef.current.scrollHeight + "px";
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech error:", event.error);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
  };

  const handleInput = (e: any) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const saveAsNote = (content: string, index: number) => {
    const existing = localStorage.getItem("studybuddy_notes");
    const notes: Note[] = existing ? JSON.parse(existing) : [];
    const note: Note = {
      id: Date.now().toString(),
      content,
      source: "ai",
      timestamp: new Date().toLocaleString(),
      tag: "important",
    };
    localStorage.setItem(
      "studybuddy_notes",
      JSON.stringify([note, ...notes])
    );
    setSavedMsgIds((prev) => new Set(prev).add(index));
  };

  const handleSend = async () => {
    if (!input && !file) return;

    // Stop mic if sending while listening
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
    }

    let newMessages = [...messages];

    if (file) {
      newMessages.push({ role: "user", type: "file", content: file.name });
    }
    if (input) {
      newMessages.push({ role: "user", type: "text", content: input });
    }

    setMessages(newMessages);
    setLoading(true);

    if (file) {
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("http://127.0.0.1:8000/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();

      if (uploadData.error) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", type: "text", content: `❌ ${uploadData.error}` },
        ]);
      } else {
        let ready = false;
        for (let i = 0; i < 10; i++) {
          const statusRes = await fetch("http://127.0.0.1:8000/status");
          const statusData = await statusRes.json();
          if (statusData.ready) {
            ready = true;
            break;
          }
          await new Promise((r) => setTimeout(r, 500));
        }

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            type: "text",
            content: ready
              ? `✅ "${file.name}" uploaded and ready! (${uploadData.chunks_created} chunks in ${uploadData.processing_time_seconds}s)\n\nAsk me anything or click ⚡ Summarize PDF.`
              : `⚠️ File uploaded but still processing. Wait a moment then ask your question.`,
          },
        ]);
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

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          type: "text",
          content: data.answer || data.error,
          mode: activeMode?.label,
        },
      ]);
    }

    setLoading(false);
    setInput("");
    setFile(null);
  };

  const handleSummarize = async () => {
    setSummarizing(true);
    setMessages((prev) => [
      ...prev,
      { role: "user", type: "text", content: "Give me a summary of the document." },
    ]);

    const res = await fetch("http://127.0.0.1:8000/summarize", {
      method: "POST",
    });

    const data = await res.json();

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        type: "text",
        content: data.summary || data.error,
      },
    ]);

    setSummarizing(false);
  };

  const handleKeyDown = (e: any) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const activeMode = MODES.find((m) => m.id === mode);

  return (
    <div className="flex h-screen bg-[#343541] text-white">
      {/* Sidebar */}
      <div className="w-64 bg-[#202123] p-4 hidden md:flex flex-col justify-between">
        <div className="space-y-2">
          <button
            onClick={() => setMessages([])}
            className="w-full border border-gray-600 rounded-lg p-2 text-sm hover:bg-gray-700"
          >
            + New chat
          </button>

          <button
            onClick={handleSummarize}
            disabled={summarizing}
            className="w-full border border-yellow-500 text-yellow-400 rounded-lg p-2 text-sm hover:bg-yellow-500 hover:text-black transition disabled:opacity-50"
          >
            {summarizing ? "Summarizing..." : "⚡ Summarize PDF"}
          </button>

          {/* Mode selector */}
          <div className="pt-4">
            <p className="text-xs text-gray-500 uppercase mb-2 tracking-wider">
              AI Mode
            </p>
            <div className="space-y-1">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                    mode === m.id
                      ? "bg-purple-700 text-white"
                      : "text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  <span>{m.label}</span>
                  <span className="block text-xs text-gray-500">{m.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tools */}
          <div className="pt-4">
            <p className="text-xs text-gray-500 uppercase mb-2 tracking-wider">
              Tools
            </p>
            <div className="space-y-1">
              <a href="/quiz" className="block w-full text-left px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-700 transition">
                🧠 Quiz
              </a>
              <a href="/questions" className="block w-full text-left px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-700 transition">
                ❓ Questions
              </a>
              <a href="/keywords" className="block w-full text-left px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-700 transition">
                🔑 Keywords
              </a>
              <a href="/flashcards" className="block w-full text-left px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-700 transition">
                🃏 Flashcards
              </a>
              <a href="/planner" className="block w-full text-left px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-700 transition">
                🗓️ Study Planner
              </a>
              <a href="/notes" className="block w-full text-left px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-700 transition">
                📝 My Notes
              </a>
            </div>
          </div>
        </div>

        {/* User section */}
        <div className="border-t border-gray-700 pt-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold">
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-gray-300 truncate max-w-[110px]">
                {userName}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-gray-500 hover:text-red-400 transition"
              title="Logout"
            >
              ⎋ Out
            </button>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-700">
          <span className="font-semibold text-lg">📚 StudyBuddy</span>
          <div className="flex gap-2 items-center flex-wrap">
            <div className="relative md:hidden">
              <button
                onClick={() => setShowModes(!showModes)}
                className="bg-purple-700 hover:bg-purple-600 px-3 py-1 rounded-lg text-sm"
              >
                {activeMode?.label}
              </button>
              {showModes && (
                <div className="absolute right-0 top-9 bg-[#202123] border border-gray-700 rounded-xl p-2 z-50 w-48 shadow-xl">
                  {MODES.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setMode(m.id);
                        setShowModes(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                        mode === m.id ? "bg-purple-700" : "hover:bg-gray-700"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <a href="/planner" className="bg-green-700 hover:bg-green-600 px-3 py-1 rounded-lg text-sm font-medium">
              🗓️ Planner
            </a>
            <a href="/flashcards" className="bg-orange-600 hover:bg-orange-700 px-3 py-1 rounded-lg text-sm font-medium">
              🃏 Flashcards
            </a>
            <a href="/notes" className="bg-gray-600 hover:bg-gray-500 px-3 py-1 rounded-lg text-sm font-medium">
              📝 Notes
            </a>
            <a href="/keywords" className="bg-yellow-600 hover:bg-yellow-700 px-3 py-1 rounded-lg text-sm font-medium">
              🔑 Keywords
            </a>
            <a href="/questions" className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-lg text-sm font-medium">
              ❓ Questions
            </a>
            <a href="/quiz" className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded-lg text-sm font-medium">
              🧠 Quiz
            </a>

            <div className="relative md:hidden">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold"
              >
                {userName.charAt(0).toUpperCase()}
              </button>
              {showUserMenu && (
                <div className="absolute right-0 top-10 bg-[#202123] border border-gray-700 rounded-xl p-3 z-50 w-40 shadow-xl">
                  <p className="text-xs text-gray-400 mb-2 truncate">{userName}</p>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left text-sm text-red-400 hover:text-red-300"
                  >
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Active mode banner */}
        {mode !== "default" && (
          <div className="bg-purple-900 bg-opacity-40 text-purple-300 text-xs text-center py-1 border-b border-purple-800">
            Mode active: {activeMode?.label} — {activeMode?.desc}
          </div>
        )}

        {/* Listening banner */}
        {listening && (
          <div className="bg-red-900 bg-opacity-60 text-red-200 text-xs text-center py-2 border-b border-red-800 flex items-center justify-center gap-2">
            <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse inline-block" />
            Listening... speak your question, then click mic to stop
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 mt-20">
                <p className="text-2xl mb-2">👋 Hi {userName}! I'm StudyBuddy</p>
                <p className="text-sm">
                  Upload a file using the + button, then ask me anything.
                </p>
                <p className="text-xs mt-2 text-gray-500">
                  Use 🎤 to speak your question · Use 🔊 to listen to answers
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-4 ${
                  msg.role === "user" ? "justify-end" : ""
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-xs flex-shrink-0">
                    AI
                  </div>
                )}

                <div className="flex flex-col gap-1 max-w-2xl flex-1">
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                      msg.role === "user"
                        ? "bg-[#40414f] text-white"
                        : "bg-[#444654] text-white"
                    }`}
                  >
                    {msg.mode && (
                      <span className="block text-xs text-purple-400 mb-1">
                        {msg.mode}
                      </span>
                    )}
                    {msg.type === "file" ? (
                      <span className="text-blue-400">📄 {msg.content}</span>
                    ) : (
                      msg.content
                    )}
                  </div>

                  {/* Action buttons on AI messages */}
                  {msg.role === "assistant" && msg.type === "text" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSpeak(msg.content, i)}
                        className={`text-xs px-3 py-1 rounded-lg transition ${
                          speakingIndex === i
                            ? "text-blue-400 bg-blue-900 bg-opacity-30 animate-pulse"
                            : "text-gray-500 hover:text-blue-400 hover:bg-gray-700"
                        }`}
                        title="Listen to this response"
                      >
                        {speakingIndex === i ? "🔊 Speaking..." : "🔊 Listen"}
                      </button>

                      <button
                        onClick={() => saveAsNote(msg.content, i)}
                        className={`text-xs px-3 py-1 rounded-lg transition ${
                          savedMsgIds.has(i)
                            ? "text-green-400 bg-green-900 bg-opacity-30"
                            : "text-gray-500 hover:text-yellow-400 hover:bg-gray-700"
                        }`}
                      >
                        {savedMsgIds.has(i) ? "✅ Saved" : "📌 Save"}
                      </button>
                    </div>
                  )}
                </div>

                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs flex-shrink-0">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            ))}

            {(loading || summarizing) && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-xs">
                  AI
                </div>
                <div className="bg-[#444654] rounded-2xl px-4 py-3 text-sm text-gray-400 animate-pulse">
                  Thinking...
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-gray-700 bg-[#40414f] p-4">
          <div className="max-w-3xl mx-auto">
            {file && (
              <div className="mb-2 text-xs text-gray-300 flex justify-between bg-gray-700 rounded px-3 py-1">
                <span>📄 {file.name}</span>
                <button
                  onClick={() => setFile(null)}
                  className="text-red-400 hover:text-red-300"
                >
                  ✖
                </button>
              </div>
            )}

            <div className="flex items-end gap-2 bg-[#40414f] border border-gray-600 rounded-xl px-3 py-2">
              <input
                type="file"
                accept=".pdf,.docx,.txt,.md"
                ref={fileInputRef}
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
              />

              {/* Upload button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-gray-400 hover:text-white text-xl font-bold pb-1"
                title="Upload file"
              >
                +
              </button>

              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder={
                  listening
                    ? "🎤 Listening..."
                    : `Ask in ${activeMode?.label} mode...`
                }
                className="flex-1 bg-transparent resize-none outline-none text-sm max-h-40"
                rows={1}
              />

              {/* Mic button */}
              {micSupported && (
                <button
                  onClick={handleMic}
                  className={`pb-1 text-lg transition ${
                    listening
                      ? "text-red-400 animate-pulse"
                      : "text-gray-400 hover:text-white"
                  }`}
                  title={listening ? "Stop listening" : "Speak your question"}
                >
                  🎤
                </button>
              )}

              {/* Send button */}
              <button
                onClick={handleSend}
                disabled={loading}
                className="bg-green-500 hover:bg-green-600 px-3 py-1 rounded-md text-sm disabled:opacity-50"
              >
                ➤
              </button>
            </div>

            <p className="text-xs text-gray-400 mt-2 text-center">
              StudyBuddy can make mistakes. Always verify important info.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}