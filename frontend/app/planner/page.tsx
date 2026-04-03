// frontend/app/planner/page.tsx

"use client";

import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

type DayPlan = {
  day: number;
  title: string;
  topics: string[];
  tasks: string[];
  tip: string;
};

type StudyPlan = {
  title: string;
  total_days: number;
  daily_hours: number;
  goal: string;
  days: DayPlan[];
  overall_tips: string[];
};

export default function PlannerPage() {
  const { userName, logout, ready } = useAuth();
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [days, setDays] = useState(7);
  const [hours, setHours] = useState(2);
  const [goal, setGoal] = useState("exam preparation");
  const [expandedDay, setExpandedDay] = useState<number | null>(0);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());

  const generate = async () => {
    setLoading(true);
    setError("");
    setPlan(null);
    setExpandedDay(0);
    setCompletedTasks(new Set());

    try {
      const res = await fetch("http://127.0.0.1:8000/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          days,
          hours_per_day: hours,
          goal,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setPlan(data.plan);
      }
    } catch (e) {
      setError("Could not connect to backend.");
    }

    setLoading(false);
  };

  const toggleTask = (taskKey: string) => {
    setCompletedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskKey)) {
        next.delete(taskKey);
      } else {
        next.add(taskKey);
      }
      return next;
    });
  };

  const downloadPlan = () => {
    if (!plan) return;

    const lines: string[] = [
      `📚 ${plan.title}`,
      `Goal: ${plan.goal}`,
      `Duration: ${plan.total_days} days · ${plan.daily_hours} hours/day`,
      `Generated for: ${userName}`,
      `Date: ${new Date().toLocaleString()}`,
      "═".repeat(50),
      "",
    ];

    plan.days.forEach((d) => {
      lines.push(`DAY ${d.day}: ${d.title}`);
      lines.push(`Topics: ${d.topics.join(", ")}`);
      lines.push("Tasks:");
      d.tasks.forEach((t) => lines.push(`  • ${t}`));
      lines.push(`💡 Tip: ${d.tip}`);
      lines.push("─".repeat(40));
      lines.push("");
    });

    lines.push("OVERALL TIPS:");
    plan.overall_tips.forEach((t) => lines.push(`• ${t}`));

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `study-plan-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalTasks = plan ? plan.days.reduce((sum, d) => sum + d.tasks.length, 0) : 0;
  const completedCount = completedTasks.size;
  const progressPct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-[#343541] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 bg-[#202123]">
        <div className="flex items-center gap-3">
          <a href="/" className="text-gray-400 hover:text-white text-sm">← Back</a>
          <h1 className="text-lg font-semibold">🗓️ Study Planner</h1>
        </div>
        <div className="flex items-center gap-3">
          {plan && (
            <button
              onClick={downloadPlan}
              className="bg-green-700 hover:bg-green-600 px-3 py-1 rounded-lg text-sm font-medium transition"
            >
              ⬇️ Download
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

        {/* Config panel */}
        <div className="bg-[#40414f] rounded-2xl p-6 mb-8 space-y-4">
          <p className="text-sm text-gray-400">Generate a personalised study plan from your document.</p>

          {/* Goal input */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Study Goal</label>
            <input
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. exam preparation, assignment revision..."
              className="w-full bg-[#343541] border border-gray-600 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-purple-500 transition placeholder-gray-500"
            />
          </div>

          {/* Days slider */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Study duration: {days} days</label>
            <input
              type="range"
              min={3}
              max={30}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full accent-purple-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>3 days</span><span>30 days</span>
            </div>
          </div>

          {/* Hours slider */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Hours per day: {hours}h</label>
            <input
              type="range"
              min={1}
              max={8}
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="w-full accent-purple-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1h</span><span>8h</span>
            </div>
          </div>

          <button
            onClick={generate}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 py-2 rounded-xl text-sm font-medium disabled:opacity-50 transition"
          >
            {loading ? "Generating plan..." : "⚡ Generate Study Plan"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900 bg-opacity-40 text-red-300 rounded-xl px-4 py-3 text-sm mb-6">
            ⚠️ {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center mt-10">
            <p className="text-4xl mb-4 animate-pulse">🗓️</p>
            <p className="text-gray-400">Building your study plan...</p>
          </div>
        )}

        {/* Plan */}
        {plan && (
          <div className="space-y-6">

            {/* Plan header */}
            <div className="bg-[#40414f] rounded-2xl p-5 border border-purple-800">
              <h2 className="text-lg font-semibold text-purple-300 mb-1">{plan.title}</h2>
              <p className="text-sm text-gray-400">
                {plan.total_days} days · {plan.daily_hours}h/day · Goal: {plan.goal}
              </p>

              {/* Overall progress */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Overall Progress</span>
                  <span>{completedCount}/{totalTasks} tasks · {progressPct}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Day cards */}
            <div className="space-y-3">
              {plan.days.map((d, i) => {
                const isExpanded = expandedDay === i;
                const dayTasksDone = d.tasks.filter((_, ti) =>
                  completedTasks.has(`${i}-${ti}`)
                ).length;
                const allDone = dayTasksDone === d.tasks.length;

                return (
                  <div
                    key={i}
                    className={`bg-[#40414f] rounded-2xl border transition ${
                      allDone ? "border-green-700" : "border-gray-700 hover:border-gray-500"
                    }`}
                  >
                    {/* Day header — clickable */}
                    <button
                      onClick={() => setExpandedDay(isExpanded ? null : i)}
                      className="w-full text-left px-5 py-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          allDone ? "bg-green-700" : "bg-purple-700"
                        }`}>
                          {allDone ? "✓" : d.day}
                        </span>
                        <div>
                          <p className="text-sm font-medium">{d.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {d.topics.slice(0, 2).join(", ")}{d.topics.length > 2 ? "..." : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{dayTasksDone}/{d.tasks.length}</span>
                        <span className="text-gray-500 text-sm">{isExpanded ? "▲" : "▼"}</span>
                      </div>
                    </button>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="px-5 pb-5 space-y-4 border-t border-gray-700 pt-4">

                        {/* Topics */}
                        <div>
                          <p className="text-xs text-gray-500 uppercase mb-2">Topics</p>
                          <div className="flex flex-wrap gap-2">
                            {d.topics.map((topic, ti) => (
                              <span
                                key={ti}
                                className="bg-purple-900 bg-opacity-50 text-purple-300 px-3 py-1 rounded-full text-xs border border-purple-800"
                              >
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Tasks with checkboxes */}
                        <div>
                          <p className="text-xs text-gray-500 uppercase mb-2">Tasks</p>
                          <div className="space-y-2">
                            {d.tasks.map((task, ti) => {
                              const key = `${i}-${ti}`;
                              const done = completedTasks.has(key);
                              return (
                                <button
                                  key={ti}
                                  onClick={() => toggleTask(key)}
                                  className="w-full text-left flex items-start gap-3 group"
                                >
                                  <span className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center text-xs transition ${
                                    done ? "bg-green-600 border-green-500" : "border-gray-500 group-hover:border-purple-400"
                                  }`}>
                                    {done ? "✓" : ""}
                                  </span>
                                  <span className={`text-sm transition ${done ? "line-through text-gray-500" : "text-gray-300"}`}>
                                    {task}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Tip */}
                        <div className="bg-yellow-900 bg-opacity-30 border border-yellow-800 rounded-xl px-4 py-3">
                          <p className="text-xs text-yellow-400 font-medium mb-1">💡 Study Tip</p>
                          <p className="text-sm text-yellow-200">{d.tip}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Overall tips */}
            {plan.overall_tips?.length > 0 && (
              <div className="bg-[#40414f] rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-blue-400 mb-3">🎯 Overall Study Tips</h3>
                <div className="space-y-2">
                  {plan.overall_tips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-blue-400 mt-0.5 flex-shrink-0">•</span>
                      <p className="text-sm text-gray-300">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={generate}
              className="w-full bg-gray-700 hover:bg-gray-600 py-3 rounded-xl text-sm font-medium transition"
            >
              🔄 Regenerate Plan
            </button>
          </div>
        )}
      </div>
    </div>
  );
}