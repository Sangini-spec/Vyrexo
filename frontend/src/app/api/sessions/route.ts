import { NextRequest, NextResponse } from "next/server";
import {
  clearSessionChatHistory,
  ensureSessionWorkspaceMaterialized,
  getSessionProject,
  getSessionChatHistory,
  removeSessionConnectedProject,
} from "@/lib/project-session-store";
import {
  readPersistedSessions,
  writePersistedSessions,
  getSessionOwner,
  isBlockedLegacySessionId,
  deleteUserSession,
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

function healAndEnrichSessions(userId: string, list: SessionRecord[]): SessionRecord[] {
  let changed = false;
  const seenIds = new Set<string>();
  const healed: SessionRecord[] = [];

  for (const s of list) {
    if (!s || !s.id || seenIds.has(s.id) || isBlockedLegacySessionId(s.id)) {
      changed = true;
      continue;
    }

    // Strict user boundary: never include a session that belongs to a different user
    if (s.user_id && s.user_id !== userId) {
      changed = true;
      continue;
    }

    const owner = getSessionOwner(s.id);
    if (owner && owner !== userId) {
      changed = true;
      continue;
    }

    seenIds.add(s.id);

    const proj = getSessionProject(s.id);
    const history = getSessionChatHistory(s.id);
    const semanticName =
      s.name === "New Session" && !proj && history.length <= 1
        ? "New Session"
        : resolveSemanticSessionName(s.name, s.id, proj?.title, history);

    let icon = s.icon || "🚀";
    if (/rail|train/i.test(semanticName) && icon === "🚀") {
      icon = "🚆";
    }

    if (semanticName !== s.name || icon !== s.icon || s.user_id !== userId) {
      changed = true;
    }

    healed.push({
      ...s,
      user_id: userId,
      name: semanticName,
      icon,
    });

    if (semanticName !== "New Session") {
      ensureSessionWorkspaceMaterialized(s.id, semanticName);
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
  if (!userId) return [];

  const inMem = sessionStore.get(userId);
  if (inMem) {
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

  // Brand-new user or user with no sessions: return strictly empty list
  sessionStore.set(userId, []);
  return [];
}

function saveUserSessions(userId: string, list: SessionRecord[]): void {
  if (!userId) return;
  const sanitized = list
    .filter((s) => s && s.id && !isBlockedLegacySessionId(s.id) && (!s.user_id || s.user_id === userId))
    .map((s) => ({ ...s, user_id: userId }));
  sessionStore.set(userId, sanitized);
  try {
    writePersistedSessions(userId, sanitized);
  } catch {}
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = (searchParams.get("user_id") || request.headers.get("x-user-id") || "").trim();

  if (!userId) {
    return NextResponse.json({
      ok: true,
      sessions: [],
    });
  }

  const sessions = getUserSessions(userId);
  return NextResponse.json({
    ok: true,
    sessions,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = (body.user_id || request.headers.get("x-user-id") || "").trim();
    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "Authentication required: user_id is missing" },
        { status: 401 }
      );
    }

    const sessionId = (body.id || `session-${Date.now()}`).trim();
    if (isBlockedLegacySessionId(sessionId)) {
      return NextResponse.json(
        { ok: false, error: "Invalid or restricted session ID" },
        { status: 403 }
      );
    }

    // Prevent any user from claiming or modifying a session owned by another user
    const existingOwner = getSessionOwner(sessionId);
    if (existingOwner && existingOwner !== userId) {
      return NextResponse.json(
        { ok: false, error: "Forbidden: session belongs to another user" },
        { status: 403 }
      );
    }

    const rawIncomingName = (body.name || "New Session").trim();
    const icon = body.icon || "🚀";
    const idTs = sessionId.match(/^session-(\d{11,14})$/)?.[1]
      ? Number(sessionId.match(/^session-(\d{11,14})$/)![1])
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
        finalName =
          currentName === "New Session" && !proj && history.length <= 1
            ? "New Session"
            : resolveSemanticSessionName(currentName, sessionId, proj?.title, history);
      }

      current[existingIndex] = {
        ...current[existingIndex],
        ...record,
        user_id: userId,
        name: finalName,
      };
    } else {
      current.unshift(record);
    }
    saveUserSessions(userId, current);
    const savedRecord = existingIndex >= 0 ? current[existingIndex] : record;

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
  const userId = (searchParams.get("user_id") || request.headers.get("x-user-id") || "").trim();
  const clearAll = searchParams.get("clear_all") === "true";
  const olderThanDaysStr = searchParams.get("older_than_days");

  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "Authentication required: user_id is missing" },
      { status: 401 }
    );
  }

  if (clearAll) {
    const userSessions = getUserSessions(userId);
    for (const s of userSessions) {
      clearSessionChatHistory(s.id);
      removeSessionConnectedProject(s.id);
      deleteUserSession(s.id, userId);
    }
    saveUserSessions(userId, []);
    return NextResponse.json({ ok: true, message: "All sessions and chats for user cleared" });
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
        removeSessionConnectedProject(s.id);
        deleteUserSession(s.id, userId);
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
    const existingOwner = getSessionOwner(sessionId);
    if (existingOwner && existingOwner !== userId) {
      return NextResponse.json(
        { ok: false, error: "Forbidden: session belongs to another user" },
        { status: 403 }
      );
    }

    const current = getUserSessions(userId);
    saveUserSessions(
      userId,
      current.filter((s) => s.id !== sessionId)
    );
    clearSessionChatHistory(sessionId);
    removeSessionConnectedProject(sessionId);
    deleteUserSession(sessionId, userId);
  }

  return NextResponse.json({ ok: true });
}
