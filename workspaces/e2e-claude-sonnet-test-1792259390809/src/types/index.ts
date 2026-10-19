export interface Task {
  id: string;
  title: string;
  completed: boolean;
}

export interface TimerState {
  timeLeft: number;
  isActive: boolean;
  sessions: number;
  mode: 'work' | 'break';
}