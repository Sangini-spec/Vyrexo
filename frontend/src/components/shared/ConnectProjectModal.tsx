"use client";

import React, { useState, useEffect, useRef } from "react";

export interface ProjectOption {
  name: string;
  path: string;
  description?: string;
  filesCount?: number;
  summary?: string;
  techStack?: string[];
  source?: string;
}

interface ConnectProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProject: (project: ProjectOption) => void;
  onDisconnectProject?: () => void;
  currentProjectPath?: string;
  sessionId?: string;
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
  onDisconnectProject,
  currentProjectPath,
  sessionId,
}: ConnectProjectModalProps) {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [customPath, setCustomPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"quick" | "custom" | "browser">("quick");
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setStatusMessage("");
      return;
    }
    setLoading(true);
    fetch(`/api/projects${sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : ""}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.projects)) {
          setProjects(data.projects);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen, sessionId]);

  if (!isOpen) return null;

  const handleSelect = async (proj: ProjectOption) => {
    setLoading(true);
    setStatusMessage(`Connecting ${proj.name} to this session...`);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          name: proj.name,
          path: proj.path,
          source: proj.source || "workspace",
          description: proj.description,
        }),
      });
      const data = await res.json();
      if (data.ok && data.project) {
        onSelectProject({
          name: data.project.name,
          path: data.project.path,
          summary: data.project.summary,
          techStack: data.project.techStack,
          filesCount: data.project.filesCount,
          source: data.project.source,
        });
      } else {
        onSelectProject(proj);
      }
    } catch {
      onSelectProject(proj);
    } finally {
      setLoading(false);
      onClose();
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPath.trim()) return;
    const name = customPath.replace(/[\\/]+$/, "").split(/[\\/]/).pop() || "workspace";
    await handleSelect({ name, path: customPath.trim(), source: "workspace" });
  };

  // Modern browser File System Access API
  const handleNativeFolderPicker = async () => {
    if (typeof window !== "undefined" && "showDirectoryPicker" in window) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker({ mode: "readwrite" }).catch(() => {
          return (window as any).showDirectoryPicker();
        });

        if (dirHandle?.name) {
          setLoading(true);
          setStatusMessage(`Scanning files in folder "${dirHandle.name}"...`);

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

          // Store dir handle for write-back
          if (typeof window !== "undefined") {
            (window as any).__localDirHandles = (window as any).__localDirHandles || {};
            (window as any).__localDirHandles[sessionId || "default"] = dirHandle;
          }

          setStatusMessage(`Indexing ${scannedFiles.length} files with Rex...`);
          const res = await fetch("/api/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId,
              name: dirHandle.name,
              path: `/local/${dirHandle.name}`,
              source: "local_folder",
              files: scannedFiles,
            }),
          });
          const data = await res.json();
          if (data.ok && data.project) {
            onSelectProject({
              name: data.project.name,
              path: data.project.path,
              summary: data.project.summary,
              techStack: data.project.techStack,
              filesCount: data.project.filesCount,
              source: "local_folder",
            });
            onClose();
            return;
          }
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          console.warn("Directory picker fallback:", err);
        }
      } finally {
        setLoading(false);
      }
    }

    // Fallback to directory file input
    folderInputRef.current?.click();
  };

  const handleFolderInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    try {
      const firstFile = files[0];
      const rootRelPath = firstFile.webkitRelativePath || firstFile.name;
      const folderName = rootRelPath.split("/")[0] || "local-project";
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
          (p) => IGNORED_FOLDERS.has(p) || (p.startsWith(".") && p !== ".env")
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

      setStatusMessage(`Analyzing and indexing ${scannedFiles.length} files...`);
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          name: folderName,
          path: `/local/${folderName}`,
          source: "local_folder",
          files: scannedFiles,
        }),
      });
      const data = await res.json();
      if (data.ok && data.project) {
        onSelectProject({
          name: data.project.name,
          path: data.project.path,
          summary: data.project.summary,
          techStack: data.project.techStack,
          filesCount: data.project.filesCount,
          source: "local_folder",
        });
        onClose();
      }
    } catch (err) {
      console.error("Failed to read folder:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-[540px] max-w-[95vw] rounded-2xl border border-[var(--border2)] bg-[var(--surface)] p-6 shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col gap-4 text-[var(--text)]"
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
            className="w-8 h-8 rounded-lg border border-[var(--border2)] bg-[var(--surface2)] text-[var(--muted2)] hover:text-[var(--text)] flex items-center justify-center text-sm"
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
                className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all flex-shrink-0"
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
            className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === "quick"
                ? "bg-[var(--midnight)] text-white shadow-sm"
                : "text-[var(--muted2)] hover:text-[var(--text)]"
            }`}
          >
            Workspaces
          </button>
          <button
            onClick={() => setActiveTab("custom")}
            className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === "custom"
                ? "bg-[var(--midnight)] text-white shadow-sm"
                : "text-[var(--muted2)] hover:text-[var(--text)]"
            }`}
          >
            Custom Path
          </button>
          <button
            onClick={() => setActiveTab("browser")}
            className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === "browser"
                ? "bg-[var(--midnight)] text-white shadow-sm"
                : "text-[var(--muted2)] hover:text-[var(--text)]"
            }`}
          >
            Pick Local Folder
          </button>
        </div>

        {/* Tab 1: Available Workspaces */}
        {activeTab === "quick" && (
          <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto pr-1">
            {loading && !statusMessage ? (
              <div className="py-8 text-center text-xs text-[var(--muted2)]">Scanning workspaces...</div>
            ) : projects.length === 0 ? (
              <div className="py-8 text-center text-xs text-[var(--muted2)]">No preset projects found.</div>
            ) : (
              projects.map((p) => {
                const isSelected = currentProjectPath === p.path;
                return (
                  <div
                    key={p.path}
                    onClick={() => handleSelect(p)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#3B5998] bg-[#3B5998]/15"
                        : "border-[var(--border2)] bg-[var(--surface2)]/50 hover:bg-[var(--surface2)] hover:border-[var(--steel)]"
                    }`}
                  >
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[var(--text)]">{p.name}</span>
                        {isSelected && (
                          <span className="px-1.5 py-0.5 text-[10px] rounded bg-[#22c55e]/20 text-[#4ade80] font-mono">
                            Active in Session
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[var(--muted2)]">{p.description || p.path}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.filesCount !== undefined && (
                        <span className="text-[11px] font-mono text-[var(--muted)]">{p.filesCount} files</span>
                      )}
                      <button className="px-3 py-1 bg-[var(--surface2)] text-[var(--text)] hover:bg-[var(--midnight)] hover:text-white rounded-lg text-xs font-medium border border-[var(--border2)] transition-all">
                        {isSelected ? "Re-index" : "Connect"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 2: Custom Absolute Path */}
        {activeTab === "custom" && (
          <form onSubmit={handleCustomSubmit} className="flex flex-col gap-3">
            <label className="text-xs font-medium text-[var(--muted2)]">
              Specify your project folder path on the filesystem:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="/projects/my-app or ./src"
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-[var(--input)] border border-[var(--border2)] text-xs text-[var(--text)] focus:outline-none focus:border-[var(--steel)]"
                autoFocus
              />
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-[var(--midnight)] text-white text-xs font-semibold rounded-xl hover:bg-[var(--steel)] transition-all disabled:opacity-50"
              >
                Connect
              </button>
            </div>
            <p className="text-[11px] text-[var(--muted)]">
              Vyrexo will create an isolated workspace and index all code files within this directory for this session.
            </p>
          </form>
        )}

        {/* Tab 3: Local Browser Folder Picker */}
        {activeTab === "browser" && (
          <div className="flex flex-col items-center justify-center p-6 rounded-xl border border-dashed border-[var(--border2)] bg-[var(--surface2)]/40 text-center gap-3">
            <span className="p-3 rounded-full bg-[var(--surface2)] text-[var(--steel)] border border-[var(--border2)]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </span>
            <div>
              <h4 className="text-sm font-semibold text-[var(--text)]">Select Folder from Your Computer</h4>
              <p className="text-xs text-[var(--muted2)] mt-1 max-w-sm">
                Rex will read and analyze all code files in this folder, generate a full architecture summary, and allow you to make updates directly inside the folder.
              </p>
            </div>
            <input
              type="file"
              ref={folderInputRef}
              onChange={handleFolderInputChange}
              // @ts-ignore
              webkitdirectory=""
              directory=""
              className="hidden"
            />
            <button
              onClick={handleNativeFolderPicker}
              disabled={loading}
              className="px-5 py-2.5 bg-[var(--midnight)] text-white text-xs font-semibold rounded-xl hover:bg-[var(--steel)] transition-all shadow-md mt-1 flex items-center gap-2 disabled:opacity-50"
            >
              <span>📁 Browse Local Folder...</span>
            </button>
            <span className="text-[10px] text-[var(--muted)]">
              Supports Chromium folder access & standard directory upload across all browsers
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--border2)] text-xs text-[var(--muted2)]">
          <span>Isolated per session: Each session maintains its own project</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-[var(--border2)] hover:bg-[var(--surface2)] text-[var(--text)] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
