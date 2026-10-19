export interface Task {
  id: string;
  title: string;
  priority: 'P0' | 'P1' | 'P2';
  completed: boolean;
}

export interface TimerState {
  timeLeft: number;
  isActive: boolean;
  mode: 'pomodoro' | 'shortBreak' | 'longBreak';
  streak: number;
}