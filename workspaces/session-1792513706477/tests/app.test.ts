import { test, expect } from "bun:test";

type Priority = 'Urgent' | 'High' | 'Medium' | 'Low';
interface T { title: string; priority: Priority; status: 'todo' | 'doing' | 'done'; subs: boolean[] }

const W: Record<Priority, number> = { Urgent: 4, High: 3, Medium: 2, Low: 1 };
const rate = (ts: T[]) => ts.length ? Math.round(ts.filter(t => t.status === 'done').length / ts.length * 100) : 0;
const progress = (t: T) => t.status === 'done' ? 100 : t.subs.length ? Math.round(t.subs.filter(Boolean).length / t.subs.length * 100) : 0;
const filter = (ts: T[], tab: string, q = '') => ts.filter(t => {
  if (tab === 'active' && t.status === 'done') return false;
  if (tab === 'completed' && t.status !== 'done') return false;
  if (tab === 'high' && W[t.priority] < 3) return false;
  return t.title.toLowerCase().includes(q.toLowerCase());
});
const toggle = (t: T): T => ({ ...t, status: t.status === 'done' ? 'todo' : 'done' });

const data: T[] = [
  { title: 'Ship deck', priority: 'Urgent', status: 'doing', subs: [true, false] },
  { title: 'Fix bug', priority: 'High', status: 'todo', subs: [] },
  { title: 'Dentist', priority: 'Low', status: 'todo', subs: [] },
  { title: 'Notes', priority: 'Medium', status: 'done', subs: [true] },
];

test("completion rate calculation", () => {
  expect(rate(data)).toBe(25);
  expect(rate([])).toBe(0);
});

test("filter tabs", () => {
  expect(filter(data, 'active').length).toBe(3);
  expect(filter(data, 'completed').length).toBe(1);
  expect(filter(data, 'high').map(t => t.title)).toEqual(['Ship deck', 'Fix bug']);
});

test("search is case-insensitive", () => {
  expect(filter(data, 'all', 'FIX').length).toBe(1);
});

test("subtask progress", () => {
  expect(progress(data[0])).toBe(50);
  expect(progress(data[3])).toBe(100);
  expect(progress(data[1])).toBe(0);
});

test("toggle transitions are reversible", () => {
  const t = toggle(data[1]);
  expect(t.status).toBe('done');
  expect(toggle(t).status).toBe('todo');
});

test("priority sort puts Urgent first", () => {
  const sorted = [...data].sort((a, b) => W[b.priority] - W[a.priority]);
  expect(sorted[0].priority).toBe('Urgent');
  expect(sorted[sorted.length - 1].priority).toBe('Low');
});
