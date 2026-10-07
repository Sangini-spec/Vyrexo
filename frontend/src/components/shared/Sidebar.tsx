"use client";

import { useEffect, useRef, useState } from "react";

export interface Session {
  id: string;
  name: string;
  icon: string;
  status: "active" | "ended";
  time: string;
}

interface SidebarProps {
  sessions: Record<string, Session[]>;
  activeSessionId?: string;
  collapsed: boolean;
  width?: number;
  user?: { email?: string; user_metadata?: { full_name?: string } } | null;
  onSignOut?: () => void;
  onToggle: () => void;
  onSessionClick: (id: string) => void;
  onNewSession: () => void;
  onRenameSession?: (id: string, name: string) => void;
  onDeleteSession?: (id: string) => void;
  onClearCurrentChat?: () => void;
  onDeleteOldChats?: (days: number) => void;
  onClearAllHistory?: () => void;
}

export function Sidebar({
  sessions,
  activeSessionId,
  collapsed,
  width = 260,
  user,
  onSignOut,
  onSessionClick,
  onNewSession,
  onRenameSession,
  onDeleteSession,
  onClearCurrentChat,
  onDeleteOldChats,
  onClearAllHistory,
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [historyMenuOpen, setHistoryMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setHistoryMenuOpen(false);
      }
    }
    if (historyMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [historyMenuOpen]);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const startRename = (session: Session) => {
    setEditingId(session.id);
    setDraft(session.name);
  };

  const commitRename = () => {
    if (editingId) {
      const name = draft.trim();
      if (name) onRenameSession?.(editingId, name);
    }
    setEditingId(null);
  };

  const q = query.trim().toLowerCase();

  return (
    <div
      className={`flex flex-col flex-shrink-0 bg-[var(--surface)] border-r border-[var(--border)] relative ${
        historyMenuOpen ? "z-[60]" : "z-30"
      } ${
        collapsed ? "overflow-hidden pointer-events-none" : "overflow-visible"
      }`}
      style={{
        width: collapsed ? 0 : width,
        opacity: collapsed ? 0 : 1,
        borderRightWidth: collapsed ? 0 : undefined,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-[14px_16px] border-b border-[var(--border)] relative">
        <a
          href="/"
          className="text-lg font-bold tracking-tight"
          style={{
            background: "linear-gradient(135deg, #3B5998, #7B93B0, #C0C8D4)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Vyrexo
        </a>
        <div className="flex items-center gap-1.5">
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setHistoryMenuOpen(!historyMenuOpen)}
              className={`w-[30px] h-[30px] rounded-[7px] border transition-all flex items-center justify-center cursor-pointer ${
                historyMenuOpen
                  ? "border-[var(--steel)] text-[var(--steel)] bg-[var(--steel-dim)]"
                  : "border-[var(--border2)] bg-[var(--border)] text-[var(--icon)] hover:border-[var(--steel)] hover:text-[var(--steel)] hover:bg-[var(--steel-dim)]"
              }`}
              title="Chat history options"
              aria-expanded={historyMenuOpen}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </button>

            {historyMenuOpen && (
              <div
                className="absolute left-0 top-[calc(100%+6px)] w-[220px] max-w-[calc(100vw-32px)] max-h-[min(420px,calc(100vh-100px))] overflow-y-auto border border-[var(--border2)] rounded-xl shadow-2xl p-1.5 z-[70] flex flex-col gap-0.5 text-xs text-[var(--text2)]"
                style={{
                  backgroundColor: "var(--surface)",
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.2)",
                }}
              >
                <div className="px-2.5 py-1 text-[10px] font-semibold text-[var(--muted2)] uppercase tracking-wider border-b border-[var(--border)] flex items-center justify-between">
                  <span>History Management</span>
                </div>

                {onClearCurrentChat && (
                  <button
                    onClick={() => {
                      setHistoryMenuOpen(false);
                      onClearCurrentChat();
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-md text-[12px] font-medium text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--surface2)] flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--icon)] flex-shrink-0">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    <span className="whitespace-nowrap">Clear Current Chat</span>
                  </button>
                )}

                {onDeleteOldChats && (
                  <button
                    onClick={() => {
                      setHistoryMenuOpen(false);
                      onDeleteOldChats(1);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-md text-[12px] font-medium text-[var(--text2)] hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-600 dark:text-amber-400 flex-shrink-0">
                      <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                    </svg>
                    <span className="whitespace-nowrap">Delete Yesterday & Older</span>
                  </button>
                )}

                {onDeleteOldChats && (
                  <button
                    onClick={() => {
                      setHistoryMenuOpen(false);
                      onDeleteOldChats(3);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-md text-[12px] font-medium text-[var(--text2)] hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-600 dark:text-amber-400 flex-shrink-0">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <span className="whitespace-nowrap">Delete 3+ Days Old</span>
                  </button>
                )}

                {onClearAllHistory && (
                  <button
                    onClick={() => {
                      setHistoryMenuOpen(false);
                      onClearAllHistory();
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-md text-[12px] font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-500/10 dark:hover:bg-rose-950/40 flex items-center gap-2 border-t border-[var(--border)] mt-1 pt-1.5 transition-colors cursor-pointer"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-rose-600 dark:text-rose-400 flex-shrink-0">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    <span className="whitespace-nowrap">Clear All Chat History</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <button
            onClick={onNewSession}
            className="w-[30px] h-[30px] rounded-[7px] border border-[var(--border2)] bg-[var(--border)] text-[var(--icon)] flex items-center justify-center hover:border-[var(--steel)] hover:text-[var(--steel)] hover:bg-[var(--steel-dim)] transition-all cursor-pointer"
            title="New session"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-[10px_12px]">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-[var(--input)] border border-[var(--border2)] rounded-[7px] py-[7px] px-[10px] pl-[30px] text-xs text-[var(--text3)] outline-none placeholder:text-[var(--muted)] focus:border-[#3B599844]"
          placeholder="Search sessions..."
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='%233f3f46' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.3-4.3'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "9px center",
          }}
        />
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-[6px] py-[2px]">
        {Object.entries(sessions).map(([group, items]) => {
          const filtered = q ? items.filter((s) => s.name.toLowerCase().includes(q)) : items;
          if (filtered.length === 0) return null;
          return (
            <div key={group}>
              <div className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-[0.8px] px-[10px] pt-[10px] pb-[4px]">
                {group}
              </div>
              {filtered.map((session) => {
                const isActive = session.id === activeSessionId;
                const isEditing = session.id === editingId;
                return (
                  <div
                    key={session.id}
                    onClick={() => !isEditing && onSessionClick(session.id)}
                    onDoubleClick={() => startRename(session)}
                    className={`group flex items-center gap-[9px] p-[8px_9px] rounded-[7px] cursor-pointer transition-all mb-[1px] border ${
                      isActive
                        ? "bg-[var(--midnight-dim)] border-[#3B599830]"
                        : "border-transparent hover:bg-[var(--border)]"
                    }`}
                  >
                    <div className="w-[30px] h-[30px] rounded-[7px] bg-[var(--border)] border border-[var(--border2)] flex items-center justify-center text-xs flex-shrink-0">
                      {session.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <input
                          ref={inputRef}
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onBlur={commitRename}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitRename();
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          maxLength={60}
                          className="w-full bg-[var(--input)] border border-[#3B599866] rounded-[5px] px-[6px] py-[2px] text-[12.5px] text-[var(--text)] outline-none"
                        />
                      ) : (
                        <div className="text-[12.5px] text-[var(--text2)] font-medium truncate">
                          {session.name}
                        </div>
                      )}
                      <div className="text-[10.5px] text-[var(--muted)] mt-[1px] flex items-center gap-[5px] whitespace-nowrap overflow-hidden">
                        <span
                          className={`w-[5px] h-[5px] rounded-full flex-shrink-0 ${
                            session.status === "active"
                              ? "bg-[#22c55e] shadow-[0_0_4px_#22c55e88]"
                              : "bg-[var(--muted)]"
                          }`}
                        />
                        <span className="truncate">
                          {session.status === "active" ? "Active" : `Ended${session.time ? ` · ${session.time}` : ""}`}
                        </span>
                      </div>
                    </div>

                    {/* Hover actions: rename + delete */}
                    {!isEditing && (
                      <div className="flex items-center gap-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); startRename(session); }}
                          title="Rename"
                          className="w-[24px] h-[24px] rounded-[5px] flex items-center justify-center text-[var(--muted)] hover:text-[var(--steel)] hover:bg-[#3B599815]"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
                          </svg>
                        </button>
                        {onDeleteSession && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }}
                            title="Delete session"
                            className="w-[24px] h-[24px] rounded-[5px] flex items-center justify-center text-[var(--muted)] hover:text-[#f87171] hover:bg-[#f8717115]"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="border-t border-[var(--border)] p-[6px] flex flex-col gap-0.5">
        <a
          href="/settings"
          className="flex items-center gap-[9px] p-[7px_10px] rounded-[7px] text-[12.5px] text-[var(--muted2)] cursor-pointer hover:bg-[var(--border)] hover:text-[var(--text)] transition-all font-medium"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-70">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <span>Settings</span>
        </a>

        {onSignOut && (
          <button
            onClick={onSignOut}
            className="w-full flex items-center justify-between p-[7px_10px] rounded-[7px] text-[12.5px] text-[var(--muted2)] cursor-pointer hover:bg-[var(--border)] hover:text-red-600 dark:hover:text-red-400 transition-all font-medium text-left"
            title="Sign out of your account"
          >
            <div className="flex items-center gap-[9px] min-w-0">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-70 flex-shrink-0">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span className="truncate">Sign out</span>
            </div>
            {user?.email && (
              <span className="text-[10px] text-[var(--muted)] truncate max-w-[80px] ml-1">
                {user.email.split("@")[0]}
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
