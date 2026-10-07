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

// Determine persistent data root directory (.data at root level)
function getDataDir(): string {
  const root = process.cwd().endsWith("frontend")
    ? path.resolve(process.cwd(), "..", ".data")
    : path.resolve(process.cwd(), ".data");

  if (!fs.existsSync(root)) {
    try {
      fs.mkdirSync(root, { recursive: true });
    } catch {
      // fallback to local directory if root unwritable
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

const DEFAULT_SESSIONS: SessionRecord[] = [
  {
    id: "session-default-1",
    user_id: "dev-local-user",
    name: "API Service Architecture",
    icon: "🚀",
    createdAt: Date.now() - 1000 * 60 * 45,
    updatedAt: Date.now() - 1000 * 60 * 45,
  },
  {
    id: "session-default-2",
    user_id: "dev-local-user",
    name: "Frontend Components & Orb",
    icon: "⚡",
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24,
  },
];

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
 * Get all sessions for a user, maintaining persistence across app reloads & restarts.
 */
export function getUserSessions(userId: string = "dev-local-user"): SessionRecord[] {
  // Check memory cache
  let userList = memorySessions.get(userId);
  if (!userList) {
    const diskData = readDiskSessions();
    if (diskData[userId] && Array.isArray(diskData[userId])) {
      userList = diskData[userId];
      memorySessions.set(userId, userList);
    }
  }

  // Load tombstones (sessions deleted by the user)
  let tombstones = memoryTombstones.get(userId);
  if (!tombstones) {
    const diskTombstones = readDiskTombstones();
    tombstones = new Set(diskTombstones[userId] || []);
    memoryTombstones.set(userId, tombstones);
  }

  // If user has never had any session records and has never deleted default sessions
  if (!userList || userList.length === 0) {
    const diskData = readDiskSessions();
    if (diskData[userId] && Array.isArray(diskData[userId])) {
      userList = diskData[userId];
    } else if (tombstones.size === 0) {
      // Brand new user: initialize with default sessions and write immediately to disk
      userList = [...DEFAULT_SESSIONS];
      diskData[userId] = userList;
      writeDiskSessions(diskData);
    } else {
      userList = [];
    }
    memorySessions.set(userId, userList);
  }

  // Filter out any tombstoned sessions
  const activeSessions = (userList || []).filter((s) => !tombstones?.has(s.id));
  return [...activeSessions].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

/**
 * Save or update a session record on disk.
 */
export function saveUserSession(userId: string = "dev-local-user", record: SessionRecord): SessionRecord {
  const current = getUserSessions(userId);
  const tombstones = memoryTombstones.get(userId) || new Set<string>();

  // If resurrecting/updating a session, remove from tombstones
  if (tombstones.has(record.id)) {
    tombstones.delete(record.id);
    const diskTombstones = readDiskTombstones();
    diskTombstones[userId] = Array.from(tombstones);
    writeDiskTombstones(diskTombstones);
  }

  const existingIdx = current.findIndex((s) => s.id === record.id);
  const now = Date.now();
  const updatedRecord: SessionRecord = {
    ...record,
    updatedAt: now,
  };

  let nextList: SessionRecord[];
  if (existingIdx >= 0) {
    nextList = [...current];
    nextList[existingIdx] = { ...current[existingIdx], ...updatedRecord };
  } else {
    nextList = [updatedRecord, ...current];
  }

  memorySessions.set(userId, nextList);

  const diskData = readDiskSessions();
  diskData[userId] = nextList;
  writeDiskSessions(diskData);

  return updatedRecord;
}

/**
 * Rename a session by its ID. Updates persistent storage and cache.
 */
export function renameUserSession(sessionId: string, newName: string, userId?: string): SessionRecord | null {
  const cleanName = newName.trim();
  if (!cleanName) return null;

  const diskData = readDiskSessions();

  // If userId provided, check that user first
  const targetUsers = userId ? [userId] : Object.keys(diskData);
  if (!targetUsers.includes("dev-local-user")) {
    targetUsers.push("dev-local-user");
  }

  let foundUser: string | null = null;
  let targetIdx = -1;

  for (const u of targetUsers) {
    const list = diskData[u] || memorySessions.get(u) || [];
    const idx = list.findIndex((s) => s.id === sessionId);
    if (idx >= 0) {
      foundUser = u;
      targetIdx = idx;
      break;
    }
  }

  // Fallback to dev-local-user if not found anywhere else
  if (!foundUser) {
    foundUser = userId || "dev-local-user";
    const userList = getUserSessions(foundUser);
    targetIdx = userList.findIndex((s) => s.id === sessionId);
  }

  const userList = [...(diskData[foundUser] || getUserSessions(foundUser))];
  let updatedRecord: SessionRecord;

  if (targetIdx >= 0) {
    userList[targetIdx] = {
      ...userList[targetIdx],
      name: cleanName,
      updatedAt: Date.now(),
    };
    updatedRecord = userList[targetIdx];
  } else {
    // If session was freshly created in client, register and rename
    updatedRecord = {
      id: sessionId,
      user_id: foundUser,
      name: cleanName,
      icon: "🚀",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    userList.unshift(updatedRecord);
  }

  memorySessions.set(foundUser, userList);
  diskData[foundUser] = userList;
  writeDiskSessions(diskData);

  return updatedRecord;
}

/**
 * Delete a session permanently by its ID, persisting deletion to disk.
 */
export function deleteUserSession(sessionId: string, userId?: string): boolean {
  const diskData = readDiskSessions();
  const diskTombstones = readDiskTombstones();

  const targetUsers = userId ? [userId] : Object.keys(diskData);
  if (!targetUsers.includes("dev-local-user")) {
    targetUsers.push("dev-local-user");
  }

  for (const u of targetUsers) {
    const current = diskData[u] || memorySessions.get(u) || [];
    diskData[u] = current.filter((s) => s.id !== sessionId);
    memorySessions.set(u, diskData[u]);

    // Record tombstone so default sessions are never resurrected
    const tSet = memoryTombstones.get(u) || new Set(diskTombstones[u] || []);
    tSet.add(sessionId);
    memoryTombstones.set(u, tSet);
    diskTombstones[u] = Array.from(tSet);
  }

  writeDiskSessions(diskData);
  writeDiskTombstones(diskTombstones);

  // Delete chat history file on disk
  deleteChatHistory(sessionId);

  return true;
}

/**
 * Clear all sessions for a user.
 */
export function clearAllUserSessions(userId: string = "dev-local-user"): void {
  const current = getUserSessions(userId);
  const diskTombstones = readDiskTombstones();
  const tSet = memoryTombstones.get(userId) || new Set(diskTombstones[userId] || []);

  for (const s of current) {
    tSet.add(s.id);
    deleteChatHistory(s.id);
  }

  memoryTombstones.set(userId, tSet);
  diskTombstones[userId] = Array.from(tSet);
  writeDiskTombstones(diskTombstones);

  memorySessions.set(userId, []);
  const diskData = readDiskSessions();
  diskData[userId] = [];
  writeDiskSessions(diskData);
}

/**
 * Clear sessions older than given days.
 */
export function clearOlderUserSessions(days: number, userId: string = "dev-local-user"): { deletedCount: number; deletedIds: string[] } {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const current = getUserSessions(userId);
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
  const tSet = memoryTombstones.get(userId) || new Set(diskTombstones[userId] || []);
  removedIds.forEach((id) => tSet.add(id));

  memoryTombstones.set(userId, tSet);
  diskTombstones[userId] = Array.from(tSet);
  writeDiskTombstones(diskTombstones);

  memorySessions.set(userId, kept);
  const diskData = readDiskSessions();
  diskData[userId] = kept;
  writeDiskSessions(diskData);

  return { deletedCount: removedIds.length, deletedIds: removedIds };
}

// ── Persistent Chat History ──────────────────────────────────────────────────

function getChatFilePath(sessionId: string): string {
  const safeId = sessionId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(getChatsDir(), `${safeId}.json`);
}

export function getChatHistory(sessionId: string): SessionChatTurn[] {
  // Check memory cache first
  const cached = memoryChats.get(sessionId);
  if (cached && cached.length > 0) return cached;

  // Read from disk
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
  memoryChats.set(sessionId, turns);
  try {
    const fPath = getChatFilePath(sessionId);
    fs.writeFileSync(fPath, JSON.stringify(turns, null, 2), "utf-8");
  } catch (err) {
    console.error(`Failed to save chat history for session ${sessionId}:`, err);
  }
}

export function appendChatTurn(sessionId: string, turn: Omit<SessionChatTurn, "timestamp"> & { timestamp?: number }): void {
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
