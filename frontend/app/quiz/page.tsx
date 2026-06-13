// frontend/app/quiz/page.tsx

"use client";

import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

export default function QuizPage() {
  const { userName, logout, ready } = useAuth();
  const [quiz, setQuiz] = useState<any[]>([]);
  const [answers, setAnswers] = useState<any>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadQuiz = async () => {
    setLoading(true);
    setError("");
    setQuiz([]);
    setAnswers({});
    setSubmitted(false);
    setScore(0);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ num_questions: 10 }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else if (data.quiz && data.quiz.length > 0) {
        setQuiz(data.quiz);
      } else {
        setError("No questions generated. Make sure a PDF is uploaded first.");
      }
    } catch (e) {
      setError("Could not connect to backend. Make sure it is running.");
    }

    setLoading(false);
  };

  const handleSubmit = () => {
    let correct = 0;
    quiz.forEach((q, i) => {
      if (answers[i] === q.answer) correct++;
    });
    setScore(correct);
    setSubmitted(true);
  };

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-[#343541] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 bg-[#202123]">
        <div className="flex items-center gap-3">
          <a href="/" className="text-gray-400 hover:text-white text-sm">← Back</a>
          <h1 className="text-lg font-semibold">🧠 Quiz</h1>
        </div>
        <div className="flex items-center gap-3">
          <a href="/questions" className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-lg text-sm">
            ❓ Questions
          </a>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold">
              {userName.charAt(0).toUpperCase()}
            </div>
            <button onClick={logout} className="text-xs text-gray-500 hover:text-red-400 transition">
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Start screen */}
        {quiz.length === 0 && !loading && (
          <div className="text-center mt-20">
            <p className="text-4xl mb-4">🧠</p>
            <h2 className="text-xl font-semibold mb-2">Ready to test yourself?</h2>
            <p className="text-gray-400 text-sm mb-6">
              Make sure you've uploaded a PDF first, then click below to generate quiz questions.
            </p>

            {error && (
              <div className="bg-red-900 bg-opacity-40 text-red-300 rounded-xl px-4 py-3 text-sm mb-6">
                ⚠️ {error}
              </div>
            )}

            <button
              onClick={loadQuiz}
              className="bg-purple-600 hover:bg-purple-700 px-8 py-3 rounded-xl text-sm font-medium transition"
            >
              ⚡ Generate Quiz
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center mt-20">
            <p className="text-4xl mb-4 animate-pulse">⏳</p>
            <p className="text-gray-400">Generating quiz questions...</p>
          </div>
        )}

        {/* Quiz questions */}
        {quiz.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-lg">
                {submitted ? `Score: ${score} / ${quiz.length}` : `${quiz.length} Questions`}
              </h2>
              <button onClick={loadQuiz} className="text-xs text-purple-400 hover:text-purple-300">
                🔄 Regenerate
              </button>
            </div>

            {/* Score bar */}
            {submitted && (
              <div className="mb-6 bg-[#40414f] rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-purple-400">{Math.round((score / quiz.length) * 100)}%</p>
                <p className="text-sm text-gray-400 mt-1">
                  {score === quiz.length ? "Perfect! 🎉" : score >= quiz.length / 2 ? "Good job! 👍" : "Keep studying! 📚"}
                </p>
              </div>
            )}

            <div className="space-y-6">
              {quiz.map((q, i) => (
                <div key={i} className="bg-[#40414f] rounded-2xl p-5">
                  <p className="text-sm font-medium mb-3">
                    {i + 1}. {q.question}
                  </p>

                  <div className="space-y-2">
                    {q.options.map((opt: string, idx: number) => {
                      const letter = ["A", "B", "C", "D"][idx];
                      const isCorrect = letter === q.answer;
                      const isSelected = answers[i] === letter;

                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            if (submitted) return;
                            setAnswers({ ...answers, [i]: letter });
                          }}
                          className={`block w-full text-left p-3 rounded-xl text-sm transition
                            ${submitted
                              ? isCorrect
                                ? "bg-green-700 text-white"
                                : isSelected
                                ? "bg-red-700 text-white"
                                : "bg-gray-700 text-gray-400"
                              : isSelected
                              ? "bg-purple-700 text-white"
                              : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                            }`}
                        >
                          {letter}. {opt}
                        </button>
                      );
                    })}
                  </div>

                  {submitted && answers[i] !== q.answer && (
                    <div className="mt-3 text-xs text-yellow-300 bg-yellow-900 bg-opacity-30 rounded-lg px-3 py-2">
                      💡 {q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {!submitted && (
              <button
                onClick={handleSubmit}
                className="w-full mt-8 bg-purple-600 hover:bg-purple-700 py-3 rounded-xl text-sm font-medium transition"
              >
                Submit Quiz
              </button>
            )}

            {submitted && (
              <button
                onClick={loadQuiz}
                className="w-full mt-8 bg-gray-700 hover:bg-gray-600 py-3 rounded-xl text-sm font-medium transition"
              >
                🔄 Try Another Quiz
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}