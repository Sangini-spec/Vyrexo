import { NextRequest, NextResponse } from "next/server";
import {
  readPersistedSessions,
  writePersistedSessions,
} from "@/lib/session-persistent-storage";
import {
  clearSessionChatHistory,
  getSessionProject,
  getSessionChatHistory,
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
  const userId = body.user_id || "dev-local-user";
  const requestedName = (body.name || "").trim();

  const proj = getSessionProject(id);
  const history = getSessionChatHistory(id);
  const semanticName = !isPlaceholderOrBadSessionName(requestedName)
    ? requestedName
    : resolveSemanticSessionName(requestedName, id, proj?.title, history);

  try {
    const store: Map<string, any[]> | undefined = (globalThis as any).__vyrexo_sessions_store;
    const list = store?.get(userId) || readPersistedSessions(userId) || [];
    const idx = list.findIndex((s: any) => s.id === id);
    if (idx >= 0) {
      const existingName = list[idx].name;
      // Only overwrite an existing good semantic name if the requested name is also a valid semantic name
      const finalName =
        !isPlaceholderOrBadSessionName(requestedName)
          ? requestedName
          : !isPlaceholderOrBadSessionName(existingName)
            ? existingName
            : semanticName;
      list[idx] = { ...list[idx], name: finalName, updatedAt: Date.now() };
      if (store) store.set(userId, list);
      writePersistedSessions(userId, list);
      return NextResponse.json({
        ok: true,
        sessionId: id,
        name: finalName,
      });
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
  const userId = searchParams.get("user_id") || "dev-local-user";

  try {
    const store: Map<string, any[]> | undefined = (globalThis as any).__vyrexo_sessions_store;
    const list = store?.get(userId) || readPersistedSessions(userId) || [];
    const filtered = list.filter((s: any) => s.id !== id);
    if (store) store.set(userId, filtered);
    writePersistedSessions(userId, filtered);
    clearSessionChatHistory(id);
  } catch {}

  return NextResponse.json({
    ok: true,
    sessionId: id,
  });
}
