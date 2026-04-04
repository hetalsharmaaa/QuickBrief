// frontend/app/game/page.tsx

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";

type Question = {
  question: string;
  options: string[];
  answer_index: number;
};

type Balloon = {
  id: number;
  x: number;
  y: number;
  color: string;
  optionIndex: number;
  text: string;
  speed: number;
  popped: boolean;
  correct: boolean;
  showResult: boolean;
};

const BALLOON_COLORS = [
  "#FF6B6B", "#FF9F43", "#FECA57", "#48DBFB",
  "#FF9FF3", "#54A0FF", "#5F27CD", "#00D2D3",
];

const PIXEL_FONT = "'Courier New', Courier, monospace";

const TOTAL_QUESTIONS = 10;
const LIVES = 3;

export default function GamePage() {
  const { userName, logout, ready } = useAuth();

  const [gameState, setGameState] = useState<"loading" | "start" | "playing" | "gameover" | "win">("start");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const [loadingQ, setLoadingQ] = useState(false);
  const [error, setError] = useState("");
  const [screenFlash, setScreenFlash] = useState<"" | "green" | "red">("");
  const [questionText, setQuestionText] = useState("");

  const animFrameRef = useRef<number>(0);
  const balloonsRef = useRef<Balloon[]>([]);
  const gameActiveRef = useRef(false);
  const nextIdRef = useRef(0);
  const spawnTimerRef = useRef<any>(null);
  const currentQRef = useRef(0);
  const livesRef = useRef(LIVES);
  const scoreRef = useRef(0);

  const fetchQuestions = async () => {
    setLoadingQ(true);
    setError("");
    try {
      const res = await fetch("http://127.0.0.1:8000/game/questions", {
        method: "POST",
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setQuestions(data.questions);
      }
    } catch {
      setError("Could not connect to backend.");
    }
    setLoadingQ(false);
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  // Sync refs
  useEffect(() => { currentQRef.current = currentQ; }, [currentQ]);
  useEffect(() => { livesRef.current = lives; }, [lives]);
  useEffect(() => { scoreRef.current = score; }, [score]);

  const spawnBalloons = useCallback((q: Question) => {
    if (!gameActiveRef.current) return;
    setQuestionText(q.question);

    const newBalloons: Balloon[] = q.options.map((opt, idx) => ({
      id: nextIdRef.current++,
      x: 15 + (idx * 22) + Math.random() * 5,
      y: 105,
      color: BALLOON_COLORS[idx % BALLOON_COLORS.length],
      optionIndex: idx,
      text: opt,
      speed: 0.18 + Math.random() * 0.1,
      popped: false,
      correct: idx === q.answer_index,
      showResult: false,
    }));

    balloonsRef.current = newBalloons;
    setBalloons([...newBalloons]);
  }, []);

  const triggerFlash = (type: "green" | "red") => {
    setScreenFlash(type);
    setTimeout(() => setScreenFlash(""), 400);
  };

  const handleBalloonClick = useCallback((balloonId: number) => {
    if (!gameActiveRef.current) return;

    const balloon = balloonsRef.current.find((b) => b.id === balloonId);
    if (!balloon || balloon.popped) return;

    // Pop it
    balloonsRef.current = balloonsRef.current.map((b) =>
      b.id === balloonId ? { ...b, popped: true, showResult: true } : b
    );
    setBalloons([...balloonsRef.current]);

    if (balloon.correct) {
      triggerFlash("green");
      scoreRef.current += 10;
      setScore(scoreRef.current);
    } else {
      triggerFlash("red");
      livesRef.current -= 1;
      setLives(livesRef.current);

      if (livesRef.current <= 0) {
        gameActiveRef.current = false;
        clearTimeout(spawnTimerRef.current);
        cancelAnimationFrame(animFrameRef.current);
        setTimeout(() => setGameState("gameover"), 600);
        return;
      }
    }

    // Next question after short delay
    spawnTimerRef.current = setTimeout(() => {
      if (!gameActiveRef.current) return;
      const nextQ = currentQRef.current + 1;
      if (nextQ >= TOTAL_QUESTIONS) {
        gameActiveRef.current = false;
        cancelAnimationFrame(animFrameRef.current);
        setGameState("win");
        return;
      }
      setCurrentQ(nextQ);
      currentQRef.current = nextQ;
      spawnBalloons(questions[nextQ]);
    }, 900);

  }, [questions, spawnBalloons]);

  // Animation loop
  const animate = useCallback(() => {
    if (!gameActiveRef.current) return;

    balloonsRef.current = balloonsRef.current.map((b) => {
      if (b.popped) return b;
      const newY = b.y - b.speed;

      // Balloon escaped — wrong answer penalty
      if (newY < -15) {
        livesRef.current -= 1;
        setLives(livesRef.current);
        triggerFlash("red");

        if (livesRef.current <= 0) {
          gameActiveRef.current = false;
          cancelAnimationFrame(animFrameRef.current);
          setTimeout(() => setGameState("gameover"), 400);
          return { ...b, popped: true, y: newY };
        }

        // Move to next question
        const nextQ = currentQRef.current + 1;
        if (nextQ >= TOTAL_QUESTIONS) {
          gameActiveRef.current = false;
          setGameState("win");
          return { ...b, popped: true, y: newY };
        }

        setTimeout(() => {
          if (!gameActiveRef.current) return;
          setCurrentQ(nextQ);
          currentQRef.current = nextQ;
          spawnBalloons(questions[nextQ]);
        }, 600);

        // Pop all current balloons
        balloonsRef.current = balloonsRef.current.map((bb) => ({ ...bb, popped: true }));
        return { ...b, popped: true };
      }

      return { ...b, y: newY };
    });

    setBalloons([...balloonsRef.current]);
    animFrameRef.current = requestAnimationFrame(animate);
  }, [questions, spawnBalloons]);

  const startGame = () => {
    if (questions.length === 0) return;

    // Reset everything
    gameActiveRef.current = true;
    balloonsRef.current = [];
    nextIdRef.current = 0;
    currentQRef.current = 0;
    livesRef.current = LIVES;
    scoreRef.current = 0;

    setCurrentQ(0);
    setScore(0);
    setLives(LIVES);
    setBalloons([]);
    setScreenFlash("");
    setGameState("playing");

    setTimeout(() => {
      spawnBalloons(questions[0]);
      animFrameRef.current = requestAnimationFrame(animate);
    }, 100);
  };

  const stopGame = () => {
    gameActiveRef.current = false;
    cancelAnimationFrame(animFrameRef.current);
    clearTimeout(spawnTimerRef.current);
    setBalloons([]);
    setGameState("start");
  };

  useEffect(() => {
    return () => {
      gameActiveRef.current = false;
      cancelAnimationFrame(animFrameRef.current);
      clearTimeout(spawnTimerRef.current);
    };
  }, []);

  if (!ready) return null;

  return (
    <div
      className="min-h-screen bg-[#0a0a1a] text-white"
      style={{ fontFamily: PIXEL_FONT }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b-4 border-purple-800 bg-[#0d0d2b]">
        <div className="flex items-center gap-3">
          <a href="/" className="text-purple-400 hover:text-purple-300 text-sm">← BACK</a>
          <h1 className="text-lg font-bold text-yellow-400 tracking-widest">🎈 BALLOON BLAST</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-purple-400">{userName.toUpperCase()}</span>
          <button onClick={logout} className="text-xs text-gray-500 hover:text-red-400">
            LOGOUT
          </button>
        </div>
      </div>

      {/* ── START SCREEN ── */}
      {gameState === "start" && (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
          <div className="text-7xl mb-6 animate-bounce">🎈</div>
          <h2 className="text-3xl font-bold text-yellow-400 tracking-widest mb-2">
            BALLOON BLAST
          </h2>
          <p className="text-purple-300 text-sm mb-1 tracking-wider">PIXEL QUIZ SHOOTER</p>
          <div className="border-2 border-purple-700 rounded-xl p-6 mt-6 mb-8 max-w-sm w-full bg-[#0d0d2b] space-y-2">
            <p className="text-xs text-gray-400 tracking-wider">HOW TO PLAY</p>
            <p className="text-sm text-gray-300">🎈 Balloons float up with answer options</p>
            <p className="text-sm text-gray-300">🖱️ Click the CORRECT balloon to pop it</p>
            <p className="text-sm text-gray-300">❌ Wrong answer or miss = lose a life</p>
            <p className="text-sm text-gray-300">❤️ You have 3 lives · 10 questions</p>
            <p className="text-sm text-yellow-400">⭐ +10 points per correct answer</p>
          </div>

          {error && (
            <p className="text-red-400 text-xs mb-4 tracking-wider">⚠️ {error}</p>
          )}

          {loadingQ ? (
            <p className="text-purple-400 text-sm tracking-widest animate-pulse">
              LOADING QUESTIONS...
            </p>
          ) : questions.length > 0 ? (
            <button
              onClick={startGame}
              className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-10 py-4 text-lg tracking-widest transition border-4 border-yellow-600 hover:border-yellow-400"
              style={{ imageRendering: "pixelated" }}
            >
              ▶ START GAME
            </button>
          ) : (
            <button
              onClick={fetchQuestions}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-8 py-3 text-sm tracking-widest border-2 border-purple-400"
            >
              RETRY LOADING
            </button>
          )}
        </div>
      )}

      {/* ── GAME SCREEN ── */}
      {gameState === "playing" && (
        <div className="relative w-full overflow-hidden"
          style={{ height: "calc(100vh - 65px)" }}
        >
          {/* Screen flash overlay */}
          {screenFlash && (
            <div
              className="absolute inset-0 z-50 pointer-events-none transition-opacity"
              style={{
                backgroundColor: screenFlash === "green"
                  ? "rgba(0,255,100,0.15)"
                  : "rgba(255,50,50,0.2)",
              }}
            />
          )}

          {/* Starfield background */}
          <div className="absolute inset-0 bg-[#0a0a1a]">
            {[...Array(40)].map((_, i) => (
              <div
                key={i}
                className="absolute bg-white rounded-full opacity-40"
                style={{
                  width: i % 5 === 0 ? 2 : 1,
                  height: i % 5 === 0 ? 2 : 1,
                  left: `${(i * 7.3 + 3) % 100}%`,
                  top: `${(i * 11.7 + 5) % 100}%`,
                }}
              />
            ))}
          </div>

          {/* HUD */}
          <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-6 py-3 bg-[#0d0d2b] border-b-2 border-purple-900">
            <div className="flex gap-1">
              {[...Array(LIVES)].map((_, i) => (
                <span key={i} className="text-lg">{i < lives ? "❤️" : "🖤"}</span>
              ))}
            </div>
            <div className="text-center">
              <p className="text-xs text-purple-400 tracking-widest">QUESTION</p>
              <p className="text-sm font-bold text-white">{currentQ + 1} / {TOTAL_QUESTIONS}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-yellow-400 tracking-widest">SCORE</p>
              <p className="text-lg font-bold text-yellow-300">{score}</p>
            </div>
          </div>

          {/* Question box */}
          <div className="absolute left-0 right-0 z-30 flex justify-center"
            style={{ top: "70px" }}
          >
            <div className="bg-[#0d0d2b] border-2 border-purple-600 rounded-xl px-5 py-3 max-w-xl mx-4 text-center shadow-lg shadow-purple-900">
              <p className="text-xs text-purple-400 tracking-widest mb-1">❓ QUESTION</p>
              <p className="text-sm text-white leading-relaxed">{questionText}</p>
            </div>
          </div>

          {/* Balloons */}
          {balloons.map((balloon) => (
            <div
              key={balloon.id}
              onClick={() => !balloon.popped && handleBalloonClick(balloon.id)}
              className="absolute select-none transition-all"
              style={{
                left: `${balloon.x}%`,
                top: `${balloon.y}%`,
                transform: "translateX(-50%)",
                cursor: balloon.popped ? "default" : "pointer",
                zIndex: 20,
              }}
            >
              {!balloon.popped ? (
                <div className="flex flex-col items-center group">
                  {/* Balloon body */}
                  <div
                    className="relative flex items-center justify-center rounded-full border-4 hover:brightness-125 transition-all active:scale-95"
                    style={{
                      width: 90,
                      height: 105,
                      backgroundColor: balloon.color,
                      borderColor: "rgba(0,0,0,0.3)",
                      boxShadow: `0 0 15px ${balloon.color}88`,
                    }}
                  >
                    {/* Shine */}
                    <div
                      className="absolute top-3 left-4 w-4 h-5 rounded-full opacity-40"
                      style={{ backgroundColor: "white" }}
                    />
                    <p
                      className="text-xs font-bold text-center px-2 leading-tight z-10"
                      style={{
                        fontFamily: PIXEL_FONT,
                        color: "#000",
                        textShadow: "none",
                        maxWidth: 76,
                        wordBreak: "break-word",
                      }}
                    >
                      {balloon.text}
                    </p>
                  </div>
                  {/* String */}
                  <div
                    style={{
                      width: 2,
                      height: 24,
                      backgroundColor: "rgba(255,255,255,0.4)",
                    }}
                  />
                </div>
              ) : (
                /* Popped balloon */
                <div className="flex flex-col items-center justify-center"
                  style={{ width: 90, height: 105 }}
                >
                  <div className="text-3xl animate-ping" style={{ animationIterationCount: 1 }}>
                    {balloon.correct ? "✨" : "💥"}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Quit button */}
          <button
            onClick={stopGame}
            className="absolute bottom-4 right-4 z-40 text-xs text-gray-600 hover:text-red-400 tracking-wider border border-gray-700 px-3 py-1"
          >
            QUIT
          </button>
        </div>
      )}

      {/* ── GAME OVER SCREEN ── */}
      {gameState === "gameover" && (
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
          <div className="text-6xl mb-4">💀</div>
          <h2 className="text-3xl font-bold text-red-400 tracking-widest mb-2">
            GAME OVER
          </h2>
          <p className="text-purple-300 text-sm tracking-wider mb-6">
            YOU RAN OUT OF LIVES
          </p>
          <div className="border-2 border-red-800 bg-[#0d0d2b] rounded-xl p-6 mb-8 space-y-2 min-w-64">
            <p className="text-xs text-gray-400 tracking-wider">FINAL STATS</p>
            <p className="text-2xl font-bold text-yellow-400">{score} PTS</p>
            <p className="text-sm text-gray-300">
              Questions answered: {currentQ} / {TOTAL_QUESTIONS}
            </p>
            <p className="text-sm text-gray-300">
              Accuracy: {currentQ > 0 ? Math.round((score / 10 / currentQ) * 100) : 0}%
            </p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={startGame}
              className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-8 py-3 tracking-widest border-4 border-yellow-600 text-sm"
            >
              ▶ PLAY AGAIN
            </button>
            <button
              onClick={() => { fetchQuestions(); setGameState("start"); }}
              className="bg-purple-700 hover:bg-purple-600 text-white font-bold px-8 py-3 tracking-widest border-2 border-purple-400 text-sm"
            >
              NEW QS
            </button>
          </div>
        </div>
      )}

      {/* ── WIN SCREEN ── */}
      {gameState === "win" && (
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
          <div className="text-6xl mb-4 animate-bounce">🏆</div>
          <h2 className="text-3xl font-bold text-yellow-400 tracking-widest mb-2">
            YOU WIN!
          </h2>
          <p className="text-green-400 text-sm tracking-wider mb-6">
            ALL {TOTAL_QUESTIONS} QUESTIONS COMPLETED!
          </p>
          <div className="border-2 border-yellow-600 bg-[#0d0d2b] rounded-xl p-6 mb-8 space-y-2 min-w-64">
            <p className="text-xs text-gray-400 tracking-wider">FINAL STATS</p>
            <p className="text-4xl font-bold text-yellow-400">{score}</p>
            <p className="text-sm text-yellow-300 tracking-wider">POINTS</p>
            <p className="text-sm text-gray-300">
              Lives remaining: {"❤️".repeat(lives)}
            </p>
            <p className="text-sm text-gray-300">
              Accuracy: {Math.round((score / (TOTAL_QUESTIONS * 10)) * 100)}%
            </p>
            {score === TOTAL_QUESTIONS * 10 && (
              <p className="text-yellow-400 font-bold tracking-wider">⭐ PERFECT SCORE!</p>
            )}
          </div>
          <div className="flex gap-4">
            <button
              onClick={startGame}
              className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-8 py-3 tracking-widest border-4 border-yellow-600 text-sm"
            >
              ▶ PLAY AGAIN
            </button>
            <button
              onClick={() => { fetchQuestions(); setGameState("start"); }}
              className="bg-purple-700 hover:bg-purple-600 text-white font-bold px-8 py-3 tracking-widest border-2 border-purple-400 text-sm"
            >
              NEW QS
            </button>
          </div>
        </div>
      )}
    </div>
  );
}