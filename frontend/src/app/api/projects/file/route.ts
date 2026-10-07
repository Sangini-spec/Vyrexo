import { NextRequest, NextResponse } from "next/server";
import {
  getSessionConnectedProject,
  getSessionWorkspaceFiles,
  getProjectFile,
  updateProjectFile,
} from "@/lib/project-session-store";
import { collectProjectExportData } from "@/lib/project-export";
import fs from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");
  const filePath = searchParams.get("file") || "";

  if (!filePath) {
    return NextResponse.json({ ok: false, error: "Missing file parameter" }, { status: 400 });
  }

  const cleanPath = filePath.replace(/^\/+/, "");

  // 1. Check in connected session project
  if (sessionId) {
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

    const cleanPath = file.replace(/^\/+/, "");
    updateProjectFile(sessionId, cleanPath, content);

    // Also write to workspace directory if it exists
    const wsDir = path.resolve(process.cwd(), "workspaces", sessionId.replace(/[^a-zA-Z0-9_-]/g, "_"));
    if (fs.existsSync(wsDir)) {
      const fullPath = path.join(wsDir, cleanPath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content, "utf-8");
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
