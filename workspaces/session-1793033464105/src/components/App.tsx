'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';

// ---------- Types ----------
type Status = 'todo' | 'doing' | 'done' | 'deferred';
type Priority = 'low' | 'medium' | 'high';
type ThemeKey = 'noir' | 'ivory' | 'emerald' | 'rose';
type View = 'workspace' | 'board' | 'insights' | 'settings';
interface Subtask { id: string; label: string; done: boolean }
interface Task {
  id: string; title: string; notes: string; status: Status; priority: Priority;
  effort: number; minutes: number; tag: string; image: string; subtasks: Subtask[]; focusSessions: number;
}
interface Filters { query: string; status: Status | 'all'; priority: Priority | 'all'; tag: string; lowOnly: boolean }
interface Settings { capacity: number; gentleMode: boolean; autoDefer: boolean }
interface Theme {
  name: string; page: string; panel: string; card: string; muted: string; border: string;
  accent: string; chip: string; chipActive: string; input: string; swatch: string;
}
interface Persisted { tasks: Task[]; energy: number; theme: ThemeKey; settings: Settings; sleepLog: string[] }

// ---------- Constants ----------
const STORE_KEY = 'toughtired:v1';
const HERO = 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1600&q=80';
const FALLBACK = 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80';
const IMG_CODE = 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80';
const IMG_DESK = 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=800&q=80';
const IMG_WORK = 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80';
const COLUMNS: { key: Status; label: string }[] = [
  { key: 'todo', label: 'To Do' }, { key: 'doing', label: 'In Progress' },
  { key: 'done', label: 'Done' }, { key: 'deferred', label: 'Deferred to Tomorrow' },
];
const THEMES: Record<ThemeKey, Theme> = {
  noir: { name: 'Luxury Noir', page: 'bg-neutral-950 text-amber-50', panel: 'bg-neutral-900', card: 'bg-neutral-900 border-neutral-800', muted: 'text-neutral-400', border: 'border-neutral-800', accent: 'bg-amber-400 text-neutral-950 hover:bg-amber-300', chip: 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700', chipActive: 'bg-amber-400 text-neutral-950', input: 'bg-neutral-800 border-neutral-700 text-amber-50 placeholder-neutral-500', swatch: 'bg-amber-400' },
  ivory: { name: 'Warm Ivory', page: 'bg-stone-50 text-stone-900', panel: 'bg-white', card: 'bg-white border-stone-200', muted: 'text-stone-500', border: 'border-stone-200', accent: 'bg-stone-900 text-stone-50 hover:bg-stone-700', chip: 'bg-stone-100 text-stone-600 hover:bg-stone-200', chipActive: 'bg-stone-900 text-white', input: 'bg-white border-stone-300 text-stone-900 placeholder-stone-400', swatch: 'bg-stone-800' },
  emerald: { name: 'Emerald Velvet', page: 'bg-emerald-950 text-emerald-50', panel: 'bg-emerald-900', card: 'bg-emerald-900/60 border-emerald-800', muted: 'text-emerald-300/70', border: 'border-emerald-800', accent: 'bg-emerald-400 text-emerald-950 hover:bg-emerald-300', chip: 'bg-emerald-800 text-emerald-200 hover:bg-emerald-700', chipActive: 'bg-emerald-300 text-emerald-950', input: 'bg-emerald-950 border-emerald-700 text-emerald-50 placeholder-emerald-500', swatch: 'bg-emerald-400' },
  rose: { name: 'Rose Quartz', page: 'bg-rose-50 text-rose-950', panel: 'bg-white', card: 'bg-white border-rose-200', muted: 'text-rose-700/60', border: 'border-rose-200', accent: 'bg-rose-500 text-white hover:bg-rose-600', chip: 'bg-rose-100 text-rose-700 hover:bg-rose-200', chipActive: 'bg-rose-500 text-white', input: 'bg-white border-rose-200 text-rose-950 placeholder-rose-300', swatch: 'bg-rose-400' },
};
const PRIORITY_RANK: Record<Priority, number> = { high: 3, medium: 2, low: 1 };
const DEFAULT_SETTINGS: Settings = { capacity: 100, gentleMode: false, autoDefer: true };

const SEED: Task[] = [
  { id: 't1', title: 'Ship onboarding flow', notes: 'Final QA pass on the signup steps and email verification.', status: 'doing', priority: 'high', effort: 4, minutes: 90, tag: 'Build', image: IMG_CODE, focusSessions: 1, subtasks: [{ id: 's1', label: 'Fix validation copy', done: true }, { id: 's2', label: 'Verify email template', done: false }] },
  { id: 't2', title: 'Reply to client emails', notes: 'Three threads waiting since Monday.', status: 'todo', priority: 'medium', effort: 2, minutes: 30, tag: 'Comms', image: IMG_DESK, focusSessions: 0, subtasks: [] },
  { id: 't3', title: 'Refactor billing module', notes: 'Split the monolith into smaller services.', status: 'todo', priority: 'high', effort: 5, minutes: 150, tag: 'Build', image: IMG_CODE, focusSessions: 0, subtasks: [{ id: 's3', label: 'Extract invoice helpers', done: false }] },
  { id: 't4', title: 'Write weekly status note', notes: 'Short summary of wins and blockers.', status: 'todo', priority: 'low', effort: 1, minutes: 15, tag: 'Comms', image: IMG_DESK, focusSessions: 0, subtasks: [] },
  { id: 't5', title: 'Plan next sprint', notes: 'Pick top five items with the team.', status: 'todo', priority: 'medium', effort: 3, minutes: 60, tag: 'Planning', image: IMG_WORK, focusSessions: 0, subtasks: [] },
  { id: 't6', title: 'Update project roadmap', notes: 'Reflect the shifted launch date.', status: 'done', priority: 'low', effort: 2, minutes: 40, tag: 'Planning', image: IMG_WORK, focusSessions: 2, subtasks: [] },
  { id: 't7', title: 'Fix flaky CI tests', notes: 'Two integration tests fail randomly.', status: 'todo', priority: 'high', effort: 3, minutes: 75, tag: 'Build', image: IMG_CODE, focusSessions: 0, subtasks: [] },
  { id: 't8', title: 'Organize design files', notes: 'Rename and archive old exports.', status: 'deferred', priority: 'low', effort: 1, minutes: 20, tag: 'Admin', image: IMG_DESK, focusSessions: 0, subtasks: [] },
];

// ---------- Pure domain helpers ----------
const effortCost = (effort: number): number => effort * 8;
const focusCost = (effort: number): number => effort * 3;
const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));
const fatigueLabel = (energy: number): string => (energy >= 70 ? 'Fresh' : energy >= 40 ? 'Getting tired' : energy >= 15 ? 'Running on fumes' : 'Go to sleep');
const completionRate = (tasks: Task[]): number => (tasks.length === 0 ? 0 : Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100));
const filterTasks = (tasks: Task[], f: Filters): Task[] => {
  const q = f.query.trim().toLowerCase();
  return tasks.filter(t =>
    (f.status === 'all' || t.status === f.status) &&
    (f.priority === 'all' || t.priority === f.priority) &&
    (f.tag === 'All' || t.tag === f.tag) &&
    (!f.lowOnly || t.effort <= 2) &&
    (q === '' || t.title.toLowerCase().includes(q) || t.notes.toLowerCase().includes(q)));
};
const suggestNext = (tasks: Task[], energy: number): Task | null => {
  const open = tasks.filter(t => t.status === 'todo' || t.status === 'doing').filter(t => effortCost(t.effort) <= energy);
  open.sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] || a.effort - b.effort);
  return open[0] ?? null;
};
const sleepScore = (deferred: number, routine: number, bedtimeHour: number): number => {
  const lateness = bedtimeHour >= 24 ? bedtimeHour - 24 : 0;
  return clamp(40 + deferred * 5 + routine * 12 - lateness * 10, 0, 100);
};
const makeSleepId = (n: number): string => 'ZZZ-' + String(1000 + n * 7).padStart(5, '0');

// ---------- Small UI components ----------
function Toggle({ on, onChange, t, label }: { on: boolean; onChange: (v: boolean) => void; t: Theme; label: string }) {
  return (
    <button type='button' role='switch' aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={'relative h-6 w-11 shrink-0 rounded-full transition-colors ' + (on ? t.chipActive : t.chip)}>
      <span className={'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ' + (on ? 'left-5' : 'left-0.5')} />
    </button>
  );
}

function Chip({ active, onClick, t, children }: { active: boolean; onClick: () => void; t: Theme; children: React.ReactNode }) {
  return (
    <button type='button' onClick={onClick}
      className={'rounded-full px-3 py-1 text-xs font-semibold transition ' + (active ? t.chipActive : t.chip)}>{children}</button>
  );
}

function Cover({ src, className }: { src: string; className: string }) {
  return (
    <div className={'overflow-hidden ' + className}>
      <img src={src} alt='' referrerPolicy='no-referrer' loading='lazy'
        onError={e => { (e.currentTarget as HTMLImageElement).src = FALLBACK; }}
        className='h-full w-full object-cover transition-transform duration-500 group-hover:scale-105' />
    </div>
  );
}

const PRIORITY_DOT: Record<Priority, string> = { high: 'bg-red-500', medium: 'bg-amber-400', low: 'bg-sky-400' };

function TaskCard({ task, t, onOpen, onAdvance }: { task: Task; t: Theme; onOpen: () => void; onAdvance: () => void }) {
  const doneSubs = task.subtasks.filter(s => s.done).length;
  return (
    <div className={'group overflow-hidden rounded-2xl border shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ' + t.card}>
      <button type='button' onClick={onOpen} className='block w-full text-left'>
        <Cover src={task.image} className='h-28 w-full' />
        <div className='space-y-2 p-4'>
          <div className='flex items-center justify-between gap-2'>
            <span className={'rounded-full px-2 py-0.5 text-[11px] font-semibold ' + t.chip}>{task.tag}</span>
            <span className='flex items-center gap-1 text-[11px] font-semibold capitalize'>
              <span className={'h-2 w-2 rounded-full ' + PRIORITY_DOT[task.priority]} />{task.priority}
            </span>
          </div>
          <h3 className={'font-semibold leading-snug ' + (task.status === 'done' ? 'line-through opacity-60' : '')}>{task.title}</h3>
          <p className={'text-xs ' + t.muted}>{task.minutes} min / energy cost {effortCost(task.effort)}{task.subtasks.length > 0 ? ' / ' + doneSubs + ' of ' + task.subtasks.length + ' steps' : ''}</p>
        </div>
      </button>
      <div className='px-4 pb-4'>
        <button type='button' onClick={onAdvance} className={'w-full rounded-xl px-3 py-2 text-xs font-bold transition ' + t.accent}>
          {task.status === 'todo' ? 'Start working' : task.status === 'doing' ? 'Mark done' : task.status === 'done' ? 'Reopen' : 'Bring back today'}
        </button>
      </div>
    </div>
  );
}

// ---------- Main App ----------
export function App() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [tasks, setTasks] = useState<Task[]>(SEED);
  const [energy, setEnergy] = useState(80);
  const [themeKey, setThemeKey] = useState<ThemeKey>('noir');
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [sleepLog, setSleepLog] = useState<string[]>([]);
  const [view, setView] = useState<View>('workspace');
  const [filters, setFilters] = useState<Filters>({ query: '', status: 'all', priority: 'all', tag: 'All', lowOnly: false });
  const [sortBy, setSortBy] = useState<'priority' | 'effort' | 'time'>('priority');
  const [openId, setOpenId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newEffort, setNewEffort] = useState(2);
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [drawer, setDrawer] = useState(false);
  const [step, setStep] = useState(1);
  const [picked, setPicked] = useState<string[]>([]);
  const [routine, setRoutine] = useState<string[]>(['dim']);
  const [bedtime, setBedtime] = useState(23);
  const [note, setNote] = useState('');
  const [sleepId, setSleepId] = useState('');

  const t = THEMES[themeKey];

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Persisted;
        if (Array.isArray(p.tasks)) setTasks(p.tasks);
        if (typeof p.energy === 'number') setEnergy(p.energy);
        if (p.theme && THEMES[p.theme]) setThemeKey(p.theme);
        if (p.settings) setSettings(p.settings);
        if (Array.isArray(p.sleepLog)) setSleepLog(p.sleepLog);
      }
    } catch (e) { /* corrupted storage is ignored */ }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    const data: Persisted = { tasks, energy, theme: themeKey, settings, sleepLog };
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  }, [isHydrated, tasks, energy, themeKey, settings, sleepLog]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  const tags = useMemo(() => ['All', ...Array.from(new Set(tasks.map(x => x.tag)))], [tasks]);
  const visible = useMemo(() => {
    const list = filterTasks(tasks, filters).filter(x => !(settings.gentleMode && energy < 40 && x.effort >= 4));
    const sorted = [...list];
    if (sortBy === 'priority') sorted.sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]);
    if (sortBy === 'effort') sorted.sort((a, b) => a.effort - b.effort);
    if (sortBy === 'time') sorted.sort((a, b) => a.minutes - b.minutes);
    return sorted;
  }, [tasks, filters, sortBy, settings.gentleMode, energy]);
  const suggestion = useMemo(() => suggestNext(tasks, energy), [tasks, energy]);
  const openTask = useMemo(() => tasks.find(x => x.id === openId) ?? null, [tasks, openId]);
  const rate = useMemo(() => completionRate(tasks), [tasks]);
  const remainingMinutes = useMemo(() => tasks.filter(x => x.status === 'todo' || x.status === 'doing').reduce((s, x) => s + x.minutes, 0), [tasks]);
  const energyPct = clamp(Math.round((energy / settings.capacity) * 100), 0, 100);

  const patchTask = useCallback((id: string, patch: Partial<Task>) => {
    setTasks(prev => prev.map(x => (x.id === id ? { ...x, ...patch } : x)));
  }, []);

  const advance = useCallback((task: Task) => {
    const next: Status = task.status === 'todo' ? 'doing' : task.status === 'doing' ? 'done' : task.status === 'done' ? 'todo' : 'todo';
    patchTask(task.id, { status: next });
    if (next === 'done') {
      setEnergy(e => clamp(e - effortCost(task.effort), 0, settings.capacity));
      setToast('Nice work. Spent ' + effortCost(task.effort) + ' energy finishing ' + task.title);
    } else if (task.status === 'done') {
      setToast('Task reopened');
    } else {
      setToast(next === 'doing' ? 'Started: ' + task.title : 'Moved to today');
    }
  }, [patchTask, settings.capacity]);

  const addTask = useCallback(() => {
    const title = newTitle.trim();
    if (!title) { setToast('Give your task a name first'); return; }
    const task: Task = { id: 't' + Date.now(), title, notes: '', status: 'todo', priority: newPriority, effort: newEffort, minutes: newEffort * 20, tag: 'Admin', image: IMG_DESK, subtasks: [], focusSessions: 0 };
    setTasks(prev => [task, ...prev]);
    setNewTitle('');
    setToast('Task added');
  }, [newTitle, newPriority, newEffort]);

  const focusSession = useCallback((task: Task) => {
    const cost = focusCost(task.effort);
    if (energy < cost) { setToast('Too tired for a focus session. Time to rest.'); return; }
    setEnergy(e => e - cost);
    patchTask(task.id, { focusSessions: task.focusSessions + 1, status: task.status === 'todo' ? 'doing' : task.status });
    setToast('25 minute focus logged (-' + cost + ' energy)');
  }, [energy, patchTask]);

  const toggleSub = useCallback((task: Task, sid: string) => {
    patchTask(task.id, { subtasks: task.subtasks.map(s => (s.id === sid ? { ...s, done: !s.done } : s)) });
  }, [patchTask]);

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(x => x.id !== id));
    setOpenId(null);
    setToast('Task deleted');
  }, []);

  const openDrawer = useCallback(() => {
    const auto = settings.autoDefer ? tasks.filter(x => (x.status === 'todo' || x.status === 'doing') && x.priority !== 'high').map(x => x.id) : [];
    setPicked(auto); setStep(1); setSleepId(''); setDrawer(true);
  }, [settings.autoDefer, tasks]);

  const score = sleepScore(picked.length, routine.length, bedtime);

  const confirmSleep = useCallback(() => {
    setTasks(prev => prev.map(x => (picked.includes(x.id) ? { ...x, status: 'deferred' as Status } : x)));
    setEnergy(e => clamp(e + Math.round((score * settings.capacity) / 100), 0, settings.capacity));
    const id = makeSleepId(sleepLog.length + 1);
    setSleepId(id);
    setSleepLog(prev => [id, ...prev]);
    setStep(3);
  }, [picked, score, settings.capacity, sleepLog.length]);

  const resetAll = useCallback(() => {
    setTasks(SEED); setEnergy(80); setSettings(DEFAULT_SETTINGS); setSleepLog([]);
    setToast('Workspace reset to defaults');
  }, []);

  const inputCls = 'rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-current ' + t.input;
  const views: { key: View; label: string }[] = [
    { key: 'workspace', label: 'Workspace' }, { key: 'board', label: 'Kanban Board' },
    { key: 'insights', label: 'Analytics & Insights' }, { key: 'settings', label: 'Settings' },
  ];
  const routineOptions: { key: string; label: string }[] = [
    { key: 'dim', label: 'Dim the lights' }, { key: 'screens', label: 'Screens off' },
    { key: 'stretch', label: 'Stretch' }, { key: 'tea', label: 'Herbal tea' },
  ];

  return (
    <div className={'min-h-screen font-sans transition-colors ' + t.page}>
      <header className={'sticky top-0 z-30 border-b backdrop-blur ' + t.border + ' ' + t.panel + '/90'}>
        <div className='mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3'>
          <div className='mr-4 text-lg font-black tracking-tight'>Tough<span className='italic opacity-70'>Tired</span></div>
          <nav className='flex flex-1 flex-wrap gap-1'>
            {views.map(v => (
              <button key={v.key} type='button' onClick={() => setView(v.key)}
                className={'rounded-full px-4 py-1.5 text-sm font-semibold transition ' + (view === v.key ? t.chipActive : t.chip)}>{v.label}</button>
            ))}
          </nav>
          <div className='flex items-center gap-1' aria-label='Theme switcher'>
            {(Object.keys(THEMES) as ThemeKey[]).map(k => (
              <button key={k} type='button' title={THEMES[k].name} onClick={() => setThemeKey(k)}
                className={'h-6 w-6 rounded-full border-2 transition ' + THEMES[k].swatch + ' ' + (k === themeKey ? 'scale-110 border-white ring-2 ring-current' : 'border-transparent')} />
            ))}
          </div>
          <button type='button' onClick={openDrawer} className={'rounded-full px-4 py-1.5 text-sm font-bold ' + t.accent}>Sleep Now</button>
        </div>
      </header>

      <section className='relative isolate overflow-hidden'>
        <img src={HERO} alt='' referrerPolicy='no-referrer' loading='lazy' onError={e => { (e.currentTarget as HTMLImageElement).src = FALLBACK; }} className='absolute inset-0 -z-10 h-full w-full object-cover opacity-40' />
        <div className='absolute inset-0 -z-10 bg-gradient-to-b from-black/60 via-black/40 to-black/70' />
        <div className='mx-auto max-w-6xl px-4 py-14 text-white'>
          <p className='text-xs font-bold uppercase tracking-widest opacity-80'>The energy-aware project workspace</p>
          <h1 className='mt-3 max-w-2xl text-4xl font-black leading-tight sm:text-5xl'>Work is tough. Being tired is real. Finish what matters, then rest.</h1>
          <p className='mt-3 max-w-xl text-sm opacity-90'>ToughTired matches your tasks to the energy you actually have, defers the rest, and helps you wind down with a clear conscience.</p>
          <div className='mt-6 flex flex-wrap gap-3'>
            <button type='button' onClick={() => setView('workspace')} className='rounded-full bg-white px-5 py-2 text-sm font-bold text-black hover:bg-neutral-200'>Plan my day</button>
            <button type='button' onClick={openDrawer} className='rounded-full border border-white/60 px-5 py-2 text-sm font-bold hover:bg-white/10'>I just want to sleep</button>
          </div>
          <div className='mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4'>
            {[['Energy', energy + ' / ' + settings.capacity], ['Status', fatigueLabel(energy)], ['Completed', rate + '%'], ['Work left', Math.round(remainingMinutes / 6) / 10 + ' h']].map(k => (
              <div key={k[0]} className='rounded-2xl bg-white/10 p-4 backdrop-blur'>
                <div className='text-[11px] uppercase tracking-wider opacity-70'>{k[0]}</div>
                <div className='mt-1 text-xl font-black'>{k[1]}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <main className='mx-auto max-w-6xl space-y-6 px-4 py-8'>
        {view === 'workspace' && (
          <>
            <div className={'rounded-2xl border p-5 ' + t.card}>
              <div className='mb-2 flex items-center justify-between text-sm font-semibold'>
                <span>Energy meter: {fatigueLabel(energy)}</span><span>{energyPct}%</span>
              </div>
              <div className={'h-3 overflow-hidden rounded-full ' + t.chip}>
                <div className={'h-full rounded-full transition-all duration-500 ' + (energyPct > 50 ? 'bg-emerald-500' : energyPct > 20 ? 'bg-amber-400' : 'bg-red-500')} style={{ width: energyPct + '%' }} />
              </div>
              <p className={'mt-3 text-sm ' + t.muted}>
                {suggestion ? 'Best next move: ' + suggestion.title + ' (costs ' + effortCost(suggestion.effort) + ' energy).' : 'Nothing fits your energy right now. Defer the rest and get some sleep.'}
              </p>
              <div className='mt-3 flex flex-wrap gap-2'>
                {suggestion && <button type='button' onClick={() => setOpenId(suggestion.id)} className={'rounded-full px-4 py-1.5 text-xs font-bold ' + t.accent}>Open suggestion</button>}
                <button type='button' onClick={() => { setEnergy(e => clamp(e + 10, 0, settings.capacity)); setToast('Quick break taken (+10 energy)'); }} className={'rounded-full px-4 py-1.5 text-xs font-bold ' + t.chip}>Take a 10 min break</button>
              </div>
            </div>

            <div className={'grid gap-3 rounded-2xl border p-5 sm:grid-cols-[1fr_auto_auto_auto] ' + t.card}>
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addTask(); }} placeholder='Add a new task...' className={inputCls} />
              <div className='flex items-center gap-1'>
                {[1, 2, 3, 4, 5].map(n => <Chip key={n} t={t} active={newEffort === n} onClick={() => setNewEffort(n)}>E{n}</Chip>)}
              </div>
              <div className='flex items-center gap-1'>
                {(['low', 'medium', 'high'] as Priority[]).map(p => <Chip key={p} t={t} active={newPriority === p} onClick={() => setNewPriority(p)}>{p}</Chip>)}
              </div>
              <button type='button' onClick={addTask} className={'rounded-xl px-5 py-2 text-sm font-bold ' + t.accent}>Add task</button>
            </div>

            <div className={'space-y-4 rounded-2xl border p-5 ' + t.card}>
              <input value={filters.query} onChange={e => setFilters(f => ({ ...f, query: e.target.value }))} placeholder='Search tasks and notes...' className={'w-full ' + inputCls} />
              <div className='flex flex-wrap items-center gap-2'>
                <span className={'text-xs font-bold uppercase ' + t.muted}>Status</span>
                {(['all', 'todo', 'doing', 'done', 'deferred'] as const).map(s => <Chip key={s} t={t} active={filters.status === s} onClick={() => setFilters(f => ({ ...f, status: s }))}>{s}</Chip>)}
              </div>
              <div className='flex flex-wrap items-center gap-2'>
                <span className={'text-xs font-bold uppercase ' + t.muted}>Priority</span>
                {(['all', 'high', 'medium', 'low'] as const).map(p => <Chip key={p} t={t} active={filters.priority === p} onClick={() => setFilters(f => ({ ...f, priority: p }))}>{p}</Chip>)}
              </div>
              <div className='flex flex-wrap items-center gap-2'>
                <span className={'text-xs font-bold uppercase ' + t.muted}>Tag</span>
                {tags.map(g => <Chip key={g} t={t} active={filters.tag === g} onClick={() => setFilters(f => ({ ...f, tag: g }))}>{g}</Chip>)}
              </div>
              <div className='flex flex-wrap items-center gap-3'>
                <span className={'text-xs font-bold uppercase ' + t.muted}>Sort</span>
                {(['priority', 'effort', 'time'] as const).map(s => <Chip key={s} t={t} active={sortBy === s} onClick={() => setSortBy(s)}>{s}</Chip>)}
                <span className='ml-auto flex items-center gap-2 text-xs font-semibold'>
                  Low energy only
                  <Toggle on={filters.lowOnly} onChange={v => setFilters(f => ({ ...f, lowOnly: v }))} t={t} label='Low energy only' />
                </span>
              </div>
            </div>

            {visible.length === 0 ? (
              <div className={'rounded-2xl border p-10 text-center text-sm ' + t.card + ' ' + t.muted}>No tasks match. Try adjusting your filters.</div>
            ) : (
              <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                {visible.map(task => <TaskCard key={task.id} task={task} t={t} onOpen={() => setOpenId(task.id)} onAdvance={() => advance(task)} />)}
              </div>
            )}
          </>
        )}

        {view === 'board' && (
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
            {COLUMNS.map(col => {
              const items = tasks.filter(x => x.status === col.key);
              return (
                <div key={col.key} className={'space-y-3 rounded-2xl border p-3 ' + t.card}>
                  <div className='flex items-center justify-between px-1 text-sm font-bold'>
                    <span>{col.label}</span>
                    <span className={'rounded-full px-2 py-0.5 text-xs ' + t.chip}>{items.length}</span>
                  </div>
                  {items.length === 0 && <p className={'px-1 py-4 text-xs ' + t.muted}>Nothing here.</p>}
                  {items.map(task => <TaskCard key={task.id} task={task} t={t} onOpen={() => setOpenId(task.id)} onAdvance={() => advance(task)} />)}
                </div>
              );
            })}
          </div>
        )}

        {view === 'insights' && (
          <div className='grid gap-4 md:grid-cols-2'>
            <div className={'space-y-3 rounded-2xl border p-5 ' + t.card}>
              <h2 className='text-lg font-bold'>Energy & Capacity Breakdown</h2>
              <p className={'text-sm ' + t.muted}>Completion rate: {rate}% across {tasks.length} tasks.</p>
              <div className='space-y-2 pt-2'>
                {COLUMNS.map(c => {
                  const count = tasks.filter(x => x.status === c.key).length;
                  return (
                    <div key={c.key} className='flex items-center justify-between text-sm'>
                      <span>{c.label}</span>
                      <span className='font-bold'>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className={'space-y-3 rounded-2xl border p-5 ' + t.card}>
              <h2 className='text-lg font-bold'>Recent Rest & Recovery Log</h2>
              {sleepLog.length === 0 ? (
                <p className={'text-sm ' + t.muted}>No wind-down sessions logged yet. Click Sleep Now when ready.</p>
              ) : (
                <ul className='space-y-1 text-sm'>
                  {sleepLog.map(id => <li key={id} className='font-mono'>Session {id} — Rested & recharged</li>)}
                </ul>
              )}
            </div>
          </div>
        )}

        {view === 'settings' && (
          <div className={'space-y-4 rounded-2xl border p-5 ' + t.card}>
            <h2 className='text-lg font-bold'>Workspace Preferences</h2>
            <div className='flex items-center justify-between'>
              <span>Gentle Mode (hide high-effort tasks when tired)</span>
              <Toggle on={settings.gentleMode} onChange={v => setSettings(s => ({ ...s, gentleMode: v }))} t={t} label='Gentle mode' />
            </div>
            <div className='flex items-center justify-between'>
              <span>Auto-select non-urgent tasks when winding down</span>
              <Toggle on={settings.autoDefer} onChange={v => setSettings(s => ({ ...s, autoDefer: v }))} t={t} label='Auto defer' />
            </div>
            <div className='pt-2'>
              <button type='button' onClick={resetAll} className={'rounded-xl px-4 py-2 text-xs font-bold ' + t.chip}>Reset Workspace Defaults</button>
            </div>
          </div>
        )}
      </main>

      {openTask && (
        <div className='fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4' onClick={() => setOpenId(null)}>
          <div className={'w-full max-w-lg space-y-4 rounded-2xl border p-6 ' + t.card} onClick={e => e.stopPropagation()}>
            <div className='flex items-start justify-between gap-2'>
              <h3 className='text-lg font-bold'>{openTask.title}</h3>
              <button type='button' onClick={() => setOpenId(null)} className={'rounded-full px-2.5 py-1 text-xs ' + t.chip}>Close</button>
            </div>
            <p className={'text-sm ' + t.muted}>{openTask.notes || 'No extra notes.'}</p>
            {openTask.subtasks.length > 0 && (
              <div className='space-y-2'>
                {openTask.subtasks.map(sub => (
                  <label key={sub.id} className='flex items-center gap-2 text-sm cursor-pointer'>
                    <input type='checkbox' checked={sub.done} onChange={() => toggleSub(openTask, sub.id)} />
                    <span className={sub.done ? 'line-through opacity-60' : ''}>{sub.label}</span>
                  </label>
                ))}
              </div>
            )}
            <div className='flex flex-wrap gap-2 pt-2'>
              <button type='button' onClick={() => focusSession(openTask)} className={'rounded-xl px-4 py-2 text-xs font-bold ' + t.accent}>Log 25m Focus</button>
              <button type='button' onClick={() => advance(openTask)} className={'rounded-xl px-4 py-2 text-xs font-bold ' + t.chip}>Advance Status</button>
              <button type='button' onClick={() => deleteTask(openTask.id)} className='ml-auto rounded-xl bg-red-500/20 px-4 py-2 text-xs font-bold text-red-400'>Delete</button>
            </div>
          </div>
        </div>
      )}

      {drawer && (
        <div className='fixed inset-0 z-40 flex justify-end bg-black/60' onClick={() => setDrawer(false)}>
          <div className={'h-full w-full max-w-md space-y-4 overflow-y-auto border-l p-6 ' + t.card} onClick={e => e.stopPropagation()}>
            <div className='flex items-center justify-between'>
              <h3 className='text-lg font-bold'>Wind Down & Sleep</h3>
              <button type='button' onClick={() => setDrawer(false)} className={'rounded-full px-2.5 py-1 text-xs ' + t.chip}>Close</button>
            </div>
            {step < 3 ? (
              <>
                <p className={'text-sm ' + t.muted}>Defer {picked.length} remaining tasks to tomorrow and recharge your energy.</p>
                <div className='flex flex-wrap gap-2'>
                  {routineOptions.map(ro => (
                    <Chip key={ro.key} t={t} active={routine.includes(ro.key)} onClick={() => setRoutine(prev => prev.includes(ro.key) ? prev.filter(x => x !== ro.key) : [...prev, ro.key])}>{ro.label}</Chip>
                  ))}
                </div>
                <textarea value={note} onChange={e => setNote(e.target.value)} placeholder='Note for tomorrow morning...' className={'w-full ' + inputCls} rows={3} />
                <button type='button' onClick={confirmSleep} className={'w-full rounded-xl py-2.5 text-sm font-bold ' + t.accent}>Confirm & Recharge (Score: {score})</button>
              </>
            ) : (
              <div className='space-y-3 py-4 text-center'>
                <div className='text-2xl font-black'>Goodnight!</div>
                <p className={'text-sm ' + t.muted}>Recovery pass {sleepId} logged. Energy restored.</p>
                <button type='button' onClick={() => setDrawer(false)} className={'w-full rounded-xl py-2 text-sm font-bold ' + t.accent}>Done</button>
              </div>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className='fixed bottom-4 right-4 z-50 rounded-xl bg-neutral-900 px-4 py-2.5 text-xs font-semibold text-white shadow-lg border border-neutral-700'>
          {toast}
        </div>
      )}
    </div>
  );
}

export default App;
