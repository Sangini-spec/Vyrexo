import { NextRequest, NextResponse } from "next/server";
import {
  getSessionProject,
  getSessionConnectedProject,
  getSessionWorkspaceFiles,
  buildFileTree,
  ensureSessionWorkspaceMaterialized,
  getSessionChatHistory,
  verifySessionProjectOwnership,
} from "@/lib/project-session-store";
import { findPersistedSessionById, isBlockedLegacySessionId } from "@/lib/session-persistent-storage";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = (searchParams.get("sessionId") || searchParams.get("session") || "").trim();
  const userId = (searchParams.get("user_id") || req.headers.get("x-user-id") || "").trim();

  if (!sessionId || isBlockedLegacySessionId(sessionId)) {
    return NextResponse.json({
      ok: true,
      tree: [],
      source: "empty",
      projectName: null,
      project: null,
      filesCount: 0,
    });
  }

  if (!verifySessionProjectOwnership(sessionId, userId || null)) {
    return NextResponse.json(
      { ok: false, tree: [], source: "empty", projectName: null, project: null, filesCount: 0, error: "Forbidden" },
      { status: 403 }
    );
  }

  let connected = getSessionConnectedProject(sessionId, userId || undefined);
  if (!connected) {
    const cogProj = getSessionProject(sessionId, userId || undefined);
    const persisted = findPersistedSessionById(sessionId);
    const chatTurns = getSessionChatHistory(sessionId);
    const title = cogProj?.title || persisted?.name || "";
    if (
      (title && title !== "New Session") ||
      chatTurns.some((t) => t.role === "user" && t.text.trim().length > 0)
    ) {
      connected = ensureSessionWorkspaceMaterialized(
        sessionId,
        title || "Sandbox Application",
        chatTurns
      );
    }
  }

  if (connected && connected.files.length > 0) {
    return NextResponse.json({
      ok: true,
      tree: buildFileTree(connected.files),
      source: "connected",
      projectName: connected.name,
      projectPath: connected.path,
      project: { name: connected.name, path: connected.path },
      filesCount: connected.files.length,
    });
  }

  const wsFiles = getSessionWorkspaceFiles(sessionId);
  if (wsFiles.length > 0) {
    const proj = getSessionProject(sessionId, userId || undefined);
    const projName = proj?.title || `Workspace (${sessionId})`;
    return NextResponse.json({
      ok: true,
      tree: buildFileTree(wsFiles),
      source: "workspace",
      projectName: projName,
      project: { name: projName },
      filesCount: wsFiles.length,
    });
  }

  return NextResponse.json({
    ok: true,
    tree: [],
    source: "empty",
    projectName: null,
    project: null,
    filesCount: 0,
  });
}

