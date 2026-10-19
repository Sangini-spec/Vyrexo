"use client";
import React, { useState, useEffect } from 'react';
import { Task, TimerState } from '../types';

export default function App() {
  const [timer, setTimer] = useState<TimerState>({ timeLeft: 1500, isActive: false, mode: 'pomodoro', streak: 0 });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer.isActive && timer.timeLeft > 0) {
      interval = setInterval(() => setTimer(prev => ({ ...prev, timeLeft: prev.timeLeft - 1 })), 1000);
    } else if (timer.timeLeft === 0 && timer.isActive) {
      setTimer(prev => ({ ...prev, isActive: false, streak: prev.streak + 1 }));
    }
    return () => clearInterval(interval);
  }, [timer.isActive, timer.timeLeft]);

  const addTask = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;
    setTasks(prev => [...prev, { id: Date.now().toString(), title: input.trim(), priority: 'P1', completed: false }]);
    setInput('');
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const resetTimer = () => {
    setTimer(prev => ({ ...prev, timeLeft: 1500, isActive: false }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8 font-sans">
      <header className="flex justify-between items-center mb-12">
        <h1 className="text-3xl font-bold text-indigo-400">FocusPulse</h1>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setTimer(p => ({ ...p, isActive: !p.isActive }))}
            className="bg-indigo-600 px-6 py-2 rounded-full hover:bg-indigo-500 font-medium transition-colors flex items-center gap-2"
            aria-label={timer.isActive ? "Pause timer" : "Start timer"}
          >
            <i className={`fa-solid ${timer.isActive ? 'fa-pause' : 'fa-play'}`}></i>
            <span>{timer.isActive ? 'Pause' : 'Start'}</span>
          </button>
          <button
            type="button"
            onClick={resetTimer}
            className="bg-slate-800 px-4 py-2 rounded-full hover:bg-slate-700 text-slate-300 font-medium transition-colors flex items-center gap-2"
            aria-label="Reset timer"
          >
            <i className="fa-solid fa-rotate-left"></i>
            <span>Reset</span>
          </button>
        </div>
      </header>
      
      <main className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <section className="bg-slate-900 p-8 rounded-2xl border border-slate-800">
          <h2 className="text-2xl mb-6">Timer: {Math.floor(timer.timeLeft / 60)}:{String(timer.timeLeft % 60).padStart(2, '0')}</h2>
          <div className="text-slate-400">Current Streak: {timer.streak} sessions</div>
        </section>

        <section className="bg-slate-900 p-8 rounded-2xl border border-slate-800">
          <form onSubmit={addTask} className="flex gap-2 mb-6">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-slate-800 p-2 rounded border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              placeholder="New task..."
              aria-label="New task input"
            />
            <button
              type="submit"
              className="bg-emerald-600 px-4 py-2 rounded hover:bg-emerald-500 font-medium transition-colors"
              aria-label="Add task"
            >
              Add
            </button>
          </form>
          <ul className="space-y-2">
            {tasks.map(t => (
              <li
                key={t.id}
                className={`p-3 bg-slate-800 rounded flex items-center justify-between gap-3 border border-slate-700/50 ${
                  t.completed ? 'opacity-70 bg-slate-800/60' : ''
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={t.completed}
                    onChange={() => toggleTask(t.id)}
                    aria-label={`Toggle completion for ${t.title}`}
                    className="w-5 h-5 rounded cursor-pointer accent-emerald-500"
                  />
                  <span className={`truncate ${t.completed ? 'line-through text-slate-400' : 'text-slate-100'}`}>
                    {t.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">{t.priority}</span>
                  <button
                    type="button"
                    onClick={() => toggleTask(t.id)}
                    aria-label={t.completed ? "Mark task as incomplete" : "Mark task as complete"}
                    className={`text-xs px-3 py-1 rounded font-medium transition-colors ${
                      t.completed
                        ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-600/40'
                        : 'bg-slate-700 text-slate-200 hover:bg-slate-600 border border-slate-600'
                    }`}
                  >
                    {t.completed ? 'Completed' : 'Mark Done'}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteTask(t.id)}
                    aria-label={`Delete task ${t.title}`}
                    className="text-xs bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 px-2.5 py-1 rounded border border-rose-500/30 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
            {tasks.length === 0 && (
              <li className="text-center py-6 text-slate-500 text-sm">
                No tasks yet. Add one above!
              </li>
            )}
          </ul>
        </section>
      </main>
    </div>
  );
}