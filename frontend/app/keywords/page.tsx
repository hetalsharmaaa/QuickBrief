// frontend/app/keywords/page.tsx

"use client";

import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

type KeywordData = {
  keywords: string[];
  definitions: { term: string; definition: string }[];
  important_topics: string[];
  formulas: string[];
};

export default function KeywordsPage() {
  const { userName, logout, ready } = useAuth();
  const [data, setData] = useState<KeywordData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchKeywords = async () => {
    setLoading(true);
    setError("");
    setData(null);

    try {
      const res = await fetch("http://127.0.0.1:8000/keywords");
      const json = await res.json();

      if (json.error) {
        setError(json.error);
      } else {
        setData(json);
      }
    } catch (e) {
      setError("Could not connect to backend.");
    }

    setLoading(false);
  };

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-[#343541] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 bg-[#202123]">
        <div className="flex items-center gap-3">
          <a href="/" className="text-gray-400 hover:text-white text-sm">← Back</a>
          <h1 className="text-lg font-semibold">🔑 Keywords & Concepts</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold">
            {userName.charAt(0).toUpperCase()}
          </div>
          <button onClick={logout} className="text-xs text-gray-500 hover:text-red-400 transition">
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">

        {!data && !loading && (
          <div className="text-center mt-16">
            <p className="text-4xl mb-4">🔑</p>
            <h2 className="text-xl font-semibold mb-2">Extract Key Concepts</h2>
            <p className="text-gray-400 text-sm mb-6">
              Automatically find keywords, definitions, important topics and formulas from your document.
            </p>

            {error && (
              <div className="bg-red-900 bg-opacity-40 text-red-300 rounded-xl px-4 py-3 text-sm mb-6">
                ⚠️ {error}
              </div>
            )}

            <button
              onClick={fetchKeywords}
              className="bg-purple-600 hover:bg-purple-700 px-8 py-3 rounded-xl text-sm font-medium transition"
            >
              ⚡ Extract Keywords
            </button>
          </div>
        )}

        {loading && (
          <div className="text-center mt-20">
            <p className="text-4xl mb-4 animate-pulse">🔍</p>
            <p className="text-gray-400">Analyzing document...</p>
          </div>
        )}

        {data && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold text-lg">Analysis Results</h2>
              <button onClick={fetchKeywords} className="text-xs text-purple-400 hover:text-purple-300">
                🔄 Refresh
              </button>
            </div>

            {data.important_topics?.length > 0 && (
              <div className="bg-[#40414f] rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-purple-400 mb-3">📌 Important Topics</h3>
                <div className="flex flex-wrap gap-2">
                  {data.important_topics.map((topic, i) => (
                    <span key={i} className="bg-purple-900 bg-opacity-50 text-purple-300 px-3 py-1 rounded-full text-sm border border-purple-700">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {data.keywords?.length > 0 && (
              <div className="bg-[#40414f] rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-yellow-400 mb-3">🔑 Keywords</h3>
                <div className="flex flex-wrap gap-2">
                  {data.keywords.map((kw, i) => (
                    <span key={i} className="bg-yellow-900 bg-opacity-30 text-yellow-300 px-3 py-1 rounded-full text-xs border border-yellow-800">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {data.definitions?.length > 0 && (
              <div className="bg-[#40414f] rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-green-400 mb-3">📖 Key Definitions</h3>
                <div className="space-y-3">
                  {data.definitions.map((def, i) => (
                    <div key={i} className="border-l-2 border-green-600 pl-3">
                      <p className="text-sm font-medium text-green-300">{def.term}</p>
                      <p className="text-xs text-gray-400 mt-1">{def.definition}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.formulas?.length > 0 && (
              <div className="bg-[#40414f] rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-blue-400 mb-3">🧮 Formulas</h3>
                <div className="space-y-2">
                  {data.formulas.map((formula, i) => (
                    <div key={i} className="bg-blue-900 bg-opacity-30 border border-blue-800 rounded-lg px-4 py-2 text-sm font-mono text-blue-300">
                      {formula}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.formulas?.length === 0 && (
              <p className="text-xs text-gray-500 text-center">No formulas found in this document.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}