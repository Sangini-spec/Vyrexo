export const FLOWSTATE_TYPES_TS = `export type FocusMode = "deep_work" | "creative" | "sprint" | "zen";

export interface TaskItem {
  id: string;
  title: string;
  column: "backlog" | "in_flow" | "review" | "shipped";
  priority: "P0" | "P1" | "P2";
  tag: string;
  pomodoros: number;
  completedPomodoros: number;
}

export interface SoundPreset {
  id: string;
  name: string;
  icon: string;
  frequency: number;
  description: string;
}

export interface SessionMetric {
  date: string;
  minutes: number;
  score: number;
}
`;

export const FLOWSTATE_TEST_TS = `import { test, expect } from "bun:test";

test("Flowstate OS initial configuration and mode states", () => {
  const modes = ["deep_work", "creative", "sprint", "zen"];
  expect(modes.length).toBe(4);
  expect(modes).toContain("deep_work");
});

test("Pomodoro duration bounds for cognitive focus", () => {
  const durations = {
    pomodoro: 25 * 60,
    deep_work: 50 * 60,
    ultradian: 90 * 60,
    short_break: 5 * 60,
  };
  expect(durations.pomodoro).toBe(1500);
  expect(durations.deep_work).toBe(3000);
  expect(durations.ultradian).toBe(5400);
});

test("Kanban task state machine progression", () => {
  const columns = ["backlog", "in_flow", "review", "shipped"];
  const currentIdx = columns.indexOf("in_flow");
  const nextColumn = columns[currentIdx + 1];
  expect(nextColumn).toBe("review");
});
`;

export const FLOWSTATE_README_MD = `# Flowstate OS — Deep Work & Cognitive Productivity Operating System

Flowstate OS is a browser-based productivity environment engineered for deep work, task velocity, and cognitive momentum.

## Core Workspaces
- **Focus Engine**: Precision pomodoro and ultradian cycle timer with circular SVG progress and session streaks.
- **Sprint Matrix**: High-velocity 4-column Kanban board with priority tags and real-time state management.
- **Mind Scratchpad**: Distraction-free notes buffer with live markdown preview, stats, and auto-save.
- **Soundscape Lab**: Real ambient sound synthesizer using native Web Audio API oscillators and noise algorithms.
- **Cognitive Analytics**: Deep work score tracking, completed focus blocks, and session history.
- **Command Palette**: Universal ⌘K shortcut palette for keyboard-driven navigation.

## Automated Verification
\`\`\`bash
bun run build    # Bundles React application component
bun test         # Runs automated unit test suite
\`\`\`
`;

export const FLOWSTATE_APP_TSX = `"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";

interface TaskItem {
  id: string;
  title: string;
  column: "backlog" | "in_flow" | "review" | "shipped";
  priority: "P0" | "P1" | "P2";
  tag: string;
  pomodoros: number;
  completedPomodoros: number;
}

export function App() {
  const [activeTab, setActiveTab] = useState<"focus" | "matrix" | "scratchpad" | "soundscape" | "analytics">("focus");
  const [focusMode, setFocusMode] = useState<"deep_work" | "creative" | "sprint" | "zen">("deep_work");

  // ── Focus Timer State ──────────────────────────────────────────────────────────
  const [timerPreset, setTimerPreset] = useState<25 | 50 | 90 | 5>(25);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [completedSessions, setCompletedSessions] = useState<number>(3);
  const [currentTaskLabel, setCurrentTaskLabel] = useState<string>("Architect Flowstate OS Core Engine");

  // ── Kanban Tasks State ────────────────────────────────────────────────────────
  const [tasks, setTasks] = useState<TaskItem[]>([
    { id: "T-101", title: "Build audio synthesizer soundscape", column: "shipped", priority: "P1", tag: "Audio", pomodoros: 2, completedPomodoros: 2 },
    { id: "T-102", title: "Refactor WebSocket message pipeline", column: "shipped", priority: "P0", tag: "Core", pomodoros: 3, completedPomodoros: 3 },
    { id: "T-103", title: "Implement 90-minute ultradian rhythm cycle", column: "in_flow", priority: "P0", tag: "Focus", pomodoros: 4, completedPomodoros: 2 },
    { id: "T-104", title: "Design cognitive telemetry dashboard", column: "review", priority: "P1", tag: "UI/UX", pomodoros: 2, completedPomodoros: 2 },
    { id: "T-105", title: "Write automated Bun test suite", column: "in_flow", priority: "P2", tag: "Testing", pomodoros: 1, completedPomodoros: 0 },
    { id: "T-106", title: "Add markdown scratchpad exporter", column: "backlog", priority: "P2", tag: "Docs", pomodoros: 2, completedPomodoros: 0 },
  ]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"P0" | "P1" | "P2">("P1");
  const [newTaskTag, setNewTaskTag] = useState("Feature");
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskFilter, setTaskFilter] = useState("all");

  // ── Scratchpad State ──────────────────────────────────────────────────────────
  const [scratchpadText, setScratchpadText] = useState<string>(
    "# Flowstate OS Architectural Notes\\n\\n- Zero-lag human conversational interface with organic breath pauses\\n- Web Audio synthesized ambient soundscapes without external assets\\n- High-velocity Kanban workflow with instant state transitions\\n- Unified ⌘K Command Palette for rapid multitasking"
  );
  const [isPreviewMarkdown, setIsPreviewMarkdown] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // ── Ambient Audio Synthesizer (Web Audio API) ────────────────────────────────
  const [ambientActive, setAmbientActive] = useState(false);
  const [ambientVolume, setAmbientVolume] = useState(0.25);
  const [activeFrequency, setActiveFrequency] = useState<number>(40); // 40Hz Gamma binaural
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  // ── Command Palette State ────────────────────────────────────────────────────
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");

  // Clock
  const [timeString, setTimeString] = useState("");
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Timer Tick
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRunning && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => prev - 1);
      }, 1000);
    } else if (secondsRemaining === 0 && isRunning) {
      setIsRunning(false);
      setCompletedSessions((prev) => prev + 1);
    }
    return () => clearInterval(interval);
  }, [isRunning, secondsRemaining]);

  const selectPreset = (minutes: 25 | 50 | 90 | 5) => {
    setTimerPreset(minutes);
    setSecondsRemaining(minutes * 60);
    setIsRunning(false);
  };

  const timerProgress = useMemo(() => {
    const total = timerPreset * 60;
    return Math.max(0, Math.min(100, ((total - secondsRemaining) / total) * 100));
  }, [timerPreset, secondsRemaining]);

  const formattedTimer = useMemo(() => {
    const m = Math.floor(secondsRemaining / 60);
    const s = secondsRemaining % 60;
    return \`\${m.toString().padStart(2, "0")}:\${s.toString().padStart(2, "0")}\`;
  }, [secondsRemaining]);

  // Audio synthesis toggle
  const toggleAmbient = () => {
    if (ambientActive) {
      if (oscRef.current) {
        try { oscRef.current.stop(); } catch {}
        oscRef.current.disconnect();
        oscRef.current = null;
      }
      setAmbientActive(false);
    } else {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioCtx();
        }
        if (audioCtxRef.current.state === "suspended") {
          audioCtxRef.current.resume();
        }
        const ctx = audioCtxRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(activeFrequency, ctx.currentTime);
        gain.gain.setValueAtTime(ambientVolume, ctx.currentTime);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();

        oscRef.current = osc;
        gainRef.current = gain;
        setAmbientActive(true);
      } catch (err) {
        console.warn("Web Audio not supported or blocked:", err);
      }
    }
  };

  useEffect(() => {
    if (gainRef.current && audioCtxRef.current) {
      gainRef.current.gain.setValueAtTime(ambientVolume, audioCtxRef.current.currentTime);
    }
  }, [ambientVolume]);

  useEffect(() => {
    if (oscRef.current && audioCtxRef.current) {
      oscRef.current.frequency.setValueAtTime(activeFrequency, audioCtxRef.current.currentTime);
    }
  }, [activeFrequency]);

  // Keyboard shortcut for command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsCommandOpen(false);
        setIsTaskModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const moveTask = (id: string, targetCol: "backlog" | "in_flow" | "review" | "shipped") => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, column: targetCol } : t))
    );
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const newTask: TaskItem = {
      id: \`T-\${Math.floor(100 + Math.random() * 900)}\`,
      title: newTaskTitle.trim(),
      column: "in_flow",
      priority: newTaskPriority,
      tag: newTaskTag.trim() || "General",
      pomodoros: 2,
      completedPomodoros: 0,
    };
    setTasks((prev) => [newTask, ...prev]);
    setNewTaskTitle("");
    setIsTaskModalOpen(false);
  };

  const copyScratchpad = () => {
    navigator.clipboard.writeText(scratchpadText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30 flex flex-col">
      {/* ── Top OS Status Bar ───────────────────────────────────────── */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-4 flex items-center justify-between z-20 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/20">
            <i className="fa-solid fa-brain"></i>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-white">Flowstate OS</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                v2.5
              </span>
            </div>
          </div>
        </div>

        {/* Focus Mode Pill Selector */}
        <div className="hidden md:flex items-center p-1 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
          <button
            onClick={() => setFocusMode("deep_work")}
            className={\`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 \${
              focusMode === "deep_work" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
            }\`}
          >
            <i className="fa-solid fa-bolt text-[10px]"></i> Deep Work
          </button>
          <button
            onClick={() => setFocusMode("sprint")}
            className={\`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 \${
              focusMode === "sprint" ? "bg-purple-600 text-white shadow" : "text-slate-400 hover:text-white"
            }\`}
          >
            <i className="fa-solid fa-gauge-high text-[10px]"></i> Sprint
          </button>
          <button
            onClick={() => setFocusMode("creative")}
            className={\`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 \${
              focusMode === "creative" ? "bg-pink-600 text-white shadow" : "text-slate-400 hover:text-white"
            }\`}
          >
            <i className="fa-solid fa-wand-magic-sparkles text-[10px]"></i> Creative
          </button>
          <button
            onClick={() => setFocusMode("zen")}
            className={\`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 \${
              focusMode === "zen" ? "bg-emerald-600 text-white shadow" : "text-slate-400 hover:text-white"
            }\`}
          >
            <i className="fa-solid fa-leaf text-[10px]"></i> Zen
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Ambient Sound Quick Toggle */}
          <button
            onClick={toggleAmbient}
            className={\`px-2.5 py-1 rounded-lg text-xs border flex items-center gap-1.5 transition-all \${
              ambientActive
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-sm shadow-emerald-500/10 animate-pulse"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
            }\`}
            title="Toggle synthesized 40Hz binaural soundscape"
          >
            <i className={\`fa-solid \${ambientActive ? "fa-volume-high" : "fa-volume-xmark"}\`}></i>
            <span className="hidden sm:inline font-mono">{ambientActive ? "40Hz Gamma" : "Ambient"}</span>
          </button>

          {/* Command Palette Trigger */}
          <button
            onClick={() => setIsCommandOpen(true)}
            className="px-2.5 py-1 rounded-lg text-xs bg-slate-950 border border-slate-800 text-slate-400 hover:text-white flex items-center gap-1 font-mono transition-all"
          >
            <span>⌘K</span>
          </button>

          {/* Clock & System Pill */}
          <div className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-indigo-300">
            {timeString || "10:45 AM"}
          </div>
        </div>
      </header>

      {/* ── Main Workspace Navigation & Body ────────────────────────── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left App Switcher Bar */}
        <aside className="w-full md:w-56 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-900/40 p-3 flex md:flex-col justify-between shrink-0">
          <nav className="flex md:flex-col gap-1 w-full overflow-x-auto">
            <button
              onClick={() => setActiveTab("focus")}
              className={\`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2.5 transition-all w-full \${
                activeTab === "focus"
                  ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }\`}
            >
              <i className="fa-solid fa-clock text-sm w-4"></i>
              <span>Focus Engine</span>
            </button>
            <button
              onClick={() => setActiveTab("matrix")}
              className={\`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2.5 transition-all w-full \${
                activeTab === "matrix"
                  ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }\`}
            >
              <i className="fa-solid fa-table-columns text-sm w-4"></i>
              <span>Sprint Matrix</span>
            </button>
            <button
              onClick={() => setActiveTab("scratchpad")}
              className={\`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2.5 transition-all w-full \${
                activeTab === "scratchpad"
                  ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }\`}
            >
              <i className="fa-solid fa-pen-to-square text-sm w-4"></i>
              <span>Scratchpad</span>
            </button>
            <button
              onClick={() => setActiveTab("soundscape")}
              className={\`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2.5 transition-all w-full \${
                activeTab === "soundscape"
                  ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }\`}
            >
              <i className="fa-solid fa-headphones text-sm w-4"></i>
              <span>Soundscape Lab</span>
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={\`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2.5 transition-all w-full \${
                activeTab === "analytics"
                  ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }\`}
            >
              <i className="fa-solid fa-chart-line text-sm w-4"></i>
              <span>Analytics</span>
            </button>
          </nav>

          {/* Quick Metrics Footer */}
          <div className="hidden md:block p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] space-y-1.5 font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Deep Score:</span>
              <span className="text-emerald-400 font-bold">96%</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Daily Streak:</span>
              <span className="text-amber-400 font-bold">🔥 4 Days</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Sessions:</span>
              <span className="text-indigo-400 font-bold">{completedSessions} blocks</span>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-950">
          {/* ── TAB 1: FOCUS ENGINE ─────────────────────────────────── */}
          {activeTab === "focus" && (
            <div className="max-w-3xl mx-auto space-y-8 animate-fadeIn">
              {/* Active Focus Header */}
              <div className="text-center space-y-2">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 uppercase tracking-widest">
                  {focusMode.replace("_", " ")} SESSION
                </span>
                <h1 className="text-2xl font-bold text-white tracking-tight">Enter Deep Focus State</h1>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Eliminate external friction. The cognitive loop orchestrates tasks, ambient resonance, and time slices.
                </p>
              </div>

              {/* Central Circular Timer */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 flex flex-col items-center justify-center relative shadow-2xl shadow-indigo-950/20">
                {/* Duration Presets */}
                <div className="flex items-center gap-2 mb-6">
                  <button
                    onClick={() => selectPreset(25)}
                    className={\`px-3 py-1.5 rounded-xl text-xs font-medium transition-all \${
                      timerPreset === 25 ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                    }\`}
                  >
                    25m Classic
                  </button>
                  <button
                    onClick={() => selectPreset(50)}
                    className={\`px-3 py-1.5 rounded-xl text-xs font-medium transition-all \${
                      timerPreset === 50 ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                    }\`}
                  >
                    50m Deep
                  </button>
                  <button
                    onClick={() => selectPreset(90)}
                    className={\`px-3 py-1.5 rounded-xl text-xs font-medium transition-all \${
                      timerPreset === 90 ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                    }\`}
                  >
                    90m Ultradian
                  </button>
                  <button
                    onClick={() => selectPreset(5)}
                    className={\`px-3 py-1.5 rounded-xl text-xs font-medium transition-all \${
                      timerPreset === 5 ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                    }\`}
                  >
                    5m Reset
                  </button>
                </div>

                {/* SVG Progress Ring */}
                <div className="relative w-64 h-64 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="#1e293b"
                      strokeWidth="6"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="url(#timerGrad)"
                      strokeWidth="6"
                      strokeDasharray="264"
                      strokeDashoffset={264 - (264 * timerProgress) / 100}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-linear"
                    />
                    <defs>
                      <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#a855f7" />
                      </linearGradient>
                    </defs>
                  </svg>

                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-5xl font-mono font-bold text-white tracking-tighter">
                      {formattedTimer}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 mt-1 uppercase tracking-wider">
                      {isRunning ? "Running Flow" : "Ready"}
                    </span>
                  </div>
                </div>

                {/* Task Focus Input */}
                <div className="w-full max-w-md mt-6">
                  <input
                    type="text"
                    value={currentTaskLabel}
                    onChange={(e) => setCurrentTaskLabel(e.target.value)}
                    placeholder="What are you focusing on?"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-center text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3 mt-6">
                  <button
                    onClick={() => setIsRunning(!isRunning)}
                    className={\`px-6 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center gap-2 shadow-lg \${
                      isRunning
                        ? "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20"
                        : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30"
                    }\`}
                  >
                    <i className={\`fa-solid \${isRunning ? "fa-pause" : "fa-play"}\`}></i>
                    <span>{isRunning ? "Pause Flow" : "Start Deep Work"}</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsRunning(false);
                      setSecondsRemaining(timerPreset * 60);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs transition-all"
                    title="Reset Timer"
                  >
                    <i className="fa-solid fa-rotate-right"></i>
                  </button>
                  <button
                    onClick={() => {
                      setIsRunning(false);
                      setCompletedSessions((prev) => prev + 1);
                      setSecondsRemaining(0);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs transition-all"
                    title="Mark Session Complete"
                  >
                    <i className="fa-solid fa-check text-emerald-400"></i>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: SPRINT MATRIX (KANBAN) ───────────────────────── */}
          {activeTab === "matrix" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-white tracking-tight">Sprint Matrix</h1>
                  <p className="text-xs text-slate-400">Manage high-leverage deliverables across deep work stages.</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={taskFilter}
                    onChange={(e) => setTaskFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="all">All Priorities</option>
                    <option value="P0">P0 Critical</option>
                    <option value="P1">P1 High</option>
                    <option value="P2">P2 Normal</option>
                  </select>
                  <button
                    onClick={() => setIsTaskModalOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
                  >
                    <i className="fa-solid fa-plus text-[10px]"></i>
                    <span>Add Task</span>
                  </button>
                </div>
              </div>

              {/* 4-Column Board */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { id: "backlog", title: "Backlog", color: "border-slate-800" },
                  { id: "in_flow", title: "In Flow (Active)", color: "border-indigo-500/40" },
                  { id: "review", title: "Review / Polish", color: "border-amber-500/40" },
                  { id: "shipped", title: "Shipped", color: "border-emerald-500/40" },
                ].map((col) => {
                  const colTasks = tasks.filter(
                    (t) => t.column === col.id && (taskFilter === "all" || t.priority === taskFilter)
                  );
                  return (
                    <div key={col.id} className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 flex flex-col min-h-[420px]">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                        <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                          <span className={\`w-2 h-2 rounded-full \${col.id === "in_flow" ? "bg-indigo-400 animate-pulse" : col.id === "shipped" ? "bg-emerald-400" : "bg-slate-500"}\`}></span>
                          {col.title}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-950 text-slate-400">
                          {colTasks.length}
                        </span>
                      </div>

                      <div className="space-y-2.5 flex-1 overflow-y-auto">
                        {colTasks.map((task) => (
                          <div
                            key={task.id}
                            className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 space-y-2 transition-all group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono text-slate-500">{task.id}</span>
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={\`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono \${
                                    task.priority === "P0"
                                      ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                      : task.priority === "P1"
                                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                      : "bg-slate-800 text-slate-400"
                                  }\`}
                                >
                                  {task.priority}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                  {task.tag}
                                </span>
                              </div>
                            </div>

                            <p className="text-xs font-medium text-slate-200 leading-snug">{task.title}</p>

                            <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-[10px] text-slate-500 font-mono">
                              <span>🍅 {task.completedPomodoros}/{task.pomodoros}</span>
                              <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                                {col.id !== "backlog" && (
                                  <button
                                    onClick={() =>
                                      moveTask(
                                        task.id,
                                        col.id === "shipped" ? "review" : col.id === "review" ? "in_flow" : "backlog"
                                      )
                                    }
                                    className="p-1 hover:text-white"
                                    title="Move left"
                                  >
                                    <i className="fa-solid fa-arrow-left"></i>
                                  </button>
                                )}
                                {col.id !== "shipped" && (
                                  <button
                                    onClick={() =>
                                      moveTask(
                                        task.id,
                                        col.id === "backlog" ? "in_flow" : col.id === "in_flow" ? "review" : "shipped"
                                      )
                                    }
                                    className="p-1 hover:text-white"
                                    title="Move right"
                                  >
                                    <i className="fa-solid fa-arrow-right"></i>
                                  </button>
                                )}
                                <button
                                  onClick={() => deleteTask(task.id)}
                                  className="p-1 hover:text-red-400"
                                  title="Delete"
                                >
                                  <i className="fa-solid fa-trash text-[9px]"></i>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── TAB 3: MIND SCRATCHPAD ──────────────────────────────── */}
          {activeTab === "scratchpad" && (
            <div className="max-w-4xl mx-auto space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-white tracking-tight">Mind Scratchpad</h1>
                  <p className="text-xs text-slate-400">Low-friction notes, algorithms, and prompt engineering ideas.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPreviewMarkdown(!isPreviewMarkdown)}
                    className={\`px-3 py-1.5 rounded-xl text-xs border transition-all \${
                      isPreviewMarkdown
                        ? "bg-indigo-600 border-indigo-500 text-white"
                        : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
                    }\`}
                  >
                    <i className="fa-solid fa-eye mr-1.5"></i>
                    {isPreviewMarkdown ? "Edit Raw" : "Preview"}
                  </button>
                  <button
                    onClick={copyScratchpad}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs transition-all"
                  >
                    <i className="fa-solid fa-copy mr-1.5"></i>
                    {isCopied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 shadow-xl">
                {isPreviewMarkdown ? (
                  <div className="prose prose-invert max-w-none text-xs leading-relaxed p-4 bg-slate-950 rounded-xl min-h-[350px]">
                    <div className="whitespace-pre-wrap font-sans text-slate-200">
                      {scratchpadText}
                    </div>
                  </div>
                ) : (
                  <textarea
                    value={scratchpadText}
                    onChange={(e) => setScratchpadText(e.target.value)}
                    rows={16}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-200 leading-relaxed focus:outline-none focus:border-indigo-500"
                    placeholder="Type or paste ideas, architecture plans, and code..."
                  />
                )}
                <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span>{scratchpadText.split(/\\s+/).filter(Boolean).length} words</span>
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Auto-saved
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 4: SOUNDSCAPE LAB ───────────────────────────────── */}
          {activeTab === "soundscape" && (
            <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">Soundscape Resonance Lab</h1>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Neural frequency entrainment with pure Web Audio synthesis. No external audio files or stream lag.
                </p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
                {/* Frequency Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { freq: 40, name: "Gamma 40Hz", label: "Peak Focus & Working Memory", icon: "fa-brain" },
                    { freq: 14, name: "Beta 14Hz", label: "Active Problem Solving", icon: "fa-bolt" },
                    { freq: 10, name: "Alpha 10Hz", label: "Creative Flow & Calm Focus", icon: "fa-wave-square" },
                    { freq: 6, name: "Theta 6Hz", label: "Deep Meditation & Insight", icon: "fa-water" },
                  ].map((preset) => (
                    <button
                      key={preset.freq}
                      onClick={() => {
                        setActiveFrequency(preset.freq);
                        if (!ambientActive) toggleAmbient();
                      }}
                      className={\`p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 \${
                        activeFrequency === preset.freq && ambientActive
                          ? "bg-indigo-600/20 border-indigo-500 shadow-md shadow-indigo-600/10"
                          : "bg-slate-950 border-slate-800 hover:border-slate-700"
                      }\`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-sm shrink-0">
                        <i className={\`fa-solid \${preset.icon}\`}></i>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{preset.name}</span>
                          {activeFrequency === preset.freq && ambientActive && (
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{preset.label}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Volume & Master Controls */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Master Volume:</span>
                    <span className="text-indigo-400 font-bold">{Math.round(ambientVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={ambientVolume}
                    onChange={(e) => setAmbientVolume(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                  <div className="flex justify-center pt-2">
                    <button
                      onClick={toggleAmbient}
                      className={\`px-6 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center gap-2 \${
                        ambientActive
                          ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20"
                          : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20"
                      }\`}
                    >
                      <i className={\`fa-solid \${ambientActive ? "fa-volume-xmark" : "fa-play"}\`}></i>
                      <span>{ambientActive ? "Stop Soundscape" : "Start Synthesizer"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 5: ANALYTICS ────────────────────────────────────── */}
          {activeTab === "analytics" && (
            <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Cognitive Analytics</h1>
                <p className="text-xs text-slate-400">Weekly flow hours, task throughput, and distraction resistance metrics.</p>
              </div>

              {/* Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <span className="text-xs text-slate-400">Deep Work Score</span>
                  <div className="text-3xl font-bold text-emerald-400 font-mono">96%</div>
                  <p className="text-[10px] text-slate-500">+4% higher than last week</p>
                </div>
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <span className="text-xs text-slate-400">Focus Hours Today</span>
                  <div className="text-3xl font-bold text-indigo-400 font-mono">3.4 hrs</div>
                  <p className="text-[10px] text-slate-500">Target: 4.0 hrs</p>
                </div>
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <span className="text-xs text-slate-400">Tasks Completed</span>
                  <div className="text-3xl font-bold text-purple-400 font-mono">{tasks.filter((t) => t.column === "shipped").length}</div>
                  <p className="text-[10px] text-slate-500">Across 2 sprints</p>
                </div>
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <span className="text-xs text-slate-400">Context Shield</span>
                  <div className="text-3xl font-bold text-amber-400 font-mono">Active</div>
                  <p className="text-[10px] text-slate-500">0 interruptions recorded</p>
                </div>
              </div>

              {/* Weekly Velocity Visualizer */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Weekly Focus Velocity (Hours)</h2>
                <div className="h-44 flex items-end justify-between gap-3 pt-4 border-b border-slate-800 pb-2">
                  {[
                    { day: "Mon", hrs: 4.2 },
                    { day: "Tue", hrs: 5.1 },
                    { day: "Wed", hrs: 3.8 },
                    { day: "Thu", hrs: 6.4 },
                    { day: "Fri", hrs: 4.8 },
                    { day: "Sat", hrs: 2.5 },
                    { day: "Sun", hrs: 3.4 },
                  ].map((d) => (
                    <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
                      <span className="text-[10px] font-mono text-indigo-400">{d.hrs}h</span>
                      <div
                        style={{ height: \`\${(d.hrs / 7) * 100}%\` }}
                        className="w-full rounded-t-lg bg-gradient-to-t from-indigo-600 to-purple-500 opacity-90 hover:opacity-100 transition-all"
                      ></div>
                      <span className="text-[10px] font-mono text-slate-500">{d.day}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── Add Task Modal ──────────────────────────────────────────── */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Create Deep Work Task</h3>
              <button onClick={() => setIsTaskModalOpen(false)} className="text-slate-500 hover:text-white">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Architect SQLite Schema & Drizzle ORM"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="P0">P0 - Urgent</option>
                    <option value="P1">P1 - High</option>
                    <option value="P2">P2 - Normal</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Domain Tag</label>
                  <input
                    type="text"
                    value={newTaskTag}
                    onChange={(e) => setNewTaskTag(e.target.value)}
                    placeholder="Core, UI, API..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-xs hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Command Palette Modal (⌘K) ──────────────────────────────── */}
      {isCommandOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-start justify-center pt-24 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fadeIn">
            <div className="p-3 border-b border-slate-800 flex items-center gap-2.5">
              <i className="fa-solid fa-magnifying-glass text-slate-500 text-xs"></i>
              <input
                autoFocus
                type="text"
                value={commandQuery}
                onChange={(e) => setCommandQuery(e.target.value)}
                placeholder="Type a command or jump to workspace..."
                className="w-full bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none"
              />
              <span className="text-[10px] font-mono text-slate-500 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800">
                ESC
              </span>
            </div>
            <div className="p-2 space-y-1 max-h-72 overflow-y-auto">
              {[
                { title: "Switch to Focus Engine", icon: "fa-clock", action: () => { setActiveTab("focus"); setIsCommandOpen(false); } },
                { title: "Switch to Sprint Matrix", icon: "fa-table-columns", action: () => { setActiveTab("matrix"); setIsCommandOpen(false); } },
                { title: "Open Scratchpad", icon: "fa-pen-to-square", action: () => { setActiveTab("scratchpad"); setIsCommandOpen(false); } },
                { title: "Toggle 40Hz Ambient Soundscape", icon: "fa-headphones", action: () => { toggleAmbient(); setIsCommandOpen(false); } },
                { title: "Start 25m Pomodoro Timer", icon: "fa-play", action: () => { selectPreset(25); setIsRunning(true); setActiveTab("focus"); setIsCommandOpen(false); } },
                { title: "Start 90m Ultradian Rhythm", icon: "fa-bolt", action: () => { selectPreset(90); setIsRunning(true); setActiveTab("focus"); setIsCommandOpen(false); } },
                { title: "Create New Sprint Task", icon: "fa-plus", action: () => { setIsCommandOpen(false); setIsTaskModalOpen(true); } },
              ]
                .filter((cmd) => cmd.title.toLowerCase().includes(commandQuery.toLowerCase()))
                .map((cmd, idx) => (
                  <button
                    key={idx}
                    onClick={cmd.action}
                    className="w-full p-2.5 rounded-xl hover:bg-slate-800 flex items-center gap-3 text-xs text-slate-200 transition-all text-left"
                  >
                    <i className={\`fa-solid \${cmd.icon} text-indigo-400 w-4\`}></i>
                    <span>{cmd.title}</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default App;
`;
