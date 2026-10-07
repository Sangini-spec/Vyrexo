import { NextRequest, NextResponse } from "next/server";
import { generateProjectZipBuffer, ProjectExportFile } from "@/lib/project-export";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId") || undefined;
    const title = searchParams.get("title") || searchParams.get("path") || undefined;

    const { buffer, filename, fileCount } = await generateProjectZipBuffer(sessionId, undefined, title);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Project-Files-Count": String(fileCount),
        "Cache-Control": "no-cache, no-store",
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to generate project ZIP" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sessionId = body.sessionId || undefined;
    const title = body.title || body.projectTitle || undefined;
    const files: ProjectExportFile[] | undefined = Array.isArray(body.files) ? body.files : undefined;

    const { buffer, filename, fileCount } = await generateProjectZipBuffer(sessionId, files, title);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Project-Files-Count": String(fileCount),
        "Cache-Control": "no-cache, no-store",
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to generate project ZIP" },
      { status: 500 }
    );
  }
}
