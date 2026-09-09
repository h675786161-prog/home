export type TaskStatus = 'todo' | 'done';

export interface Task {
  id: string;
  title: string;
  category: string | null;
  due_at: string | null;
  status: TaskStatus;
  created_at: string;
}

export interface Note {
  id: string;
  content: string;
  created_at: string;
}
