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
  onToggle: () => void;
  onSessionClick: (id: string) => void;
  onNewSession: () => void;
  onRenameSession?: (id: string, name: string) => void;
  onDeleteSession?: (id: string) => void;
}

export function Sidebar({
  sessions,
  activeSessionId,
  collapsed,
  width = 260,
  onSessionClick,
  onNewSession,
  onRenameSession,
  onDeleteSession,
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

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
      className="flex flex-col flex-shrink-0 bg-[var(--surface)] border-r border-[var(--border)] overflow-hidden"
      style={{
        width: collapsed ? 0 : width,
        opacity: collapsed ? 0 : 1,
        pointerEvents: collapsed ? "none" : "auto",
        borderRightWidth: collapsed ? 0 : undefined,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-[14px_16px] border-b border-[var(--border)]">
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
        <button
          onClick={onNewSession}
          className="w-[30px] h-[30px] rounded-[7px] border border-[var(--border2)] bg-[var(--border)] text-[var(--icon)] flex items-center justify-center hover:border-[var(--steel)] hover:text-[var(--steel)] hover:bg-[var(--steel-dim)] transition-all"
          title="New session"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
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
                        : "border-transparent hover:bg-[#14141a]"
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
                      <div className="text-[10.5px] text-[var(--muted)] mt-[1px] flex items-center gap-[5px]">
                        <span
                          className={`w-[5px] h-[5px] rounded-full flex-shrink-0 ${
                            session.status === "active"
                              ? "bg-[#22c55e] shadow-[0_0_4px_#22c55e88]"
                              : "bg-[var(--muted)]"
                          }`}
                        />
                        {session.status === "active" ? "Active" : "Ended"} · {session.time}
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
      <div className="border-t border-[var(--border)] p-[6px]">
        <a
          href="/settings"
          className="flex items-center gap-[9px] p-[7px_10px] rounded-[7px] text-[12.5px] text-[var(--muted2)] cursor-pointer hover:bg-[#14141a] hover:text-[var(--text3)] transition-all"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-50">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          Settings
        </a>
      </div>
    </div>
  );
}
