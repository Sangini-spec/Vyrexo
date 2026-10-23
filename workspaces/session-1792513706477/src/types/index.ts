export type Priority = 'Urgent' | 'High' | 'Medium' | 'Low';
export type Category = 'Work' | 'Personal' | 'Design' | 'Engineering';
export type TaskStatus = 'todo' | 'doing' | 'done';
export type FilterTab = 'all' | 'active' | 'completed' | 'high';
export type SortKey = 'created' | 'due' | 'priority';
export type ViewMode = 'list' | 'board';
export type ThemeKey = 'cyber' | 'editorial' | 'aurora' | 'slate';

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  category: Category;
  priority: Priority;
  due: string;
  status: TaskStatus;
  subtasks: Subtask[];
  created: number;
}

export interface Draft {
  title: string;
  category: Category;
  priority: Priority;
  due: string;
  subtasks: string[];
}
