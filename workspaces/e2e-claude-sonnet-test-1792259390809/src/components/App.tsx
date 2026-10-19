"use client";
import React, { useState, useEffect } from 'react';
import { Task } from '../types';

export default function App() {
  const [timeLeft, setTimeLeft] = useState(1500);
  const [isActive, setIsActive] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0) {
      setSessions((prev) => prev + 1);
      setIsActive(false);
      setTimeLeft(1500);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const addTask = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTask.trim()) return;
    setTasks((prev) => [
      ...prev,
      { id: Date.now().toString(), title: newTask.trim(), completed: false },
    ]);
    setNewTask('');
  };

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  return (
    <div className="min-h-screen bg-rose-50 p-8 font-sans text-rose-950">
      <header className="max-w-2xl mx-auto text-center mb-12">
        <h1 className="text-4xl font-bold mb-2">Pomodoro Focus Timer Application</h1>
        <p className="text-rose-600">Master your flow state with intentional intervals.</p>
      </header>

      <main className="max-w-md mx-auto bg-white p-8 rounded-3xl shadow-xl border border-rose-100">
        <div className="text-center mb-8">
          <div className="text-7xl font-mono font-bold text-rose-500 mb-4">{formatTime(timeLeft)}</div>
          <div className="flex justify-center gap-4">
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              aria-label={isActive ? 'Pause' : 'Start'}
              className="bg-rose-500 text-white px-6 py-2 rounded-full hover:bg-rose-600 flex items-center gap-2 font-medium"
            >
              <i className={`fa-solid ${isActive ? 'fa-pause' : 'fa-play'}`} aria-hidden="true"></i>
              <span>{isActive ? 'Pause' : 'Start'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsActive(false);
                setTimeLeft(1500);
              }}
              aria-label="Reset"
              className="bg-rose-200 text-rose-800 px-6 py-2 rounded-full hover:bg-rose-300 flex items-center gap-2 font-medium"
            >
              <i className="fa-solid fa-rotate-left" aria-hidden="true"></i>
              <span>Reset</span>
            </button>
          </div>
          <p className="mt-4 text-sm font-medium">Completed Sessions: {sessions}</p>
        </div>

        <div className="space-y-4">
          <form onSubmit={addTask} className="flex gap-2">
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              className="flex-1 border border-rose-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-rose-400"
              placeholder="Add a task..."
              aria-label="Add a task"
            />
            <button
              type="submit"
              aria-label="Add Task"
              className="bg-rose-900 text-white px-4 py-2 rounded-lg hover:bg-rose-800 flex items-center justify-center gap-1 font-medium"
            >
              <i className="fa-solid fa-plus" aria-hidden="true"></i>
              <span>Add Task</span>
            </button>
          </form>
          <ul className="space-y-2">
            {tasks.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-2 p-2 bg-rose-50 rounded-lg border border-rose-100"
              >
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="checkbox"
                    id={`task-${t.id}`}
                    checked={t.completed}
                    onChange={() => toggleTask(t.id)}
                    aria-label={`Toggle ${t.title}`}
                    className="w-5 h-5 cursor-pointer accent-rose-600 rounded"
                  />
                  <label
                    htmlFor={`task-${t.id}`}
                    className={`cursor-pointer select-none flex-1 ${
                      t.completed ? 'line-through text-rose-400' : 'text-rose-950 font-medium'
                    }`}
                  >
                    {t.title}
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => toggleTask(t.id)}
                  aria-label={`Toggle status for ${t.title}`}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                    t.completed
                      ? 'bg-rose-200 text-rose-800 hover:bg-rose-300'
                      : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  {t.completed ? 'Completed' : 'Complete'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}