export type Mode = "focus" | "sprint" | "short" | "long";

export type Priority = "high" | "medium" | "low";

export interface Task {
  id: number;
  title: string;
  priority: Priority;
  done: boolean;
  pomodoros: number;
  notes: string;
}

export interface TimerState {
  mode: Mode;
  remaining: number;
  running: boolean;
  sessions: number;
  focusedSecs: number;
}

export interface TaskFilter {
  search: string;
  status: "all" | "open" | "done";
  priority: "all" | Priority;
}
