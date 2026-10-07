import { NextRequest, NextResponse } from "next/server";
import {
  clearSessionChatHistory,
  clearAllSessionChatHistories,
} from "@/lib/project-session-store";

interface SessionRecord {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  createdAt: number;
}

// In-memory store for sessions during development and container runtime
const sessionStore = new Map<string, SessionRecord[]>();

const DEFAULT_SESSIONS: SessionRecord[] = [
  {
    id: "session-default-1",
    user_id: "dev-local-user",
    name: "API Service Architecture",
    icon: "🚀",
    createdAt: Date.now() - 1000 * 60 * 45,
  },
  {
    id: "session-default-2",
    user_id: "dev-local-user",
    name: "Frontend Components & Orb",
    icon: "⚡",
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
  },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id") || "dev-local-user";

  const userSessions = sessionStore.get(userId);
  if (!userSessions || userSessions.length === 0) {
    sessionStore.set(userId, [...DEFAULT_SESSIONS]);
  }

  const sessions = sessionStore.get(userId) || [];
  return NextResponse.json({
    ok: true,
    sessions,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = body.user_id || "dev-local-user";
    const sessionId = body.id || `session-${Date.now()}`;
    const name = body.name || "New Session";
    const icon = body.icon || "🚀";
    const idTs = body.id?.match(/^session-(\d{11,14})$/)?.[1]
      ? Number(body.id.match(/^session-(\d{11,14})$/)[1])
      : null;
    const createdAt = body.createdAt ? Number(body.createdAt) : (idTs || Date.now());

    const current = sessionStore.get(userId) || [];
    const existingIndex = current.findIndex((s) => s.id === sessionId);

    const record: SessionRecord = {
      id: sessionId,
      user_id: userId,
      name,
      icon,
      createdAt,
    };

    if (existingIndex >= 0) {
      current[existingIndex] = { ...current[existingIndex], ...record };
    } else {
      current.unshift(record);
    }
    sessionStore.set(userId, current);

    return NextResponse.json({
      ok: true,
      session: record,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to save session" },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("id");
  const userId = searchParams.get("user_id") || "dev-local-user";
  const clearAll = searchParams.get("clear_all") === "true";
  const olderThanDaysStr = searchParams.get("older_than_days");

  if (clearAll) {
    sessionStore.set(userId, []);
    clearAllSessionChatHistories();
    return NextResponse.json({ ok: true, message: "All sessions and chats cleared" });
  }

  if (olderThanDaysStr) {
    const days = parseFloat(olderThanDaysStr) || 1;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const current = sessionStore.get(userId) || [];
    const kept: SessionRecord[] = [];
    const removedIds: string[] = [];

    for (const s of current) {
      if (s.createdAt < cutoff) {
        removedIds.push(s.id);
        clearSessionChatHistory(s.id);
      } else {
        kept.push(s);
      }
    }

    sessionStore.set(userId, kept);
    return NextResponse.json({
      ok: true,
      removedCount: removedIds.length,
      removedIds,
      remainingCount: kept.length,
    });
  }

  if (sessionId) {
    const current = sessionStore.get(userId) || [];
    sessionStore.set(
      userId,
      current.filter((s) => s.id !== sessionId)
    );
    clearSessionChatHistory(sessionId);
  }

  return NextResponse.json({ ok: true });
}
