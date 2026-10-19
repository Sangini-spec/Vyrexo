import { NextRequest, NextResponse } from "next/server";
import {
  clearSessionChatHistory,
  clearAllSessionChatHistories,
  ensureSessionWorkspaceMaterialized,
  getSessionProject,
  getSessionChatHistory,
} from "@/lib/project-session-store";
import {
  readPersistedSessions,
  writePersistedSessions,
} from "@/lib/session-persistent-storage";
import {
  isPlaceholderOrBadSessionName,
  resolveSemanticSessionName,
} from "@/lib/project-spec";

interface SessionRecord {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  createdAt: number;
}

const sessionStore: Map<string, SessionRecord[]> =
  (globalThis as any).__vyrexo_sessions_store ||
  ((globalThis as any).__vyrexo_sessions_store = new Map<string, SessionRecord[]>());

const DEFAULT_SESSIONS: SessionRecord[] = [
  {
    id: "session-1790005321834",
    user_id: "dev-local-user",
    name: "RailGo Train Booking",
    icon: "🚆",
    createdAt: Date.now() - 1000 * 60 * 15,
  },
];

function healAndEnrichSessions(userId: string, list: SessionRecord[]): SessionRecord[] {
  let changed = false;
  const seenIds = new Set<string>();
  const healed: SessionRecord[] = [];

  for (const s of list) {
    if (!s || !s.id || seenIds.has(s.id)) continue;
    // Remove defunct empty default placeholders if they have no built project or chat history
    if (
      (s.id === "session-default-1" || s.id === "session-default-2") &&
      !getSessionProject(s.id) &&
      getSessionChatHistory(s.id).length === 0
    ) {
      changed = true;
      continue;
    }
    seenIds.add(s.id);

    const proj = getSessionProject(s.id);
    const history = getSessionChatHistory(s.id);
    const semanticName = resolveSemanticSessionName(
      s.name,
      s.id,
      proj?.title,
      history
    );

    let icon = s.icon || "🚀";
    if (/rail|train/i.test(semanticName) && icon === "🚀") {
      icon = "🚆";
    }

    if (semanticName !== s.name || icon !== s.icon) {
      changed = true;
    }

    healed.push({
      ...s,
      name: semanticName,
      icon,
    });

    ensureSessionWorkspaceMaterialized(s.id, semanticName);
  }

  // Ensure session-1790005321834 is always present if built on disk
  if (!seenIds.has("session-1790005321834")) {
    const railProj = getSessionProject("session-1790005321834");
    const railHist = getSessionChatHistory("session-1790005321834");
    if (railProj || railHist.length > 0 || healed.length === 0) {
      const semanticName = resolveSemanticSessionName(
        "RailGo Train Booking",
        "session-1790005321834",
        railProj?.title,
        railHist
      );
      healed.push({
        id: "session-1790005321834",
        user_id: userId,
        name: semanticName,
        icon: "🚆",
        createdAt: Date.now() - 1000 * 60 * 15,
      });
      seenIds.add("session-1790005321834");
      ensureSessionWorkspaceMaterialized("session-1790005321834", semanticName);
      changed = true;
    }
  }

  if (changed) {
    try {
      writePersistedSessions(userId, healed);
    } catch {}
  }

  return healed;
}

function getUserSessions(userId: string): SessionRecord[] {
  const inMem = sessionStore.get(userId);
  if (inMem && inMem.length > 0) {
    const healed = healAndEnrichSessions(userId, inMem);
    sessionStore.set(userId, healed);
    return healed;
  }

  try {
    const persisted = readPersistedSessions(userId);
    if (persisted && persisted.length > 0) {
      const healed = healAndEnrichSessions(userId, persisted);
      sessionStore.set(userId, healed);
      return healed;
    }
  } catch {}

  const seeded = healAndEnrichSessions(userId, [...DEFAULT_SESSIONS]);
  sessionStore.set(userId, seeded);
  return seeded;
}

function saveUserSessions(userId: string, list: SessionRecord[]): void {
  sessionStore.set(userId, list);
  try {
    writePersistedSessions(userId, list);
  } catch {}
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id") || "dev-local-user";

  const sessions = getUserSessions(userId);
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
    const rawIncomingName = (body.name || "New Session").trim();
    const icon = body.icon || "🚀";
    const idTs = body.id?.match(/^session-(\d{11,14})$/)?.[1]
      ? Number(body.id.match(/^session-(\d{11,14})$/)[1])
      : null;
    const createdAt = body.createdAt ? Number(body.createdAt) : (idTs || Date.now());

    const current = [...getUserSessions(userId)];
    const existingIndex = current.findIndex((s) => s.id === sessionId);

    const proj = getSessionProject(sessionId);
    const history = getSessionChatHistory(sessionId);
    const resolvedIncomingName =
      rawIncomingName === "New Session"
        ? !isPlaceholderOrBadSessionName(proj?.title)
          ? proj!.title
          : "New Session"
        : resolveSemanticSessionName(rawIncomingName, sessionId, proj?.title, history);

    const record: SessionRecord = {
      id: sessionId,
      user_id: userId,
      name: resolvedIncomingName,
      icon: /rail|train/i.test(resolvedIncomingName) && icon === "🚀" ? "🚆" : icon,
      createdAt,
    };

    if (existingIndex >= 0) {
      const currentName = current[existingIndex].name;
      const currentIsGood = !isPlaceholderOrBadSessionName(currentName);
      const incomingIsGood = !isPlaceholderOrBadSessionName(resolvedIncomingName);

      let finalName = currentName;
      if (body.forceRename && incomingIsGood) {
        finalName = resolvedIncomingName;
      } else if (!currentIsGood && incomingIsGood) {
        finalName = resolvedIncomingName;
      } else if (!currentIsGood && !incomingIsGood) {
        finalName = resolveSemanticSessionName(currentName, sessionId, proj?.title, history);
      }

      current[existingIndex] = {
        ...current[existingIndex],
        ...record,
        name: finalName,
      };
    } else {
      current.unshift(record);
    }
    saveUserSessions(userId, current);
    const savedRecord = existingIndex >= 0 ? current[existingIndex] : record;

    // Ensure existing workspace is loaded from disk if present (never overwrites built projects)
    if (savedRecord.name && savedRecord.name !== "New Session") {
      ensureSessionWorkspaceMaterialized(sessionId, savedRecord.name);
    }

    return NextResponse.json({
      ok: true,
      session: savedRecord,
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
    saveUserSessions(userId, []);
    clearAllSessionChatHistories();
    return NextResponse.json({ ok: true, message: "All sessions and chats cleared" });
  }

  if (olderThanDaysStr) {
    const days = parseFloat(olderThanDaysStr) || 1;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const current = getUserSessions(userId);
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

    saveUserSessions(userId, kept);
    return NextResponse.json({
      ok: true,
      removedCount: removedIds.length,
      removedIds,
      remainingCount: kept.length,
    });
  }

  if (sessionId) {
    const current = getUserSessions(userId);
    saveUserSessions(
      userId,
      current.filter((s) => s.id !== sessionId)
    );
    clearSessionChatHistory(sessionId);
  }

  return NextResponse.json({ ok: true });
}

