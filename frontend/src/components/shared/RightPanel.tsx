"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AgentTimeline, type AgentStep } from "@/components/agents/AgentTimeline";

export type RightTab = "chat" | "code" | "task" | "preview";

export interface ChatMessage {
  role: string;
  text: string;
}

/**
 * A single entry in the Code tab feed. `action` entries come from
 * `agent.action.*` events (a tool the agent ran); `output` entries come from
 * `execution.output` events (terminal output).
 */
export interface CodeEvent {
  kind: "action" | "output";
  agent?: string;
  tool?: string;
  category?: string;
  path?: string;
  command?: string;
  message?: string;
  text?: string;
}

interface RightPanelProps {
  collapsed: boolean;
  activeTab: RightTab;
  onTabChange: (tab: RightTab) => void;
  narration: string;
  steps: AgentStep[];
  chatLog: ChatMessage[];
  codeEvents: CodeEvent[];
  previewUrl: string;
  onPreviewUrlChange: (url: string) => void;
  voiceMode: string;
  onInterrupt: () => void;
}

const TABS: { key: RightTab; label: string }[] = [
  { key: "chat", label: "Chat" },
  { key: "code", label: "Code" },
  { key: "task", label: "Task" },
  { key: "preview", label: "Preview" },
];

export function RightPanel({
  collapsed,
  activeTab,
  onTabChange,
  narration,
  steps,
  chatLog,
  codeEvents,
  previewUrl,
  onPreviewUrlChange,
  voiceMode,
  onInterrupt,
}: RightPanelProps) {
  return (
    <div
      className={`flex flex-col flex-shrink-0 bg-[var(--panel)] border-l border-[var(--border)] transition-all duration-300 overflow-hidden ${
        collapsed ? "w-0 border-l-0 opacity-0 pointer-events-none" : "w-[420px]"
      }`}
    >
      {/* Tab bar */}
      <div className="flex border-b border-[var(--border)] px-[6px]">
        {TABS.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`py-[9px] px-4 text-xs font-medium border-b-2 transition-all ${
                active
                  ? "text-[var(--steel)] border-[var(--steel)]"
                  : "text-[var(--muted)] border-transparent hover:text-[var(--text4)]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0">
        {activeTab === "chat" && <ChatTab chatLog={chatLog} />}
        {activeTab === "code" && <CodeTab codeEvents={codeEvents} />}
        {activeTab === "task" && <TaskTab narration={narration} steps={steps} />}
        {activeTab === "preview" && (
          <PreviewTab previewUrl={previewUrl} onPreviewUrlChange={onPreviewUrlChange} />
        )}
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between px-[14px] py-[6px] bg-[var(--panel-bar)] border-t border-[var(--border)] text-[10.5px] text-[var(--muted)]">
        <span>{voiceMode === "active_conversation" ? "Conversation active" : "Waiting for 'Rex'"}</span>
        <button
          onClick={onInterrupt}
          className="flex items-center gap-1 bg-[#dc262622] text-[#f87171] border border-[#dc262633] px-3 py-[3px] rounded-[5px] text-[10.5px] font-semibold hover:bg-[#dc262644] transition-all"
        >
          Interrupt
        </button>
      </div>
    </div>
  );
}

// ── Chat tab ────────────────────────────────────────────────────────────────

function ChatTab({ chatLog }: { chatLog: ChatMessage[] }) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLog.length]);

  if (chatLog.length === 0) {
    return (
      <div className="h-full flex items-center justify-center px-6 text-center">
        <p className="text-xs text-[var(--muted)]">
          Your conversation with Rex will appear here. Say &ldquo;Rex&rdquo; or type a command to start.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-3 flex flex-col gap-3">
      {chatLog.map((msg, i) => {
        const isUser = msg.role === "user";
        return (
          <div key={i} className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
            <span className="text-[9px] uppercase tracking-wide text-[var(--muted)] mb-1 px-1">
              {isUser ? "You" : "Rex"}
            </span>
            <div
              className={`max-w-[92%] text-xs leading-relaxed px-3 py-2 rounded-lg ${
                isUser
                  ? "bg-[#3B599820] text-[var(--ice)] border border-[#3B599833] rounded-tr-sm"
                  : "bg-[var(--surface2)] text-[var(--text3)] border border-[var(--border2)] rounded-tl-sm"
              }`}
            >
              {isUser ? (
                msg.text
              ) : (
                <div className="md-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

// ── Code tab ────────────────────────────────────────────────────────────────

function CodeTab({ codeEvents }: { codeEvents: CodeEvent[] }) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [codeEvents.length]);

  if (codeEvents.length === 0) {
    return (
      <div className="h-full flex items-center justify-center px-6 text-center">
        <p className="text-xs text-[var(--muted)]">
          Files Rex reads or writes and commands it runs will stream here as it works.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-3 font-mono text-[11px] leading-relaxed bg-[var(--code-bg)]">
      {codeEvents.map((ev, i) => (
        <CodeLine key={i} ev={ev} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

function CodeLine({ ev }: { ev: CodeEvent }) {
  if (ev.kind === "output") {
    return (
      <pre className="whitespace-pre-wrap text-[var(--text4)] mb-1 pl-3 border-l border-[var(--border2)]">
        {ev.text}
      </pre>
    );
  }

  // Action entry — render a short, colour-coded line per category.
  let glyph = "•";
  let color = "text-[var(--muted2)]";
  let label = ev.tool || "action";

  if (ev.category === "file_write") {
    glyph = ev.tool === "delete_file" ? "✕" : "✎";
    color = ev.tool === "delete_file" ? "text-[#f87171]" : "text-[#4ade80]";
    label = ev.path || ev.tool || "file";
  } else if (ev.category === "file_read") {
    glyph = "○";
    color = "text-[var(--muted2)]";
    label = ev.path || ev.tool || "file";
  } else if (ev.category === "terminal_exec") {
    glyph = "$";
    color = "text-[var(--steel)]";
    label = ev.command || ev.tool || "command";
  } else if (ev.category === "git_op") {
    glyph = "⎇";
    color = "text-[#C0C8D4]";
    label = ev.message ? `${ev.tool} — ${ev.message}` : ev.tool || "git";
  }

  return (
    <div className={`mb-[2px] ${color} break-all`}>
      <span className="inline-block w-4 opacity-70">{glyph}</span>
      {label}
    </div>
  );
}

// ── Task tab ────────────────────────────────────────────────────────────────

function TaskTab({ narration, steps }: { narration: string; steps: AgentStep[] }) {
  return (
    <div className="h-full overflow-y-auto p-3">
      {/* Narration box */}
      <div className="flex items-center gap-2 p-[9px_12px] mb-3 rounded-md border-l-[3px] border-l-[var(--steel)] bg-[#7B93B008] border border-[#7B93B015]">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--steel)"
          strokeWidth="2"
          className="flex-shrink-0 opacity-70"
        >
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
        <span className="text-xs text-[var(--ice)] italic">{narration}</span>
      </div>

      {steps.length > 0 ? (
        <AgentTimeline steps={steps} />
      ) : (
        <div className="text-center text-[var(--muted)] text-xs mt-8">
          Agent activity will appear here when you give a command.
        </div>
      )}
    </div>
  );
}

// ── Preview tab ───────────────────────────────────────────────────────────────

function PreviewTab({
  previewUrl,
  onPreviewUrlChange,
}: {
  previewUrl: string;
  onPreviewUrlChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const load = () => {
    const val = inputRef.current?.value.trim();
    if (val) onPreviewUrlChange(normalizeUrl(val));
  };

  return (
    <div className="h-full flex flex-col">
      {/* URL bar */}
      <div className="flex items-center gap-2 p-2 border-b border-[var(--border)]">
        <input
          ref={inputRef}
          key={previewUrl}
          defaultValue={previewUrl}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder="http://localhost:3000"
          className="flex-1 bg-[var(--input)] border border-[var(--border2)] rounded-md py-[5px] px-2 text-[11px] text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:border-[#3B599844]"
        />
        <button
          onClick={load}
          className="px-3 py-[5px] bg-[var(--midnight)] text-white text-[11px] font-medium rounded-md hover:bg-[var(--steel)] transition-all"
        >
          Load
        </button>
      </div>

      {/* Frame / placeholder */}
      {previewUrl ? (
        <iframe
          src={previewUrl}
          title="Preview"
          className="flex-1 w-full bg-white"
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      ) : (
        <div className="flex-1 flex items-center justify-center px-6 text-center">
          <p className="text-xs text-[var(--muted)]">
            No preview yet. Enter a URL above (e.g. a dev server Rex started) to load it here.
          </p>
        </div>
      )}
    </div>
  );
}

function normalizeUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `http://${url}`;
}
