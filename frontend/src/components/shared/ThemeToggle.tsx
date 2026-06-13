"use client";

import { useEffect, useState } from "react";

/** Sun/moon button that flips between light and dark themes and persists it. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const cur = (document.documentElement.getAttribute("data-theme") as "dark" | "light") || "dark";
    setTheme(cur);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("vyrexo_theme", next);
    } catch {}
  };

  return (
    <button
      onClick={toggle}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className={
        className ||
        "w-[30px] h-[30px] rounded-[7px] border border-[var(--border2)] bg-[var(--surface2)] text-[var(--text4)] flex items-center justify-center hover:border-[var(--steel)] hover:text-[var(--steel)] transition-all"
      }
    >
      {theme === "dark" ? (
        // sun → click for light
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        // moon → click for dark
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}
