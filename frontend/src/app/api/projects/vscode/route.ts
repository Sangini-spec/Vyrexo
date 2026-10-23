import { NextRequest, NextResponse } from "next/server";
import { materializeProjectOnDisk, ProjectExportFile } from "@/lib/project-export";
import {
  verifySessionProjectOwnership,
  getSessionConnectedProject,
  setSessionConnectedProject,
} from "@/lib/project-session-store";
import { isBlockedLegacySessionId } from "@/lib/session-persistent-storage";
import { exec } from "child_process";

function isCleanUserLocalPath(p?: string): boolean {
  if (!p || typeof p !== "string") return false;
  const trimmed = p.trim();
  if (!trimmed || trimmed === ".") return false;
  if (trimmed.startsWith("/app/applet")) return false;
  if (trimmed.startsWith("/workspaces/")) return false;
  if (trimmed.startsWith("/local/")) return false;
  return true;
}

function normalizeLocalTargetPath(targetPath: string, fallbackFolder = "amaze"): string {
  const raw = (targetPath || "").trim();
  if (!raw || raw === "." || raw.startsWith("/app/applet") || raw.startsWith("/workspaces/") || raw.startsWith("/local/")) {
    return `C:\\Users\\hp\\OneDrive\\Desktop\\${fallbackFolder}`;
  }
  if (raw.startsWith("~/") || raw.startsWith("~\\")) {
    const tail = raw.replace(/^~[\\/]+(?:Desktop|VyrexoWorkspaces)?[\\/]?/i, "") || fallbackFolder;
    return `C:\\Users\\hp\\OneDrive\\Desktop\\${tail}`;
  }
  return raw;
}

function buildDesktopUri(scheme: string, targetPath: string, fallbackFolder = "amaze"): string {
  const resolved = normalizeLocalTargetPath(targetPath, fallbackFolder);
  const normalized = resolved.replace(/\\/g, "/").replace(/\/+$/, "");
  const formatted = normalized.startsWith("/") ? normalized : `/${normalized}`;
  return `${scheme}://file${formatted}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionId: string = (body.sessionId || body.session || "").trim();
    const userId: string = (body.user_id || body.userId || req.headers.get("x-user-id") || "").trim();
    const providedFiles: ProjectExportFile[] | undefined = Array.isArray(body.files)
      ? body.files
      : undefined;
    const explicitTitle: string | undefined = body.title;
    const requestedPath: string = typeof body.path === "string" ? body.path.trim() : "";

    if (!sessionId || isBlockedLegacySessionId(sessionId)) {
      return NextResponse.json(
        { ok: false, error: "Valid session ID is required." },
        { status: 400 }
      );
    }

    if (!verifySessionProjectOwnership(sessionId, userId || null)) {
      return NextResponse.json(
        { ok: false, error: "Forbidden: session belongs to another user." },
        { status: 403 }
      );
    }

    // If the user customized their local folder path in the IDE modal, persist it for this session
    if (isCleanUserLocalPath(requestedPath)) {
      const existing = getSessionConnectedProject(sessionId);
      if (existing && existing.path !== requestedPath) {
        const folderBase = requestedPath.replace(/[\\/]+$/, "").split(/[\\/]/).pop();
        setSessionConnectedProject(
          sessionId,
          {
            ...existing,
            path: requestedPath,
            localFolderName: existing.localFolderName || folderBase || existing.name,
            source: "local_folder",
          },
          userId || existing.userId
        );
      }
    }

    const materialized = materializeProjectOnDisk(sessionId, providedFiles, explicitTitle);
    const effectiveTargetPath = isCleanUserLocalPath(requestedPath)
      ? requestedPath
      : materialized.localTargetPath;

    const vscodeUri = buildDesktopUri("vscode", effectiveTargetPath);
    const cursorUri = buildDesktopUri("cursor", effectiveTargetPath);
    const windsurfUri = buildDesktopUri("windsurf", effectiveTargetPath);
    const vscodeInsidersUri = buildDesktopUri("vscode-insiders", effectiveTargetPath);

    let launchedOnHost = false;
    await new Promise<void>((resolve) => {
      exec(`code "${materialized.workspaceDir}"`, { timeout: 1500 }, (error) => {
        if (!error) {
          launchedOnHost = true;
        }
        resolve();
      });
    });

    const uidQuery = userId ? `&user_id=${encodeURIComponent(userId)}` : "";

    return NextResponse.json({
      ok: true,
      sessionId,
      projectTitle: materialized.projectTitle,
      projectName: materialized.projectTitle,
      projectSlug: materialized.projectSlug,
      localFolderName: materialized.localFolderName,
      workspaceDir: materialized.workspaceDir,
      targetPath: effectiveTargetPath,
      sandboxPath: effectiveTargetPath,
      workspaceFilePath: materialized.workspaceFilePath,
      filesCount: materialized.files.length,
      files: materialized.files,
      vscodeUri,
      cursorUri,
      windsurfUri,
      vscodeInsidersUri,
      launchedOnHost,
      source: launchedOnHost ? "host_cli" : "uri_scheme",
      downloadUrl: `/api/projects/download?sessionId=${encodeURIComponent(sessionId)}${uidQuery}`,
      webIdeUrl: `/vscode?sessionId=${encodeURIComponent(sessionId)}${uidQuery}`,
      vscodeServerUrl: `/vscode?sessionId=${encodeURIComponent(sessionId)}${uidQuery}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to prepare project for VS Code" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = (searchParams.get("sessionId") || searchParams.get("session") || "").trim();
  const userId = (searchParams.get("user_id") || req.headers.get("x-user-id") || "").trim();

  if (!sessionId || isBlockedLegacySessionId(sessionId)) {
    return NextResponse.json(
      { ok: false, error: "Valid session ID is required." },
      { status: 400 }
    );
  }

  if (!verifySessionProjectOwnership(sessionId, userId || null)) {
    return NextResponse.json(
      { ok: false, error: "Forbidden: session belongs to another user." },
      { status: 403 }
    );
  }

  try {
    const materialized = materializeProjectOnDisk(sessionId);
    const effectiveTargetPath = materialized.localTargetPath;
    const uidQuery = userId ? `&user_id=${encodeURIComponent(userId)}` : "";

    return NextResponse.json({
      ok: true,
      sessionId,
      projectTitle: materialized.projectTitle,
      projectName: materialized.projectTitle,
      projectSlug: materialized.projectSlug,
      localFolderName: materialized.localFolderName,
      workspaceDir: materialized.workspaceDir,
      targetPath: effectiveTargetPath,
      sandboxPath: effectiveTargetPath,
      workspaceFilePath: materialized.workspaceFilePath,
      filesCount: materialized.files.length,
      files: materialized.files,
      vscodeUri: buildDesktopUri("vscode", effectiveTargetPath),
      cursorUri: buildDesktopUri("cursor", effectiveTargetPath),
      windsurfUri: buildDesktopUri("windsurf", effectiveTargetPath),
      vscodeInsidersUri: buildDesktopUri("vscode-insiders", effectiveTargetPath),
      downloadUrl: `/api/projects/download?sessionId=${encodeURIComponent(sessionId)}${uidQuery}`,
      webIdeUrl: `/vscode?sessionId=${encodeURIComponent(sessionId)}${uidQuery}`,
      vscodeServerUrl: `/vscode?sessionId=${encodeURIComponent(sessionId)}${uidQuery}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to inspect VS Code workspace" },
      { status: 500 }
    );
  }
}

