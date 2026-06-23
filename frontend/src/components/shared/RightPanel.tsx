"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AgentTimeline, type AgentStep } from "@/components/agents/AgentTimeline";

export type RightTab = "chat" | "code" | "task" | "preview";

export interface ChatMessage {
  role: string;
  text: string;
  images?: string[];
  docs?: string[];
}

/**
 * A single entry in the Code feed. `action` entries come from `agent.action.*`
 * events (a tool the agent ran); `output` entries come from `execution.output`.
 * `content` carries the exact code for file_write actions.
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
  content?: string;
  oldContent?: string;
}

interface TreeNode {
  name: string;
  type: "file" | "dir";
  path: string;
  children?: TreeNode[];
}

interface RightPanelProps {
  collapsed: boolean;
  width: number;
  activeTab: RightTab;
  onTabChange: (tab: RightTab) => void;
  narration: string;
  steps: AgentStep[];
  chatLog: ChatMessage[];
  codeEvents: CodeEvent[];
  projectPath: string;
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
  width,
  activeTab,
  onTabChange,
  narration,
  steps,
  chatLog,
  codeEvents,
  projectPath,
  previewUrl,
  onPreviewUrlChange,
  voiceMode,
  onInterrupt,
}: RightPanelProps) {
  return (
    <div
      className="flex flex-col flex-shrink-0 bg-[var(--panel)] border-l border-[var(--border)] overflow-hidden"
      style={{ width: collapsed ? 0 : width, opacity: collapsed ? 0 : 1, pointerEvents: collapsed ? "none" : "auto" }}
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
        {activeTab === "code" && <CodeTab codeEvents={codeEvents} projectPath={projectPath} />}
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
              {msg.images && msg.images.length > 0 && (
                <div className="flex gap-1.5 flex-wrap mb-1.5">
                  {msg.images.map((src, j) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={j} src={src} alt="attachment" className="max-w-[140px] max-h-[140px] rounded-md border border-[var(--border2)]" />
                  ))}
                </div>
              )}
              {msg.docs && msg.docs.length > 0 && (
                <div className="flex gap-1.5 flex-wrap mb-1.5">
                  {msg.docs.map((name, j) => (
                    <span key={j} className="inline-flex items-center gap-1 text-[10px] text-[var(--text3)] bg-[var(--surface)] border border-[var(--border2)] rounded px-1.5 py-0.5">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                      {name}
                    </span>
                  ))}
                </div>
              )}
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

// ── Code tab (Replit-style: file tree + live code viewer) ─────────────────────

/** Thin draggable divider for resizing the in-panel file tree. */
function CodeResize({ onDelta }: { onDelta: (dx: number) => void }) {
  const dragging = useRef(false);
  const lastX = useRef(0);
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!dragging.current) return;
      onDelta(e.clientX - lastX.current);
      lastX.current = e.clientX;
    };
    const up = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [onDelta]);
  return (
    <div
      onMouseDown={(e) => {
        dragging.current = true;
        lastX.current = e.clientX;
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
      }}
      title="Drag to resize"
      className="w-[4px] flex-shrink-0 cursor-col-resize bg-[var(--border)] hover:bg-[var(--steel)] transition-colors"
    />
  );
}

type DiffLine = { type: "add" | "del" | "ctx"; text: string };

/** Line-based diff (LCS) so the Code tab can show exact +/- changes. */
function lineDiff(oldText: string, newText: string): DiffLine[] {
  const a = oldText ? oldText.split("\n") : [];
  const b = newText ? newText.split("\n") : [];
  const m = a.length, n = b.length;
  if (m === 0) return b.map((t) => ({ type: "add" as const, text: t }));
  if (m * n > 4_000_000) return b.map((t) => ({ type: "add" as const, text: t })); // too big to diff
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--)
    for (let j = n - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: DiffLine[] = [];
  let i = 0, j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) { out.push({ type: "ctx", text: a[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ type: "del", text: a[i] }); i++; }
    else { out.push({ type: "add", text: b[j] }); j++; }
  }
  while (i < m) out.push({ type: "del", text: a[i++] });
  while (j < n) out.push({ type: "add", text: b[j++] });
  return out;
}

function CodeTab({ codeEvents, projectPath }: { codeEvents: CodeEvent[]; projectPath: string }) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [openPath, setOpenPath] = useState("");
  const [openContent, setOpenContent] = useState("");
  const [openDiff, setOpenDiff] = useState<DiffLine[] | null>(null);
  const [diffView, setDiffView] = useState(true);
  const [loading, setLoading] = useState(false);
  const connected = projectPath !== "";

  // The file tree is a panel-within-a-panel — collapsible + resizable like the
  // main sidebars, so the code viewer can take the full width when you want it.
  const [treeCollapsed, setTreeCollapsed] = useState(false);
  const [treeWidth, setTreeWidth] = useState(170);
  useEffect(() => {
    try {
      setTreeCollapsed(localStorage.getItem("vyrexo_codetree_collapsed") === "1");
      const w = parseInt(localStorage.getItem("vyrexo_codetree_w") || "", 10);
      if (w) setTreeWidth(Math.max(110, Math.min(320, w)));
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("vyrexo_codetree_w", String(treeWidth)); } catch {}
  }, [treeWidth]);
  const toggleTree = () =>
    setTreeCollapsed((c) => {
      const n = !c;
      try { localStorage.setItem("vyrexo_codetree_collapsed", n ? "1" : "0"); } catch {}
      return n;
    });

  const refreshTree = useCallback(async () => {
    if (!connected) return;
    try {
      const r = await fetch(`/api/projects/tree?path=${encodeURIComponent(projectPath)}`);
      const d = await r.json();
      if (d.ok) {
        setTree(d.tree as TreeNode[]);
        // Auto-expand top-level folders so the structure is visible at a glance.
        setExpanded((prev) => {
          const next = new Set(prev);
          (d.tree as TreeNode[]).forEach((n) => n.type === "dir" && next.add(n.path));
          return next;
        });
      }
    } catch {
      /* backend not reachable yet */
    }
  }, [connected, projectPath]);

  const openFile = useCallback(
    async (file: string) => {
      setOpenPath(file);
      setOpenDiff(null); // clicking a file shows its full current content, not a diff
      if (!connected) return;
      setLoading(true);
      try {
        const r = await fetch(
          `/api/projects/file?path=${encodeURIComponent(projectPath)}&file=${encodeURIComponent(file)}`
        );
        const d = await r.json();
        setOpenContent(d.ok ? (d.content as string) : `// ${d.error || "couldn't open this file"}`);
      } catch {
        setOpenContent("// failed to load file");
      } finally {
        setLoading(false);
      }
    },
    [connected, projectPath]
  );

  // Initial + project-change tree load.
  useEffect(() => {
    setTree([]);
    setOpenPath("");
    setOpenContent("");
    setOpenDiff(null);
    refreshTree();
  }, [refreshTree]);

  // The most recent file Rex wrote — auto-open it with the exact content, and
  // refresh the tree (a new file may have appeared).
  const lastWrite = useMemo(() => {
    for (let i = codeEvents.length - 1; i >= 0; i--) {
      const e = codeEvents[i];
      if (e.kind === "action" && e.category === "file_write" && e.path) return e;
    }
    return null;
  }, [codeEvents]);

  useEffect(() => {
    if (lastWrite?.path) {
      const newC = lastWrite.content || "";
      setOpenPath(lastWrite.path);
      setOpenContent(newC);
      setOpenDiff(lineDiff(lastWrite.oldContent || "", newC));
      setDiffView(true);
      refreshTree();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastWrite?.path, lastWrite?.content]);

  if (!connected) {
    return (
      <div className="h-full flex items-center justify-center px-6 text-center">
        <p className="text-xs text-[var(--muted)]">
          Connect a project and the file tree will show here — Rex opens each file as it writes it.
        </p>
      </div>
    );
  }

  const lines = openContent ? openContent.split("\n") : [];

  return (
    <div className="h-full flex min-h-0">
      {/* File tree — collapsible + resizable */}
      {!treeCollapsed && (
        <div className="flex-shrink-0 border-r border-[var(--border)] overflow-y-auto py-1 bg-[var(--surface)]" style={{ width: treeWidth }}>
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-[9px] uppercase tracking-wide text-[var(--muted)]">Files</span>
            <div className="flex items-center gap-[7px]">
              <button onClick={refreshTree} title="Refresh" className="text-[var(--muted)] hover:text-[var(--steel)]">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              </button>
              <button onClick={toggleTree} title="Hide file tree" className="text-[var(--muted)] hover:text-[var(--steel)]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></svg>
              </button>
            </div>
          </div>
          {tree.length === 0 ? (
            <p className="px-2 text-[10px] text-[var(--muted)]">Empty / indexing…</p>
          ) : (
            tree.map((n) => (
              <TreeRow key={n.path} node={n} depth={0} expanded={expanded}
                onToggle={(p) => setExpanded((prev) => { const s = new Set(prev); s.has(p) ? s.delete(p) : s.add(p); return s; })}
                openPath={openPath} onOpen={(f) => openFile(f)} />
            ))
          )}
        </div>
      )}
      {!treeCollapsed && (
        <CodeResize onDelta={(dx) => setTreeWidth((w) => Math.max(110, Math.min(320, w + dx)))} />
      )}

      {/* Code viewer */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--code-bg)]">
        <div className="flex items-center gap-2 px-3 py-[6px] border-b border-[var(--border)]">
          {treeCollapsed && (
            <button
              onClick={toggleTree}
              title="Show file tree"
              className="w-[22px] h-[22px] -ml-1 rounded-[5px] border border-[var(--border2)] bg-[var(--surface)] text-[var(--icon)] flex items-center justify-center flex-shrink-0 hover:border-[var(--steel)] hover:text-[var(--steel)] transition-all"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></svg>
            </button>
          )}
          <span className="text-[11px] text-[var(--text3)] font-mono truncate flex-1">{openPath || "No file open"}</span>
          {openDiff && (
            <div className="flex items-center rounded-[5px] border border-[var(--border2)] overflow-hidden flex-shrink-0">
              {(["diff", "file"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setDiffView(m === "diff")}
                  className={`px-2 py-[2px] text-[10px] ${(diffView ? "diff" : "file") === m ? "bg-[var(--midnight)] text-white" : "text-[var(--muted2)] hover:text-[var(--text3)]"}`}
                >
                  {m === "diff" ? "Diff" : "File"}
                </button>
              ))}
            </div>
          )}
          {connected && (
            <a
              href={`/api/projects/download?path=${encodeURIComponent(projectPath)}`}
              title="Download project as ZIP"
              className="w-[22px] h-[22px] rounded-[5px] border border-[var(--border2)] bg-[var(--surface)] text-[var(--icon)] flex items-center justify-center flex-shrink-0 hover:border-[var(--steel)] hover:text-[var(--steel)] transition-all"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </a>
          )}
        </div>
        <div className="flex-1 overflow-auto">
          {openDiff && diffView ? (
            <div className="font-mono text-[11px] leading-[1.55] py-2">
              {openDiff.length === 0 ? (
                <p className="px-3 text-[var(--muted)]">No changes.</p>
              ) : (
                openDiff.map((d, i) => (
                  <div
                    key={i}
                    className={
                      d.type === "add"
                        ? "bg-[#13351c] text-[#86efac]"
                        : d.type === "del"
                        ? "bg-[#3a1717] text-[#fca5a5]"
                        : "text-[var(--text4)]"
                    }
                  >
                    <span className="select-none inline-block w-5 text-center opacity-70">
                      {d.type === "add" ? "+" : d.type === "del" ? "-" : ""}
                    </span>
                    <span className="whitespace-pre">{d.text || " "}</span>
                  </div>
                ))
              )}
            </div>
          ) : openPath ? (
            <div className="flex font-mono text-[11px] leading-[1.55]">
              <div className="select-none text-right pr-2 pl-2 py-2 text-[var(--muted)] border-r border-[var(--border2)] bg-[var(--surface)]">
                {lines.map((_, i) => <div key={i}>{i + 1}</div>)}
              </div>
              <pre className="flex-1 py-2 px-3 whitespace-pre overflow-x-auto text-[var(--text3)]">{loading ? "loading…" : openContent}</pre>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center px-6 text-center">
              <p className="text-xs text-[var(--muted)]">Pick a file on the left, or Rex will open one as it writes.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TreeRow({
  node, depth, expanded, onToggle, openPath, onOpen,
}: {
  node: TreeNode; depth: number; expanded: Set<string>;
  onToggle: (path: string) => void; openPath: string; onOpen: (file: string) => void;
}) {
  const isOpenDir = expanded.has(node.path);
  const pad = 6 + depth * 11;
  if (node.type === "dir") {
    return (
      <>
        <div
          onClick={() => onToggle(node.path)}
          className="flex items-center gap-1 py-[2px] pr-2 text-[11px] text-[var(--text4)] cursor-pointer hover:bg-[#14141a]"
          style={{ paddingLeft: pad }}
        >
          <span className="opacity-60 w-[10px]">{isOpenDir ? "▾" : "▸"}</span>
          <span className="opacity-70">📁</span>
          <span className="truncate">{node.name}</span>
        </div>
        {isOpenDir && node.children?.map((c) => (
          <TreeRow key={c.path} node={c} depth={depth + 1} expanded={expanded} onToggle={onToggle} openPath={openPath} onOpen={onOpen} />
        ))}
      </>
    );
  }
  const active = openPath === node.path;
  return (
    <div
      onClick={() => onOpen(node.path)}
      className={`flex items-center gap-1 py-[2px] pr-2 text-[11px] cursor-pointer truncate ${active ? "bg-[var(--midnight-dim)] text-[var(--ice)]" : "text-[var(--muted2)] hover:bg-[#14141a]"}`}
      style={{ paddingLeft: pad + 11 }}
    >
      <span className="opacity-60">📄</span>
      <span className="truncate">{node.name}</span>
    </div>
  );
}

// ── Task tab ────────────────────────────────────────────────────────────────

function TaskTab({ narration, steps }: { narration: string; steps: AgentStep[] }) {
  return (
    <div className="h-full overflow-y-auto p-3">
      <div className="flex items-center gap-2 p-[9px_12px] mb-3 rounded-md border-l-[3px] border-l-[var(--steel)] bg-[#7B93B008] border border-[#7B93B015]">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--steel)" strokeWidth="2" className="flex-shrink-0 opacity-70">
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
  const [reloadKey, setReloadKey] = useState(0);

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
        {/* Refresh */}
        <button
          onClick={() => setReloadKey((k) => k + 1)}
          disabled={!previewUrl}
          title="Reload preview"
          className="w-[28px] h-[28px] rounded-md border border-[var(--border2)] bg-[var(--border)] text-[var(--icon)] flex items-center justify-center hover:border-[var(--steel)] hover:text-[var(--steel)] transition-all disabled:opacity-40"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
        </button>
        {/* Open in new tab */}
        <a
          href={previewUrl || "#"}
          target="_blank"
          rel="noopener noreferrer"
          title="Open in a new tab"
          aria-disabled={!previewUrl}
          onClick={(e) => { if (!previewUrl) e.preventDefault(); }}
          className={`w-[28px] h-[28px] rounded-md border border-[var(--border2)] bg-[var(--border)] flex items-center justify-center transition-all ${previewUrl ? "text-[var(--icon)] hover:border-[var(--steel)] hover:text-[var(--steel)]" : "text-[var(--muted)] opacity-40 pointer-events-none"}`}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </a>
      </div>

      {/* Frame / placeholder */}
      {previewUrl ? (
        <iframe
          key={`${previewUrl}-${reloadKey}`}
          src={previewUrl}
          title="Preview"
          className="flex-1 w-full bg-white"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      ) : (
        <div className="flex-1 flex items-center justify-center px-6 text-center">
          <p className="text-xs text-[var(--muted)]">
            No preview yet. Say &ldquo;run the app&rdquo; and Rex will start it and load it here.
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
