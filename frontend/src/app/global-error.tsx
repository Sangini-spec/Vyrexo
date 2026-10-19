"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const msg = `${error?.name || ""} ${error?.message || ""}`;
    if (
      msg.includes("ChunkLoadError") ||
      msg.includes("Loading chunk") ||
      msg.includes("failed to fetch dynamically imported module")
    ) {
      const timer = setTimeout(() => {
        window.location.reload();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-6 antialiased">
        <div className="max-w-md w-full text-center space-y-4">
          <h1 className="text-2xl font-bold text-slate-100">Reloading Application...</h1>
          <p className="text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 p-3 rounded-xl overflow-x-auto text-left">
            {error?.message || "Synchronizing latest bundle..."}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => reset()}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold tracking-wide transition-all cursor-pointer"
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold tracking-wide transition-all cursor-pointer"
            >
              Reload Page
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
