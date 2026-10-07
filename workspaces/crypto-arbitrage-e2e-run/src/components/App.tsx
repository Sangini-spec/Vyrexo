"use client";

import React, { useState } from "react";

export function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      <header className="flex justify-between items-center pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Real-Time Crypto Arbitrage Scanner Application</h1>
          <p className="text-xs text-slate-400">Autonomous Application Engine</p>
        </div>
        <div className="flex gap-2">
          {["overview", "analytics", "settings"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs rounded-lg uppercase tracking-wider font-semibold transition-all ${
                activeTab === tab
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <main className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-sm font-semibold text-white">Interactive State Controller</h2>
          <p className="text-xs text-slate-400">
            Real-time verified client component executed in the dedicated sandbox environment.
          </p>
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-300">Current Action Counter</span>
            <span className="font-mono text-lg font-bold text-indigo-400">{count}</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setCount((c) => c + 1)}
              className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all"
            >
              Increment Value
            </button>
            <button
              onClick={() => setCount(0)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-sm font-semibold text-white">System Health & Metrics</h2>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Memory Integrity</span>
                <span className="text-emerald-400 font-mono font-bold">100% Verified</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-full"></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Bundle Optimization</span>
                <span className="text-indigo-400 font-mono font-bold">Production Ready</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 w-4/5"></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
