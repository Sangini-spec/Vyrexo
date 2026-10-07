import { NextRequest, NextResponse } from "next/server";
import {
  getSessionChatHistory,
  saveSessionChatHistory,
  appendSessionChatTurn,
  clearSessionChatHistory,
  SessionChatTurn,
} from "@/lib/project-session-store";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const turns = getSessionChatHistory(id);

  if (turns.length === 0) {
    return NextResponse.json({
      ok: true,
      sessionId: id,
      turns: [
        {
          role: "assistant",
          content: "Welcome back! Rex is ready. What would you like to build or inspect?",
          timestamp: Date.now(),
        },
      ],
    });
  }

  return NextResponse.json({
    ok: true,
    sessionId: id,
    turns: turns.map((t) => ({
      role: t.role,
      content: t.text,
      text: t.text,
      images: t.images,
      docs: t.docs,
      timestamp: t.timestamp,
    })),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (Array.isArray(body.turns)) {
      const normalized: SessionChatTurn[] = body.turns.map((t: any) => ({
        role: t.role === "user" ? "user" : "assistant",
        text: t.text || t.content || "",
        images: t.images || [],
        docs: t.docs || [],
        timestamp: t.timestamp || Date.now(),
      }));
      saveSessionChatHistory(id, normalized);
      return NextResponse.json({ ok: true, count: normalized.length });
    }

    if (body.turn) {
      appendSessionChatTurn(id, {
        role: body.turn.role === "user" ? "user" : "assistant",
        text: body.turn.text || body.turn.content || "",
        images: body.turn.images || [],
        docs: body.turn.docs || [],
        timestamp: body.turn.timestamp || Date.now(),
      });
      return NextResponse.json({ ok: true, turn: body.turn });
    }

    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to save history" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  clearSessionChatHistory(id);
  return NextResponse.json({ ok: true, sessionId: id, message: "History cleared" });
}

