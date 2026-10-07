"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[VyrexoApp] Client root error:", error);
  }, [error]);

  return (
    <main id="error-page" className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-6">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-3xl font-black text-rose-400">Application Error</h1>
        <p className="text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 p-3 rounded-xl overflow-x-auto text-left">
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={() => reset()}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold tracking-wide transition-all shadow-lg shadow-indigo-600/20"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
