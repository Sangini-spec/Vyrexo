import { NextRequest, NextResponse } from "next/server";
import {
  getSessionConnectedProject,
  setSessionConnectedProject,
  removeSessionConnectedProject,
  analyzeCodebase,
  ProjectFile,
  ConnectedProject,
  ensureSessionWorkspaceMaterialized,
  getSessionProject,
  getSessionChatHistory,
  verifySessionProjectOwnership,
} from "@/lib/project-session-store";
import {
  findPersistedSessionById,
  isBlockedLegacySessionId,
  getSessionOwner,
  getUserSessions,
  saveUserSession,
  normalizeUserPrimaryKey,
  areSameUserIdentity,
} from "@/lib/session-persistent-storage";
import fs from "fs";
import path from "path";

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  ".cache",
  "__pycache__",
  ".venv",
  "venv",
  "target",
  "coverage",
  ".vscode",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".py",
  ".md",
  ".css",
  ".scss",
  ".html",
  ".yml",
  ".yaml",
  ".toml",
  ".rs",
  ".go",
  ".java",
  ".sql",
  ".sh",
  ".env.example",
]);

function getWorkspacesBaseDir(): string {
  return process.cwd().endsWith("frontend")
    ? path.resolve(process.cwd(), "..", "workspaces")
    : path.resolve(process.cwd(), "workspaces");
}

function scanLocalDirectory(
  dirPath: string,
  baseDir: string,
  results: ProjectFile[] = [],
  maxFiles = 80
): ProjectFile[] {
  if (results.length >= maxFiles) return results;
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (results.length >= maxFiles) break;
      if (entry.name === ".vyrexo-project.json" || entry.name === "project-meta.json") {
        continue;
      }
      if (entry.name.startsWith(".") && entry.name !== ".env.example") {
        if (IGNORED_DIRS.has(entry.name) || entry.isDirectory()) continue;
      }
      if (IGNORED_DIRS.has(entry.name)) continue;

      const fullPath = path.join(dirPath, entry.name);
      const relPath = path.relative(baseDir, fullPath).replace(/\\/g, "/");

      if (entry.isDirectory()) {
        scanLocalDirectory(fullPath, baseDir, results, maxFiles);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (
          ALLOWED_EXTENSIONS.has(ext) ||
          entry.name === "Dockerfile" ||
          entry.name === "Makefile"
        ) {
          try {
            const stat = fs.statSync(fullPath);
            if (stat.size <= 250 * 1024) {
              const content = fs.readFileSync(fullPath, "utf-8");
              results.push({
                path: relPath,
                content,
                size: stat.size,
                lastModified: stat.mtimeMs,
              });
            }
          } catch {}
        }
      }
    }
  } catch {}
  return results;
}

function getSessionTimestampFromId(sessionId: string, fallbackCreatedAt?: number): number {
  const m = sessionId.match(/^session-(\d{10,14})$/);
  const idTs = m ? parseInt(m[1], 10) : null;
  if (fallbackCreatedAt && fallbackCreatedAt > 1000000000000) {
    if (idTs && idTs < fallbackCreatedAt - 3600000) return idTs;
    return fallbackCreatedAt;
  }
  if (idTs && idTs > 1000000000000) return idTs;
  return fallbackCreatedAt || Date.now();
}

/**
 * Inspects whether a given user session actually contains a technical project
 * (either materialized in /workspaces/<sessionId> or stored as a ConnectedProject / SessionProject).
 * Sessions with only normal conversation and no technical project return null.
 */
function resolveTechnicalProjectForSession(
  sessionId: string,
  sessionName: string,
  sessionCreatedAt: number,
  userId: string
): {
  id: string;
  sessionId: string;
  name: string;
  path: string;
  description: string;
  summary: string;
  techStack: string[];
  filesCount: number;
  source: string;
  createdAt: number;
  lastUpdatedAt: number;
} | null {
  if (!sessionId || isBlockedLegacySessionId(sessionId)) return null;

  const workspaceBase = getWorkspacesBaseDir();
  const cleanFolder = sessionId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const wsDir = path.join(workspaceBase, cleanFolder);

  // 1. Check in-memory or disk-persisted ConnectedProject / SessionProject
  const connected = getSessionConnectedProject(sessionId, userId);
  const cogProject = getSessionProject(sessionId, userId);

  // 2. Check physical workspace directory on disk
  let diskFiles: ProjectFile[] = [];
  let diskMetaTitle = "";
  let diskUpdatedAt = 0;

  if (fs.existsSync(wsDir) && fs.statSync(wsDir).isDirectory()) {
    diskFiles = scanLocalDirectory(wsDir, wsDir, [], 100);
    const metaJsonPath = path.join(wsDir, "project-meta.json");
    if (fs.existsSync(metaJsonPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaJsonPath, "utf-8"));
        if (meta?.title) diskMetaTitle = String(meta.title).trim();
        if (meta?.updatedAt) diskUpdatedAt = Number(meta.updatedAt);
      } catch {}
    }
    const vyrexoJsonPath = path.join(wsDir, ".vyrexo-project.json");
    if (fs.existsSync(vyrexoJsonPath)) {
      try {
        const vMeta = JSON.parse(fs.readFileSync(vyrexoJsonPath, "utf-8"));
        if (!diskMetaTitle && vMeta?.project?.title) {
          diskMetaTitle = String(vMeta.project.title).trim();
        }
        if (!diskUpdatedAt && vMeta?.updatedAt) {
          diskUpdatedAt = Number(vMeta.updatedAt);
        }
      } catch {}
    }
  }

  // Strictly verify that a real technical project exists in this session
  // (Either physical project files exist in /workspaces/<sessionId>, or a connected project / cognitive project was explicitly registered)
  const hasPhysicalWorkspace = diskFiles.length > 0;
  const hasConnectedProject = Boolean(connected && (connected.filesCount > 0 || connected.source === "local_folder"));
  const hasCognitiveProject = Boolean(cogProject && cogProject.title && cogProject.title !== "New Session");

  if (!hasPhysicalWorkspace && !hasConnectedProject && !hasCognitiveProject) {
    // Only normal conversation or empty session — do NOT include in Workspaces!
    return null;
  }

  const createdAt = getSessionTimestampFromId(sessionId, sessionCreatedAt);
  const cleanSessionName =
    sessionName && sessionName !== "New Session" ? sessionName.trim() : "";

  const displayName =
    cleanSessionName ||
    diskMetaTitle ||
    connected?.name ||
    cogProject?.title ||
    "Project Workspace";

  const filesCount =
    diskFiles.length > 0
      ? diskFiles.length
      : connected?.filesCount ?? cogProject?.components?.length ?? 0;

  const slugForPath =
    (connected?.localFolderName || displayName)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || cleanFolder;

  const resolvedPath =
    connected?.path &&
    !connected.path.startsWith("/app/applet") &&
    !connected.path.startsWith("/workspaces/") &&
    !connected.path.startsWith("/local/") &&
    !connected.path.startsWith("~/") &&
    !connected.path.startsWith("~\\")
      ? connected.path
      : `C:\\Users\\hp\\OneDrive\\Desktop\\${connected?.localFolderName || slugForPath}`;

  const techStack =
    connected?.techStack && connected.techStack.length > 0
      ? connected.techStack
      : cogProject?.techStack && cogProject.techStack.length > 0
      ? cogProject.techStack
      : ["React", "TypeScript", "Tailwind CSS"];

  const summary =
    connected?.summary ||
    cogProject?.summary ||
    (diskMetaTitle ? `${diskMetaTitle} (${filesCount} files)` : `${displayName} (${filesCount} files)`);

  return {
    id: connected?.id || cogProject?.id || `proj_${sessionId}`,
    sessionId,
    name: displayName,
    path: resolvedPath,
    description: diskMetaTitle && diskMetaTitle !== displayName ? diskMetaTitle : summary,
    summary,
    techStack,
    filesCount,
    source: connected?.source || "workspace",
    createdAt,
    lastUpdatedAt: diskUpdatedAt || connected?.lastUpdatedAt || createdAt,
  };
}

/**
 * GET /api/projects?sessionId=...&user_id=...
 * Returns:
 * 1. `project`: the connected project for the active `sessionId` (if any)
 * 2. `projects`: all technical projects created by `user_id` across their sessions,
 *    ordered from newest at the top to earliest-created at the bottom.
 *    Sessions with only normal conversation (no technical project) are excluded.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = (
    searchParams.get("session") ||
    searchParams.get("sessionId") ||
    ""
  ).trim();
  const rawUserId = (searchParams.get("user_id") || req.headers.get("x-user-id") || "").trim();
  const rawEmail = (
    searchParams.get("email") ||
    req.headers.get("x-user-email") ||
    (rawUserId.includes("@") ? rawUserId : "")
  )
    .trim()
    .toLowerCase();
  const userId = normalizeUserPrimaryKey(rawUserId, rawEmail);

  // 1. Collect all technical projects created by this user across their sessions
  const userProjectsList: Array<{
    id: string;
    sessionId: string;
    name: string;
    path: string;
    description: string;
    summary: string;
    techStack: string[];
    filesCount: number;
    source: string;
    createdAt: number;
    lastUpdatedAt: number;
  }> = [];

  if (userId) {
    const userSessions = getUserSessions(userId, rawEmail);
    const seenSessionIds = new Set<string>();

    for (const s of userSessions) {
      if (!s?.id || isBlockedLegacySessionId(s.id)) continue;
      seenSessionIds.add(s.id);
      const techProj = resolveTechnicalProjectForSession(
        s.id,
        s.name,
        s.createdAt,
        userId
      );
      if (techProj) {
        userProjectsList.push(techProj);
      }
    }

    // Sort hierarchy: newest created project at the top, earliest created project at the bottom
    userProjectsList.sort((a, b) => b.createdAt - a.createdAt);
  }

  // 2. If no specific sessionId was requested, return the user's project collection
  if (!sessionId || isBlockedLegacySessionId(sessionId)) {
    return NextResponse.json({
      ok: true,
      connected: false,
      project: null,
      projects: userProjectsList,
      totalProjects: userProjectsList.length,
    });
  }

  if (!verifySessionProjectOwnership(sessionId, userId || null)) {
    return NextResponse.json(
      {
        ok: false,
        connected: false,
        project: null,
        projects: userProjectsList,
        error: "Forbidden: session belongs to another user",
      },
      { status: 403 }
    );
  }

  let project = getSessionConnectedProject(sessionId, userId || undefined);

  if (!project) {
    const cogProj = getSessionProject(sessionId, userId || undefined);
    const persistedSession = findPersistedSessionById(sessionId);
    const chatTurns = getSessionChatHistory(sessionId);
    const workspaceBase = getWorkspacesBaseDir();
    const cleanFolder = sessionId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const wsDir = path.join(workspaceBase, cleanFolder);
    const hasWorkspaceOnDisk =
      fs.existsSync(wsDir) &&
      fs.statSync(wsDir).isDirectory() &&
      scanLocalDirectory(wsDir, wsDir, [], 5).length > 0;

    const candidateTitle = cogProj?.title || persistedSession?.name || "";

    // Only auto-materialize if this session actually has a technical project or workspace on disk
    if (hasWorkspaceOnDisk || (cogProj && candidateTitle && candidateTitle !== "New Session")) {
      project = ensureSessionWorkspaceMaterialized(
        sessionId,
        candidateTitle && candidateTitle !== "New Session" ? candidateTitle : "Sandbox Application",
        chatTurns
      );
    }
  }

  if (!project) {
    return NextResponse.json({
      ok: true,
      connected: false,
      project: null,
      projects: userProjectsList,
      totalProjects: userProjectsList.length,
    });
  }

  const formattedProject = {
    id: project.id,
    sessionId: project.sessionId,
    name: project.name,
    path: project.path,
    source: project.source,
    summary: project.summary,
    techStack: project.techStack,
    filesCount: project.filesCount,
    connectedAt: project.connectedAt,
    lastUpdatedAt: project.lastUpdatedAt,
    files: project.files.map((f) => ({
      path: f.path,
      size: f.size || f.content.length,
      preview: f.content.slice(0, 300),
      content: f.content,
    })),
  };

  // Ensure the active session's project is also represented in projects list if not already there
  if (userId && !userProjectsList.some((p) => p.sessionId === sessionId)) {
    const persisted = findPersistedSessionById(sessionId);
    const createdAt = getSessionTimestampFromId(sessionId, persisted?.createdAt || project.connectedAt);
    userProjectsList.push({
      id: formattedProject.id,
      sessionId,
      name: persisted?.name && persisted.name !== "New Session" ? persisted.name : formattedProject.name,
      path: formattedProject.path,
      description: formattedProject.summary,
      summary: formattedProject.summary,
      techStack: formattedProject.techStack,
      filesCount: formattedProject.filesCount,
      source: formattedProject.source,
      createdAt,
      lastUpdatedAt: formattedProject.lastUpdatedAt,
    });
    userProjectsList.sort((a, b) => b.createdAt - a.createdAt);
  }

  return NextResponse.json({
    ok: true,
    connected: true,
    project: formattedProject,
    projects: userProjectsList.length > 0 ? userProjectsList : [formattedProject],
    totalProjects: userProjectsList.length > 0 ? userProjectsList.length : 1,
  });
}

/**
 * POST /api/projects
 * Connects a project (including empty or populated local folders, or existing workspaces)
 * to the specified sessionId and userId.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionId: string = (body.sessionId || body.session || "").trim();
    const rawUserId: string = (body.userId || body.user_id || req.headers.get("x-user-id") || "").trim();
    const rawEmail: string = (
      body.email ||
      req.headers.get("x-user-email") ||
      (rawUserId.includes("@") ? rawUserId : "")
    )
      .trim()
      .toLowerCase();
    const userId: string = normalizeUserPrimaryKey(rawUserId, rawEmail);
    const isExplicitLocalFolder = body.source === "local_folder" || Array.isArray(body.files);
    const mode: "files" | "server_path" =
      body.mode || (!isExplicitLocalFolder && body.path ? "server_path" : "files");

    if (!sessionId || isBlockedLegacySessionId(sessionId)) {
      return NextResponse.json(
        { error: "Valid session ID is required to connect a project." },
        { status: 400 }
      );
    }

    const existingOwner = getSessionOwner(sessionId);
    if (existingOwner && userId && !areSameUserIdentity(existingOwner, userId)) {
      return NextResponse.json(
        { error: "Forbidden: session belongs to another user." },
        { status: 403 }
      );
    }

    const workspaceBase = getWorkspacesBaseDir();
    const cleanSessionFolder = sessionId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const sessionWorkspaceDir = path.resolve(workspaceBase, cleanSessionFolder);

    let projectName = (body.name || "Connected Project").trim();
    let projectPath = (body.path || `/local/${projectName}`).trim();
    let files: ProjectFile[] = [];
    let source: "local_folder" | "workspace" | "preset" = "local_folder";

    if (mode === "server_path") {
      const targetPath = (body.serverPath || body.path || "").trim();
      if (!targetPath || targetPath.includes("..") || targetPath.includes("\0")) {
        return NextResponse.json(
          { error: "Forbidden: invalid or traversal directory path." },
          { status: 403 }
        );
      }

      const resolvedPath = path.isAbsolute(targetPath)
        ? path.resolve(targetPath)
        : path.resolve(workspaceBase, targetPath);

      const isInsideWorkspaces =
        resolvedPath === sessionWorkspaceDir ||
        resolvedPath.startsWith(sessionWorkspaceDir + path.sep) ||
        resolvedPath.startsWith(workspaceBase + path.sep);

      if (!isInsideWorkspaces) {
        // User entered a custom local path on their machine (e.g., C:\Users\...\amaze or /Users/.../amaze)
        // Create the backing session workspace directory and bind their custom local path!
        fs.mkdirSync(sessionWorkspaceDir, { recursive: true });
        projectName = body.name || targetPath.replace(/[\\/]+$/, "").split(/[\\/]/).pop() || "Local Project";
        projectPath = targetPath;
        source = "local_folder";
        files = scanLocalDirectory(sessionWorkspaceDir, sessionWorkspaceDir, [], 100);
      } else {
        if (!fs.existsSync(resolvedPath)) {
          fs.mkdirSync(resolvedPath, { recursive: true });
        }
        projectName = body.name || path.basename(resolvedPath) || "Workspace Project";
        projectPath = resolvedPath;
        source = "workspace";
        files = scanLocalDirectory(resolvedPath, resolvedPath, [], 100);
      }
    } else {
      const rawFiles = Array.isArray(body.files) ? body.files : [];
      files = rawFiles
        .filter(
          (f: any) =>
            f &&
            typeof f.path === "string" &&
            typeof f.content === "string" &&
            !f.path.includes("..") &&
            !/(?:^|\/)\.env(?:\..+)?$/i.test(f.path.replace(/\\/g, "/"))
        )
        .slice(0, 200)
        .map((f: any) => ({
          path: f.path.replace(/\\/g, "/").replace(/^\/+/, ""),
          content: f.content,
          size: f.size || f.content.length,
          lastModified: f.lastModified || Date.now(),
        }));
      const cleanLocalPath =
        body.path &&
        typeof body.path === "string" &&
        !body.path.startsWith("/app/applet") &&
        !body.path.startsWith("/workspaces/") &&
        !body.path.startsWith("/local/") &&
        !body.path.startsWith("~/") &&
        !body.path.startsWith("~\\")
          ? body.path.trim()
          : `C:\\Users\\hp\\OneDrive\\Desktop\\${projectName}`;
      projectPath = cleanLocalPath;
      source = "local_folder";

      // Always materialize the session workspace folder on disk (even for an empty local folder!)
      // so any files uploaded now or generated next by Rex are stored cleanly in /workspaces/<sessionId>
      fs.mkdirSync(sessionWorkspaceDir, { recursive: true });
      for (const file of files) {
        try {
          const dest = path.resolve(sessionWorkspaceDir, file.path);
          if (dest.startsWith(sessionWorkspaceDir + path.sep)) {
            fs.mkdirSync(path.dirname(dest), { recursive: true });
            fs.writeFileSync(dest, file.content, "utf-8");
          }
        } catch {}
      }
    }

    // Support both populated folders AND empty folders (0 files) selected on purpose by the user!
    const analysis =
      files.length > 0
        ? analyzeCodebase(projectName, files)
        : {
            summary: `Connected empty local folder "${projectName}". All new files generated by Rex in this session will be created inside this workspace and synced for VS Code.`,
            techStack: ["Local Folder Sync", "VS Code Ready"],
          };
    const now = Date.now();

    const connected: ConnectedProject = {
      id: `proj_${now}`,
      sessionId,
      userId: userId || existingOwner || undefined,
      name: projectName,
      localFolderName: source === "local_folder" ? projectName : undefined,
      path: projectPath,
      source,
      summary: analysis.summary,
      techStack: analysis.techStack,
      filesCount: files.length,
      files,
      connectedAt: now,
      lastUpdatedAt: now,
    };

    setSessionConnectedProject(sessionId, connected, userId || undefined);

    // Also ensure the session record exists for this user and reflects the connected folder name if it was "New Session"
    if (userId) {
      const existingSession = findPersistedSessionById(sessionId);
      const shouldUpdateName =
        !existingSession || !existingSession.name || existingSession.name === "New Session";
      saveUserSession(userId, {
        id: sessionId,
        user_id: userId,
        name: shouldUpdateName ? projectName : existingSession.name,
        icon: existingSession?.icon || "📁",
        createdAt: existingSession?.createdAt || getSessionTimestampFromId(sessionId, now),
      });
    }

    return NextResponse.json({
      ok: true,
      project: {
        id: connected.id,
        sessionId: connected.sessionId,
        name: connected.name,
        path: connected.path,
        source: connected.source,
        summary: connected.summary,
        techStack: connected.techStack,
        filesCount: connected.filesCount,
        connectedAt: connected.connectedAt,
        lastUpdatedAt: connected.lastUpdatedAt,
        files: connected.files.map((f) => ({
          path: f.path,
          size: f.size || f.content.length,
          content: f.content,
        })),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to connect project folder." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects?session=...
 * Disconnects the project from the specified session.
 */
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = (
    searchParams.get("session") ||
    searchParams.get("sessionId") ||
    ""
  ).trim();
  const rawUserId = (searchParams.get("user_id") || req.headers.get("x-user-id") || "").trim();
  const rawEmail = (
    searchParams.get("email") ||
    req.headers.get("x-user-email") ||
    (rawUserId.includes("@") ? rawUserId : "")
  )
    .trim()
    .toLowerCase();
  const userId = normalizeUserPrimaryKey(rawUserId, rawEmail);

  if (!sessionId || isBlockedLegacySessionId(sessionId)) {
    return NextResponse.json({ ok: false, removed: false }, { status: 400 });
  }

  if (!verifySessionProjectOwnership(sessionId, userId || null)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const removed = removeSessionConnectedProject(sessionId);
  return NextResponse.json({ ok: true, removed, sessionId });
}

