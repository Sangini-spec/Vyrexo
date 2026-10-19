import React, { useState, useEffect, useMemo, useCallback } from "react";

type Mode = "focus" | "sprint" | "short" | "long";
type Priority = "high" | "medium" | "low";
interface Task {
  id: number;
  title: string;
  priority: Priority;
  done: boolean;
  pomodoros: number;
  notes: string;
}

type IconName =
  | "brain" | "bolt" | "coffee" | "couch" | "stopwatch" | "play" | "pause"
  | "reset" | "trash" | "list" | "plus" | "check" | "target" | "info" | "x" | "bell" | "circle-check";

const DURATIONS: Record<Mode, number> = { focus: 25 * 60, sprint: 15 * 60, short: 5 * 60, long: 15 * 60 };
const MODE_LABEL: Record<Mode, string> = { focus: "Focus", sprint: "Quick Sprint", short: "Short Break", long: "Long Break" };
const MODE_COLOR: Record<Mode, string> = { focus: "bg-rose-500", sprint: "bg-violet-500", short: "bg-emerald-500", long: "bg-sky-500" };
const MODE_ICON: Record<Mode, IconName> = { focus: "brain", sprint: "bolt", short: "coffee", long: "couch" };
const PRIO_COLOR: Record<Priority, string> = { high: "bg-red-100 text-red-700", medium: "bg-amber-100 text-amber-700", low: "bg-green-100 text-green-700" };
const isWork = (m: Mode) => m === "focus" || m === "sprint";

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: `inline-block align-[-2px] ${className}`,
    "aria-hidden": true,
  };
  switch (name) {
    case "brain":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 3v18M7 8c2 0 3 1 5 1M17 8c-2 0-3 1-5 1M7 15c2 0 3-1 5-1M17 15c-2 0-3-1-5-1" /></svg>;
    case "bolt":
      return <svg {...common}><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></svg>;
    case "coffee":
      return <svg {...common}><path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" /><path d="M17 10h2a2 2 0 0 1 0 4h-2M7 3v2M11 3v2" /></svg>;
    case "couch":
      return <svg {...common}><path d="M4 11V8a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v3" /><path d="M2 14a2 2 0 0 1 4 0v2h12v-2a2 2 0 0 1 4 0v4H2z" /></svg>;
    case "stopwatch":
      return <svg {...common}><circle cx="12" cy="14" r="8" /><path d="M12 14V9M9 2h6M12 2v4" /></svg>;
    case "play":
      return <svg {...common}><path d="M6 4l14 8-14 8z" /></svg>;
    case "pause":
      return <svg {...common}><path d="M8 4v16M16 4v16" /></svg>;
    case "reset":
      return <svg {...common}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></svg>;
    case "trash":
      return <svg {...common}><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>;
    case "list":
      return <svg {...common}><path d="M9 6h12M9 12h12M9 18h12M3 6l1 1 2-2M3 12l1 1 2-2M3 18l1 1 2-2" /></svg>;
    case "plus":
      return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
    case "check":
      return <svg {...common}><path d="M5 12l5 5 9-10" /></svg>;
    case "target":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></svg>;
    case "info":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" /></svg>;
    case "x":
      return <svg {...common}><path d="M6 6l12 12M18 6L6 18" /></svg>;
    case "bell":
      return <svg {...common}><path d="M6 17V11a6 6 0 0 1 12 0v6l2 2H4z" /><path d="M10 21h4" /></svg>;
    case "circle-check":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" /></svg>;
    default:
      return null;
  }
}

function App() {
  const [mode, setMode] = useState<Mode>("focus");
  const [remaining, setRemaining] = useState(DURATIONS.focus);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [focusedSecs, setFocusedSecs] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([
    { id: 1, title: "Plan sprint goals", priority: "high", done: false, pomodoros: 0, notes: "Outline top three goals for the sprint." },
    { id: 2, title: "Review pull requests", priority: "medium", done: false, pomodoros: 0, notes: "Check open PRs and leave feedback." },
  ]);
  const [activeId, setActiveId] = useState<number | null>(1);
  const [newTitle, setNewTitle] = useState("");
  const [newPrio, setNewPrio] = useState<Priority>("medium");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "done">("all");
  const [prioFilter, setPrioFilter] = useState<"all" | Priority>("all");
  const [detailId, setDetailId] = useState<number | null>(null);
  const [toast, setToast] = useState("");

  const notify = useCallback((m: string) => { setToast(m); setTimeout(() => setToast(""), 2500); }, []);

  const switchMode = useCallback((m: Mode) => { setMode(m); setRunning(false); setRemaining(DURATIONS[m]); }, []);

  const startQuickSprint = useCallback(() => {
    setMode("sprint");
    setRemaining(DURATIONS.sprint);
    setRunning(true);
    notify("Quick Sprint started: 15 minutes of deep focus!");
  }, [notify]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setRemaining((r) => (r > 0 ? r - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (remaining !== 0 || !running) return;
    setRunning(false);
    if (isWork(mode)) {
      const next = sessions + 1;
      setSessions(next);
      setFocusedSecs((f) => f + DURATIONS[mode]);
      setTasks((ts) => ts.map((t) => (t.id === activeId ? { ...t, pomodoros: t.pomodoros + 1 } : t)));
      notify(`${MODE_LABEL[mode]} complete! Session ${next} logged. Time for a break.`);
      switchMode(next % 4 === 0 ? "long" : "short");
    } else {
      notify("Break over. Ready to focus!");
      switchMode("focus");
    }
  }, [remaining, running, mode, sessions, activeId, notify, switchMode]);

  useEffect(() => { document.title = `${fmt(remaining)} - ${MODE_LABEL[mode]}`; }, [remaining, mode]);

  const addTask = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const title = newTitle.trim();
    if (!title) return notify("Task title cannot be empty.");
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setTasks((ts) => [...ts, { id, title, priority: newPrio, done: false, pomodoros: 0, notes: "" }]);
    if (activeId === null) setActiveId(id);
    setNewTitle("");
    notify("Task added.");
  };
  const toggleDone = (id: number) => setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const removeTask = (id: number) => {
    setTasks((ts) => ts.filter((t) => t.id !== id));
    if (activeId === id) setActiveId(null);
    if (detailId === id) setDetailId(null);
    notify("Task deleted.");
  };
  const updateNotes = (id: number, notes: string) => setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, notes } : t)));

  const filtered = useMemo(() => tasks.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase()) &&
    (statusFilter === "all" || (statusFilter === "done" ? t.done : !t.done)) &&
    (prioFilter === "all" || t.priority === prioFilter)), [tasks, search, statusFilter, prioFilter]);

  const progress = ((DURATIONS[mode] - remaining) / DURATIONS[mode]) * 100;
  const detail = tasks.find((t) => t.id === detailId) || null;
  const active = tasks.find((t) => t.id === activeId) || null;
  const totalPomos = tasks.reduce((a, t) => a + t.pomodoros, 0);
  const focusedMins = Math.floor(focusedSecs / 60);
  const modes: Mode[] = ["focus", "sprint", "short", "long"];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6">
        <section className="bg-slate-800 rounded-2xl p-6 shadow-xl">
          <h1 className="text-2xl font-bold mb-4"><Icon name="stopwatch" className="mr-2 text-rose-400" />Pomodoro Focus Timer</h1>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {modes.map((m) => (
              <button type="button" key={m} onClick={() => switchMode(m)} aria-pressed={mode === m} className={`py-2 rounded-lg text-sm font-medium transition ${mode === m ? MODE_COLOR[m] + " text-white" : "bg-slate-700 hover:bg-slate-600"}`}>
                <Icon name={MODE_ICON[m]} className="mr-1" />{MODE_LABEL[m]} <span className="opacity-70 text-xs">({DURATIONS[m] / 60}m)</span>
              </button>
            ))}
          </div>
          <div className="text-center">
            <div className="text-7xl font-mono font-bold tabular-nums" aria-live="polite">{fmt(remaining)}</div>
            <div className="text-sm mt-1 text-slate-400">{MODE_LABEL[mode]}</div>
            <div className="h-2 bg-slate-700 rounded-full mt-4 overflow-hidden"><div className={`h-full ${MODE_COLOR[mode]} transition-all`} style={{ width: `${progress}%` }} /></div>
            <p className="mt-3 text-slate-400 text-sm">{active ? <>Working on: <span className="text-slate-100 font-medium">{active.title}</span></> : "No active task selected"}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <button type="button" onClick={() => setRunning((r) => !r)} className={`px-6 py-3 rounded-xl font-semibold ${running ? "bg-amber-500 hover:bg-amber-400" : "bg-emerald-500 hover:bg-emerald-400"} text-white`}>
              <Icon name={running ? "pause" : "play"} className="mr-2" />{running ? "Pause" : remaining < DURATIONS[mode] ? "Resume" : "Start"}
            </button>
            <button type="button" onClick={() => { setRunning(false); setRemaining(DURATIONS[mode]); }} className="px-6 py-3 rounded-xl font-semibold bg-slate-700 hover:bg-slate-600"><Icon name="reset" className="mr-2" />Reset</button>
            <button type="button" onClick={startQuickSprint} title="Start a 15-minute focus sprint immediately" className="px-6 py-3 rounded-xl font-semibold bg-violet-500 hover:bg-violet-400 text-white"><Icon name="bolt" className="mr-2" />Quick Sprint 15m</button>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-6 text-center">
            <div className="bg-slate-700 rounded-lg p-3"><div className="text-2xl font-bold">{sessions}</div><div className="text-xs text-slate-400">Sessions</div></div>
            <div className="bg-slate-700 rounded-lg p-3"><div className="text-2xl font-bold">{totalPomos}</div><div className="text-xs text-slate-400">Task Pomodoros</div></div>
            <div className="bg-slate-700 rounded-lg p-3"><div className="text-2xl font-bold">{focusedMins}m</div><div className="text-xs text-slate-400">Focused</div></div>
          </div>
          <button type="button" onClick={() => { setSessions(0); setFocusedSecs(0); setTasks((ts) => ts.map((t) => ({ ...t, pomodoros: 0 }))); notify("Counters cleared."); }} className="mt-4 text-xs text-slate-400 hover:text-rose-400"><Icon name="trash" className="mr-1" />Clear session counters</button>
        </section>

        <section className="bg-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-semibold mb-4"><Icon name="list" className="mr-2 text-sky-400" />Tasks ({filtered.length}/{tasks.length})</h2>
          <form onSubmit={addTask} className="flex gap-2 mb-4">
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Add a new task..." aria-label="New task title" className="flex-1 bg-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 ring-sky-500" />
            <select value={newPrio} onChange={(e) => setNewPrio(e.target.value as Priority)} aria-label="New task priority" className="bg-slate-700 rounded-lg px-2"><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
            <button type="submit" className="bg-sky-500 hover:bg-sky-400 rounded-lg px-4 font-medium"><Icon name="plus" className="mr-1" />Add Task</button>
          </form>
          <div className="flex gap-2 mb-4 text-sm">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." aria-label="Search tasks" className="flex-1 bg-slate-700 rounded-lg px-3 py-1.5 outline-none" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "all" | "open" | "done")} aria-label="Filter by status" className="bg-slate-700 rounded-lg px-2"><option value="all">All</option><option value="open">Open</option><option value="done">Done</option></select>
            <select value={prioFilter} onChange={(e) => setPrioFilter(e.target.value as "all" | Priority)} aria-label="Filter by priority" className="bg-slate-700 rounded-lg px-2"><option value="all">Any priority</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
          </div>
          <ul className="space-y-2 max-h-96 overflow-y-auto">
            {filtered.length === 0 && <li className="text-center text-slate-500 py-8">No tasks match your filters.</li>}
            {filtered.map((t) => (
              <li key={t.id} className={`flex items-center gap-3 p-3 rounded-lg bg-slate-700 ${activeId === t.id ? "ring-2 ring-rose-400" : ""}`}>
                <button
                  type="button"
                  onClick={() => toggleDone(t.id)}
                  aria-pressed={t.done}
                  aria-label={`Complete ${t.title}`}
                  title={t.done ? "Mark as open" : "Mark as done"}
                  className={`w-6 h-6 flex items-center justify-center rounded border-2 shrink-0 ${t.done ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-400 hover:border-emerald-400"}`}
                >
                  {t.done && <Icon name="check" className="w-3 h-3" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className={`truncate ${t.done ? "line-through text-slate-500" : ""}`}>{t.title}</div>
                  <div className="flex gap-2 items-center mt-1"><span className={`text-xs px-2 rounded-full ${PRIO_COLOR[t.priority]}`}>{t.priority}</span><span className="text-xs text-slate-400"><Icon name="circle-check" className="mr-1" />{t.pomodoros}</span></div>
                </div>
                <button type="button" onClick={() => setActiveId(t.id)} title="Set active" aria-label={`Set ${t.title} active`} className={`p-2 ${activeId === t.id ? "text-rose-400" : "text-slate-400 hover:text-rose-400"}`}><Icon name="target" /></button>
                <button type="button" onClick={() => setDetailId(t.id)} title="Details" aria-label={`Details for ${t.title}`} className="p-2 text-slate-400 hover:text-sky-400"><Icon name="info" /></button>
                <button type="button" onClick={() => removeTask(t.id)} title="Delete" aria-label={`Delete ${t.title}`} className="p-2 text-slate-400 hover:text-red-400"><Icon name="trash" /></button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {detail && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setDetailId(null)}>
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-xl font-bold">{detail.title}</h3>
              <button type="button" onClick={() => setDetailId(null)} aria-label="Close details" className="text-slate-400 hover:text-white"><Icon name="x" /></button>
            </div>
            <div className="flex gap-2 items-center mb-4 text-sm">
              <span className={`px-2 rounded-full ${PRIO_COLOR[detail.priority]}`}>{detail.priority}</span>
              <span className="text-slate-400">{detail.pomodoros} pomodoros</span>
              <span className={detail.done ? "text-emerald-400" : "text-amber-400"}>{detail.done ? "Done" : "Open"}</span>
            </div>
            <label className="block text-sm text-slate-400 mb-1" htmlFor="task-notes">Notes</label>
            <textarea id="task-notes" value={detail.notes} onChange={(e) => updateNotes(detail.id, e.target.value)} rows={4} className="w-full bg-slate-700 rounded-lg p-3 outline-none focus:ring-2 ring-sky-500" />
            <div className="flex flex-wrap gap-2 mt-4">
              <button type="button" onClick={() => { setActiveId(detail.id); notify("Active task updated."); }} className="flex-1 bg-rose-500 hover:bg-rose-400 rounded-lg py-2 font-medium"><Icon name="target" className="mr-1" />Set Active</button>
              <button type="button" onClick={() => { setActiveId(detail.id); setDetailId(null); startQuickSprint(); }} className="flex-1 bg-violet-500 hover:bg-violet-400 rounded-lg py-2 font-medium"><Icon name="bolt" className="mr-1" />Sprint on this</button>
              <button type="button" onClick={() => toggleDone(detail.id)} className="flex-1 bg-emerald-500 hover:bg-emerald-400 rounded-lg py-2 font-medium"><Icon name="check" className="mr-1" />{detail.done ? "Reopen" : "Complete"}</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div role="status" className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-100 text-slate-900 px-4 py-2 rounded-lg shadow-lg z-50 text-sm font-medium">
          <Icon name="bell" className="mr-2" />{toast}
        </div>
      )}
    </div>
  );
}

export default App;