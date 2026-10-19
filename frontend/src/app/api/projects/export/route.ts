import { NextRequest, NextResponse } from "next/server";
import { generateProjectZipBuffer } from "@/lib/project-export";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId") || url.searchParams.get("session") || "default";

    const { buffer, filename } = await generateProjectZipBuffer(sessionId);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
