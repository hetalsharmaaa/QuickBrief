// frontend/app/questions/page.tsx

"use client";

import { useState } from "react";

type MCQ = {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
};

type ShortQ = {
  question: string;
  answer: string;
};

export default function QuestionsPage() {
  const [type, setType] = useState<"mcq" | "short">("mcq");
  const [count, setCount] = useState(5);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState<{ [key: number]: boolean }>({});

  const generate = async () => {
    setLoading(true);
    setQuestions([]);
    setRevealed({});
    setError("");

    const res = await fetch("http://127.0.0.1:8000/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ num_questions: count, question_type: type }),
    });

    const data = await res.json();

    if (data.error) {
      setError(data.error);
    } else {
      setQuestions(data.questions);
    }

    setLoading(false);
  };

  const toggleReveal = (i: number) => {
    setRevealed((prev) => ({ ...prev, [i]: !prev[i] }));
  };

  return (
    <div className="min-h-screen bg-[#343541] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 bg-[#202123]">
        <div className="flex items-center gap-3">
          <a href="/" className="text-gray-400 hover:text-white text-sm">← Back</a>
          <h1 className="text-lg font-semibold">❓ Question Generator</h1>
        </div>
        
          <a href="/quiz"
          className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded-lg text-sm"
        >
          🧠 Quiz Mode
        </a>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Controls */}
        <div className="bg-[#40414f] rounded-2xl p-6 mb-8 space-y-4">
          <p className="text-sm text-gray-400">Generate practice questions from your uploaded PDF.</p>

          {/* Type toggle */}
          <div className="flex gap-3">
            <button
              onClick={() => setType("mcq")}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${
                type === "mcq"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-700 text-gray-400 hover:bg-gray-600"
              }`}
            >
              📝 MCQ
            </button>
            <button
              onClick={() => setType("short")}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${
                type === "short"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-700 text-gray-400 hover:bg-gray-600"
              }`}
            >
              ✍️ Short Answer
            </button>
          </div>

          {/* Count selector */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Number of questions: {count}</label>
            <input
              type="range"
              min={3}
              max={15}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full accent-purple-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>3</span><span>15</span>
            </div>
          </div>

          <button
            onClick={generate}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 py-2 rounded-xl text-sm font-medium disabled:opacity-50 transition"
          >
            {loading ? "Generating..." : "⚡ Generate Questions"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900 bg-opacity-40 text-red-300 rounded-xl px-4 py-3 text-sm mb-6">
            ⚠️ {error}
          </div>
        )}

        {/* MCQ Results */}
        {type === "mcq" && questions.length > 0 && (
          <div className="space-y-6">
            {questions.map((q: MCQ, i) => (
              <div key={i} className="bg-[#40414f] rounded-2xl p-5">
                <p className="text-sm font-medium mb-3">
                  {i + 1}. {q.question}
                </p>
                <div className="space-y-2">
                  {q.options.map((opt, idx) => (
                    <div
                      key={idx}
                      className="bg-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300"
                    >
                      {opt}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => toggleReveal(i)}
                  className="mt-3 text-xs text-purple-400 hover:text-purple-300"
                >
                  {revealed[i] ? "Hide answer ▲" : "Show answer ▼"}
                </button>
                {revealed[i] && (
                  <div className="mt-2 bg-green-900 bg-opacity-30 rounded-lg px-3 py-2 text-sm">
                    <span className="text-green-400 font-medium">Answer: {q.answer}</span>
                    <p className="text-gray-400 text-xs mt-1">{q.explanation}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Short Answer Results */}
        {type === "short" && questions.length > 0 && (
          <div className="space-y-4">
            {questions.map((q: ShortQ, i) => (
              <div key={i} className="bg-[#40414f] rounded-2xl p-5">
                <p className="text-sm font-medium mb-2">
                  {i + 1}. {q.question}
                </p>
                <button
                  onClick={() => toggleReveal(i)}
                  className="text-xs text-purple-400 hover:text-purple-300"
                >
                  {revealed[i] ? "Hide answer ▲" : "Show answer ▼"}
                </button>
                {revealed[i] && (
                  <div className="mt-2 bg-green-900 bg-opacity-30 rounded-lg px-3 py-2 text-sm text-green-300">
                    {q.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}