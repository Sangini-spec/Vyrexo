import { NextRequest, NextResponse } from "next/server";
import {
  getProjectFile,
  updateProjectFile,
  getSessionConnectedProject,
  verifySessionProjectOwnership,
} from "@/lib/project-session-store";
import { isBlockedLegacySessionId } from "@/lib/session-persistent-storage";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = (searchParams.get("sessionId") || searchParams.get("session") || "").trim();
  const filePath = searchParams.get("file") || searchParams.get("path") || "";
  const userId = (searchParams.get("user_id") || req.headers.get("x-user-id") || "").trim();

  if (!filePath || !sessionId || isBlockedLegacySessionId(sessionId)) {
    return NextResponse.json({ ok: false, error: "Missing session or file path" }, { status: 400 });
  }

  if (!verifySessionProjectOwnership(sessionId, userId || null)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const file = getProjectFile(sessionId, filePath);
  if (file) {
    return NextResponse.json({
      ok: true,
      path: file.path,
      content: file.content,
      size: file.size || file.content.length,
      lastModified: file.lastModified || Date.now(),
    });
  }

  return NextResponse.json(
    { ok: false, error: `File not found in workspace: ${filePath}` },
    { status: 404 }
  );
}

async function handleSave(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionId = (body.sessionId || body.session || "").trim();
    const filePath = body.file || body.path || "";
    const content = typeof body.content === "string" ? body.content : "";
    const userId = (body.user_id || body.userId || req.headers.get("x-user-id") || "").trim();

    if (!filePath || !sessionId || isBlockedLegacySessionId(sessionId)) {
      return NextResponse.json({ ok: false, error: "Missing session or file path" }, { status: 400 });
    }

    if (!verifySessionProjectOwnership(sessionId, userId || null)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const updated = updateProjectFile(sessionId, filePath, content);

    const proj = getSessionConnectedProject(sessionId, userId || undefined);
    if (proj && proj.source === "workspace" && proj.path && !proj.path.startsWith("local://")) {
      try {
        const fullDiskPath = path.join(proj.path, filePath.replace(/^\/+/, ""));
        if (fullDiskPath.startsWith(proj.path)) {
          fs.mkdirSync(path.dirname(fullDiskPath), { recursive: true });
          fs.writeFileSync(fullDiskPath, content, "utf-8");
        }
      } catch {}
    }

    return NextResponse.json({
      ok: true,
      updatedInMemory: updated,
      path: filePath,
      lastModified: Date.now(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to save file" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  return handleSave(req);
}

export async function POST(req: NextRequest) {
  return handleSave(req);
}

