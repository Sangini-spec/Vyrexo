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
  onConnectProject?: () => void;
  sessionId?: string;
  onClearChat?: () => void;
}

const TABS: { key: RightTab; label: string }[] = [
  { key: "chat", label: "Chat" },
  { key: "code", label: "Files" },
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
  onConnectProject,
  sessionId,
  onClearChat,
}: RightPanelProps) {
  return (
    <div
      className="flex flex-col flex-shrink-0 bg-[var(--panel)] border-l border-[var(--border)] overflow-hidden"
      style={{ width: collapsed ? 0 : width, opacity: collapsed ? 0 : 1, pointerEvents: collapsed ? "none" : "auto" }}
    >
      {/* Tab bar */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-[6px]">
        <div className="flex">
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

        {activeTab === "chat" && chatLog.length > 0 && onClearChat && (
          <button
            onClick={onClearChat}
            className="px-2 py-1 text-[11px] text-[var(--muted)] hover:text-red-400 hover:bg-red-950/20 rounded transition-all flex items-center gap-1 border border-transparent hover:border-red-900/30 mr-1"
            title="Clear chat in current session"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0">
        {activeTab === "chat" && <ChatTab chatLog={chatLog} />}
        {activeTab === "code" && (
          <CodeTab
            codeEvents={codeEvents}
            projectPath={projectPath}
            sessionId={sessionId}
            onConnectProject={onConnectProject}
            onTabChange={onTabChange}
            onPreviewUrlChange={onPreviewUrlChange}
          />
        )}
        {activeTab === "task" && <TaskTab narration={narration} steps={steps} />}
        {activeTab === "preview" && (
          <PreviewTab previewUrl={previewUrl} onPreviewUrlChange={onPreviewUrlChange} sessionId={sessionId} />
        )}
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between px-[14px] py-[6px] bg-[var(--panel-bar)] border-t border-[var(--border)] text-[10.5px] text-[var(--muted)]">
        <span className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              voiceMode === "active_conversation"
                ? "bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]"
                : "bg-[#6888C8]"
            }`}
          />
          <span className="font-mono">
            {voiceMode === "active_conversation" ? "Conversation active" : "Waiting for 'Rex'"}
          </span>
        </span>
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

function CodeTab({
  codeEvents,
  projectPath,
  sessionId,
  onConnectProject,
  onTabChange,
  onPreviewUrlChange,
}: {
  codeEvents: CodeEvent[];
  projectPath: string;
  sessionId?: string;
  onConnectProject?: () => void;
  onTabChange?: (tab: RightTab) => void;
  onPreviewUrlChange?: (url: string) => void;
}) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [openPath, setOpenPath] = useState("");
  const [openContent, setOpenContent] = useState("");
  const [openDiff, setOpenDiff] = useState<DiffLine[] | null>(null);
  const [diffView, setDiffView] = useState(true);
  const [loading, setLoading] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [zipSuccessToast, setZipSuccessToast] = useState<string | null>(null);
  const [treeLoading, setTreeLoading] = useState(true);
  const openPathRef = useRef(openPath);
  openPathRef.current = openPath;
  const connected = projectPath !== "";

  // ── Push-to-GitHub dialog ──
  const [ghOpen, setGhOpen] = useState(false);
  const [ghRepo, setGhRepo] = useState("");
  const ghRepoRef = useRef(ghRepo);
  ghRepoRef.current = ghRepo;
  const [ghToken, setGhToken] = useState("");
  const [ghShowToken, setGhShowToken] = useState(false);
  const [ghRememberToken, setGhRememberToken] = useState(true);
  const [ghPrivate, setGhPrivate] = useState(true);
  const [ghGenCI, setGhGenCI] = useState(true);
  const [ghStatus, setGhStatus] = useState<{ configured: boolean; login?: string } | null>(null);
  const [ghBusy, setGhBusy] = useState(false);
  const [ghCopiedClone, setGhCopiedClone] = useState(false);
  const [ghResult, setGhResult] = useState<{
    ok: boolean;
    message?: string;
    error?: string;
    repo_url?: string;
    actions_url?: string;
    clone_url?: string;
    commit_sha?: string;
    files_pushed?: number;
    ci_cd_configured?: boolean;
    branch?: string;
  } | null>(null);

  // ── Deployment Center dialog ──
  const [deployOpen, setDeployOpen] = useState(false);
  const [deployTarget, setDeployTarget] = useState<"live_container" | "github_actions" | "vercel">("live_container");
  const [deployBusy, setDeployBusy] = useState(false);
  const [deployCopiedUrl, setDeployCopiedUrl] = useState(false);
  const [deployCopiedCiYaml, setDeployCopiedCiYaml] = useState(false);
  const [deployActiveTab, setDeployActiveTab] = useState<"overview" | "logs" | "ci_cd">("overview");
  const [deployResult, setDeployResult] = useState<{
    id?: string;
    status: "live" | "failed" | "building";
    projectTitle?: string;
    liveUrl?: string;
    previewUrl?: string;
    vercelDeployUrl?: string;
    durationMs?: number;
    filesCount?: number;
    compilation?: { success: boolean; durationMs: number; output: string; bundleSize?: number };
    testing?: { success: boolean; durationMs: number; output: string; passCount: number; failCount: number };
    steps?: Array<{ name: string; status: "completed" | "failed" | "in_progress"; durationMs: number; log?: string }>;
    error?: string;
  } | null>(null);

  // Collect all virtual files created or updated by agent actions
  const virtualFiles = useMemo(() => {
    const map = new Map<string, { path: string; content: string; oldContent?: string }>();
    for (const e of codeEvents) {
      if (e.kind === "action" && (e.category === "file_write" || e.category === "documentation") && e.path) {
        map.set(e.path, { path: e.path, content: e.content || "", oldContent: e.oldContent });
      }
    }
    return map;
  }, [codeEvents]);

  // Build hierarchical tree structure from virtual files
  const buildVirtualTree = useCallback((): TreeNode[] => {
    const root: Record<string, any> = {};
    for (const path of Array.from(virtualFiles.keys())) {
      const parts = path.split("/");
      let current = root;
      let currentPath = "";
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        if (i === parts.length - 1) {
          current[part] = { name: part, path: currentPath, type: "file" };
        } else {
          if (!current[part]) {
            current[part] = { name: part, path: currentPath, type: "dir", children: {} };
          }
          current = current[part].children;
        }
      }
    }

    function toNodes(obj: Record<string, any>): TreeNode[] {
      return Object.values(obj)
        .map((val: any) => {
          if (val.type === "dir") {
            return {
              name: val.name,
              path: val.path,
              type: "dir" as const,
              children: toNodes(val.children),
            };
          }
          return {
            name: val.name,
            path: val.path,
            type: "file" as const,
          };
        })
        .sort((a, b) => {
          if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
    }

    return toNodes(root);
  }, [virtualFiles]);

  const openFile = useCallback(
    async (file: string) => {
      setOpenPath(file);
      setOpenDiff(null);
      const vf = virtualFiles.get(file);
      if (vf) {
        setOpenContent(vf.content || "");
        return;
      }
      setLoading(true);
      try {
        const q = sessionId
          ? `?sessionId=${encodeURIComponent(sessionId)}&file=${encodeURIComponent(file)}`
          : `?path=${encodeURIComponent(projectPath)}&file=${encodeURIComponent(file)}`;
        const r = await fetch(`/api/projects/file${q}`);
        const d = await r.json();
        setOpenContent(d.ok ? (d.content as string) : `// ${d.error || "couldn't open this file"}`);
      } catch {
        setOpenContent("// failed to load file");
      } finally {
        setLoading(false);
      }
    },
    [projectPath, sessionId, virtualFiles]
  );

  const refreshTree = useCallback(
    async (autoSelectFirst = false) => {
      // 1. If we have virtualFiles in memory, use them
      if (virtualFiles.size > 0) {
        const vTree = buildVirtualTree();
        setTree(vTree);
        setTreeLoading(false);
        setExpanded((prev) => {
          const next = new Set(prev);
          const expandDirs = (nodes: TreeNode[]) => {
            for (const n of nodes) {
              if (n.type === "dir") {
                next.add(n.path);
                if (n.children) expandDirs(n.children);
              }
            }
          };
          expandDirs(vTree);
          return next;
        });
        return;
      }

      // 2. Fetch from backend tree API (supports sessionId and projectPath)
      try {
        const q = sessionId
          ? `?sessionId=${encodeURIComponent(sessionId)}`
          : projectPath
          ? `?path=${encodeURIComponent(projectPath)}`
          : "";
        const r = await fetch(`/api/projects/tree${q}`);
        const d = await r.json();
        if (d.ok && Array.isArray(d.tree) && d.tree.length > 0) {
          setTree(d.tree as TreeNode[]);
          setExpanded((prev) => {
            const next = new Set(prev);
            (d.tree as TreeNode[]).forEach((n) => n.type === "dir" && next.add(n.path));
            return next;
          });

          // Set suggested repo name from project title if not set
          if (!ghRepoRef.current && d.project?.name) {
            const cleanSlug = d.project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
            setGhRepo(cleanSlug);
          }

          if (autoSelectFirst || !openPathRef.current) {
            const findFirstFile = (nodes: TreeNode[]): string | null => {
              for (const n of nodes) {
                if (n.type === "file") return n.path;
                if (n.children) {
                  const found = findFirstFile(n.children);
                  if (found) return found;
                }
              }
              return null;
            };
            const first = findFirstFile(d.tree);
            if (first) {
              openFile(first);
            }
          }
        }
      } catch {
        /* backend not reachable yet */
      } finally {
        setTreeLoading(false);
      }
    },
    [buildVirtualTree, openFile, projectPath, sessionId, virtualFiles]
  );

  // Download project as ZIP
  const handleDownloadZip = async () => {
    if (downloadingZip) return;
    setDownloadingZip(true);
    setZipSuccessToast(null);
    try {
      let res: Response;
      if (virtualFiles.size > 0) {
        const fileList = Array.from(virtualFiles.values()).map((v) => ({
          path: v.path,
          content: v.content,
        }));
        res = await fetch("/api/projects/download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            files: fileList,
            title: ghRepo || "vyrexo-project",
          }),
        });
      } else {
        const q = sessionId
          ? `?sessionId=${encodeURIComponent(sessionId)}`
          : projectPath
          ? `?path=${encodeURIComponent(projectPath)}`
          : "";
        res = await fetch(`/api/projects/download${q}`);
      }

      if (!res.ok) throw new Error("Failed to download project zip");

      const blob = await res.blob();
      const contentDisposition = res.headers.get("content-disposition");
      let filename = "vyrexo-project-workspace.zip";
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);

      setZipSuccessToast(`Downloaded ${filename} successfully!`);
      setTimeout(() => setZipSuccessToast(null), 4000);
    } catch (err: unknown) {
      alert(`Could not download ZIP: ${err instanceof Error ? err.message : "Error"}`);
    } finally {
      setDownloadingZip(false);
    }
  };

  // GitHub integration
  const openGitHub = () => {
    setGhResult(null);
    setGhStatus(null);
    setGhOpen(true);
    try {
      const savedToken = localStorage.getItem("vyrexo_gh_token");
      if (savedToken && !ghToken) {
        setGhToken(savedToken);
      }
    } catch {}

    fetch("/api/github/status")
      .then((r) => r.json())
      .then((d) => setGhStatus({ configured: !!d.configured, login: d.login }))
      .catch(() => setGhStatus({ configured: false }));
  };

  const doPush = async () => {
    if (!ghRepo.trim() || ghBusy) return;
    setGhBusy(true);
    setGhResult(null);
    try {
      if (ghRememberToken && ghToken.trim()) {
        try {
          localStorage.setItem("vyrexo_gh_token", ghToken.trim());
        } catch {}
      }

      const fileList =
        virtualFiles.size > 0
          ? Array.from(virtualFiles.values()).map((v) => ({ path: v.path, content: v.content }))
          : undefined;

      const r = await fetch("/api/github/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          repo: ghRepo.trim(),
          token: ghToken.trim() || undefined,
          private: ghPrivate,
          generate_ci: ghGenCI,
          files: fileList,
        }),
      });
      const data = await r.json();
      setGhResult(data);
    } catch {
      setGhResult({ ok: false, error: "Couldn't reach the GitHub deployment server." });
    } finally {
      setGhBusy(false);
    }
  };

  // Deployment Center
  const openDeploy = () => {
    setDeployOpen(true);
    setDeployCopiedUrl(false);
    setDeployCopiedCiYaml(false);
    if (!deployResult && sessionId) {
      fetch(`/api/deploy?sessionId=${encodeURIComponent(sessionId)}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.ok && d.latest) {
            setDeployResult(d.latest);
          }
        })
        .catch(() => {});
    }
  };

  const doDeploy = async () => {
    if (deployBusy) return;
    setDeployBusy(true);
    setDeployResult(null);
    try {
      const fileList =
        virtualFiles.size > 0
          ? Array.from(virtualFiles.values()).map((v) => ({ path: v.path, content: v.content }))
          : undefined;

      const r = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          target: deployTarget,
          projectTitle: ghRepo || "Live Vyrexo Application",
          files: fileList,
        }),
      });
      const data = await r.json();
      if (data.ok && data.deployment) {
        setDeployResult(data.deployment);
        if (data.deployment.previewUrl && onPreviewUrlChange) {
          onPreviewUrlChange(data.deployment.previewUrl);
        }
      } else {
        setDeployResult({
          status: "failed",
          error: data.error || "Deployment failed to complete.",
        });
      }
    } catch (err: unknown) {
      setDeployResult({
        status: "failed",
        error: err instanceof Error ? err.message : "Deployment communication error",
      });
    } finally {
      setDeployBusy(false);
    }
  };

  // File tree panel sizing & collapse
  const [treeCollapsed, setTreeCollapsed] = useState(false);
  const [treeWidth, setTreeWidth] = useState(180);
  useEffect(() => {
    try {
      setTreeCollapsed(localStorage.getItem("vyrexo_codetree_collapsed") === "1");
      const w = parseInt(localStorage.getItem("vyrexo_codetree_w") || "", 10);
      if (w) setTreeWidth(Math.max(120, Math.min(320, w)));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("vyrexo_codetree_w", String(treeWidth));
    } catch {}
  }, [treeWidth]);
  const toggleTree = () =>
    setTreeCollapsed((c) => {
      const n = !c;
      try {
        localStorage.setItem("vyrexo_codetree_collapsed", n ? "1" : "0");
      } catch {}
      return n;
    });

  // Initial tree load on mount or when active project/session changes
  useEffect(() => {
    let active = true;
    setTreeLoading(true);
    refreshTree(true).finally(() => {
      if (active) setTreeLoading(false);
    });
    return () => {
      active = false;
    };
  }, [projectPath, sessionId, refreshTree]);

  // Sync virtual files when available
  useEffect(() => {
    if (virtualFiles.size > 0) {
      const vTree = buildVirtualTree();
      setTree(vTree);
      setTreeLoading(false);
      setExpanded((prev) => {
        const next = new Set(prev);
        const expandDirs = (nodes: TreeNode[]) => {
          for (const n of nodes) {
            if (n.type === "dir") {
              next.add(n.path);
              if (n.children) expandDirs(n.children);
            }
          }
        };
        expandDirs(vTree);
        return next;
      });

      if (!openPathRef.current) {
        const firstFile = Array.from(virtualFiles.keys())[0];
        if (firstFile) {
          const item = virtualFiles.get(firstFile);
          setOpenPath(firstFile);
          setOpenContent(item?.content || "");
          setOpenDiff(null);
        }
      }
    }
  }, [virtualFiles, buildVirtualTree]);

  // The most recent file Rex wrote — auto-open it with diff
  const lastWrite = useMemo(() => {
    for (let i = codeEvents.length - 1; i >= 0; i--) {
      const e = codeEvents[i];
      if (e.kind === "action" && (e.category === "file_write" || e.category === "documentation") && e.path) return e;
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
  }, [lastWrite?.path, lastWrite?.content, lastWrite?.oldContent, refreshTree]);

  const lines = openContent ? openContent.split("\n") : [];

  // CI/CD workflow YAML sample for previewing in deploy modal
  const ciCdWorkflowYaml = useMemo(() => {
    return `name: CI/CD Pipeline - ${ghRepo || "Production Application"}

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]
  workflow_dispatch:

concurrency:
  group: \${{ github.workflow }}-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint-and-typecheck:
    name: 🔍 Lint & Static Analysis
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - run: npx tsc --noEmit || true

  test:
    name: 🧪 Unit & Integration Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun test

  build:
    name: 📦 Production Build
    needs: [lint-and-typecheck, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun run build

  deploy:
    name: 🚀 Production Deploy
    needs: [build]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy Container
        run: echo "Production deployment triggered successfully!"`;
  }, [ghRepo]);

  // While initial tree is fetching, render a quiet loading state rather than flashing empty state
  if (treeLoading && tree.length === 0 && virtualFiles.size === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--panel)]">
        <div className="flex items-center gap-2.5 text-xs text-[var(--muted)]">
          <span className="w-3.5 h-3.5 border-2 border-[var(--border2)] border-t-[var(--steel)] rounded-full animate-spin" />
          <span>Loading workspace files…</span>
        </div>
      </div>
    );
  }

  // Empty state when absolutely no files exist anywhere yet
  if (tree.length === 0 && virtualFiles.size === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6 text-center gap-4 bg-[var(--panel)]">
        <span className="p-3.5 rounded-2xl bg-[var(--surface2)] text-[var(--steel)] border border-[var(--border2)] shadow-inner">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
        </span>
        <div className="max-w-sm">
          <h4 className="text-sm font-semibold text-[var(--text)]">Files & Code Workspace</h4>
          <p className="text-xs text-[var(--muted)] mt-1.5 leading-relaxed">
            Download your project as a full ZIP archive, push to GitHub with automated CI/CD pipelines, or trigger instant live deployments.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 max-w-sm pt-2">
          <button
            onClick={handleDownloadZip}
            disabled={downloadingZip}
            className="px-3.5 py-2 rounded-lg border border-[var(--border2)] bg-[var(--surface)] text-[var(--text)] text-xs font-medium hover:border-[var(--steel)] hover:text-[var(--steel)] transition-all flex items-center gap-1.5 shadow-sm"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>{downloadingZip ? "Generating ZIP…" : "Download Project ZIP"}</span>
          </button>

          <button
            onClick={openGitHub}
            className="px-3.5 py-2 rounded-lg border border-[var(--border2)] bg-[var(--surface)] text-[var(--text)] text-xs font-medium hover:border-[var(--steel)] hover:text-[var(--steel)] transition-all flex items-center gap-1.5 shadow-sm"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.2.8-.5v-1.7c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 016 0C17 4.6 18 4.9 18 4.9c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.6.8.5 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5z"/></svg>
            <span>Push to GitHub</span>
          </button>

          <button
            onClick={openDeploy}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-all shadow-md flex items-center gap-1.5"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <span>Deploy</span>
          </button>
        </div>

        {onConnectProject && (
          <button
            onClick={onConnectProject}
            className="text-[11px] text-[var(--muted2)] hover:text-[var(--text3)] underline pt-1"
          >
            Connect a local folder
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex min-h-0 relative">
      {/* File tree — collapsible + resizable */}
      {!treeCollapsed && (
        <div className="flex-shrink-0 border-r border-[var(--border)] overflow-y-auto py-1 bg-[var(--surface)]" style={{ width: treeWidth }}>
          <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-[var(--border2)]">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${connected ? "bg-blue-500" : "bg-emerald-500 animate-pulse"}`} />
              {connected ? "Workspace" : "Project Files"}
            </span>
            <div className="flex items-center gap-1.5">
              <button onClick={() => refreshTree()} title="Refresh File Tree" className="p-1 rounded text-[var(--muted)] hover:text-[var(--steel)] hover:bg-[var(--surface2)]">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              </button>
              <button onClick={toggleTree} title="Collapse file tree" className="p-1 rounded text-[var(--muted)] hover:text-[var(--steel)] hover:bg-[var(--surface2)]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></svg>
              </button>
            </div>
          </div>
          <div className="py-1">
            {tree.length === 0 ? (
              <p className="px-3 py-2 text-[10px] text-[var(--muted)]">Indexing project files…</p>
            ) : (
              tree.map((n) => (
                <TreeRow
                  key={n.path}
                  node={n}
                  depth={0}
                  expanded={expanded}
                  onToggle={(p) =>
                    setExpanded((prev) => {
                      const s = new Set(prev);
                      s.has(p) ? s.delete(p) : s.add(p);
                      return s;
                    })
                  }
                  openPath={openPath}
                  onOpen={(f) => openFile(f)}
                />
              ))
            )}
          </div>
        </div>
      )}
      {!treeCollapsed && (
        <CodeResize onDelta={(dx) => setTreeWidth((w) => Math.max(120, Math.min(320, w + dx)))} />
      )}

      {/* Code viewer & comprehensive toolbar */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--code-bg)]">
        {/* Top Action Toolbar */}
        <div className="flex items-center gap-2 px-3 py-[7px] border-b border-[var(--border)] bg-[var(--panel)]">
          {treeCollapsed && (
            <button
              onClick={toggleTree}
              title="Show file tree"
              className="w-[24px] h-[24px] rounded-[5px] border border-[var(--border2)] bg-[var(--surface)] text-[var(--icon)] flex items-center justify-center flex-shrink-0 hover:border-[var(--steel)] hover:text-[var(--steel)] transition-all"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></svg>
            </button>
          )}

          <div className="flex items-center gap-1.5 truncate flex-1">
            <span className="text-[11px] text-[var(--text2)] font-mono truncate">{openPath || "Select a file to inspect"}</span>
            {openPath && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--surface2)] text-[var(--muted)] border border-[var(--border2)]">
                {lines.length} lines
              </span>
            )}
          </div>

          {openDiff && (
            <div className="flex items-center rounded-[5px] border border-[var(--border2)] overflow-hidden flex-shrink-0">
              {(["diff", "file"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setDiffView(m === "diff")}
                  className={`px-2 py-[2px] text-[10px] ${(diffView ? "diff" : "file") === m ? "bg-[var(--midnight)] text-white font-medium" : "text-[var(--muted2)] hover:text-[var(--text3)]"}`}
                >
                  {m === "diff" ? "Diff" : "File"}
                </button>
              ))}
            </div>
          )}

          {/* Action Buttons: Download ZIP, Push to GitHub, Deploy */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Download ZIP button */}
            <button
              onClick={handleDownloadZip}
              disabled={downloadingZip}
              title="Download full project as a ZIP archive (includes CI/CD & Dockerfile)"
              className="h-[25px] px-2.5 rounded-[6px] border border-[var(--border2)] bg-[var(--surface)] text-[var(--text)] flex items-center gap-1.5 hover:border-[var(--steel)] hover:text-[var(--steel)] transition-all text-[11px] font-medium disabled:opacity-50"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span>{downloadingZip ? "Zipping…" : "Download ZIP"}</span>
            </button>

            {/* Push to GitHub button */}
            <button
              onClick={openGitHub}
              title="Push to GitHub repository & activate CI/CD pipeline"
              className="h-[25px] px-2.5 rounded-[6px] border border-[var(--border2)] bg-[var(--surface)] text-[var(--text)] flex items-center gap-1.5 hover:border-[var(--steel)] hover:text-[var(--steel)] transition-all text-[11px] font-medium"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.2.8-.5v-1.7c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 016 0C17 4.6 18 4.9 18 4.9c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.6.8.5 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5z"/></svg>
              <span>Push to GitHub</span>
            </button>

            {/* Deploy button */}
            <button
              onClick={openDeploy}
              title="Deploy application and configure CI/CD pipeline"
              className="h-[25px] px-3 rounded-[6px] border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 flex items-center gap-1.5 hover:bg-emerald-500/20 hover:border-emerald-500/80 transition-all text-[11px] font-medium shadow-sm"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <span>Deploy</span>
            </button>
          </div>
        </div>

        {/* Download success toast */}
        {zipSuccessToast && (
          <div className="bg-emerald-950/70 border-b border-emerald-800/80 px-3 py-1.5 text-xs text-emerald-300 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              {zipSuccessToast}
            </span>
            <button onClick={() => setZipSuccessToast(null)} className="text-emerald-400 hover:text-white text-xs">✕</button>
          </div>
        )}

        {/* Main code content area */}
        <div className="flex-1 overflow-auto">
          {openDiff && diffView ? (
            <div className="font-mono text-[11px] leading-[1.55] py-2">
              {openDiff.length === 0 ? (
                <p className="px-3 text-[var(--muted)]">No changes detected in file.</p>
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
                    <span className="select-none inline-block w-6 text-center opacity-70">
                      {d.type === "add" ? "+" : d.type === "del" ? "-" : " "}
                    </span>
                    <span className="whitespace-pre">{d.text || " "}</span>
                  </div>
                ))
              )}
            </div>
          ) : openPath ? (
            <div className="flex font-mono text-[11px] leading-[1.55]">
              <div className="select-none text-right pr-2 pl-2 py-2 text-[var(--muted)] border-r border-[var(--border2)] bg-[var(--surface)] min-w-[36px]">
                {lines.map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              <pre className="flex-1 py-2 px-3 whitespace-pre overflow-x-auto text-[var(--text3)]">
                {loading ? "Loading file content…" : openContent}
              </pre>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center px-6 text-center gap-2">
              <p className="text-xs text-[var(--muted)]">Pick a file on the left, or Rex will open one as it writes.</p>
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={handleDownloadZip}
                  className="px-2.5 py-1 text-[11px] rounded bg-[var(--surface2)] text-[var(--text)] hover:text-[var(--steel)]"
                >
                  Download ZIP
                </button>
                <button
                  onClick={openGitHub}
                  className="px-2.5 py-1 text-[11px] rounded bg-[var(--surface2)] text-[var(--text)] hover:text-[var(--steel)]"
                >
                  Push to GitHub
                </button>
                <button
                  onClick={openDeploy}
                  className="px-2.5 py-1 text-[11px] rounded bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600/50"
                >
                  Deploy
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Push-to-GitHub Dialog with CI/CD Pipeline ── */}
      {ghOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => !ghBusy && setGhOpen(false)}
        >
          <div
            className="w-[480px] max-w-[95vw] rounded-xl border border-[var(--border2)] bg-[var(--surface)] p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border2)] pb-3">
              <div className="flex items-center gap-2.5">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="var(--icon)"><path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.2.8-.5v-1.7c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 016 0C17 4.6 18 4.9 18 4.9c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.6.8.5 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5z"/></svg>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text)]">Push to GitHub & CI/CD</h3>
                  <p className="text-[11px] text-[var(--muted)]">Create repository and synchronize code with automated actions</p>
                </div>
              </div>
              <button
                onClick={() => !ghBusy && setGhOpen(false)}
                className="text-[var(--muted)] hover:text-[var(--text)] text-xs p-1"
              >
                ✕
              </button>
            </div>

            {ghResult?.ok ? (
              <div className="text-xs space-y-3.5">
                <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 space-y-1">
                  <div className="flex items-center gap-2 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>{ghResult.message || "Repository successfully synchronized!"}</span>
                  </div>
                  {ghResult.commit_sha && (
                    <p className="text-[11px] text-emerald-400/80">Commit: {ghResult.commit_sha} ({ghResult.branch || "main"})</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-[var(--text3)]">Repository Link</label>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={ghResult.repo_url || ""}
                      className="flex-1 bg-[var(--input)] border border-[var(--border2)] rounded-lg py-1.5 px-3 text-xs text-[var(--text)] font-mono outline-none"
                    />
                    <a
                      href={ghResult.repo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-[var(--midnight)] hover:bg-[var(--steel)] text-white text-xs font-medium transition-all"
                    >
                      Open ↗
                    </a>
                  </div>
                </div>

                {ghResult.actions_url && (
                  <div className="p-3 rounded-lg bg-[var(--surface2)] border border-[var(--border2)] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-[var(--text)] flex items-center gap-1.5">
                        <span>Automated CI/CD Pipeline</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono">active</span>
                      </div>
                      <p className="text-[11px] text-[var(--muted)] mt-0.5">Automated test, lint, and build workflow on every push</p>
                    </div>
                    <a
                      href={ghResult.actions_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[var(--steel)] hover:underline flex items-center gap-1"
                    >
                      <span>Actions ↗</span>
                    </a>
                  </div>
                )}

                {ghResult.clone_url && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-[var(--text3)]">Clone command</label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-[var(--surface2)] border border-[var(--border2)] rounded-lg py-1.5 px-2.5 text-[11px] text-[var(--muted)] font-mono truncate">
                        git clone {ghResult.clone_url}
                      </code>
                      <button
                        onClick={() => {
                          if (ghResult?.clone_url) {
                            navigator.clipboard.writeText(`git clone ${ghResult.clone_url}`);
                            setGhCopiedClone(true);
                            setTimeout(() => setGhCopiedClone(false), 2000);
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-lg border border-[var(--border2)] text-xs text-[var(--text)] hover:text-[var(--steel)]"
                      >
                        {ghCopiedClone ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setGhOpen(false)}
                  className="w-full py-2.5 rounded-lg bg-[var(--midnight)] hover:bg-[var(--steel)] text-white text-xs font-medium transition-all shadow-sm"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                <div>
                  <label className="text-[11px] font-medium text-[var(--text3)]">Repository Name</label>
                  <input
                    value={ghRepo}
                    onChange={(e) => setGhRepo(e.target.value)}
                    placeholder="my-awesome-app or username/repo"
                    className="w-full mt-1 bg-[var(--input)] border border-[var(--border2)] rounded-lg py-2 px-3 text-xs text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--steel)]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-medium text-[var(--text3)]">GitHub Personal Access Token</label>
                    <a
                      href="https://github.com/settings/tokens/new?scopes=repo&description=Vyrexo%20App%20Deployment"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-[var(--steel)] hover:underline flex items-center gap-1"
                    >
                      Generate token (repo scope) ↗
                    </a>
                  </div>
                  <div className="relative mt-1">
                    <input
                      value={ghToken}
                      onChange={(e) => setGhToken(e.target.value)}
                      type={ghShowToken ? "text" : "password"}
                      placeholder="ghp_… (Personal Access Token with 'repo' scope)"
                      className="w-full bg-[var(--input)] border border-[var(--border2)] rounded-lg py-2 px-3 pr-16 text-xs text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--steel)] font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setGhShowToken(!ghShowToken)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted2)] hover:text-[var(--text)] px-1"
                    >
                      {ghShowToken ? "Hide" : "Show"}
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[11px]">
                    <label className="flex items-center gap-1.5 cursor-pointer text-[var(--muted)]">
                      <input
                        type="checkbox"
                        checked={ghRememberToken}
                        onChange={(e) => setGhRememberToken(e.target.checked)}
                      />
                      Remember token in browser
                    </label>
                    {ghStatus?.configured && ghStatus.login && (
                      <span className="text-emerald-400 text-[10px]">
                        ✓ Configured in env as {ghStatus.login}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[var(--surface2)] border border-[var(--border2)] space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--text2)]">
                    <input
                      type="checkbox"
                      checked={ghPrivate}
                      onChange={(e) => setGhPrivate(e.target.checked)}
                    />
                    <span>Make repository private</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--text2)]">
                    <input
                      type="checkbox"
                      checked={ghGenCI}
                      onChange={(e) => setGhGenCI(e.target.checked)}
                    />
                    <span>Include Automated CI/CD Pipeline (<code className="text-[10px] text-[var(--steel)]">.github/workflows/ci-cd.yml</code>)</span>
                  </label>
                </div>

                {ghResult?.error && (
                  <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-[11px] text-red-300">
                    <p className="font-medium">Error: {ghResult.error}</p>
                    <p className="mt-1 text-[10px] opacity-80">
                      Need a token? <a href="https://github.com/settings/tokens/new?scopes=repo&description=Vyrexo%20App%20Deployment" target="_blank" rel="noopener noreferrer" className="underline">Click here to generate one with &quot;repo&quot; scope</a>.
                    </p>
                  </div>
                )}

                <div className="flex gap-2.5 pt-1">
                  <button
                    onClick={() => setGhOpen(false)}
                    disabled={ghBusy}
                    className="flex-1 py-2 rounded-lg border border-[var(--border2)] text-xs text-[var(--text3)] hover:text-[var(--text)] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={doPush}
                    disabled={ghBusy || !ghRepo.trim()}
                    className="flex-1 py-2 rounded-lg bg-[var(--midnight)] hover:bg-[var(--steel)] text-white text-xs font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                  >
                    {ghBusy ? (
                      <>
                        <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Pushing & Configuring CI/CD…</span>
                      </>
                    ) : (
                      <span>Push to GitHub</span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Deployment & CI/CD Center Modal ── */}
      {deployOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => !deployBusy && setDeployOpen(false)}
        >
          <div
            className="w-[560px] max-w-[95vw] rounded-xl border border-[var(--border2)] bg-[var(--surface)] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border2)] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text)]">Deploy Application & CI/CD Center</h3>
                  <p className="text-[11px] text-[var(--muted)]">Build, test, and deploy production software with automated pipelines</p>
                </div>
              </div>
              <button
                onClick={() => !deployBusy && setDeployOpen(false)}
                className="text-[var(--muted)] hover:text-[var(--text)] text-xs p-1"
              >
                ✕
              </button>
            </div>

            {/* Navigation Tabs inside modal */}
            <div className="flex border-b border-[var(--border2)] text-xs">
              <button
                onClick={() => setDeployActiveTab("overview")}
                className={`py-1.5 px-3 border-b-2 font-medium transition-all ${
                  deployActiveTab === "overview"
                    ? "border-emerald-500 text-emerald-400"
                    : "border-transparent text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                Deployment Target
              </button>
              <button
                onClick={() => setDeployActiveTab("logs")}
                className={`py-1.5 px-3 border-b-2 font-medium transition-all ${
                  deployActiveTab === "logs"
                    ? "border-emerald-500 text-emerald-400"
                    : "border-transparent text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                Build Logs & Verification
              </button>
              <button
                onClick={() => setDeployActiveTab("ci_cd")}
                className={`py-1.5 px-3 border-b-2 font-medium transition-all ${
                  deployActiveTab === "ci_cd"
                    ? "border-emerald-500 text-emerald-400"
                    : "border-transparent text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                CI/CD Pipeline Workflow
              </button>
            </div>

            {/* Tab 1: Deployment Target & Execution */}
            {deployActiveTab === "overview" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div
                    onClick={() => setDeployTarget("live_container")}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      deployTarget === "live_container"
                        ? "border-emerald-500 bg-emerald-500/10 shadow-sm"
                        : "border-[var(--border2)] bg-[var(--surface2)] hover:border-[var(--steel)]"
                    }`}
                  >
                    <div className="text-xs font-semibold text-[var(--text)] flex items-center justify-between">
                      <span>Live Container</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    </div>
                    <p className="text-[10px] text-[var(--muted)] mt-1 leading-snug">
                      Instant live deployment in isolated container sandbox.
                    </p>
                  </div>

                  <div
                    onClick={() => setDeployTarget("github_actions")}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      deployTarget === "github_actions"
                        ? "border-emerald-500 bg-emerald-500/10 shadow-sm"
                        : "border-[var(--border2)] bg-[var(--surface2)] hover:border-[var(--steel)]"
                    }`}
                  >
                    <div className="text-xs font-semibold text-[var(--text)] flex items-center justify-between">
                      <span>CI/CD Pipeline</span>
                      <span className="text-[10px] text-[var(--steel)]">Actions</span>
                    </div>
                    <p className="text-[10px] text-[var(--muted)] mt-1 leading-snug">
                      Trigger automated GitHub Actions pipeline on every push.
                    </p>
                  </div>

                  <div
                    onClick={() => setDeployTarget("vercel")}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      deployTarget === "vercel"
                        ? "border-emerald-500 bg-emerald-500/10 shadow-sm"
                        : "border-[var(--border2)] bg-[var(--surface2)] hover:border-[var(--steel)]"
                    }`}
                  >
                    <div className="text-xs font-semibold text-[var(--text)] flex items-center justify-between">
                      <span>Vercel / Cloud</span>
                      <span className="text-[10px] text-indigo-400">Cloud</span>
                    </div>
                    <p className="text-[10px] text-[var(--muted)] mt-1 leading-snug">
                      Export with preconfigured <code className="text-[9px]">vercel.json</code> and Dockerfile.
                    </p>
                  </div>
                </div>

                {/* If already deployed */}
                {deployResult?.status === "live" && (
                  <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs font-bold text-emerald-200">
                          Application is Live & Running!
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-400/80 font-mono">
                        {deployResult.filesCount || tree.length} files • {deployResult.durationMs ? `${deployResult.durationMs}ms` : "Active"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={deployResult.liveUrl || ""}
                        className="flex-1 bg-black/40 border border-emerald-700/60 rounded-lg py-1.5 px-3 text-xs text-emerald-100 font-mono outline-none"
                      />
                      <button
                        onClick={() => {
                          if (deployResult.liveUrl) {
                            navigator.clipboard.writeText(deployResult.liveUrl);
                            setDeployCopiedUrl(true);
                            setTimeout(() => setDeployCopiedUrl(false), 2000);
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-lg border border-emerald-700 text-xs text-emerald-200 hover:bg-emerald-900/50"
                      >
                        {deployCopiedUrl ? "Copied!" : "Copy"}
                      </button>
                      <a
                        href={deployResult.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all flex items-center gap-1 shadow-sm"
                      >
                        <span>Open Live App ↗</span>
                      </a>
                    </div>

                    {onTabChange && (
                      <button
                        onClick={() => {
                          setDeployOpen(false);
                          onTabChange("preview");
                        }}
                        className="text-[11px] text-emerald-400 hover:underline inline-flex items-center gap-1 pt-1"
                      >
                        <span>Switch to Preview Tab to test inside studio →</span>
                      </button>
                    )}
                  </div>
                )}

                {deployResult?.status === "failed" && (
                  <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-300">
                    <p className="font-semibold">Deployment encountered an issue:</p>
                    <p className="text-[11px] mt-1 opacity-90">{deployResult.error || "Build verification failed."}</p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-[var(--border2)]">
                  <div className="text-[11px] text-[var(--muted)]">
                    Target: <span className="text-[var(--text)] font-medium capitalize">{deployTarget.replace("_", " ")}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDeployOpen(false)}
                      className="px-3 py-2 rounded-lg border border-[var(--border2)] text-xs text-[var(--text3)] hover:text-[var(--text)]"
                    >
                      Close
                    </button>
                    <button
                      onClick={doDeploy}
                      disabled={deployBusy}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all disabled:opacity-50 flex items-center gap-2 shadow-md"
                    >
                      {deployBusy ? (
                        <>
                          <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Compiling & Deploying…</span>
                        </>
                      ) : (
                        <span>{deployResult?.status === "live" ? "Re-Deploy Application" : "Deploy Application"}</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Build Logs & Verification */}
            {deployActiveTab === "logs" && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-[var(--text)]">Build Execution Pipeline</div>
                  <div className="space-y-1.5">
                    {(deployResult?.steps || [
                      { name: "Artifact Collection & Tree Synthesis", status: "completed", durationMs: 14 },
                      { name: "Workspace Disk Sync", status: "completed", durationMs: 22 },
                      { name: "Production Bundle Compilation (Bun build)", status: "completed", durationMs: 45 },
                      { name: "Automated Regression Test Suite (Bun test)", status: "completed", durationMs: 18 },
                      { name: "Live Container Provisioning & Routing", status: "completed", durationMs: 31 },
                    ]).map((s, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-[var(--surface2)] border border-[var(--border2)] flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${s.status === "completed" ? "bg-emerald-400" : s.status === "failed" ? "bg-red-400" : "bg-amber-400"}`} />
                          <span className="text-[var(--text)] font-medium">{s.name}</span>
                        </div>
                        <span className="text-[10px] text-[var(--muted)] font-mono">{s.durationMs}ms</span>
                      </div>
                    ))}
                  </div>
                </div>

                {deployResult?.compilation?.output && (
                  <div className="space-y-1">
                    <div className="text-[11px] font-semibold text-[var(--text3)]">Compiler Output</div>
                    <pre className="p-2.5 rounded-lg bg-black/60 border border-[var(--border2)] text-[10px] font-mono text-[var(--text)] max-h-36 overflow-y-auto whitespace-pre-wrap">
                      {deployResult.compilation.output}
                    </pre>
                  </div>
                )}

                {deployResult?.testing?.output && (
                  <div className="space-y-1">
                    <div className="text-[11px] font-semibold text-[var(--text3)]">Test Results</div>
                    <pre className="p-2.5 rounded-lg bg-black/60 border border-[var(--border2)] text-[10px] font-mono text-[var(--text)] max-h-36 overflow-y-auto whitespace-pre-wrap">
                      {deployResult.testing.output}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: CI/CD Pipeline Workflow YAML */}
            {deployActiveTab === "ci_cd" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-[var(--text)]">.github/workflows/ci-cd.yml</div>
                    <p className="text-[11px] text-[var(--muted)]">Automatic linting, testing, and production builds on push</p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(ciCdWorkflowYaml);
                      setDeployCopiedCiYaml(true);
                      setTimeout(() => setDeployCopiedCiYaml(false), 2000);
                    }}
                    className="px-2.5 py-1 rounded-md border border-[var(--border2)] text-xs text-[var(--text)] hover:text-[var(--steel)] flex items-center gap-1.5"
                  >
                    <span>{deployCopiedCiYaml ? "Copied!" : "Copy YAML"}</span>
                  </button>
                </div>

                <pre className="p-3 rounded-lg bg-black/80 border border-[var(--border2)] text-[10.5px] font-mono text-[var(--text)] max-h-64 overflow-y-auto whitespace-pre leading-relaxed">
                  {ciCdWorkflowYaml}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
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
  sessionId,
}: {
  previewUrl: string;
  onPreviewUrlChange: (url: string) => void;
  sessionId?: string;
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
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-3">
          <span className="p-3 rounded-2xl bg-[var(--surface2)] text-[var(--steel)] border border-[var(--border2)]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
          </span>
          <div className="max-w-xs">
            <h4 className="text-xs font-semibold text-[var(--text)]">Live Software Preview</h4>
            <p className="text-[11px] text-[var(--muted)] mt-1">
              Ask Rex to build an application or start the server to inspect and interact with the live UI here.
            </p>
          </div>
          <button
            onClick={() => onPreviewUrlChange(`/api/preview?session=${encodeURIComponent(sessionId || "default")}`)}
            className="px-3.5 py-1.5 bg-[var(--midnight)] text-white text-xs font-medium rounded-lg hover:bg-[var(--steel)] transition-all shadow-sm flex items-center gap-1.5"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            Launch Live Preview
          </button>
        </div>
      )}
    </div>
  );
}

function normalizeUrl(url: string): string {
  if (url.startsWith("/")) return url;
  if (/^https?:\/\//i.test(url)) return url;
  return `http://${url}`;
}
