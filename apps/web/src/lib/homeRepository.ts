import { supabase } from './supabase';
import type { Note, Task } from './types';

const TASKS_KEY = 'lingqi.home.demo.tasks.v1';
const NOTES_KEY = 'lingqi.home.demo.notes.v1';

const seedTasks: Task[] = [
  {
    id: crypto.randomUUID(),
    title: '把 Home 的第一根房梁搭起来',
    category: 'Home',
    due_at: null,
    status: 'done',
    created_at: new Date().toISOString()
  },
  {
    id: crypto.randomUUID(),
    title: '接上共同生活数据库',
    category: 'Home',
    due_at: null,
    status: 'todo',
    created_at: new Date().toISOString()
  }
];

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export async function listTasks(): Promise<Task[]> {
  if (!supabase) {
    const current = readLocal<Task[]>(TASKS_KEY, seedTasks);
    writeLocal(TASKS_KEY, current);
    return current;
  }

  const { data, error } = await supabase
    .from('tasks')
    .select('id,title,category,due_at,status,created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Task[];
}

export async function createTask(title: string): Promise<Task> {
  if (!supabase) {
    const next: Task = {
      id: crypto.randomUUID(),
      title,
      category: null,
      due_at: null,
      status: 'todo',
      created_at: new Date().toISOString()
    };
    const current = readLocal<Task[]>(TASKS_KEY, seedTasks);
    writeLocal(TASKS_KEY, [next, ...current]);
    return next;
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert({ title })
    .select('id,title,category,due_at,status,created_at')
    .single();

  if (error) throw error;
  return data as Task;
}

export async function setTaskDone(id: string, done: boolean): Promise<void> {
  if (!supabase) {
    const current = readLocal<Task[]>(TASKS_KEY, seedTasks);
    writeLocal(
      TASKS_KEY,
      current.map((task) => (task.id === id ? { ...task, status: done ? 'done' : 'todo' } : task))
    );
    return;
  }

  const { error } = await supabase.from('tasks').update({ status: done ? 'done' : 'todo' }).eq('id', id);
  if (error) throw error;
}

export async function listNotes(): Promise<Note[]> {
  if (!supabase) return readLocal<Note[]>(NOTES_KEY, []);

  const { data, error } = await supabase
    .from('notes')
    .select('id,content,created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return (data ?? []) as Note[];
}

export async function createNote(content: string): Promise<Note> {
  if (!supabase) {
    const next: Note = { id: crypto.randomUUID(), content, created_at: new Date().toISOString() };
    const current = readLocal<Note[]>(NOTES_KEY, []);
    writeLocal(NOTES_KEY, [next, ...current]);
    return next;
  }

  const { data, error } = await supabase.from('notes').insert({ content }).select('id,content,created_at').single();
  if (error) throw error;
  return data as Note;
}
