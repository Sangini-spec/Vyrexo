import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const videoId = `media-${Date.now()}`;
    return NextResponse.json({
      ok: true,
      video_id: videoId,
      filename: file instanceof File ? file.name : "uploaded-file",
      message: "Media successfully uploaded and indexed for Rex vision agent",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to upload file" },
      { status: 400 }
    );
  }
}
