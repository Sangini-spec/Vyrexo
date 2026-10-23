"use client";
import React, { useCallback, useEffect, useMemo, useState } from 'react';

type Priority = 'Urgent' | 'High' | 'Medium' | 'Low';
type Category = 'Work' | 'Personal' | 'Design' | 'Engineering';
type TaskStatus = 'todo' | 'doing' | 'done';
type FilterTab = 'all' | 'active' | 'completed' | 'high';
type SortKey = 'created' | 'due' | 'priority';
type ViewMode = 'list' | 'board';
type ThemeKey = 'cyber' | 'editorial' | 'aurora' | 'slate';
interface Subtask { id: string; title: string; done: boolean }
interface Task { id: string; title: string; category: Category; priority: Priority; due: string; status: TaskStatus; subtasks: Subtask[]; created: number }
interface Draft { title: string; category: Category; priority: Priority; due: string; subtasks: string[] }
interface Theme { label: string; icon: string; root: string; header: string; card: string; input: string; btn: string; ghost: string; muted: string; accent: string; chip: string; font: string }

const PRIORITIES: Priority[] = ['Urgent', 'High', 'Medium', 'Low'];
const CATEGORIES: Category[] = ['Work', 'Personal', 'Design', 'Engineering'];
const CAT_ICON: Record<Category, string> = { Work: 'fa-briefcase', Personal: 'fa-user', Design: 'fa-pen-ruler', Engineering: 'fa-code' };
const PRIO_CLS: Record<Priority, string> = { Urgent: 'bg-red-500/20 text-red-500 border-red-500/50', High: 'bg-orange-500/20 text-orange-500 border-orange-500/50', Medium: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/50', Low: 'bg-green-500/20 text-green-600 border-green-500/50' };
const PRIO_W: Record<Priority, number> = { Urgent: 4, High: 3, Medium: 2, Low: 1 };
const COLUMNS: { key: TaskStatus; label: string; icon: string }[] = [
  { key: 'todo', label: 'To Do', icon: 'fa-circle-dot' },
  { key: 'doing', label: 'In Progress', icon: 'fa-spinner' },
  { key: 'done', label: 'Done', icon: 'fa-circle-check' },
];
const TABS: { key: FilterTab; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'fa-layer-group' },
  { key: 'active', label: 'Active', icon: 'fa-bolt' },
  { key: 'completed', label: 'Completed', icon: 'fa-circle-check' },
  { key: 'high', label: 'High Priority', icon: 'fa-fire' },
];
const KEY = 'taskflow.tasks.v3';
const TKEY = 'taskflow.theme.v3';

const THEMES: Record<ThemeKey, Theme> = {
  cyber: { label: 'Cyber Neon', icon: 'fa-microchip', root: 'bg-gradient-to-br from-[#1d0b40] via-[#07070f] to-black text-cyan-50', header: 'bg-[#101022]/90 border-cyan-400/30', card: 'bg-[#101022]/90 border border-cyan-400/30 rounded-md shadow-[0_0_14px_rgba(0,240,255,.15)]', input: 'bg-black/40 border border-cyan-400/30 rounded-md text-cyan-50 placeholder-slate-500 focus:outline-none focus:border-cyan-300', btn: 'bg-cyan-400 text-black hover:bg-fuchsia-500 hover:text-white rounded-md shadow-[0_0_14px_rgba(0,240,255,.5)]', ghost: 'border border-cyan-400/30 hover:bg-cyan-400/10 rounded-md', muted: 'text-slate-400', accent: 'text-cyan-300', chip: 'bg-cyan-400/10 border-cyan-400/30', font: 'font-mono' },
  editorial: { label: 'Warm Editorial', icon: 'fa-feather-pointed', root: 'bg-[#f6efe2] text-[#2b2118]', header: 'bg-[#fffaf0] border-[#d9c9ad]', card: 'bg-[#fffaf0] border border-[#d9c9ad] rounded-sm shadow-[4px_4px_0_rgba(43,33,24,.12)]', input: 'bg-white border border-[#d9c9ad] rounded-sm text-[#2b2118] placeholder-[#8a7762] focus:outline-none focus:border-[#b4452a]', btn: 'bg-[#b4452a] text-[#fff8ef] hover:bg-[#2f5d50] rounded-sm', ghost: 'border border-[#d9c9ad] hover:bg-[#b4452a]/10 rounded-sm', muted: 'text-[#8a7762]', accent: 'text-[#b4452a]', chip: 'bg-[#b4452a]/10 border-[#d9c9ad]', font: 'font-serif' },
  aurora: { label: 'Glass Aurora', icon: 'fa-wand-magic-sparkles', root: 'bg-gradient-to-br from-[#1b1147] via-[#0f3a5f] to-[#0d5c63] text-white', header: 'bg-white/10 backdrop-blur-xl border-white/20', card: 'bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl', input: 'bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-200/60 focus:outline-none focus:border-emerald-300', btn: 'bg-emerald-300 text-[#08201c] hover:bg-violet-300 rounded-xl', ghost: 'border border-white/20 hover:bg-white/10 rounded-xl', muted: 'text-blue-200', accent: 'text-emerald-300', chip: 'bg-white/10 border-white/20', font: 'font-sans' },
  slate: { label: 'Minimal Slate', icon: 'fa-circle-half-stroke', root: 'bg-slate-100 text-slate-900', header: 'bg-white border-slate-200', card: 'bg-white border border-slate-200 rounded-xl shadow-sm', input: 'bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500', btn: 'bg-slate-700 text-white hover:bg-blue-500 rounded-lg', ghost: 'border border-slate-200 hover:bg-slate-100 rounded-lg', muted: 'text-slate-500', accent: 'text-blue-500', chip: 'bg-slate-100 border-slate-200', font: 'font-sans' },
};

const uid = () => Math.random().toString(36).slice(2, 10);
const day = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const SEED: Task[] = [
  { id: 'a1', title: 'Ship Q3 roadmap deck', category: 'Work', priority: 'Urgent', due: day(1), status: 'doing', created: 1, subtasks: [{ id: 's1', title: 'Collect metrics', done: true }, { id: 's2', title: 'Draft slides', done: false }] },
  { id: 'a2', title: 'Redesign onboarding flow', category: 'Design', priority: 'High', due: day(3), status: 'todo', created: 2, subtasks: [{ id: 's3', title: 'Wireframes', done: false }] },
  { id: 'a3', title: 'Fix auth token refresh bug', category: 'Engineering', priority: 'High', due: day(-1), status: 'todo', created: 3, subtasks: [] },
  { id: 'a4', title: 'Book dentist appointment', category: 'Personal', priority: 'Low', due: day(7), status: 'todo', created: 4, subtasks: [] },
  { id: 'a5', title: 'Weekly team sync notes', category: 'Work', priority: 'Medium', due: day(0), status: 'done', created: 5, subtasks: [{ id: 's4', title: 'Send recap', done: true }] },
];
const EMPTY: Draft = { title: '', category: 'Work', priority: 'Medium', due: '', subtasks: [] };

function load<T>(k: string, d: T): T {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; }
}
const pct = (t: Task) => t.status === 'done' ? 100 : t.subtasks.length ? Math.round(t.subtasks.filter(s => s.done).length / t.subtasks.length * 100) : 0;

export function App() {
  const [tasks, setTasks] = useState<Task[]>(() => load(KEY, SEED));
  const [theme, setTheme] = useState<ThemeKey>(() => load<ThemeKey>(TKEY, 'aurora'));
  const [view, setView] = useState<ViewMode>('list');
  const [tab, setTab] = useState<FilterTab>('all');
  const [cat, setCat] = useState<Category | 'All'>('All');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('created');
  const [modal, setModal] = useState<{ id: string | null } | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [subIn, setSubIn] = useState('');
  const [toast, setToast] = useState('');
  const T = THEMES[theme];

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(tasks)); } catch { /* ignore */ } }, [tasks]);
  useEffect(() => { try { localStorage.setItem(TKEY, JSON.stringify(theme)); } catch { /* ignore */ } }, [theme]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 2200); return () => clearTimeout(t); }, [toast]);

  const stats = useMemo(() => {
    const done = tasks.filter(t => t.status === 'done').length;
    const overdue = tasks.filter(t => t.status !== 'done' && t.due && t.due < day(0)).length;
    return { total: tasks.length, done, active: tasks.length - done, overdue, rate: tasks.length ? Math.round(done / tasks.length * 100) : 0 };
  }, [tasks]);

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    return tasks.filter(t => {
      if (tab === 'active' && t.status === 'done') return false;
      if (tab === 'completed' && t.status !== 'done') return false;
      if (tab === 'high' && !(PRIO_W[t.priority] >= 3)) return false;
      if (cat !== 'All' && t.category !== cat) return false;
      if (s && !(t.title.toLowerCase().includes(s) || t.subtasks.some(x => x.title.toLowerCase().includes(s)))) return false;
      return true;
    }).sort((a, b) => sort === 'priority' ? PRIO_W[b.priority] - PRIO_W[a.priority] : sort === 'due' ? (a.due || '9').localeCompare(b.due || '9') : b.created - a.created);
  }, [tasks, tab, cat, q, sort]);

  const patch = useCallback((id: string, fn: (t: Task) => Task) => setTasks(p => p.map(t => t.id === id ? fn(t) : t)), []);
  const toggle = (id: string) => patch(id, t => ({ ...t, status: t.status === 'done' ? 'todo' : 'done', subtasks: t.status === 'done' ? t.subtasks : t.subtasks.map(s => ({ ...s, done: true })) }));
  const toggleSub = (id: string, sid: string) => patch(id, t => ({ ...t, subtasks: t.subtasks.map(s => s.id === sid ? { ...s, done: !s.done } : s) }));
  const remove = (id: string) => { setTasks(p => p.filter(t => t.id !== id)); setToast('Task deleted'); };
  const clearDone = () => { setTasks(p => p.filter(t => t.status !== 'done')); setToast('Completed tasks cleared'); };
  const move = (id: string, status: TaskStatus) => patch(id, t => ({ ...t, status }));

  const openNew = () => { setDraft(EMPTY); setSubIn(''); setModal({ id: null }); };
  const openEdit = (t: Task) => { setDraft({ title: t.title, category: t.category, priority: t.priority, due: t.due, subtasks: t.subtasks.map(s => s.title) }); setSubIn(''); setModal({ id: t.id }); };
  const addSub = () => { const v = subIn.trim(); if (v) { setDraft(d => ({ ...d, subtasks: [...d.subtasks, v] })); setSubIn(''); } };
  const save = () => {
    if (!draft.title.trim() || !modal) return;
    const base = { title: draft.title.trim(), category: draft.category, priority: draft.priority, due: draft.due };
    if (modal.id) {
      patch(modal.id, t => ({ ...t, ...base, subtasks: draft.subtasks.map((title, i) => ({ id: t.subtasks[i]?.id ?? uid(), title, done: t.subtasks[i]?.title === title ? t.subtasks[i].done : false })) }));
      setToast('Task updated');
    } else {
      setTasks(p => [{ id: uid(), ...base, status: 'todo', created: Date.now(), subtasks: draft.subtasks.map(title => ({ id: uid(), title, done: false })) }, ...p]);
      setToast('Task created');
    }
    setModal(null);
  };

  const Card = (t: Task) => {
    const overdue = t.status !== 'done' && t.due && t.due < day(0);
    const p = pct(t);
    return (
      <div key={t.id} className={`${T.card} p-4 transition hover:-translate-y-0.5`}>
        <div className="flex items-start gap-3">
          <button aria-label="toggle" onClick={() => toggle(t.id)} className={`mt-0.5 h-6 w-6 shrink-0 grid place-items-center border ${T.chip} rounded-full ${t.status === 'done' ? T.accent : ''}`}>
            {t.status === 'done' && <i className="fa-solid fa-check text-xs"></i>}
          </button>
          <div className="min-w-0 flex-1">
            <div className={`font-semibold ${t.status === 'done' ? 'line-through opacity-50' : ''}`}>{t.title}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className={`px-2 py-0.5 rounded-full border ${PRIO_CLS[t.priority]}`}>{t.priority}</span>
              <span className={`px-2 py-0.5 rounded-full border ${T.chip}`}><i className={`fa-solid ${CAT_ICON[t.category]} mr-1`}></i>{t.category}</span>
              {t.due && <span className={overdue ? 'text-red-500 font-semibold' : T.muted}><i className="fa-regular fa-calendar mr-1"></i>{t.due}{overdue ? ' · overdue' : ''}</span>}
            </div>
            {t.subtasks.length > 0 && (
              <div className="mt-3 space-y-1">
                {t.subtasks.map(s => (
                  <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={s.done} onChange={() => toggleSub(t.id, s.id)} />
                    <span className={s.done ? 'line-through opacity-50' : ''}>{s.title}</span>
                  </label>
                ))}
              </div>
            )}
            <div className="mt-3 h-1.5 rounded-full bg-black/20 overflow-hidden"><div className="h-full bg-current transition-all" style={{ width: `${p}%` }}></div></div>
          </div>
          <div className="flex flex-col gap-1">
            <button aria-label="edit" onClick={() => openEdit(t)} className={`${T.ghost} h-8 w-8`}><i className="fa-solid fa-pen text-xs"></i></button>
            <button aria-label="delete" onClick={() => remove(t.id)} className={`${T.ghost} h-8 w-8 hover:text-red-500`}><i className="fa-solid fa-trash text-xs"></i></button>
          </div>
        </div>
        {view === 'board' && (
          <div className="mt-3 flex gap-1">
            {COLUMNS.filter(c => c.key !== t.status).map(c => (
              <button key={c.key} onClick={() => move(t.id, c.key)} className={`${T.ghost} px-2 py-1 text-xs`}><i className={`fa-solid ${c.icon} mr-1`}></i>{c.label}</button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const metrics = [
    { l: 'Total', v: stats.total, i: 'fa-list-check' },
    { l: 'Active', v: stats.active, i: 'fa-bolt' },
    { l: 'Completed', v: stats.done, i: 'fa-circle-check' },
    { l: 'Overdue', v: stats.overdue, i: 'fa-triangle-exclamation' },
  ];
  const C = 2 * Math.PI * 28;

  return (
    <div className={`min-h-screen ${T.root} ${T.font} transition-colors duration-300`}>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
      <header className={`sticky top-0 z-20 flex flex-wrap items-center gap-3 px-6 py-3 border-b ${T.header}`}>
        <div className="flex items-center gap-2 mr-auto">
          <div className={`h-10 w-10 grid place-items-center ${T.btn}`}><i className="fa-solid fa-bolt"></i></div>
          <div><b className="text-lg block leading-none">TaskFlow</b><small className={T.muted}>Productivity workspace</small></div>
        </div>
        <div className="relative">
          <i className={`fa-solid fa-magnifying-glass absolute left-3 top-3 text-xs ${T.muted}`}></i>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search tasks…" className={`${T.input} pl-8 pr-3 py-2 w-56 text-sm`} />
        </div>
        <div className="flex gap-1">
          {(Object.keys(THEMES) as ThemeKey[]).map(k => (
            <button key={k} title={THEMES[k].label} onClick={() => setTheme(k)} className={`h-9 w-9 ${T.ghost} ${theme === k ? `${T.accent} ring-2 ring-current` : ''}`}><i className={`fa-solid ${THEMES[k].icon}`}></i></button>
          ))}
        </div>
        <button onClick={openNew} className={`${T.btn} px-4 py-2 text-sm font-semibold`}><i className="fa-solid fa-plus mr-2"></i>New Task</button>
      </header>

      <main className="mx-auto max-w-6xl p-6 space-y-6">
        <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {metrics.map(m => (
            <div key={m.l} className={`${T.card} p-4`}>
              <div className={`text-xs uppercase tracking-wide ${T.muted}`}><i className={`fa-solid ${m.i} mr-1`}></i>{m.l}</div>
              <div className="text-3xl font-bold mt-1">{m.v}</div>
            </div>
          ))}
          <div className={`${T.card} p-4 flex items-center gap-3`}>
            <svg width="64" height="64" viewBox="0 0 64 64" className={T.accent}>
              <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeOpacity=".2" strokeWidth="6" />
              <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - stats.rate / 100)} transform="rotate(-90 32 32)" style={{ transition: 'stroke-dashoffset .5s' }} />
            </svg>
            <div><div className="text-2xl font-bold">{stats.rate}%</div><div className={`text-xs ${T.muted}`}>Productivity</div></div>
          </div>
        </section>

        <section className={`${T.card} p-3 flex flex-wrap items-center gap-2`}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`px-3 py-1.5 text-sm ${tab === t.key ? T.btn : T.ghost}`}><i className={`fa-solid ${t.icon} mr-1`}></i>{t.label}</button>
          ))}
          <select value={cat} onChange={e => setCat(e.target.value as Category | 'All')} className={`${T.input} px-2 py-1.5 text-sm ml-auto`}>
            <option value="All">All categories</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={sort} onChange={e => setSort(e.target.value as SortKey)} className={`${T.input} px-2 py-1.5 text-sm`}>
            <option value="created">Newest</option><option value="due">Due date</option><option value="priority">Priority</option>
          </select>
          <div className="flex gap-1">
            <button onClick={() => setView('list')} className={`h-9 w-9 ${view === 'list' ? T.btn : T.ghost}`} title="List view"><i className="fa-solid fa-list"></i></button>
            <button onClick={() => setView('board')} className={`h-9 w-9 ${view === 'board' ? T.btn : T.ghost}`} title="Board view"><i className="fa-solid fa-table-columns"></i></button>
          </div>
          <button onClick={clearDone} disabled={!stats.done} className={`${T.ghost} px-3 py-1.5 text-sm disabled:opacity-40`}><i className="fa-solid fa-broom mr-1"></i>Clear completed</button>
        </section>

        {visible.length === 0 ? (
          <div className={`${T.card} p-12 text-center ${T.muted}`}><i className="fa-solid fa-inbox text-4xl mb-3"></i><p>No tasks match your filters.</p></div>
        ) : view === 'list' ? (
          <div className="space-y-3">{visible.map(Card)}</div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {COLUMNS.map(c => {
              const items = visible.filter(t => t.status === c.key);
              return (
                <div key={c.key} className="space-y-3">
                  <div className="font-semibold text-sm"><i className={`fa-solid ${c.icon} mr-2 ${T.accent}`}></i>{c.label} <span className={T.muted}>({items.length})</span></div>
                  {items.map(Card)}
                  {items.length === 0 && <div className={`${T.card} p-4 text-center text-sm ${T.muted}`}>Empty</div>}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {modal && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-black/60 p-4" onClick={() => setModal(null)}>
          <div className={`${T.card} ${theme === 'aurora' ? '!bg-slate-900/80' : ''} w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-auto`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between"><h2 className="text-xl font-bold">{modal.id ? 'Edit Task' : 'Create Task'}</h2><button onClick={() => setModal(null)} aria-label="close"><i className="fa-solid fa-xmark"></i></button></div>
            <input autoFocus value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} onKeyDown={e => e.key === 'Enter' && save()} placeholder="What needs doing?" className={`${T.input} w-full px-3 py-2`} />
            <div className="grid grid-cols-2 gap-3">
              <select value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value as Category })} className={`${T.input} px-3 py-2`}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
              <input type="date" value={draft.due} onChange={e => setDraft({ ...draft, due: e.target.value })} className={`${T.input} px-3 py-2`} />
            </div>
            <div className="flex gap-2">
              {PRIORITIES.map(p => (
                <button key={p} onClick={() => setDraft({ ...draft, priority: p })} className={`flex-1 py-1.5 text-sm border rounded-md ${draft.priority === p ? PRIO_CLS[p] + ' font-bold' : 'border-current/20 opacity-60'}`}>{p}</button>
              ))}
            </div>
            <div>
              <div className={`text-xs mb-1 ${T.muted}`}>Subtasks</div>
              {draft.subtasks.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-1"><span><i className="fa-regular fa-square mr-2"></i>{s}</span><button onClick={() => setDraft(d => ({ ...d, subtasks: d.subtasks.filter((_, j) => j !== i) }))}><i className="fa-solid fa-xmark text-xs"></i></button></div>
              ))}
              <div className="flex gap-2 mt-1">
                <input value={subIn} onChange={e => setSubIn(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSub()} placeholder="Add subtask" className={`${T.input} flex-1 px-3 py-1.5 text-sm`} />
                <button onClick={addSub} className={`${T.ghost} px-3`}><i className="fa-solid fa-plus"></i></button>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setModal(null)} className={`${T.ghost} px-4 py-2 text-sm`}>Cancel</button>
              <button onClick={save} disabled={!draft.title.trim()} className={`${T.btn} px-4 py-2 text-sm font-semibold disabled:opacity-40`}>{modal.id ? 'Save changes' : 'Create task'}</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-4 py-2 text-sm ${T.btn}`}><i className="fa-solid fa-circle-check mr-2"></i>{toast}</div>}
    </div>
  );
}

export default App;
