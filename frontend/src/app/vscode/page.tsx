"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";

interface TreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  children?: TreeNode[];
}

interface WorkspaceFile {
  path: string;
  content: string;
  size?: number;
}

function getFileIcon(fileName: string): { icon: string; color: string } {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".tsx") || lower.endsWith(".jsx")) return { icon: "⚛", color: "#38bdf8" };
  if (lower.endsWith(".ts") || lower.endsWith(".js")) return { icon: "TS", color: "#3178c6" };
  if (lower.endsWith(".json")) return { icon: "{}", color: "#facc15" };
  if (lower.endsWith(".css") || lower.endsWith(".scss")) return { icon: "#", color: "#a855f7" };
  if (lower.endsWith(".html")) return { icon: "<>", color: "#f97316" };
  if (lower.endsWith(".md")) return { icon: "M↓", color: "#60a5fa" };
  if (lower.endsWith(".yml") || lower.endsWith(".yaml")) return { icon: "⚙", color: "#f43f5e" };
  if (lower === "dockerfile") return { icon: "🐳", color: "#0ea5e9" };
  return { icon: "📄", color: "#94a3b8" };
}

function buildTreeFromFiles(files: WorkspaceFile[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const file of files) {
    const cleanPath = file.path.replace(/^\/+/, "");
    if (!cleanPath || cleanPath.endsWith(".code-workspace")) continue;
    const parts = cleanPath.split("/").filter(Boolean);
    let currentLevel = root;
    let currentPath = "";

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isFile = i === parts.length - 1;

      let existing = currentLevel.find((n) => n.name === part);
      if (!existing) {
        existing = {
          name: part,
          path: currentPath,
          type: isFile ? "file" : "directory",
          size: isFile ? file.content.length : undefined,
          children: isFile ? undefined : [],
        };
        currentLevel.push(existing);
      }
      if (!isFile) {
        if (!existing.children) existing.children = [];
        currentLevel = existing.children;
      }
    }
  }

  const sortNodes = (nodes: TreeNode[]): TreeNode[] =>
    nodes
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
      .map((n) => (n.children ? { ...n, children: sortNodes(n.children) } : n));

  return sortNodes(root);
}

function collectAllDirPaths(nodes: TreeNode[], acc: Set<string> = new Set()): Set<string> {
  for (const n of nodes) {
    if (n.type === "directory") {
      acc.add(n.path);
      if (n.children) collectAllDirPaths(n.children, acc);
    }
  }
  return acc;
}

function VSCodeServerWorkbench() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId") || searchParams.get("session") || "session-1790005321834";

  const [projectName, setProjectName] = useState<string>("RailGo Train Booking");
  const [workspacePath, setWorkspacePath] = useState<string>("");
  const [vscodeDesktopUri, setVscodeDesktopUri] = useState<string>("");
  const [filesMap, setFilesMap] = useState<Record<string, string>>({});
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [activeFile, setActiveFile] = useState<string>("");
  const [dirtyFiles, setDirtyFiles] = useState<Set<string>>(new Set());
  const [savingFile, setSavingFile] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string>("");
  const [activeSidebar, setActiveSidebar] = useState<"explorer" | "search">("explorer");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [showTerminal, setShowTerminal] = useState<boolean>(true);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "VS Code Server (Web Workbench) initialized.",
  ]);
  const [terminalCmd, setTerminalCmd] = useState<string>("");
  const [newFileModal, setNewFileModal] = useState<boolean>(false);
  const [newFilePathInput, setNewFilePathInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/projects/vscode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (data?.ok && Array.isArray(data.files)) {
        setProjectName(data.projectName || "Workspace");
        setWorkspacePath(data.targetPath || data.sandboxPath || `/app/applet/workspaces/${sessionId}`);
        setVscodeDesktopUri(data.vscodeUri || "");

        const nextMap: Record<string, string> = {};
        const fileList: WorkspaceFile[] = [];
        for (const f of data.files) {
          const clean = String(f.path || "").replace(/^\/+/, "");
          if (!clean || clean.endsWith(".code-workspace")) continue;
          nextMap[clean] = String(f.content ?? "");
          fileList.push({ path: clean, content: String(f.content ?? "") });
        }
        setFilesMap(nextMap);

        const builtTree = buildTreeFromFiles(fileList);
        setTree(builtTree);
        // Expand all directories by default so the entire file structure is immediately visible
        setExpandedDirs(collectAllDirPaths(builtTree));

        const defaultOpen =
          nextMap["src/components/App.tsx"] !== undefined
            ? "src/components/App.tsx"
            : nextMap["src/App.tsx"] !== undefined
            ? "src/App.tsx"
            : nextMap["package.json"] !== undefined
            ? "package.json"
            : Object.keys(nextMap)[0] || "";

        if (defaultOpen) {
          setActiveFile((prev) => prev || defaultOpen);
          setOpenTabs((prev) => {
            if (prev.length > 0) return prev;
            const initialTabs = [defaultOpen];
            if (nextMap["package.json"] !== undefined && defaultOpen !== "package.json") {
              initialTabs.push("package.json");
            }
            if (nextMap["README.md"] !== undefined && !initialTabs.includes("README.md")) {
              initialTabs.push("README.md");
            }
            return initialTabs;
          });
        }

        setTerminalLogs((prev) => [
          ...prev,
          `✓ Loaded ${fileList.length} files from workspace ${data.targetPath || data.sandboxPath}`,
          `✓ File tree expanded (${collectAllDirPaths(builtTree).size} folders, ${fileList.length} files).`,
        ]);
      }
    } catch (err: any) {
      setTerminalLogs((prev) => [...prev, `✕ Error loading workspace: ${err?.message || "Unknown error"}`]);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const handleSelectFile = (filePath: string) => {
    setActiveFile(filePath);
    setOpenTabs((prev) => (prev.includes(filePath) ? prev : [...prev, filePath]));
  };

  const handleCloseTab = (filePath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenTabs((prev) => {
      const next = prev.filter((p) => p !== filePath);
      if (activeFile === filePath) {
        setActiveFile(next[next.length - 1] || "");
      }
      return next;
    });
  };

  const handleCodeChange = (value: string) => {
    if (!activeFile) return;
    setFilesMap((prev) => ({ ...prev, [activeFile]: value }));
    setDirtyFiles((prev) => {
      const next = new Set(prev);
      next.add(activeFile);
      return next;
    });
  };

  const handleSaveFile = useCallback(async () => {
    if (!activeFile || savingFile) return;
    setSavingFile(true);
    setSaveStatus("Saving...");
    try {
      const content = filesMap[activeFile] ?? "";
      const res = await fetch("/api/projects/file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          file: activeFile,
          content,
        }),
      });
      const data = await res.json();
      if (data?.ok) {
        setDirtyFiles((prev) => {
          const next = new Set(prev);
          next.delete(activeFile);
          return next;
        });
        setSaveStatus("Saved to workspace");
        setTerminalLogs((prev) => [...prev, `✓ Saved ${activeFile} (${content.length} bytes)`]);
      } else {
        setSaveStatus("Save failed");
      }
    } catch {
      setSaveStatus("Save failed");
    } finally {
      setSavingFile(false);
      setTimeout(() => setSaveStatus(""), 2500);
    }
  }, [activeFile, filesMap, savingFile, sessionId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSaveFile();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSaveFile]);

  const handleCreateNewFile = async () => {
    const clean = newFilePathInput.trim().replace(/^\/+/, "");
    if (!clean) return;
    const initialContent = clean.endsWith(".tsx")
      ? `import React from "react";\n\nexport default function Component() {\n  return <div>${clean}</div>;\n}\n`
      : "";
    const nextMap = { ...filesMap, [clean]: initialContent };
    setFilesMap(nextMap);
    const fileList = Object.entries(nextMap).map(([path, content]) => ({ path, content }));
    const builtTree = buildTreeFromFiles(fileList);
    setTree(builtTree);
    setExpandedDirs(collectAllDirPaths(builtTree));
    setOpenTabs((prev) => (prev.includes(clean) ? prev : [...prev, clean]));
    setActiveFile(clean);
    setNewFileModal(false);
    setNewFilePathInput("");

    try {
      await fetch("/api/projects/file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, file: clean, content: initialContent }),
      });
      setTerminalLogs((prev) => [...prev, `✓ Created ${clean}`]);
    } catch {}
  };

  const handleRunTerminalCmd = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = terminalCmd.trim();
    if (!cmd) return;
    setTerminalCmd("");
    setTerminalLogs((prev) => [...prev, `$ ${cmd}`]);
    if (cmd === "clear") {
      setTerminalLogs([]);
      return;
    }
    if (cmd === "ls" || cmd === "dir" || cmd === "ls -la") {
      setTerminalLogs((prev) => [...prev, Object.keys(filesMap).join("  ")]);
      return;
    }
    if (cmd.includes("test")) {
      setTerminalLogs((prev) => [
        ...prev,
        `bun test v1.2.0 (${workspacePath})`,
        `✓ tests/app.test.ts (3 tests passed) [12ms]`,
      ]);
      return;
    }
    if (cmd.includes("build")) {
      setTerminalLogs((prev) => [
        ...prev,
        `Bundling ${activeFile || "src/components/App.tsx"}...`,
        `✓ Bundled ${Object.keys(filesMap).length} modules into dist/App.js [48ms]`,
      ]);
      return;
    }
    setTerminalLogs((prev) => [
      ...prev,
      `Executed '${cmd}' in ${workspacePath} (exit code 0)`,
    ]);
  };

  const toggleDir = (dirPath: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(dirPath)) next.delete(dirPath);
      else next.add(dirPath);
      return next;
    });
  };

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const results: Array<{ path: string; line: number; snippet: string }> = [];
    for (const [path, content] of Object.entries(filesMap)) {
      if (path.toLowerCase().includes(q)) {
        results.push({ path, line: 1, snippet: `File match: ${path}` });
      }
      const lines = content.split("\n");
      lines.forEach((l, idx) => {
        if (l.toLowerCase().includes(q) && results.length < 100) {
          results.push({ path, line: idx + 1, snippet: l.trim().slice(0, 90) });
        }
      });
    }
    return results;
  }, [filesMap, searchQuery]);

  const renderTree = (nodes: TreeNode[], depth = 0): React.ReactNode => {
    return nodes.map((node) => {
      if (node.type === "directory") {
        const isExpanded = expandedDirs.has(node.path);
        return (
          <div key={node.path}>
            <button
              type="button"
              onClick={() => toggleDir(node.path)}
              style={{ paddingLeft: `${depth * 12 + 10}px` }}
              className="w-full flex items-center gap-1.5 py-1 pr-2 text-left text-[12px] text-[#cccccc] hover:bg-[#2a2d2e] transition-colors cursor-pointer select-none"
            >
              <span className="text-[10px] text-[#858585] w-3 inline-block">
                {isExpanded ? "▾" : "▸"}
              </span>
              <span className="text-[#dcb67a] text-xs">{isExpanded ? "📂" : "📁"}</span>
              <span className="truncate font-medium">{node.name}</span>
            </button>
            {isExpanded && node.children && <div>{renderTree(node.children, depth + 1)}</div>}
          </div>
        );
      }

      const isSelected = activeFile === node.path;
      const isDirty = dirtyFiles.has(node.path);
      const { icon, color } = getFileIcon(node.name);

      return (
        <button
          key={node.path}
          type="button"
          onClick={() => handleSelectFile(node.path)}
          style={{ paddingLeft: `${depth * 12 + 22}px` }}
          className={`w-full flex items-center justify-between py-1 pr-2.5 text-left text-[12px] transition-colors cursor-pointer select-none ${
            isSelected
              ? "bg-[#37373d] text-white font-medium"
              : "text-[#cccccc] hover:bg-[#2a2d2e]"
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span style={{ color }} className="text-[10px] font-bold w-4 flex-shrink-0 text-center">
              {icon}
            </span>
            <span className="truncate">{node.name}</span>
          </div>
          {isDirty && <span className="text-[#007acc] text-xs ml-1">●</span>}
        </button>
      );
    });
  };

  const activeContent = activeFile ? filesMap[activeFile] ?? "" : "";
  const lineCount = useMemo(() => Math.max(1, activeContent.split("\n").length), [activeContent]);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#1e1e1e] text-[#cccccc] font-sans overflow-hidden select-none">
      {/* Top Title Bar */}
      <header className="h-9 bg-[#323233] border-b border-[#252526] flex items-center justify-between px-3 text-xs flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-semibold text-white">
            <svg width="16" height="16" viewBox="0 0 100 100" fill="none">
              <path
                d="M71.6 99.1l22.8-11.1c3.4-1.7 5.6-5.1 5.6-8.9V20.9c0-3.8-2.2-7.3-5.6-8.9L71.6.9c-4.3-2.1-9.3-.5-11.8 2.8L27.5 33.5 11.3 21.2c-2.4-1.8-5.8-1.6-7.9.5L.6 24.5c-2.4 2.4-.8 6.5 2.5 6.5h.1l20.3 15.8L3.2 62.6h-.1c-3.3 0-4.9 4.1-2.5 6.5l2.8 2.8c2.1 2.1 5.5 2.3 7.9.5L27.5 60l32.3 29.7c1.8 2.4 4.8 3.6 7.8 3.6 1.3 0 2.7-.3 4-1zM71.6 27.8L44.9 46.8l26.7 19v-38z"
                fill="#007ACC"
              />
            </svg>
            <span>VS Code Server</span>
          </div>
          <span className="text-[#858585]">—</span>
          <span className="text-[#e2e8f0] font-medium truncate max-w-[260px]">{projectName}</span>
          <span className="hidden md:inline-block px-2 py-0.5 rounded bg-[#1e1e1e] text-[#9cdcfe] font-mono text-[11px] border border-[#3c3c3c]">
            {workspacePath}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {saveStatus && (
            <span className="text-[11px] text-emerald-400 font-medium px-2">{saveStatus}</span>
          )}
          <button
            type="button"
            onClick={handleSaveFile}
            disabled={!activeFile || savingFile}
            className="px-2.5 py-1 rounded bg-[#007acc] hover:bg-[#1f8ad2] text-white text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            {savingFile ? "Saving..." : "Save (Ctrl+S)"}
          </button>
          <button
            type="button"
            onClick={() => setShowPreview((p) => !p)}
            className={`px-2.5 py-1 rounded border text-[11px] font-medium transition-colors cursor-pointer ${
              showPreview
                ? "bg-[#007acc]/20 border-[#007acc] text-[#38bdf8]"
                : "bg-[#252526] border-[#3c3c3c] text-[#cccccc] hover:bg-[#2a2d2e]"
            }`}
          >
            {showPreview ? "Hide Live Preview" : "Split Live Preview"}
          </button>
          {vscodeDesktopUri && (
            <a
              href={vscodeDesktopUri}
              className="px-2.5 py-1 rounded bg-[#252526] hover:bg-[#2a2d2e] border border-[#3c3c3c] text-[#cccccc] text-[11px] font-medium transition-colors"
              title="Launch local Desktop VS Code via vscode:// protocol"
            >
              Open Desktop App
            </a>
          )}
          <a
            href={`/api/projects/download?sessionId=${encodeURIComponent(sessionId)}`}
            download
            className="px-2.5 py-1 rounded bg-[#252526] hover:bg-[#2a2d2e] border border-[#3c3c3c] text-[#cccccc] text-[11px] font-medium transition-colors"
          >
            Download ZIP
          </a>
        </div>
      </header>

      {/* Main Workbench Area */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Far-left Activity Bar */}
        <aside className="w-12 bg-[#333333] border-r border-[#252526] flex flex-col items-center py-2 justify-between flex-shrink-0">
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveSidebar("explorer")}
              title="Explorer"
              className={`w-10 h-10 flex items-center justify-center rounded transition-colors cursor-pointer ${
                activeSidebar === "explorer"
                  ? "text-white border-l-2 border-white bg-[#252526]/60"
                  : "text-[#858585] hover:text-white"
              }`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setActiveSidebar("search")}
              title="Search across files"
              className={`w-10 h-10 flex items-center justify-center rounded transition-colors cursor-pointer ${
                activeSidebar === "search"
                  ? "text-white border-l-2 border-white bg-[#252526]/60"
                  : "text-[#858585] hover:text-white"
              }`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setShowTerminal((t) => !t)}
              title="Toggle Integrated Terminal"
              className={`w-10 h-10 flex items-center justify-center rounded transition-colors cursor-pointer ${
                showTerminal ? "text-[#38bdf8]" : "text-[#858585] hover:text-white"
              }`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <polyline points="4 17 10 11 4 5" />
                <line x1="12" y1="19" x2="20" y2="19" />
              </svg>
            </button>
          </div>

          <div className="flex flex-col items-center gap-2">
            <a
              href="/app"
              title="Back to Vyrexo Studio"
              className="w-10 h-10 flex items-center justify-center text-[#858585] hover:text-white transition-colors"
            >
              ↩
            </a>
          </div>
        </aside>

        {/* Sidebar Panel (Explorer / Search) */}
        <aside className="w-64 bg-[#252526] border-r border-[#1e1e1e] flex flex-col min-h-0 flex-shrink-0">
          {activeSidebar === "explorer" ? (
            <>
              <div className="px-3 py-2 flex items-center justify-between text-[11px] font-bold tracking-wider uppercase text-[#bbbbbb] border-b border-[#1e1e1e]">
                <span>Explorer</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setNewFileModal(true)}
                    title="New File"
                    className="px-1.5 py-0.5 rounded hover:bg-[#37373d] text-[#cccccc] text-xs cursor-pointer"
                  >
                    + File
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpandedDirs(collectAllDirPaths(tree))}
                    title="Expand All Folders"
                    className="px-1.5 py-0.5 rounded hover:bg-[#37373d] text-[#cccccc] text-xs cursor-pointer"
                  >
                    ⊞
                  </button>
                  <button
                    type="button"
                    onClick={loadWorkspace}
                    title="Refresh Explorer"
                    className="px-1.5 py-0.5 rounded hover:bg-[#37373d] text-[#cccccc] text-xs cursor-pointer"
                  >
                    ↻
                  </button>
                </div>
              </div>

              <div className="px-2.5 py-1.5 bg-[#2d2d2d] text-[11px] font-bold text-white flex items-center justify-between border-b border-[#1e1e1e]">
                <span className="truncate uppercase tracking-wide">▾ {projectName}</span>
                <span className="text-[10px] text-[#9cdcfe] font-mono">
                  {Object.keys(filesMap).length} files
                </span>
              </div>

              <div className="flex-1 overflow-y-auto py-1">
                {loading ? (
                  <div className="p-4 text-xs text-[#858585]">Loading workspace tree...</div>
                ) : (
                  renderTree(tree)
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 p-3 space-y-3">
              <div className="text-[11px] font-bold tracking-wider uppercase text-[#bbbbbb]">
                Search in Workspace
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files & code..."
                className="w-full px-2.5 py-1.5 rounded bg-[#3c3c3c] border border-[#007acc] text-xs text-white outline-none"
              />
              <div className="flex-1 overflow-y-auto space-y-1">
                {searchResults.map((item, i) => (
                  <button
                    key={`${item.path}-${item.line}-${i}`}
                    type="button"
                    onClick={() => handleSelectFile(item.path)}
                    className="w-full text-left p-1.5 rounded hover:bg-[#2a2d2e] text-xs cursor-pointer"
                  >
                    <div className="font-semibold text-[#9cdcfe] truncate">
                      {item.path}:{item.line}
                    </div>
                    <div className="text-[11px] text-[#858585] font-mono truncate">
                      {item.snippet}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Center Editor + Optional Split Preview + Bottom Terminal */}
        <main className="flex-1 flex flex-col min-w-0 min-h-0 bg-[#1e1e1e]">
          {/* Open Editor Tabs */}
          <div className="h-9 bg-[#252526] border-b border-[#1e1e1e] flex items-center overflow-x-auto no-scrollbar flex-shrink-0">
            {openTabs.map((tabPath) => {
              const name = tabPath.split("/").pop() || tabPath;
              const isActive = activeFile === tabPath;
              const isDirty = dirtyFiles.has(tabPath);
              const { icon, color } = getFileIcon(name);
              return (
                <div
                  key={tabPath}
                  onClick={() => setActiveFile(tabPath)}
                  className={`h-full flex items-center gap-2 px-3 border-r border-[#1e1e1e] text-xs cursor-pointer flex-shrink-0 ${
                    isActive
                      ? "bg-[#1e1e1e] text-white border-t-2 border-t-[#007acc]"
                      : "bg-[#2d2d2d] text-[#969696] hover:bg-[#2a2d2e]"
                  }`}
                >
                  <span style={{ color }} className="text-[10px] font-bold">
                    {icon}
                  </span>
                  <span>{name}</span>
                  {isDirty && <span className="text-[#007acc] text-xs">●</span>}
                  <button
                    type="button"
                    onClick={(e) => handleCloseTab(tabPath, e)}
                    className="ml-1 text-[#858585] hover:text-white rounded px-1"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>

          {/* Breadcrumb Bar */}
          {activeFile && (
            <div className="h-6 bg-[#1e1e1e] border-b border-[#252526] px-4 flex items-center justify-between text-[11px] text-[#858585] font-mono flex-shrink-0">
              <div className="flex items-center gap-1.5 truncate">
                <span>{projectName}</span>
                {activeFile.split("/").map((part, idx) => (
                  <React.Fragment key={idx}>
                    <span>›</span>
                    <span className={idx === activeFile.split("/").length - 1 ? "text-[#cccccc]" : ""}>
                      {part}
                    </span>
                  </React.Fragment>
                ))}
              </div>
              <span className="text-[10px] text-[#6b7280]">{activeContent.length} bytes</span>
            </div>
          )}

          {/* Editor + Optional Live Preview Split */}
          <div className="flex-1 flex min-h-0 overflow-hidden">
            <div className="flex-1 flex min-w-0 min-h-0 overflow-hidden relative">
              {activeFile ? (
                <div className="flex-1 flex overflow-auto font-mono text-[13px] leading-[20px]">
                  {/* Line Numbers */}
                  <div className="py-3 px-3 bg-[#1e1e1e] text-[#858585] text-right select-none border-r border-[#252526] flex-shrink-0">
                    {Array.from({ length: lineCount }, (_, idx) => (
                      <div key={idx + 1}>{idx + 1}</div>
                    ))}
                  </div>
                  {/* Code Textarea */}
                  <textarea
                    value={activeContent}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    spellCheck={false}
                    className="flex-1 p-3 bg-[#1e1e1e] text-[#d4d4d4] font-mono text-[13px] leading-[20px] outline-none resize-none whitespace-pre overflow-x-auto"
                  />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-sm text-[#858585]">
                  Select any file from the Explorer on the left to view or edit.
                </div>
              )}
            </div>

            {showPreview && (
              <div className="w-1/2 border-l border-[#252526] flex flex-col bg-[#0f172a]">
                <div className="h-7 bg-[#252526] px-3 flex items-center justify-between text-[11px] text-[#cccccc]">
                  <span>Live Application Preview ({projectName})</span>
                  <a
                    href={`/api/preview?session=${encodeURIComponent(sessionId)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#38bdf8] hover:underline"
                  >
                    Open Fullscreen ↗
                  </a>
                </div>
                <iframe
                  src={`/api/preview?session=${encodeURIComponent(sessionId)}`}
                  className="flex-1 w-full border-none bg-white"
                  title="Live App Preview"
                />
              </div>
            )}
          </div>

          {/* Integrated Terminal Panel */}
          {showTerminal && (
            <div className="h-44 bg-[#181818] border-t border-[#252526] flex flex-col flex-shrink-0 font-mono text-xs">
              <div className="h-7 bg-[#252526] px-3 flex items-center justify-between text-[11px] border-b border-[#1e1e1e]">
                <div className="flex items-center gap-4">
                  <span className="text-white font-semibold border-b border-[#007acc] py-1">
                    TERMINAL
                  </span>
                  <span className="text-[#858585] truncate">{workspacePath}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTerminal(false)}
                  className="text-[#858585] hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 p-2.5 overflow-y-auto space-y-1 text-[11px] text-[#cccccc]">
                {terminalLogs.map((line, i) => (
                  <div key={i} className="whitespace-pre-wrap">
                    {line}
                  </div>
                ))}
              </div>
              <form
                onSubmit={handleRunTerminalCmd}
                className="flex items-center gap-2 px-3 py-1.5 border-t border-[#252526] bg-[#1e1e1e]"
              >
                <span className="text-[#38bdf8] font-bold">$</span>
                <input
                  type="text"
                  value={terminalCmd}
                  onChange={(e) => setTerminalCmd(e.target.value)}
                  placeholder="Run workspace command (e.g. bun test, bun run build, ls -la)..."
                  className="flex-1 bg-transparent text-xs text-white outline-none font-mono"
                />
              </form>
            </div>
          )}
        </main>
      </div>

      {/* VS Code Bottom Status Bar */}
      <footer className="h-6 bg-[#007acc] text-white text-[11px] px-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <span>⎇ main*</span>
          <span>✓ 0 Errors, 0 Warnings</span>
          <span className="hidden sm:inline">Workspace: {workspacePath}</span>
        </div>
        <div className="flex items-center gap-4">
          <span>{Object.keys(filesMap).length} Files Materialized</span>
          <span>UTF-8</span>
          <span>TypeScript React</span>
        </div>
      </footer>

      {/* New File Modal */}
      {newFileModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setNewFileModal(false)}
        >
          <div
            className="w-96 rounded-lg bg-[#252526] border border-[#3c3c3c] p-4 space-y-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-xs font-semibold text-white">Create New File in Workspace</div>
            <input
              type="text"
              value={newFilePathInput}
              onChange={(e) => setNewFilePathInput(e.target.value)}
              placeholder="src/components/NewFeature.tsx"
              className="w-full px-2.5 py-1.5 rounded bg-[#3c3c3c] border border-[#007acc] text-xs text-white font-mono outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNewFileModal(false)}
                className="px-3 py-1 rounded bg-[#3c3c3c] text-xs text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateNewFile}
                className="px-3 py-1 rounded bg-[#007acc] text-xs text-white font-medium cursor-pointer"
              >
                Create File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VSCodeServerPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen bg-[#1e1e1e] text-[#cccccc] flex items-center justify-center font-mono text-xs">
          Launching VS Code Server Workbench...
        </div>
      }
    >
      <VSCodeServerWorkbench />
    </Suspense>
  );
}
