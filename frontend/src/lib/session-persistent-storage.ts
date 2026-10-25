import fs from "fs";
import path from "path";

export interface SessionRecord {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  createdAt: number;
  updatedAt?: number;
}

export interface SessionChatTurn {
  role: "user" | "assistant";
  text: string;
  images?: string[];
  docs?: string[];
  timestamp: number;
}

// Legacy pre-seeded or test session IDs that must never be assigned to users
const BLOCKED_LEGACY_SESSION_IDS = new Set([
  "session-1790005321834",
  "session-default-1",
  "session-default-2",
  "default",
  "test-session",
  "test-session-1",
  "test-session-finance",
  "test-session-flight",
  "railgo-train-booking",
]);

// Known development UUID <-> canonical email primary key mappings
const USER_IDENTITY_ALIASES: Record<string, string[]> = {
  "sanginitripathi8@gmail.com": [
    "sanginitripathi8@gmail.com",
    "b636edec-74a0-4961-8521-887fd8a90c69",
  ],
  "b636edec-74a0-4961-8521-887fd8a90c69": [
    "sanginitripathi8@gmail.com",
    "b636edec-74a0-4961-8521-887fd8a90c69",
  ],
};

export function normalizeUserPrimaryKey(
  userId?: string | null,
  email?: string | null
): string {
  const cleanEmail = (email || "").trim().toLowerCase();
  if (cleanEmail && cleanEmail.includes("@")) {
    return cleanEmail;
  }
  const cleanId = (userId || "").trim();
  if (!cleanId || cleanId === "default") return "";
  const lowerId = cleanId.toLowerCase();
  if (lowerId.includes("@")) return lowerId;
  if (lowerId === "b636edec-74a0-4961-8521-887fd8a90c69") {
    return "sanginitripathi8@gmail.com";
  }
  return cleanId;
}

export function getUserIdentityAliases(
  userId?: string | null,
  email?: string | null
): string[] {
  const canonical = normalizeUserPrimaryKey(userId, email);
  const rawId = (userId || "").trim();
  const rawEmail = (email || "").trim().toLowerCase();
  const set = new Set<string>();

  if (canonical) set.add(canonical);
  if (rawEmail && rawEmail.includes("@")) set.add(rawEmail);
  if (rawId && rawId !== "default") set.add(rawId);

  for (const k of Array.from(set)) {
    const mapped = USER_IDENTITY_ALIASES[k.toLowerCase()];
    if (mapped) {
      for (const a of mapped) set.add(a);
    }
  }

  return Array.from(set);
}

export function areSameUserIdentity(
  userA?: string | null,
  userB?: string | null
): boolean {
  if (!userA || !userB) return false;
  const trimA = userA.trim();
  const trimB = userB.trim();
  if (!trimA || !trimB) return false;
  if (trimA.toLowerCase() === trimB.toLowerCase()) return true;

  const aliasesA = getUserIdentityAliases(trimA);
  const lowerB = trimB.toLowerCase();
  return aliasesA.some((a) => a.toLowerCase() === lowerB);
}

export function isBlockedLegacySessionId(sessionId?: string | null): boolean {
  if (!sessionId) return true;
  return BLOCKED_LEGACY_SESSION_IDS.has(sessionId);
}

// Determine persistent data root directory (.data at root level)
function getDataDir(): string {
  const root = process.cwd().endsWith("frontend")
    ? path.resolve(process.cwd(), "..", ".data")
    : path.resolve(process.cwd(), ".data");

  if (!fs.existsSync(root)) {
    try {
      fs.mkdirSync(root, { recursive: true });
    } catch {
      return path.resolve(process.cwd(), ".data");
    }
  }
  return root;
}

function getChatsDir(): string {
  const cDir = path.join(getDataDir(), "chats");
  if (!fs.existsSync(cDir)) {
    try {
      fs.mkdirSync(cDir, { recursive: true });
    } catch {}
  }
  return cDir;
}

// In-memory cache for ultra-fast access, backed by disk
const memorySessions = new Map<string, SessionRecord[]>();
const memoryTombstones = new Map<string, Set<string>>();
const memoryChats = new Map<string, SessionChatTurn[]>();

function readDiskSessions(): Record<string, SessionRecord[]> {
  try {
    const fPath = path.join(getDataDir(), "sessions.json");
    if (fs.existsSync(fPath)) {
      const data = JSON.parse(fs.readFileSync(fPath, "utf-8"));
      if (typeof data === "object" && data !== null) {
        return data;
      }
    }
  } catch {}
  return {};
}

function writeDiskSessions(data: Record<string, SessionRecord[]>): void {
  try {
    const fPath = path.join(getDataDir(), "sessions.json");
    fs.writeFileSync(fPath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write sessions.json:", err);
  }
}

function readDiskTombstones(): Record<string, string[]> {
  try {
    const fPath = path.join(getDataDir(), "deleted_sessions.json");
    if (fs.existsSync(fPath)) {
      const data = JSON.parse(fs.readFileSync(fPath, "utf-8"));
      if (typeof data === "object" && data !== null) {
        return data;
      }
    }
  } catch {}
  return {};
}

function writeDiskTombstones(data: Record<string, string[]>): void {
  try {
    const fPath = path.join(getDataDir(), "deleted_sessions.json");
    fs.writeFileSync(fPath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write deleted_sessions.json:", err);
  }
}

/**
 * Returns the canonical user_id that owns a given sessionId, or null if no user owns it.
 */
export function getSessionOwner(sessionId: string): string | null {
  if (!sessionId || isBlockedLegacySessionId(sessionId)) return null;

  for (const [uid, list] of Array.from(memorySessions.entries())) {
    if (Array.isArray(list) && list.some((s) => s.id === sessionId)) {
      return normalizeUserPrimaryKey(uid) || uid;
    }
  }

  const diskData = readDiskSessions();
  for (const [uid, list] of Object.entries(diskData)) {
    if (Array.isArray(list) && list.some((s) => s.id === sessionId)) {
      return normalizeUserPrimaryKey(uid) || uid;
    }
  }

  const globalStore: Map<string, SessionRecord[]> | undefined = (globalThis as any).__vyrexo_sessions_store;
  if (globalStore) {
    for (const [uid, list] of Array.from(globalStore.entries())) {
      if (Array.isArray(list) && list.some((s) => s.id === sessionId)) {
        return normalizeUserPrimaryKey(uid) || uid;
      }
    }
  }

  return null;
}

/**
 * Checks whether the given userId is allowed to access or modify the given sessionId.
 * - Blocked legacy/demo session IDs are always denied.
 * - If the session is already owned by another user, access is strictly denied.
 */
export function canUserAccessSession(
  sessionId: string,
  userId?: string | null,
  requireExistingOwnership = false
): boolean {
  if (!sessionId || isBlockedLegacySessionId(sessionId)) return false;
  if (!userId) return false;

  const owner = getSessionOwner(sessionId);
  if (owner) {
    return areSameUserIdentity(owner, userId);
  }

  return !requireExistingOwnership;
}

/**
 * Get all sessions strictly created by and assigned to `userId` (and its canonical email/UUID aliases).
 * Brand-new users always receive an empty list `[]`.
 */
export function getUserSessions(userId?: string | null, email?: string | null): SessionRecord[] {
  const aliases = getUserIdentityAliases(userId, email);
  if (aliases.length === 0) return [];
  const canonical = normalizeUserPrimaryKey(userId, email) || aliases[0];

  const diskData = readDiskSessions();
  const diskTombstones = readDiskTombstones();

  const combinedTombstones = new Set<string>();
  for (const key of aliases) {
    const memT = memoryTombstones.get(key);
    if (memT) memT.forEach((id) => combinedTombstones.add(id));
    const dT = diskTombstones[key];
    if (Array.isArray(dT)) dT.forEach((id) => combinedTombstones.add(id));
  }
  memoryTombstones.set(canonical, combinedTombstones);

  const seenIds = new Set<string>();
  const mergedList: SessionRecord[] = [];

  for (const key of aliases) {
    const memList = memorySessions.get(key);
    const dList = diskData[key];
    const sourceList = Array.isArray(memList) && memList.length > 0 ? memList : Array.isArray(dList) ? dList : [];
    for (const s of sourceList) {
      if (
        s &&
        s.id &&
        !seenIds.has(s.id) &&
        !isBlockedLegacySessionId(s.id) &&
        (!s.user_id || areSameUserIdentity(s.user_id, canonical)) &&
        !combinedTombstones.has(s.id)
      ) {
        seenIds.add(s.id);
        mergedList.push({
          ...s,
          user_id: canonical,
        });
      }
    }
  }

  const sorted = mergedList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  for (const key of aliases) {
    memorySessions.set(key, sorted);
  }
  return sorted;
}

/**
 * Save or update a session record on disk, enforcing strict user ownership.
 */
export function saveUserSession(userId: string, record: SessionRecord, email?: string | null): SessionRecord | null {
  const aliases = getUserIdentityAliases(userId, email);
  if (aliases.length === 0 || !record?.id || isBlockedLegacySessionId(record.id)) return null;
  const canonical = normalizeUserPrimaryKey(userId, email) || aliases[0];

  const existingOwner = getSessionOwner(record.id);
  if (existingOwner && !areSameUserIdentity(existingOwner, canonical)) {
    return null;
  }

  const current = getUserSessions(canonical, email);
  const tombstones = memoryTombstones.get(canonical) || new Set<string>();

  if (tombstones.has(record.id)) {
    tombstones.delete(record.id);
    const diskTombstones = readDiskTombstones();
    for (const key of aliases) {
      diskTombstones[key] = Array.from(tombstones);
      memoryTombstones.set(key, tombstones);
    }
    writeDiskTombstones(diskTombstones);
  }

  const existingIdx = current.findIndex((s) => s.id === record.id);
  const now = Date.now();
  const updatedRecord: SessionRecord = {
    ...record,
    user_id: canonical,
    updatedAt: now,
  };

  let nextList: SessionRecord[];
  if (existingIdx >= 0) {
    nextList = [...current];
    nextList[existingIdx] = { ...current[existingIdx], ...updatedRecord };
  } else {
    nextList = [updatedRecord, ...current];
  }

  const diskData = readDiskSessions();
  for (const key of aliases) {
    memorySessions.set(key, nextList);
    diskData[key] = nextList;
  }
  writeDiskSessions(diskData);

  return updatedRecord;
}

/**
 * Rename a session by its ID, strictly scoped to `userId`.
 */
export function renameUserSession(sessionId: string, newName: string, userId?: string): SessionRecord | null {
  const cleanName = newName.trim();
  const aliases = getUserIdentityAliases(userId);
  if (!cleanName || aliases.length === 0 || isBlockedLegacySessionId(sessionId)) return null;
  const canonical = normalizeUserPrimaryKey(userId) || aliases[0];

  const existingOwner = getSessionOwner(sessionId);
  if (existingOwner && !areSameUserIdentity(existingOwner, canonical)) {
    return null;
  }

  const diskData = readDiskSessions();
  const userList = [...getUserSessions(canonical)];
  const targetIdx = userList.findIndex((s) => s.id === sessionId);
  let updatedRecord: SessionRecord;

  if (targetIdx >= 0) {
    userList[targetIdx] = {
      ...userList[targetIdx],
      user_id: canonical,
      name: cleanName,
      updatedAt: Date.now(),
    };
    updatedRecord = userList[targetIdx];
  } else {
    updatedRecord = {
      id: sessionId,
      user_id: canonical,
      name: cleanName,
      icon: "🚀",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    userList.unshift(updatedRecord);
  }

  for (const key of aliases) {
    memorySessions.set(key, userList);
    diskData[key] = userList;
  }
  writeDiskSessions(diskData);

  return updatedRecord;
}

/**
 * Delete a session permanently by its ID, strictly scoped to `userId`.
 */
export function deleteUserSession(sessionId: string, userId?: string): boolean {
  const aliases = getUserIdentityAliases(userId);
  if (aliases.length === 0 || !sessionId) return false;
  const canonical = normalizeUserPrimaryKey(userId) || aliases[0];

  const existingOwner = getSessionOwner(sessionId);
  if (existingOwner && !areSameUserIdentity(existingOwner, canonical)) {
    return false;
  }

  const diskData = readDiskSessions();
  const diskTombstones = readDiskTombstones();
  const current = getUserSessions(canonical).filter((s) => s.id !== sessionId);

  const tSet = memoryTombstones.get(canonical) || new Set(diskTombstones[canonical] || []);
  tSet.add(sessionId);

  for (const key of aliases) {
    diskData[key] = current;
    memorySessions.set(key, current);
    memoryTombstones.set(key, tSet);
    diskTombstones[key] = Array.from(tSet);
  }

  writeDiskSessions(diskData);
  writeDiskTombstones(diskTombstones);

  deleteChatHistory(sessionId);

  return true;
}

/**
 * Clear all sessions strictly for the specified user (never touches other users' sessions).
 */
export function clearAllUserSessions(userId: string): void {
  const aliases = getUserIdentityAliases(userId);
  if (aliases.length === 0) return;
  const canonical = normalizeUserPrimaryKey(userId) || aliases[0];
  const current = getUserSessions(canonical);
  const diskTombstones = readDiskTombstones();
  const tSet = memoryTombstones.get(canonical) || new Set(diskTombstones[canonical] || []);

  for (const s of current) {
    tSet.add(s.id);
    deleteChatHistory(s.id);
  }

  const diskData = readDiskSessions();
  for (const key of aliases) {
    memoryTombstones.set(key, tSet);
    diskTombstones[key] = Array.from(tSet);
    memorySessions.set(key, []);
    diskData[key] = [];
  }
  writeDiskTombstones(diskTombstones);
  writeDiskSessions(diskData);
}

/**
 * Clear sessions older than given days for a specific user.
 */
export function clearOlderUserSessions(days: number, userId: string): { deletedCount: number; deletedIds: string[] } {
  const aliases = getUserIdentityAliases(userId);
  if (aliases.length === 0) return { deletedCount: 0, deletedIds: [] };
  const canonical = normalizeUserPrimaryKey(userId) || aliases[0];
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const current = getUserSessions(canonical);
  const kept: SessionRecord[] = [];
  const removedIds: string[] = [];

  for (const s of current) {
    if ((s.createdAt || 0) < cutoff) {
      removedIds.push(s.id);
      deleteChatHistory(s.id);
    } else {
      kept.push(s);
    }
  }

  const diskTombstones = readDiskTombstones();
  const tSet = memoryTombstones.get(canonical) || new Set(diskTombstones[canonical] || []);
  removedIds.forEach((id) => tSet.add(id));

  const diskData = readDiskSessions();
  for (const key of aliases) {
    memoryTombstones.set(key, tSet);
    diskTombstones[key] = Array.from(tSet);
    memorySessions.set(key, kept);
    diskData[key] = kept;
  }
  writeDiskTombstones(diskTombstones);
  writeDiskSessions(diskData);

  return { deletedCount: removedIds.length, deletedIds: removedIds };
}

// ── Persistent Chat History ──────────────────────────────────────────────────

function getChatFilePath(sessionId: string): string {
  const safeId = sessionId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(getChatsDir(), `${safeId}.json`);
}

export function getChatHistory(sessionId: string): SessionChatTurn[] {
  if (!sessionId || isBlockedLegacySessionId(sessionId)) return [];

  const cached = memoryChats.get(sessionId);
  if (cached && cached.length > 0) return cached;

  const fPath = getChatFilePath(sessionId);
  if (fs.existsSync(fPath)) {
    try {
      const raw = fs.readFileSync(fPath, "utf-8");
      const turns = JSON.parse(raw);
      if (Array.isArray(turns)) {
        memoryChats.set(sessionId, turns);
        return turns;
      }
    } catch {}
  }

  return [];
}

export function saveChatHistory(sessionId: string, turns: SessionChatTurn[]): void {
  if (!sessionId || isBlockedLegacySessionId(sessionId)) return;
  memoryChats.set(sessionId, turns);
  try {
    const fPath = getChatFilePath(sessionId);
    fs.writeFileSync(fPath, JSON.stringify(turns, null, 2), "utf-8");
  } catch (err) {
    console.error(`Failed to save chat history for session ${sessionId}:`, err);
  }
}

export function appendChatTurn(sessionId: string, turn: Omit<SessionChatTurn, "timestamp"> & { timestamp?: number }): void {
  if (!sessionId || isBlockedLegacySessionId(sessionId)) return;
  const current = getChatHistory(sessionId);
  const newTurn: SessionChatTurn = {
    role: turn.role,
    text: turn.text,
    images: turn.images,
    docs: turn.docs,
    timestamp: turn.timestamp || Date.now(),
  };
  const updated = [...current, newTurn];
  saveChatHistory(sessionId, updated);
}

export function deleteChatHistory(sessionId: string): void {
  memoryChats.delete(sessionId);
  try {
    const fPath = getChatFilePath(sessionId);
    if (fs.existsSync(fPath)) {
      fs.unlinkSync(fPath);
    }
  } catch {}
}

// ── Compatibility Exports for Session & Chat Persistence ─────────────────────

export function readPersistedSessions(userId: string, email?: string | null): SessionRecord[] {
  return getUserSessions(userId, email);
}

export function writePersistedSessions(
  userId: string,
  sessions: SessionRecord[],
  email?: string | null
): void {
  const aliases = getUserIdentityAliases(userId, email);
  if (aliases.length === 0) return;
  const canonical = normalizeUserPrimaryKey(userId, email) || aliases[0];
  const sanitized = sessions
    .filter((s) => s && s.id && !isBlockedLegacySessionId(s.id))
    .map((s) => ({ ...s, user_id: canonical }));

  const diskData = readDiskSessions();
  for (const key of aliases) {
    memorySessions.set(key, sanitized);
    diskData[key] = sanitized;
  }
  writeDiskSessions(diskData);
}

export function findPersistedSessionById(sessionId: string): SessionRecord | null {
  if (!sessionId || isBlockedLegacySessionId(sessionId)) return null;
  const diskData = readDiskSessions();
  for (const list of Object.values(diskData)) {
    if (Array.isArray(list)) {
      const found = list.find((s) => s.id === sessionId);
      if (found) return found;
    }
  }
  for (const list of Array.from(memorySessions.values())) {
    const found = list.find((s) => s.id === sessionId);
    if (found) return found;
  }
  return null;
}

export function readPersistedHistories(): Record<string, SessionChatTurn[]> {
  const result: Record<string, SessionChatTurn[]> = {};
  try {
    const dir = getChatsDir();
    if (fs.existsSync(dir)) {
      const entries = fs.readdirSync(dir);
      for (const entry of entries) {
        if (entry.endsWith(".json")) {
          const sid = entry.slice(0, -5);
          if (isBlockedLegacySessionId(sid)) continue;
          try {
            const raw = fs.readFileSync(path.join(dir, entry), "utf-8");
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              result[sid] = parsed;
            }
          } catch {}
        }
      }
    }
  } catch {}
  return result;
}

export function writePersistedHistory(sessionId: string, turns: SessionChatTurn[]): void {
  saveChatHistory(sessionId, turns);
}

export function deletePersistedHistory(sessionId: string): void {
  deleteChatHistory(sessionId);
}

export function clearAllPersistedHistories(): void {
  memoryChats.clear();
  try {
    const dir = getChatsDir();
    if (fs.existsSync(dir)) {
      for (const entry of fs.readdirSync(dir)) {
        if (entry.endsWith(".json")) {
          try {
            fs.unlinkSync(path.join(dir, entry));
          } catch {}
        }
      }
    }
  } catch {}
}
