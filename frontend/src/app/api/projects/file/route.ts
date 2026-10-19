import { NextRequest, NextResponse } from "next/server";
import {
  getSessionWorkspaceFiles,
  getProjectFile,
  updateProjectFile,
  ensureSessionWorkspaceMaterialized,
} from "@/lib/project-session-store";
import { collectProjectExportData } from "@/lib/project-export";
import fs from "fs";
import path from "path";

function isRestrictedSecretFile(relPath: string): boolean {
  const normalized = relPath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (normalized.includes("..")) return true;
  const base = path.posix.basename(normalized).toLowerCase();
  if (
    (base === ".env" || base.startsWith(".env.")) &&
    base !== ".env.example"
  ) {
    return true;
  }
  if (base === "ai-config.json" || normalized.startsWith(".data/")) {
    return true;
  }
  return false;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawSessionId = searchParams.get("sessionId");
  const sessionId =
    !rawSessionId || rawSessionId === "default" ? "session-1790005321834" : rawSessionId;
  const filePath = searchParams.get("file") || "";

  if (!filePath) {
    return NextResponse.json({ ok: false, error: "Missing file parameter" }, { status: 400 });
  }

  const cleanPath = filePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (isRestrictedSecretFile(cleanPath)) {
    return NextResponse.json(
      { ok: false, error: "Access to environment or secret configuration files is denied." },
      { status: 403 }
    );
  }

  // 1. Check in connected session project
  if (sessionId) {
    ensureSessionWorkspaceMaterialized(sessionId);

    const file = getProjectFile(sessionId, cleanPath);
    if (file) {
      return NextResponse.json({
        ok: true,
        file: cleanPath,
        content: file.content,
        size: file.size,
        lastModified: file.lastModified,
      });
    }

    // 2. Check in workspace files from disk
    const wsFiles = getSessionWorkspaceFiles(sessionId);
    const foundWs = wsFiles.find((f) => f.path.replace(/^\/+/, "") === cleanPath);
    if (foundWs) {
      return NextResponse.json({
        ok: true,
        file: cleanPath,
        content: foundWs.content,
        size: foundWs.size,
        lastModified: foundWs.lastModified,
      });
    }

    // 3. Check synthesized export files
    try {
      const projectData = await collectProjectExportData(sessionId);
      const match = projectData.files.find((f) => f.path.replace(/^\/+/, "") === cleanPath);
      if (match) {
        return NextResponse.json({
          ok: true,
          file: cleanPath,
          content: match.content,
          size: Buffer.byteLength(match.content, "utf-8"),
          lastModified: Date.now(),
        });
      }
    } catch {}
  }

  // Fallback to default synthesized project
  try {
    const defaultData = await collectProjectExportData();
    const match = defaultData.files.find((f) => f.path.replace(/^\/+/, "") === cleanPath);
    if (match) {
      return NextResponse.json({
        ok: true,
        file: cleanPath,
        content: match.content,
        size: Buffer.byteLength(match.content, "utf-8"),
        lastModified: Date.now(),
      });
    }
  } catch {}

  return NextResponse.json({
    ok: false,
    error: `File not found: ${filePath}`,
  }, { status: 404 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, file, content } = body;

    if (!sessionId || !file || content === undefined) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields (sessionId, file, content)" },
        { status: 400 }
      );
    }

    const cleanPath = String(file).replace(/\\/g, "/").replace(/^\/+/, "");
    if (isRestrictedSecretFile(cleanPath)) {
      return NextResponse.json(
        { ok: false, error: "Modifying environment or secret configuration files is not permitted." },
        { status: 403 }
      );
    }

    updateProjectFile(sessionId, cleanPath, content);

    // Also write to workspace directory safely within workspace root
    const { getWorkspaceDir } = require("@/lib/workspace-executor");
    const wsDir = path.resolve(getWorkspaceDir(sessionId));
    if (fs.existsSync(wsDir)) {
      const fullPath = path.resolve(wsDir, cleanPath);
      if (fullPath.startsWith(wsDir + path.sep)) {
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, content, "utf-8");
      }
    }

    return NextResponse.json({
      ok: true,
      message: `File ${cleanPath} updated successfully`,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to update file" },
      { status: 500 }
    );
  }
}
