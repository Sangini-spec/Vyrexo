"use client";

import React, { useState, useCallback } from 'react';
import type { CounterState } from '../types';

// Helper functions for counter logic (can be moved to a separate utils file for larger apps)
const increment = (currentCount: CounterState) => currentCount + 1;
const decrement = (currentCount: CounterState) => Math.max(0, currentCount - 1); // Counter stops at 0
const reset = () => 0;

export default function App() {
  const [count, setCount] = useState<CounterState>(0);

  const handleIncrement = useCallback(() => {
    setCount(increment);
  }, []);

  const handleDecrement = useCallback(() => {
    setCount(decrement);
  }, []);

  const handleReset = useCallback(() => {
    setCount(reset);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-8 w-full max-w-md text-center">
        <h1 className="text-4xl font-extrabold mb-8 text-indigo-400 tracking-tight">
          Simple Counter Application
        </h1>

        <div className="mb-10">
          <p className="text-slate-400 text-lg mb-2">Current Count:</p>
          <p className="text-7xl font-bold text-emerald-400 transition-transform duration-200 ease-out transform hover:scale-105">
            {count}
          </p>
        </div>

        <div className="flex flex-col space-y-4">
          <button
            onClick={handleIncrement}
            className="flex items-center justify-center w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold rounded-lg shadow-md transition-all duration-200 ease-in-out transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            aria-label="Increment count"
          >
            <i className="fa-solid fa-plus mr-3 text-xl"></i>
            <span className="text-lg">Increment</span>
          </button>

          <button
            onClick={handleDecrement}
            className="flex items-center justify-center w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 active:bg-slate-700 text-white font-semibold rounded-lg shadow-md transition-all duration-200 ease-in-out transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Decrement count"
            disabled={count === 0}
          >
            <i className="fa-solid fa-minus mr-3 text-xl"></i>
            <span className="text-lg">Decrement</span>
          </button>

          <button
            onClick={handleReset}
            className="flex items-center justify-center w-full px-6 py-3 bg-red-700 hover:bg-red-800 active:bg-red-900 text-white font-semibold rounded-lg shadow-md transition-all duration-200 ease-in-out transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            aria-label="Reset count"
          >
            <i className="fa-solid fa-rotate-left mr-3 text-xl"></i>
            <span className="text-lg">Reset</span>
          </button>
        </div>
      </div>

      {/* FontAwesome CDN for icons - In a real app, you'd typically install it via npm/yarn */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" integrity="sha512-SnH5WK+bZxgPHs44uWIX+LLJAJ9/2PkPKZ5QiAj6Ta86w+fsb2TkcmfRyVX3pBnMFcV7oQPJkl9QevSCWr3W6A==" crossOrigin="anonymous" referrerPolicy="no-referrer" />
    </div>
  );
}
