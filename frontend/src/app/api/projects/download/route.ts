import { NextRequest, NextResponse } from "next/server";
import {
  materializeProjectOnDisk,
  createTarGzArchive,
  generateProjectZipBuffer,
  ProjectExportFile,
} from "@/lib/project-export";
import { verifySessionProjectOwnership } from "@/lib/project-session-store";
import { isBlockedLegacySessionId } from "@/lib/session-persistent-storage";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = (searchParams.get("sessionId") || searchParams.get("session") || "").trim();
    const format = (searchParams.get("format") || "zip").toLowerCase();
    const userId = (searchParams.get("user_id") || req.headers.get("x-user-id") || "").trim();

    if (!sessionId || isBlockedLegacySessionId(sessionId)) {
      return NextResponse.json({ ok: false, error: "Valid session ID is required" }, { status: 400 });
    }

    if (!verifySessionProjectOwnership(sessionId, userId || null)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    if (format === "workspace" || format === "targz") {
      const materialized = materializeProjectOnDisk(sessionId);

      if (format === "workspace") {
        const wsFile = materialized.files.find((f) => f.path.endsWith(".code-workspace"));
        const content = wsFile ? wsFile.content : "{}";
        return new NextResponse(content, {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Content-Disposition": `attachment; filename="${materialized.projectSlug}.code-workspace"`,
          },
        });
      }

      const archiveBuffer = createTarGzArchive(
        materialized.workspaceDir,
        materialized.projectSlug
      );

      return new NextResponse(new Uint8Array(archiveBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/gzip",
          "Content-Disposition": `attachment; filename="${materialized.projectSlug}-project.tar.gz"`,
          "Content-Length": String(archiveBuffer.length),
        },
      });
    }

    const { buffer, filename } = await generateProjectZipBuffer(sessionId);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to generate project archive" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionId = (body.sessionId || body.session || "").trim();
    const userId = (body.user_id || body.userId || req.headers.get("x-user-id") || "").trim();
    const files: ProjectExportFile[] | undefined = Array.isArray(body.files)
      ? body.files
      : undefined;
    const title: string | undefined = body.title;

    if (sessionId && isBlockedLegacySessionId(sessionId)) {
      return NextResponse.json({ ok: false, error: "Invalid session ID" }, { status: 403 });
    }

    if (sessionId && !verifySessionProjectOwnership(sessionId, userId || null)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const { buffer, filename } = await generateProjectZipBuffer(sessionId, files, title);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to generate project ZIP" },
      { status: 500 }
    );
  }
}

