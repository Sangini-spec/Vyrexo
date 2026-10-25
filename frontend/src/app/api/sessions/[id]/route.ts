import { NextRequest, NextResponse } from "next/server";
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
  clearSessionChatHistory,
  getSessionProject,
  getSessionChatHistory,
  removeSessionConnectedProject,
} from "@/lib/project-session-store";
import {
  isPlaceholderOrBadSessionName,
  resolveSemanticSessionName,
} from "@/lib/project-spec";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const rawUserId = (body.user_id || body.userId || request.headers.get("x-user-id") || "").trim();
  const rawEmail = (
    body.email ||
    request.headers.get("x-user-email") ||
    (rawUserId.includes("@") ? rawUserId : "")
  )
    .trim()
    .toLowerCase();
  const userId = normalizeUserPrimaryKey(rawUserId, rawEmail);
  const requestedName = (body.name || "").trim();

  if (!id || isBlockedLegacySessionId(id)) {
    return NextResponse.json({ ok: false, error: "Invalid session ID" }, { status: 403 });
  }

  const existingOwner = getSessionOwner(id);
  if (existingOwner && userId && !areSameUserIdentity(existingOwner, userId)) {
    return NextResponse.json(
      { ok: false, error: "Forbidden: session belongs to another user" },
      { status: 403 }
    );
  }

  const targetUserId = userId || existingOwner || "";
  const proj = getSessionProject(id);
  const history = getSessionChatHistory(id);
  const semanticName = !isPlaceholderOrBadSessionName(requestedName)
    ? requestedName
    : resolveSemanticSessionName(requestedName, id, proj?.title, history);

  try {
    if (targetUserId) {
      const aliases = getUserIdentityAliases(targetUserId, rawEmail);
      const store: Map<string, any[]> | undefined = (globalThis as any).__vyrexo_sessions_store;
      const list = store?.get(targetUserId) || readPersistedSessions(targetUserId, rawEmail) || [];
      const idx = list.findIndex((s: any) => s.id === id);
      if (idx >= 0) {
        const existingName = list[idx].name;
        const finalName =
          !isPlaceholderOrBadSessionName(requestedName)
            ? requestedName
            : !isPlaceholderOrBadSessionName(existingName)
              ? existingName
              : semanticName;
        list[idx] = { ...list[idx], name: finalName, updatedAt: Date.now() };
        if (store) {
          for (const a of aliases) store.set(a, list);
        }
        writePersistedSessions(targetUserId, list, rawEmail);
        return NextResponse.json({
          ok: true,
          sessionId: id,
          name: finalName,
        });
      }
    }
  } catch {}

  return NextResponse.json({
    ok: true,
    sessionId: id,
    name: semanticName || "Updated Session",
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  if (!id) {
    return NextResponse.json({ ok: false, error: "Session ID required" }, { status: 400 });
  }

  const existingOwner = getSessionOwner(id);
  if (existingOwner && userId && !areSameUserIdentity(existingOwner, userId)) {
    return NextResponse.json(
      { ok: false, error: "Forbidden: session belongs to another user" },
      { status: 403 }
    );
  }

  const targetUserId = userId || existingOwner || "";

  try {
    const store: Map<string, any[]> | undefined = (globalThis as any).__vyrexo_sessions_store;
    if (targetUserId) {
      const aliases = getUserIdentityAliases(targetUserId, rawEmail);
      const list = store?.get(targetUserId) || readPersistedSessions(targetUserId, rawEmail) || [];
      const filtered = list.filter((s: any) => s.id !== id);
      if (store) {
        for (const a of aliases) store.set(a, filtered);
      }
      writePersistedSessions(targetUserId, filtered, rawEmail);
    }
    clearSessionChatHistory(id);
    removeSessionConnectedProject(id);
    deleteUserSession(id, targetUserId || undefined);
  } catch {}

  return NextResponse.json({
    ok: true,
    sessionId: id,
  });
}


