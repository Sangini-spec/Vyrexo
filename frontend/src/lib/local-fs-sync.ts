"use client";

export interface SyncFileItem {
  path: string;
  content: string;
  size?: number;
}

const IDB_NAME = "vyrexo_local_fs_db";
const IDB_STORE = "dir_handles";
const PARENT_DIR_NAMES = new Set([
  "desktop",
  "documents",
  "downloads",
  "onedrive",
  "projects",
  "workspaces",
  "vyrexoworkspaces",
  "repos",
  "code",
  "dev",
]);

function openHandlesDb(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveDirHandleToIndexedDB(key: string, handle: any): Promise<void> {
  if (!key || !handle) return;
  const db = await openHandlesDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(handle, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function getDirHandleFromIndexedDB(key: string): Promise<any | null> {
  if (!key) return null;
  const db = await openHandlesDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function registerLocalDirectoryHandle(
  sessionId: string,
  folderName: string,
  handle: any
): Promise<void> {
  if (typeof window === "undefined" || !handle) return;
  (window as any).__localDirHandles = (window as any).__localDirHandles || {};
  if (sessionId) {
    (window as any).__localDirHandles[sessionId] = handle;
    await saveDirHandleToIndexedDB(`session:${sessionId}`, handle);
  }
  const cleanName = (folderName || handle.name || "").trim().toLowerCase();
  if (cleanName) {
    (window as any).__localDirHandles[`folder:${cleanName}`] = handle;
    await saveDirHandleToIndexedDB(`folder:${cleanName}`, handle);
  }
}

async function ensureReadWritePermission(handle: any, requestIfPrompt: boolean): Promise<boolean> {
  if (!handle) return false;
  try {
    if (typeof handle.queryPermission === "function") {
      const state = await handle.queryPermission({ mode: "readwrite" });
      if (state === "granted") return true;
      if (requestIfPrompt && typeof handle.requestPermission === "function") {
        const requested = await handle.requestPermission({ mode: "readwrite" });
        return requested === "granted";
      }
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function writeFilesToDirectoryHandle(
  rootHandle: any,
  files: SyncFileItem[]
): Promise<number> {
  if (!rootHandle || !Array.isArray(files) || files.length === 0) return 0;
  let written = 0;

  for (const file of files) {
    const cleanRel = String(file.path || "")
      .replace(/\\/g, "/")
      .replace(/^\/+/, "")
      .trim();
    if (!cleanRel || cleanRel.includes("..")) continue;
    // Skip internal .code-workspace file so the folder itself opens cleanly in VS Code Explorer
    if (cleanRel.endsWith(".code-workspace")) continue;

    const parts = cleanRel.split("/").filter(Boolean);
    if (parts.length === 0) continue;
    const fileName = parts.pop()!;

    try {
      let dirHandle = rootHandle;
      for (const part of parts) {
        dirHandle = await dirHandle.getDirectoryHandle(part, { create: true });
      }
      const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(file.content ?? "");
      await writable.close();
      written++;
    } catch {
      // Ignore individual file error and continue writing remaining tree
    }
  }

  return written;
}

function buildUpdatedTargetPath(baseTargetPath: string, actualFolderName: string): string {
  const cleanFolder = (actualFolderName || "amaze").trim();
  const raw = (baseTargetPath || "").trim();
  if (
    !raw ||
    raw === "." ||
    raw.startsWith("/app/applet") ||
    raw.startsWith("/workspaces/") ||
    raw.startsWith("/local/") ||
    raw.startsWith("~")
  ) {
    return `C:\\Users\\hp\\OneDrive\\Desktop\\${cleanFolder}`;
  }

  const isWin = raw.includes("\\") || /^[A-Za-z]:/.test(raw);
  const sep = isWin ? "\\" : "/";
  const parts = raw.replace(/[\\/]+$/, "").split(/[\\/]/);
  if (parts.length > 1) {
    parts[parts.length - 1] = cleanFolder;
    return parts.join(sep);
  }
  return `C:\\Users\\hp\\OneDrive\\Desktop\\${cleanFolder}`;
}

export async function syncSessionFilesToLocalDisk(options: {
  sessionId: string;
  folderName: string;
  targetPath: string;
  files: SyncFileItem[];
  promptIfMissing?: boolean;
}): Promise<{
  synced: boolean;
  filesWritten: number;
  actualFolderName: string;
  actualTargetPath: string;
}> {
  const { sessionId, folderName, targetPath, files, promptIfMissing = false } = options;
  const desiredFolder = (folderName || "amaze").trim() || "amaze";
  const defaultTargetPath = buildUpdatedTargetPath(targetPath, desiredFolder);

  if (typeof window === "undefined" || (!promptIfMissing && (!Array.isArray(files) || files.length === 0))) {
    return {
      synced: false,
      filesWritten: 0,
      actualFolderName: desiredFolder,
      actualTargetPath: defaultTargetPath,
    };
  }

  (window as any).__localDirHandles = (window as any).__localDirHandles || {};
  const memHandles = (window as any).__localDirHandles;

  // 1. Check existing handle for this session or folder name (in memory or IndexedDB)
  let projectHandle =
    memHandles[sessionId] ||
    memHandles[`folder:${desiredFolder.toLowerCase()}`] ||
    (await getDirHandleFromIndexedDB(`session:${sessionId}`)) ||
    (await getDirHandleFromIndexedDB(`folder:${desiredFolder.toLowerCase()}`));

  if (projectHandle) {
    const hasPerm = await ensureReadWritePermission(projectHandle, promptIfMissing);
    if (hasPerm) {
      await registerLocalDirectoryHandle(sessionId, projectHandle.name || desiredFolder, projectHandle);
      const count = await writeFilesToDirectoryHandle(projectHandle, files);
      const actualName = projectHandle.name || desiredFolder;
      return {
        synced: count > 0,
        filesWritten: count,
        actualFolderName: actualName,
        actualTargetPath: buildUpdatedTargetPath(targetPath, actualName),
      };
    }
  }

  // 2. For projects generated on Vercel that are not locally present yet:
  // Check if we have a saved parent workspace handle (e.g. Desktop) in IndexedDB and auto-create the project subfolder!
  const parentHandle =
    memHandles["root:workspace_parent"] ||
    (await getDirHandleFromIndexedDB("root:workspace_parent"));

  if (parentHandle) {
    const hasPerm = await ensureReadWritePermission(parentHandle, promptIfMissing);
    if (hasPerm) {
      try {
        const createdSubdir = await parentHandle.getDirectoryHandle(desiredFolder, { create: true });
        await registerLocalDirectoryHandle(sessionId, desiredFolder, createdSubdir);
        const count = await writeFilesToDirectoryHandle(createdSubdir, files);
        return {
          synced: count > 0,
          filesWritten: count,
          actualFolderName: desiredFolder,
          actualTargetPath: buildUpdatedTargetPath(targetPath, desiredFolder),
        };
      } catch {}
    }
  }

  // 3. If no handle is stored yet and promptIfMissing is true, open native directory picker
  if (promptIfMissing && "showDirectoryPicker" in window) {
    try {
      const pickedHandle = await (window as any).showDirectoryPicker({
        mode: "readwrite",
        startIn: "desktop",
      });
      if (pickedHandle) {
        const pickedName = String(pickedHandle.name || "").trim();
        const pickedLower = pickedName.toLowerCase();

        // If user selected Desktop / Documents / Projects parent folder, automatically create/open `<desiredFolder>` inside it!
        if (PARENT_DIR_NAMES.has(pickedLower) && pickedLower !== desiredFolder.toLowerCase()) {
          memHandles["root:workspace_parent"] = pickedHandle;
          await saveDirHandleToIndexedDB("root:workspace_parent", pickedHandle);

          const subHandle = await pickedHandle.getDirectoryHandle(desiredFolder, { create: true });
          await registerLocalDirectoryHandle(sessionId, desiredFolder, subHandle);
          const count = await writeFilesToDirectoryHandle(subHandle, files);
          return {
            synced: count > 0,
            filesWritten: count,
            actualFolderName: desiredFolder,
            actualTargetPath: buildUpdatedTargetPath(targetPath, desiredFolder),
          };
        }

        // User selected the project folder itself (e.g. "amaze"): write all files & subdirectories directly into it!
        const finalFolderName = pickedName || desiredFolder;
        await registerLocalDirectoryHandle(sessionId, finalFolderName, pickedHandle);
        const count = await writeFilesToDirectoryHandle(pickedHandle, files);
        return {
          synced: count > 0,
          filesWritten: count,
          actualFolderName: finalFolderName,
          actualTargetPath: buildUpdatedTargetPath(targetPath, finalFolderName),
        };
      }
    } catch {
      // User cancelled picker or running inside a restricted cross-origin iframe
    }
  }

  return {
    synced: false,
    filesWritten: 0,
    actualFolderName: desiredFolder,
    actualTargetPath: defaultTargetPath,
  };
}

export function saveSessionFilesToCache(
  sessionId: string,
  files: SyncFileItem[],
  meta?: { projectName?: string; localFolderName?: string; targetPath?: string }
): void {
  if (typeof window === "undefined" || !sessionId || !Array.isArray(files) || files.length === 0) {
    return;
  }
  const cleanFiles = files
    .filter((f) => f?.path && typeof f.content === "string" && !f.path.endsWith(".code-workspace"))
    .map((f) => ({
      path: String(f.path).replace(/^\/+/, ""),
      content: f.content,
    }));
  if (cleanFiles.length === 0) return;

  try {
    const existingRaw = localStorage.getItem(`vyrexo_session_files_${sessionId}`);
    const existing = existingRaw ? JSON.parse(existingRaw) : {};
    const mergedMap = new Map<string, string>();
    if (Array.isArray(existing.files)) {
      for (const f of existing.files) {
        if (f?.path && typeof f.content === "string") {
          mergedMap.set(f.path, f.content);
        }
      }
    }
    for (const f of cleanFiles) {
      mergedMap.set(f.path, f.content);
    }
    const mergedFiles = Array.from(mergedMap.entries()).map(([path, content]) => ({ path, content }));
    localStorage.setItem(
      `vyrexo_session_files_${sessionId}`,
      JSON.stringify({
        files: mergedFiles,
        projectName: meta?.projectName || existing.projectName,
        localFolderName: meta?.localFolderName || existing.localFolderName,
        targetPath: meta?.targetPath || existing.targetPath,
        updatedAt: Date.now(),
      })
    );
  } catch {}
}

export function getSessionFilesFromCache(sessionId: string): {
  files: SyncFileItem[];
  projectName?: string;
  localFolderName?: string;
  targetPath?: string;
} | null {
  if (typeof window === "undefined" || !sessionId) return null;
  try {
    const raw = localStorage.getItem(`vyrexo_session_files_${sessionId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.files) && parsed.files.length > 0) {
      return parsed;
    }
  } catch {}
  return null;
}
