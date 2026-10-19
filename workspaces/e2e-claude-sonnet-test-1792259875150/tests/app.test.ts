import { test, expect } from "bun:test";

type Mode = "focus" | "sprint" | "short" | "long";
type Priority = "high" | "medium" | "low";
interface Task { id: number; title: string; priority: Priority; done: boolean; pomodoros: number; }

const DURATIONS: Record<Mode, number> = { focus: 25 * 60, sprint: 15 * 60, short: 5 * 60, long: 15 * 60 };

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

const isWork = (m: Mode) => m === "focus" || m === "sprint";

const nextBreak = (sessions: number): Mode => (sessions % 4 === 0 ? "long" : "short");

const progress = (mode: Mode, remaining: number) => ((DURATIONS[mode] - remaining) / DURATIONS[mode]) * 100;

// Mirrors the Quick Sprint button handler: switch to sprint, full duration, running.
const startQuickSprint = () => ({ mode: "sprint" as Mode, remaining: DURATIONS.sprint, running: true });

// Mirrors session completion: work modes add their own duration to focused time.
const completeSession = (mode: Mode, sessions: number, focusedSecs: number) => ({
  sessions: sessions + 1,
  focusedSecs: focusedSecs + DURATIONS[mode],
  nextMode: nextBreak(sessions + 1),
});

const filterTasks = (tasks: Task[], search: string, status: "all" | "open" | "done", prio: "all" | Priority) =>
  tasks.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase()) &&
    (status === "all" || (status === "done") === t.done) &&
    (prio === "all" || t.priority === prio));

const tasks: Task[] = [
  { id: 1, title: "Write report", priority: "high", done: false, pomodoros: 2 },
  { id: 2, title: "Email clients", priority: "low", done: true, pomodoros: 1 },
  { id: 3, title: "Review code", priority: "high", done: true, pomodoros: 3 },
];

test("formats seconds as MM:SS, including the 15-minute sprint", () => {
  expect(fmt(DURATIONS.focus)).toBe("25:00");
  expect(fmt(DURATIONS.sprint)).toBe("15:00");
  expect(fmt(65)).toBe("01:05");
  expect(fmt(0)).toBe("00:00");
});

test("quick sprint preset starts a running 15-minute timer in sprint mode", () => {
  const s = startQuickSprint();
  expect(s.mode).toBe("sprint");
  expect(s.remaining).toBe(900);
  expect(s.running).toBe(true);
  expect(isWork(s.mode)).toBe(true);
  expect(isWork("short")).toBe(false);
});

test("completing a sprint logs 15 focused minutes and schedules the right break", () => {
  const r = completeSession("sprint", 0, 0);
  expect(r.sessions).toBe(1);
  expect(r.focusedSecs).toBe(15 * 60);
  expect(r.nextMode).toBe("short");
  const fourth = completeSession("focus", 3, 0);
  expect(fourth.nextMode).toBe("long");
  expect(fourth.focusedSecs).toBe(25 * 60);
});

test("progress is 0 at start, 50 halfway, and 100 at finish for sprint and other modes", () => {
  expect(progress("sprint", DURATIONS.sprint)).toBe(0);
  expect(progress("sprint", DURATIONS.sprint / 2)).toBe(50);
  expect(progress("short", DURATIONS.short / 2)).toBe(50);
  expect(progress("long", 0)).toBe(100);
});

test("task filtering combines search, status, and priority", () => {
  expect(filterTasks(tasks, "", "all", "all").length).toBe(3);
  expect(filterTasks(tasks, "REVIEW", "all", "all").map((t) => t.id)).toEqual([3]);
  expect(filterTasks(tasks, "", "done", "high").map((t) => t.id)).toEqual([3]);
  expect(filterTasks(tasks, "", "open", "low").length).toBe(0);
});

test("duration invariants: focus > sprint > short, and sprint is shorter than a full pomodoro", () => {
  expect(DURATIONS.focus).toBeGreaterThan(DURATIONS.sprint);
  expect(DURATIONS.sprint).toBeGreaterThan(DURATIONS.short);
  expect(DURATIONS.sprint).toBe(15 * 60);
});
