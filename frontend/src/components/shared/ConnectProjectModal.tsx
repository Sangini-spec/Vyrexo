"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  registerLocalDirectoryHandle,
  writeFilesToDirectoryHandle,
  getSessionFilesFromCache,
} from "@/lib/local-fs-sync";

export interface ProjectOption {
  id?: string;
  sessionId?: string;
  name: string;
  path: string;
  description?: string;
  filesCount?: number;
  summary?: string;
  techStack?: string[];
  source?: string;
  createdAt?: number;
  files?: Array<{ path: string; content: string; size?: number }>;
}

interface ConnectProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProject: (project: ProjectOption) => void;
  onSwitchSession?: (sessionId: string) => void;
  onEnsureSession?: () => string;
  onDisconnectProject?: () => void;
  currentProjectPath?: string;
  sessionId?: string;
  userId?: string;
}

const TEXT_EXTENSIONS = new Set([
  "js", "jsx", "ts", "tsx", "json", "md", "py", "rs", "go", "java", "c", "cpp", "h", "hpp",
  "css", "scss", "sass", "html", "htm", "toml", "yaml", "yml", "env", "sh", "bash", "txt",
  "sql", "graphql", "xml", "svg", "vue", "svelte", "dockerfile", "makefile", "lock", "mjs", "cjs"
]);

const IGNORED_FOLDERS = new Set([
  "node_modules", ".git", ".next", "dist", "build", ".cache", "__pycache__", ".turbo",
  ".idea", ".vscode", "coverage", ".svn", ".hg", "venv", ".venv"
]);

export function ConnectProjectModal({
  isOpen,
  onClose,
  onSelectProject,
  onSwitchSession,
  onEnsureSession,
  onDisconnectProject,
  currentProjectPath,
  sessionId,
  userId,
}: ConnectProjectModalProps) {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [customPath, setCustomPath] = useState("");
  const [localFolderName, setLocalFolderName] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [emptyFolderDetected, setEmptyFolderDetected] = useState(false);
  const [activeTab, setActiveTab] = useState<"quick" | "custom" | "browser">("quick");
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const pickerPendingRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      setStatusMessage("");
      setErrorMessage("");
      setEmptyFolderDetected(false);
      pickerPendingRef.current = false;
      return;
    }
    setLoading(true);
    setErrorMessage("");

    const params = new URLSearchParams();
    if (sessionId) params.set("sessionId", sessionId);
    if (userId) params.set("user_id", userId);

    fetch(`/api/projects?${params.toString()}`, {
      headers: userId ? { "x-user-id": userId } : undefined,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.ok && Array.isArray(data.projects)) {
          // Ensure strictly ordered from newest created at top to earliest created at bottom
          const sorted = [...data.projects].sort(
            (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
          );
          setProjects(sorted);
        } else {
          setProjects([]);
        }
      })
      .catch(() => {
        setProjects([]);
      })
      .finally(() => setLoading(false));
  }, [isOpen, sessionId, userId]);

  // Connect an empty or populated local folder to the current (or newly created) session
  const connectLocalFolderToBackend = async (
    folderName: string,
    scannedFiles: Array<{ path: string; content: string; size: number }>,
    explicitLocalPath?: string
  ) => {
    setLoading(true);
    setErrorMessage("");
    setEmptyFolderDetected(false);

    const cleanName = folderName.trim() || "local-workspace";
    const targetSessionId = sessionId || (onEnsureSession ? onEnsureSession() : `session-${Date.now()}`);
    const resolvedPath = explicitLocalPath?.trim() || `/local/${cleanName}`;

    setStatusMessage(
      scannedFiles.length > 0
        ? `Uploading & indexing ${scannedFiles.length} file${scannedFiles.length === 1 ? "" : "s"} from "${cleanName}"...`
        : `Connecting empty local folder "${cleanName}" for real-time file generation & VS Code sync...`
    );

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(userId ? { "x-user-id": userId } : {}),
        },
        body: JSON.stringify({
          sessionId: targetSessionId,
          user_id: userId,
          name: cleanName,
          path: resolvedPath,
          source: "local_folder",
          files: scannedFiles,
        }),
      });
      const data = await res.json();
      if (data?.ok && data.project) {
        onSelectProject({
          id: data.project.id,
          sessionId: targetSessionId,
          name: data.project.name,
          path: data.project.path,
          summary: data.project.summary,
          techStack: data.project.techStack,
          filesCount: data.project.filesCount ?? scannedFiles.length,
          source: "local_folder",
          files: data.project.files || scannedFiles,
        });
        onClose();
      } else {
        setErrorMessage(data?.error || "Could not connect the selected local folder.");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to upload local folder.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Clicking a project in the "Workspaces" tab opens its respective session!
  const handleSelectWorkspaceProject = async (proj: ProjectOption) => {
    if (proj.sessionId && proj.sessionId !== sessionId && onSwitchSession) {
      onSwitchSession(proj.sessionId);
      onClose();
      return;
    }

    setLoading(true);
    setErrorMessage("");
    const targetSessionId = proj.sessionId || sessionId || (onEnsureSession ? onEnsureSession() : `session-${Date.now()}`);
    setStatusMessage(`Opening ${proj.name}...`);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(userId ? { "x-user-id": userId } : {}),
        },
        body: JSON.stringify({
          sessionId: targetSessionId,
          user_id: userId,
          name: proj.name,
          path: proj.path,
          source: proj.source || "workspace",
          description: proj.description,
        }),
      });
      const data = await res.json();
      if (data?.ok && data.project) {
        onSelectProject({
          id: data.project.id,
          sessionId: targetSessionId,
          name: data.project.name,
          path: data.project.path,
          summary: data.project.summary,
          techStack: data.project.techStack,
          filesCount: data.project.filesCount,
          source: data.project.source,
          files: data.project.files,
        });
      } else {
        onSelectProject({ ...proj, sessionId: targetSessionId });
      }
    } catch {
      onSelectProject({ ...proj, sessionId: targetSessionId });
    } finally {
      setLoading(false);
      onClose();
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPath.trim()) return;
    const name = customPath.replace(/[\\/]+$/, "").split(/[\\/]/).pop() || "workspace";
    await connectLocalFolderToBackend(name, [], customPath.trim());
  };

  // Modern browser File System Access API + Cross-Browser / Iframe Directory Picker Fallback
  const handleNativeFolderPicker = async () => {
    setErrorMessage("");
    setEmptyFolderDetected(false);

    // 1. Try File System Access API (works in top-level windows and supports empty folders with direct disk write-back!)
    if (typeof window !== "undefined" && "showDirectoryPicker" in window) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker({ mode: "readwrite" }).catch(() => {
          return (window as any).showDirectoryPicker();
        });

        if (dirHandle?.name) {
          setLoading(true);
          setStatusMessage(`Scanning folder "${dirHandle.name}"...`);

          const scannedFiles: Array<{ path: string; content: string; size: number }> = [];
          const MAX_FILES = 250;
          const MAX_FILE_SIZE = 1.5 * 1024 * 1024;

          async function traverse(handle: any, relDir: string) {
            if (scannedFiles.length >= MAX_FILES) return;
            for await (const entry of handle.values()) {
              if (scannedFiles.length >= MAX_FILES) break;
              if (entry.kind === "directory") {
                if (!IGNORED_FOLDERS.has(entry.name) && !entry.name.startsWith(".")) {
                  const nextRel = relDir ? `${relDir}/${entry.name}` : entry.name;
                  await traverse(entry, nextRel);
                }
              } else if (entry.kind === "file") {
                const ext = entry.name.split(".").pop()?.toLowerCase() || "";
                if (
                  TEXT_EXTENSIONS.has(ext) ||
                  entry.name.startsWith(".env") ||
                  entry.name === "Dockerfile" ||
                  entry.name === "Makefile"
                ) {
                  try {
                    const file = await entry.getFile();
                    if (file.size <= MAX_FILE_SIZE) {
                      const content = await file.text();
                      const filePath = relDir ? `${relDir}/${entry.name}` : entry.name;
                      scannedFiles.push({ path: filePath, content, size: file.size });
                    }
                  } catch {}
                }
              }
            }
          }

          await traverse(dirHandle, "");

          const targetSessionId = sessionId || (onEnsureSession ? onEnsureSession() : `session-${Date.now()}`);
          await registerLocalDirectoryHandle(targetSessionId, dirHandle.name, dirHandle);

          // If this session already has generated files in cache, write them into the connected folder right away
          const existingCached = getSessionFilesFromCache(targetSessionId);
          if (existingCached && existingCached.files.length > 0 && scannedFiles.length === 0) {
            await writeFilesToDirectoryHandle(dirHandle, existingCached.files);
          }

          await connectLocalFolderToBackend(dirHandle.name, scannedFiles, `/local/${dirHandle.name}`);
          return;
        }
      } catch (err: any) {
        if (err?.name === "AbortError") {
          setLoading(false);
          return;
        }
        // In cross-origin iframes (like AI Studio preview), showDirectoryPicker throws SecurityError.
        // Fall through to the directory <input webkitdirectory> below.
      }
    }

    // 2. Fallback to <input type="file" webkitdirectory>
    // Note: When a user selects an EMPTY folder (0 files, e.g. "amaze") and clicks "Upload" in the browser's
    // "Upload 0 files to this site?" prompt, Chromium does not fire `onChange` because `FileList` has 0 files.
    // We detect when the dialog closes via window focus without a `cancel` event so empty folders connect seamlessly!
    const inputEl = folderInputRef.current;
    if (!inputEl) return;

    inputEl.value = "";
    pickerPendingRef.current = true;
    let cancelledByUser = false;

    const onInputCancel = () => {
      cancelledByUser = true;
      pickerPendingRef.current = false;
      cleanupListeners();
    };

    const onWindowFocus = () => {
      // Wait briefly for `change` or `cancel` event to fire first
      setTimeout(() => {
        if (!pickerPendingRef.current) return;
        pickerPendingRef.current = false;
        cleanupListeners();

        const selectedFiles = inputEl.files;
        if (!cancelledByUser && (!selectedFiles || selectedFiles.length === 0)) {
          // The user selected an EMPTY folder ("Upload 0 files to this site?") and clicked Upload!
          const chosenName = localFolderName.trim();
          if (chosenName) {
            connectLocalFolderToBackend(chosenName, [], `/local/${chosenName}`);
          } else {
            setEmptyFolderDetected(true);
            setLocalFolderName("amaze");
          }
        }
      }, 450);
    };

    const cleanupListeners = () => {
      inputEl.removeEventListener("cancel", onInputCancel);
      window.removeEventListener("focus", onWindowFocus);
    };

    inputEl.addEventListener("cancel", onInputCancel, { once: true });
    window.addEventListener("focus", onWindowFocus, { once: true });
    inputEl.click();
  };

  const handleFolderInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    pickerPendingRef.current = false;
    const files = e.target.files;

    // If 0 files were passed in onChange (empty folder), connect it immediately!
    if (!files || files.length === 0) {
      const folderName = localFolderName.trim() || "local-workspace";
      await connectLocalFolderToBackend(folderName, [], `/local/${folderName}`);
      return;
    }

    setLoading(true);
    try {
      const firstFile = files[0];
      const rootRelPath = firstFile.webkitRelativePath || firstFile.name;
      const folderName = rootRelPath.split("/")[0] || localFolderName.trim() || "local-project";
      setStatusMessage(`Reading files from "${folderName}"...`);

      const scannedFiles: Array<{ path: string; content: string; size: number }> = [];
      const MAX_FILES = 250;
      const MAX_FILE_SIZE = 1.5 * 1024 * 1024;

      for (let i = 0; i < files.length; i++) {
        if (scannedFiles.length >= MAX_FILES) break;
        const file = files[i];
        const relPath = file.webkitRelativePath || file.name;
        const parts = relPath.split("/");

        const isIgnored = parts.some(
          (p) => IGNORED_FOLDERS.has(p) || (p.startsWith(".") && p !== ".env" && p !== ".env.example")
        );
        if (isIgnored) continue;

        const ext = file.name.split(".").pop()?.toLowerCase() || "";
        if (
          TEXT_EXTENSIONS.has(ext) ||
          file.name.startsWith(".env") ||
          file.name === "Dockerfile" ||
          file.name === "Makefile"
        ) {
          if (file.size <= MAX_FILE_SIZE) {
            try {
              const content = await file.text();
              const cleanPath = parts.length > 1 ? parts.slice(1).join("/") : file.name;
              scannedFiles.push({ path: cleanPath, content, size: file.size });
            } catch {}
          }
        }
      }

      await connectLocalFolderToBackend(folderName, scannedFiles, `/local/${folderName}`);
    } catch (err: any) {
      console.error("Failed to read folder:", err);
      setErrorMessage(err?.message || "Failed to read local folder.");
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-[560px] max-w-[95vw] rounded-2xl border border-[var(--border2)] bg-[var(--surface)] p-6 shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col gap-4 text-[var(--text)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border2)]">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-[var(--surface2)] border border-[var(--border2)] text-[var(--steel)]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </span>
            <div>
              <h3 className="text-base font-semibold">Connect Project Workspace</h3>
              <p className="text-xs text-[var(--muted2)]">
                Bound to this session: Rex will summarize files and make real-time code updates
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-[var(--border2)] bg-[var(--surface2)] text-[var(--muted2)] hover:text-[var(--text)] flex items-center justify-center text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Loading / Status Overlay */}
        {loading && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--midnight-dim)] border border-[#3B599840] text-xs text-[var(--steel)] animate-pulse">
            <svg className="animate-spin h-4 w-4 text-[var(--steel)] flex-shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span>{statusMessage || "Working on project workspace..."}</span>
          </div>
        )}

        {/* Error Banner */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
            {errorMessage}
          </div>
        )}

        {/* Connected Project Banner for this session */}
        {currentProjectPath && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface2)] border border-[var(--border2)] text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 animate-pulse" />
              <div className="min-w-0">
                <span className="text-[var(--muted2)] block text-[10px]">Current Session Connected Folder:</span>
                <span className="font-mono text-[var(--text)] text-[11px] truncate block font-medium">
                  {currentProjectPath}
                </span>
              </div>
            </div>
            {onDisconnectProject && (
              <button
                type="button"
                onClick={onDisconnectProject}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all flex-shrink-0 cursor-pointer"
              >
                Disconnect
              </button>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 p-1 rounded-xl bg-[var(--surface2)] border border-[var(--border2)] text-xs">
          <button
            onClick={() => setActiveTab("quick")}
            className={`flex-1 py-1.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "quick"
                ? "bg-[var(--midnight)] text-white shadow-sm"
                : "text-[var(--muted2)] hover:text-[var(--text)]"
            }`}
          >
            <span>Workspaces</span>
            {projects.length > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-semibold ${
                  activeTab === "quick"
                    ? "bg-white/20 text-white"
                    : "bg-[var(--border)] text-[var(--text2)]"
                }`}
              >
                {projects.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("custom")}
            className={`flex-1 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              activeTab === "custom"
                ? "bg-[var(--midnight)] text-white shadow-sm"
                : "text-[var(--muted2)] hover:text-[var(--text)]"
            }`}
          >
            Custom Path
          </button>
          <button
            onClick={() => setActiveTab("browser")}
            className={`flex-1 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              activeTab === "browser"
                ? "bg-[var(--midnight)] text-white shadow-sm"
                : "text-[var(--muted2)] hover:text-[var(--text)]"
            }`}
          >
            Pick Local Folder
          </button>
        </div>

        {/* Tab 1: User's Created Technical Projects (Workspaces) */}
        {activeTab === "quick" && (
          <div className="flex flex-col gap-2.5">
            {projects.length > 0 && (
              <div className="flex items-center justify-between px-1 text-[11px] text-[var(--muted2)]">
                <span className="font-medium text-[var(--text2)]">
                  {projects.length} Technical Project{projects.length === 1 ? "" : "s"} Created
                </span>
                <span className="text-[10px] text-[var(--muted)]">
                  Latest at top · Click a project to open its session
                </span>
              </div>
            )}

            <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1">
              {loading && !statusMessage ? (
                <div className="py-8 text-center text-xs text-[var(--muted2)]">Scanning your project workspaces...</div>
              ) : projects.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--muted2)]">
                  No technical projects created yet. Ask Rex to build an application or connect a local folder!
                </div>
              ) : (
                projects.map((p, idx) => {
                  const isCurrentSession =
                    (p.sessionId && p.sessionId === sessionId) ||
                    (currentProjectPath && currentProjectPath === p.path);
                  const isOldest = idx === projects.length - 1 && projects.length > 1;
                  const isNewest = idx === 0 && projects.length > 1;

                  return (
                    <div
                      key={p.sessionId || p.path}
                      onClick={() => handleSelectWorkspaceProject(p)}
                      className={`group flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isCurrentSession
                          ? "border-[#3B5998] bg-[#3B5998]/15"
                          : "border-[var(--border2)] bg-[var(--surface2)]/60 hover:bg-[var(--surface2)] hover:border-[var(--steel)]"
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0 pr-3">
                        <div className="w-8 h-8 rounded-lg bg-[var(--surface)] border border-[var(--border2)] flex items-center justify-center text-xs font-mono font-bold text-[var(--steel)] flex-shrink-0 mt-0.5">
                          #{idx + 1}
                        </div>
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-[var(--text)] group-hover:text-[var(--steel)] transition-colors truncate">
                              {p.name}
                            </span>
                            {isCurrentSession && (
                              <span className="px-1.5 py-0.5 text-[10px] rounded bg-[#22c55e]/20 text-[#4ade80] font-mono">
                                Active Session
                              </span>
                            )}
                            {isNewest && !isCurrentSession && (
                              <span className="px-1.5 py-0.5 text-[10px] rounded bg-[#3B5998]/25 text-[var(--ice)] font-mono">
                                Latest
                              </span>
                            )}
                            {isOldest && (
                              <span className="px-1.5 py-0.5 text-[10px] rounded bg-[var(--border)] text-[var(--muted2)] font-mono">
                                Created First
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-[var(--muted2)] line-clamp-1">
                            {p.description || p.summary || p.path}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 flex-shrink-0">
                        {p.filesCount !== undefined && (
                          <span className="text-[11px] font-mono text-[var(--muted)]">
                            {p.filesCount} file{p.filesCount === 1 ? "" : "s"}
                          </span>
                        )}
                        <button
                          type="button"
                          className="px-3 py-1.5 bg-[var(--surface)] text-[var(--text)] group-hover:bg-[var(--midnight)] group-hover:text-white rounded-lg text-xs font-medium border border-[var(--border2)] transition-all cursor-pointer"
                        >
                          {isCurrentSession ? "Connected" : "Open Session →"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Custom Absolute Path */}
        {activeTab === "custom" && (
          <form onSubmit={handleCustomSubmit} className="flex flex-col gap-3">
            <label className="text-xs font-medium text-[var(--muted2)]">
              Specify your project folder path on your computer or workspace:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="C:\Users\you\Desktop\amaze or /Users/you/projects/amaze"
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-[var(--input)] border border-[var(--border2)] text-xs text-[var(--text)] focus:outline-none focus:border-[var(--steel)]"
                autoFocus
              />
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-[var(--midnight)] text-white text-xs font-semibold rounded-xl hover:bg-[var(--steel)] transition-all disabled:opacity-50 cursor-pointer"
              >
                Connect
              </button>
            </div>
            <p className="text-[11px] text-[var(--muted)]">
              Supports both empty folders and existing codebases. Rex will generate and sync all project files inside this workspace.
            </p>
          </form>
        )}

        {/* Tab 3: Local Browser Folder Picker (Supports both Empty Folders & Existing Projects) */}
        {activeTab === "browser" && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col items-center justify-center p-5 rounded-xl border border-dashed border-[var(--border2)] bg-[var(--surface2)]/40 text-center gap-3">
              <span className="p-3 rounded-full bg-[var(--surface2)] text-[var(--steel)] border border-[var(--border2)]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </span>
              <div>
                <h4 className="text-sm font-semibold text-[var(--text)]">Select Folder from Your Computer</h4>
                <p className="text-xs text-[var(--muted2)] mt-1 max-w-md">
                  Select an <strong>existing project folder</strong> or an <strong>empty folder</strong>. When you build with Rex, all generated files stay inside this workspace and sync for VS Code.
                </p>
              </div>

              {/* Optional Folder Name / Empty Folder Binding Input */}
              <div className="w-full max-w-sm flex flex-col gap-1.5 text-left mt-1">
                <label className="text-[11px] font-medium text-[var(--muted2)]">
                  Folder Name (used when selecting an empty folder with 0 files):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="e.g. amaze"
                    value={localFolderName}
                    onChange={(e) => setLocalFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && localFolderName.trim()) {
                        e.preventDefault();
                        connectLocalFolderToBackend(
                          localFolderName.trim(),
                          [],
                          `/local/${localFolderName.trim()}`
                        );
                      }
                    }}
                    className="flex-1 px-3 py-2 rounded-xl bg-[var(--input)] border border-[var(--border2)] text-xs text-[var(--text)] focus:outline-none focus:border-[var(--steel)]"
                  />
                  {localFolderName.trim() && (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() =>
                        connectLocalFolderToBackend(
                          localFolderName.trim(),
                          [],
                          `/local/${localFolderName.trim()}`
                        )
                      }
                      className="px-3.5 py-2 bg-[var(--surface)] hover:bg-[var(--midnight)] text-[var(--text)] hover:text-white border border-[var(--border2)] text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap"
                    >
                      Bind Empty Folder
                    </button>
                  )}
                </div>
              </div>

              <input
                type="file"
                ref={folderInputRef}
                onChange={handleFolderInputChange}
                // @ts-ignore
                webkitdirectory=""
                directory=""
                multiple
                className="hidden"
              />
              <button
                type="button"
                onClick={handleNativeFolderPicker}
                disabled={loading}
                className="px-5 py-2.5 bg-[var(--midnight)] text-white text-xs font-semibold rounded-xl hover:bg-[var(--steel)] transition-all shadow-md mt-1 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <span>📁 Browse Local Folder...</span>
              </button>
              <span className="text-[10px] text-[var(--muted)]">
                Supports both empty folders (0 files) & populated repositories across all browsers
              </span>
            </div>

            {/* Instant confirmation banner if browser returned 0 files from native dialog */}
            {emptyFolderDetected && (
              <div className="p-3.5 rounded-xl bg-[#3B5998]/15 border border-[#3B5998] flex items-center justify-between gap-3 animate-in fade-in duration-150">
                <div className="text-xs">
                  <div className="font-semibold text-[var(--text)]">
                    ✓ Empty Local Folder Selected (0 files)
                  </div>
                  <div className="text-[11px] text-[var(--muted2)] mt-0.5">
                    Confirm the folder name above (<span className="font-mono text-[var(--text)]">{localFolderName || "amaze"}</span>) to bind it to this session for file generation & VS Code sync.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    connectLocalFolderToBackend(
                      localFolderName.trim() || "amaze",
                      [],
                      `/local/${localFolderName.trim() || "amaze"}`
                    )
                  }
                  className="px-4 py-2 bg-[var(--midnight)] hover:bg-[var(--steel)] text-white text-xs font-semibold rounded-xl transition-all flex-shrink-0 cursor-pointer shadow-sm"
                >
                  Connect &ldquo;{localFolderName.trim() || "amaze"}&rdquo; →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--border2)] text-xs text-[var(--muted2)]">
          <span>Isolated per session: Each session maintains its own project</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-[var(--border2)] hover:bg-[var(--surface2)] text-[var(--text)] transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
