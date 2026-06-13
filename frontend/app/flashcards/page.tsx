// frontend/app/flashcards/page.tsx

"use client";

import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

type Flashcard = {
  front: string;
  back: string;
  category: string;
};



const categoryColors: Record<string, string> = {
  definition: "bg-green-900 text-green-300 border-green-700",
  concept: "bg-purple-900 text-purple-300 border-purple-700",
  formula: "bg-blue-900 text-blue-300 border-blue-700",
  date: "bg-yellow-900 text-yellow-300 border-yellow-700",
  person: "bg-pink-900 text-pink-300 border-pink-700",
  process: "bg-orange-900 text-orange-300 border-orange-700",
};

export default function FlashcardsPage() {
  const { userName, logout, ready } = useAuth();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [numCards, setNumCards] = useState(10);

  // Study mode state
  const [studyMode, setStudyMode] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<number>>(new Set());
  const [unknown, setUnknown] = useState<Set<number>>(new Set());

  const generate = async () => {
    setLoading(true);
    setError("");
    setCards([]);
    setStudyMode(false);
    setCurrentIndex(0);
    setFlipped(false);
    setKnown(new Set());
    setUnknown(new Set());

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/flashcards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ num_cards: numCards }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setCards(data.flashcards);
      }
    } catch (e) {
      setError("Could not connect to backend.");
    }

    setLoading(false);
  };

  const markKnown = () => {
    setKnown((prev) => new Set(prev).add(currentIndex));
    setUnknown((prev) => { const s = new Set(prev); s.delete(currentIndex); return s; });
    nextCard();
  };

  const markUnknown = () => {
    setUnknown((prev) => new Set(prev).add(currentIndex));
    setKnown((prev) => { const s = new Set(prev); s.delete(currentIndex); return s; });
    nextCard();
  };

  const nextCard = () => {
    setFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % cards.length);
    }, 150);
  };

  const prevCard = () => {
    setFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
    }, 150);
  };

  const resetStudy = () => {
    setCurrentIndex(0);
    setFlipped(false);
    setKnown(new Set());
    setUnknown(new Set());
  };

  if (!ready) return null;

  const currentCard = cards[currentIndex];
  const progress = cards.length > 0 ? Math.round(((known.size + unknown.size) / cards.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#343541] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 bg-[#202123]">
        <div className="flex items-center gap-3">
          <a href="/" className="text-gray-400 hover:text-white text-sm">← Back</a>
          <h1 className="text-lg font-semibold">🃏 Flashcards</h1>
        </div>
        <div className="flex items-center gap-3">
          {cards.length > 0 && (
            <button
              onClick={() => { setStudyMode(!studyMode); resetStudy(); }}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                studyMode ? "bg-yellow-600 hover:bg-yellow-700" : "bg-purple-600 hover:bg-purple-700"
              }`}
            >
              {studyMode ? "📋 Grid View" : "📖 Study Mode"}
            </button>
          )}
          <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold">
            {userName.charAt(0).toUpperCase()}
          </div>
          <button onClick={logout} className="text-xs text-gray-500 hover:text-red-400 transition">
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Generate controls */}
        {!studyMode && (
          <div className="bg-[#40414f] rounded-2xl p-6 mb-8 space-y-4">
            <p className="text-sm text-gray-400">Generate flashcards from your uploaded document.</p>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Number of cards: {numCards}</label>
              <input
                type="range"
                min={5}
                max={20}
                value={numCards}
                onChange={(e) => setNumCards(Number(e.target.value))}
                className="w-full accent-purple-500"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>5</span><span>20</span>
              </div>
            </div>

            <button
              onClick={generate}
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 py-2 rounded-xl text-sm font-medium disabled:opacity-50 transition"
            >
              {loading ? "Generating cards..." : "⚡ Generate Flashcards"}
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-900 bg-opacity-40 text-red-300 rounded-xl px-4 py-3 text-sm mb-6">
            ⚠️ {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center mt-10">
            <p className="text-4xl mb-4 animate-pulse">🃏</p>
            <p className="text-gray-400">Generating flashcards...</p>
          </div>
        )}

        {/* ── STUDY MODE ── */}
        {studyMode && cards.length > 0 && (
          <div className="space-y-6">

            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Card {currentIndex + 1} of {cards.length}</span>
                <span>{known.size} known · {unknown.size} unsure · {progress}% reviewed</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Flashcard */}
            <div
              onClick={() => setFlipped(!flipped)}
              className="cursor-pointer select-none"
            >
              <div className={`relative bg-[#40414f] rounded-2xl border-2 transition-all duration-300 min-h-64 flex flex-col items-center justify-center p-8 text-center ${
                known.has(currentIndex)
                  ? "border-green-600"
                  : unknown.has(currentIndex)
                  ? "border-red-600"
                  : "border-gray-600 hover:border-purple-500"
              }`}>

                <span className={`absolute top-3 right-3 text-xs px-2 py-0.5 rounded-full border ${
                  categoryColors[currentCard?.category] || "bg-gray-700 text-gray-300 border-gray-600"
                }`}>
                  {currentCard?.category}
                </span>

                <p className="text-xs text-gray-500 mb-4">
                  {flipped ? "ANSWER" : "QUESTION — tap to flip"}
                </p>

                <p className="text-lg font-medium leading-relaxed">
                  {flipped ? currentCard?.back : currentCard?.front}
                </p>

                {!flipped && (
                  <p className="text-xs text-gray-600 mt-6">👆 Tap card to reveal answer</p>
                )}
              </div>
            </div>

            {/* Action buttons */}
            {flipped && (
              <div className="flex gap-3">
                <button
                  onClick={markUnknown}
                  className="flex-1 bg-red-900 hover:bg-red-800 border border-red-700 py-3 rounded-xl text-sm font-medium transition"
                >
                  😕 Still Learning
                </button>
                <button
                  onClick={markKnown}
                  className="flex-1 bg-green-900 hover:bg-green-800 border border-green-700 py-3 rounded-xl text-sm font-medium transition"
                >
                  ✅ Got It!
                </button>
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={prevCard}
                className="bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded-xl text-sm transition"
              >
                ← Prev
              </button>
              <button
                onClick={resetStudy}
                className="bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded-xl text-sm transition"
              >
                🔄 Reset
              </button>
              <button
                onClick={nextCard}
                className="bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded-xl text-sm transition"
              >
                Next →
              </button>
            </div>

            {/* Summary when all reviewed */}
            {known.size + unknown.size === cards.length && (
              <div className="bg-[#40414f] rounded-2xl p-5 text-center border border-purple-700">
                <p className="text-2xl mb-2">🎉</p>
                <p className="font-semibold mb-1">Round Complete!</p>
                <p className="text-sm text-gray-400">
                  ✅ {known.size} known · 😕 {unknown.size} still learning
                </p>
                <button
                  onClick={resetStudy}
                  className="mt-4 bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-xl text-sm transition"
                >
                  Study Again
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── GRID VIEW ── */}
        {!studyMode && cards.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{cards.length} Flashcards</h2>
              <button
                onClick={() => { setStudyMode(true); resetStudy(); }}
                className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-xl text-sm transition"
              >
                📖 Start Studying
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {cards.map((card, i) => (
                <div key={i} className="bg-[#40414f] rounded-2xl p-4 border border-gray-700">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-sm font-medium text-white">{card.front}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${
                      categoryColors[card.category] || "bg-gray-700 text-gray-300 border-gray-600"
                    }`}>
                      {card.category}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 border-t border-gray-700 pt-2 mt-2">
                    {card.back}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}