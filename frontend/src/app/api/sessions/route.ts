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
  normalizeUserPrimaryKey,
  getUserIdentityAliases,
  areSameUserIdentity,
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
  const canonical = normalizeUserPrimaryKey(userId) || userId;
  let changed = false;
  const seenIds = new Set<string>();
  const healed: SessionRecord[] = [];

  for (const s of list) {
    if (!s || !s.id || seenIds.has(s.id) || isBlockedLegacySessionId(s.id)) {
      changed = true;
      continue;
    }

    // Strict user boundary: never include a session that belongs to a different user
    if (s.user_id && !areSameUserIdentity(s.user_id, canonical)) {
      changed = true;
      continue;
    }

    const owner = getSessionOwner(s.id);
    if (owner && !areSameUserIdentity(owner, canonical)) {
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

    if (semanticName !== s.name || icon !== s.icon || s.user_id !== canonical) {
      changed = true;
    }

    healed.push({
      ...s,
      user_id: canonical,
      name: semanticName,
      icon,
    });

    if (semanticName !== "New Session") {
      ensureSessionWorkspaceMaterialized(s.id, semanticName);
    }
  }

  if (changed) {
    try {
      writePersistedSessions(canonical, healed);
    } catch {}
  }

  return healed;
}

function getUserSessions(userId: string, email?: string | null): SessionRecord[] {
  const aliases = getUserIdentityAliases(userId, email);
  if (aliases.length === 0) return [];
  const canonical = normalizeUserPrimaryKey(userId, email) || aliases[0];

  for (const key of aliases) {
    const inMem = sessionStore.get(key);
    if (inMem && inMem.length > 0) {
      const healed = healAndEnrichSessions(canonical, inMem);
      for (const a of aliases) sessionStore.set(a, healed);
      return healed;
    }
  }

  try {
    const persisted = readPersistedSessions(canonical, email);
    if (persisted && persisted.length > 0) {
      const healed = healAndEnrichSessions(canonical, persisted);
      for (const a of aliases) sessionStore.set(a, healed);
      return healed;
    }
  } catch {}

  // Brand-new user or user with no sessions: return strictly empty list
  for (const a of aliases) sessionStore.set(a, []);
  return [];
}

function saveUserSessions(userId: string, list: SessionRecord[], email?: string | null): void {
  const aliases = getUserIdentityAliases(userId, email);
  if (aliases.length === 0) return;
  const canonical = normalizeUserPrimaryKey(userId, email) || aliases[0];
  const sanitized = list
    .filter(
      (s) =>
        s &&
        s.id &&
        !isBlockedLegacySessionId(s.id) &&
        (!s.user_id || areSameUserIdentity(s.user_id, canonical))
    )
    .map((s) => ({ ...s, user_id: canonical }));
  for (const a of aliases) sessionStore.set(a, sanitized);
  try {
    writePersistedSessions(canonical, sanitized, email);
  } catch {}
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawUserId = (searchParams.get("user_id") || request.headers.get("x-user-id") || "").trim();
  const rawEmail = (
    searchParams.get("email") ||
    request.headers.get("x-user-email") ||
    (rawUserId.includes("@") ? rawUserId : "")
  )
    .trim()
    .toLowerCase();
  const userId = normalizeUserPrimaryKey(rawUserId, rawEmail);

  if (!userId) {
    return NextResponse.json({
      ok: true,
      sessions: [],
    });
  }

  const sessions = getUserSessions(userId, rawEmail);
  return NextResponse.json({
    ok: true,
    sessions,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawUserId = (body.user_id || request.headers.get("x-user-id") || "").trim();
    const rawEmail = (
      body.email ||
      request.headers.get("x-user-email") ||
      (rawUserId.includes("@") ? rawUserId : "")
    )
      .trim()
      .toLowerCase();
    const userId = normalizeUserPrimaryKey(rawUserId, rawEmail);
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
    if (existingOwner && !areSameUserIdentity(existingOwner, userId)) {
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
  const rawUserId = (searchParams.get("user_id") || request.headers.get("x-user-id") || "").trim();
  const rawEmail = (
    searchParams.get("email") ||
    request.headers.get("x-user-email") ||
    (rawUserId.includes("@") ? rawUserId : "")
  )
    .trim()
    .toLowerCase();
  const userId = normalizeUserPrimaryKey(rawUserId, rawEmail);
  const clearAll = searchParams.get("clear_all") === "true";
  const olderThanDaysStr = searchParams.get("older_than_days");

  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "Authentication required: user_id is missing" },
      { status: 401 }
    );
  }

  if (clearAll) {
    const userSessions = getUserSessions(userId, rawEmail);
    for (const s of userSessions) {
      clearSessionChatHistory(s.id);
      removeSessionConnectedProject(s.id);
      deleteUserSession(s.id, userId);
    }
    saveUserSessions(userId, [], rawEmail);
    return NextResponse.json({ ok: true, message: "All sessions and chats for user cleared" });
  }

  if (olderThanDaysStr) {
    const days = parseFloat(olderThanDaysStr) || 1;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const current = getUserSessions(userId, rawEmail);
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

    saveUserSessions(userId, kept, rawEmail);
    return NextResponse.json({
      ok: true,
      removedCount: removedIds.length,
      removedIds,
      remainingCount: kept.length,
    });
  }

  if (sessionId) {
    const existingOwner = getSessionOwner(sessionId);
    if (existingOwner && !areSameUserIdentity(existingOwner, userId)) {
      return NextResponse.json(
        { ok: false, error: "Forbidden: session belongs to another user" },
        { status: 403 }
      );
    }

    const current = getUserSessions(userId, rawEmail);
    saveUserSessions(
      userId,
      current.filter((s) => s.id !== sessionId),
      rawEmail
    );
    clearSessionChatHistory(sessionId);
    removeSessionConnectedProject(sessionId);
    deleteUserSession(sessionId, userId);
  }

  return NextResponse.json({ ok: true });
}
