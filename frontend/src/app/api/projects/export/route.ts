import { NextRequest, NextResponse } from "next/server";
import { materializeProjectOnDisk } from "@/lib/project-export";
import { verifySessionProjectOwnership } from "@/lib/project-session-store";
import { isBlockedLegacySessionId } from "@/lib/session-persistent-storage";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = (searchParams.get("sessionId") || searchParams.get("session") || "").trim();
    const userId = (searchParams.get("user_id") || req.headers.get("x-user-id") || "").trim();

    if (!sessionId || isBlockedLegacySessionId(sessionId)) {
      return NextResponse.json({ ok: false, error: "Valid session ID is required" }, { status: 400 });
    }

    if (!verifySessionProjectOwnership(sessionId, userId || null)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const materialized = materializeProjectOnDisk(sessionId);

    return NextResponse.json({
      ok: true,
      sessionId,
      projectTitle: materialized.projectTitle,
      projectSlug: materialized.projectSlug,
      workspaceDir: materialized.workspaceDir,
      workspaceFilePath: materialized.workspaceFilePath,
      filesCount: materialized.files.length,
      files: materialized.files.map((f) => ({
        path: f.path,
        content: f.content,
        size: Buffer.byteLength(f.content, "utf-8"),
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to export project files" },
      { status: 500 }
    );
  }
}

