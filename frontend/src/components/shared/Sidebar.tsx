"use client";

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
  onToggle: () => void;
  onSessionClick: (id: string) => void;
  onNewSession: () => void;
}

export function Sidebar({
  sessions,
  activeSessionId,
  collapsed,
  onToggle,
  onSessionClick,
  onNewSession,
}: SidebarProps) {
  return (
    <div
      className={`flex flex-col flex-shrink-0 bg-[var(--surface)] border-r border-[var(--border)] transition-all duration-300 overflow-hidden ${
        collapsed ? "w-0 border-r-0 opacity-0 pointer-events-none" : "w-[260px]"
      }`}
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
          className="w-[30px] h-[30px] rounded-[7px] border border-[#27272a] bg-[var(--border)] text-[var(--text4)] flex items-center justify-center hover:border-[var(--steel)] hover:text-[var(--steel)] hover:bg-[var(--steel-dim)] transition-all"
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
          className="w-full bg-[#0f0f14] border border-[var(--border2)] rounded-[7px] py-[7px] px-[10px] pl-[30px] text-xs text-[var(--text3)] outline-none placeholder:text-[var(--muted)] focus:border-[#3B599844]"
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
        {Object.entries(sessions).map(([group, items]) => (
          <div key={group}>
            <div className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-[0.8px] px-[10px] pt-[10px] pb-[4px]">
              {group}
            </div>
            {items.map((session) => (
              <div
                key={session.id}
                onClick={() => onSessionClick(session.id)}
                className={`flex items-center gap-[9px] p-[8px_9px] rounded-[7px] cursor-pointer transition-all mb-[1px] border ${
                  session.id === activeSessionId
                    ? "bg-[var(--midnight-dim)] border-[#3B599830]"
                    : "border-transparent hover:bg-[#14141a]"
                }`}
              >
                <div className="w-[30px] h-[30px] rounded-[7px] bg-[var(--border)] border border-[var(--border2)] flex items-center justify-center text-xs flex-shrink-0">
                  {session.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] text-[var(--text2)] font-medium truncate">
                    {session.name}
                  </div>
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
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-[var(--border)] p-[6px]">
        {["Settings", "API Keys"].map((item) => (
          <div
            key={item}
            className="flex items-center gap-[9px] p-[7px_10px] rounded-[7px] text-[12.5px] text-[var(--muted2)] cursor-pointer hover:bg-[#14141a] hover:text-[var(--text3)] transition-all"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-50">
              {item === "Settings" ? (
                <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>
              ) : (
                <><path d="M15 7h3a5 5 0 0 1 0 10h-3m-6 0H6a5 5 0 0 1 0-10h3" /><line x1="8" y1="12" x2="16" y2="12" /></>
              )}
            </svg>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
