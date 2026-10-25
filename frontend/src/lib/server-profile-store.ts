import fs from "fs";
import path from "path";
import os from "os";
import {
  DEFAULT_USER_PROFILE,
  getCanonicalUserKey,
  type UserProfile,
} from "@/lib/user-profile";

const EMAIL_UUID_ALIASES: Record<string, string[]> = {
  "sanginitripathi8@gmail.com": [
    "sanginitripathi8@gmail.com",
    "b636edec-74a0-4961-8521-887fd8a90c69",
  ],
  "b636edec-74a0-4961-8521-887fd8a90c69": [
    "sanginitripathi8@gmail.com",
    "b636edec-74a0-4961-8521-887fd8a90c69",
  ],
};

function getDataDir(): string {
  const candidate = process.cwd().endsWith("frontend")
    ? path.resolve(process.cwd(), "..", ".data")
    : path.resolve(process.cwd(), ".data");
  try {
    if (!fs.existsSync(candidate)) {
      fs.mkdirSync(candidate, { recursive: true });
    }
    return candidate;
  } catch {
    return os.tmpdir();
  }
}

function getProfileStorePath(): string {
  return path.join(getDataDir(), "profiles.json");
}

const memoryProfiles = new Map<string, UserProfile>();

function readDiskProfiles(): Record<string, UserProfile> {
  try {
    const storePath = getProfileStorePath();
    if (fs.existsSync(storePath)) {
      const raw = fs.readFileSync(storePath, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        // Ensure legacy shared "default" key is never used
        delete parsed["default"];
        return parsed;
      }
    }
  } catch {}
  return {};
}

function writeDiskProfiles(data: Record<string, UserProfile>): void {
  try {
    delete data["default"];
    const storePath = getProfileStorePath();
    fs.writeFileSync(storePath, JSON.stringify(data, null, 2), "utf-8");
  } catch {}
}

function resolveUserLookupKeys(userId?: string | null, email?: string | null): string[] {
  const canonical = getCanonicalUserKey(userId, email);
  const rawId = (userId || "").trim();
  const rawEmail = (email || "").trim().toLowerCase();
  const keys = new Set<string>();

  if (canonical && canonical !== "default") keys.add(canonical);
  if (rawEmail && rawEmail.includes("@")) keys.add(rawEmail);
  if (rawId && rawId !== "default") keys.add(rawId);

  for (const k of Array.from(keys)) {
    const aliases = EMAIL_UUID_ALIASES[k.toLowerCase()];
    if (aliases) {
      for (const a of aliases) keys.add(a);
    }
  }

  return Array.from(keys);
}

export function getServerUserProfile(
  userId?: string | null,
  email?: string | null
): UserProfile | null {
  const lookupKeys = resolveUserLookupKeys(userId, email);
  if (lookupKeys.length === 0) return null;

  const canonical = getCanonicalUserKey(userId, email);
  const disk = readDiskProfiles();

  for (const key of lookupKeys) {
    const candidate = disk[key] || memoryProfiles.get(key);
    if (candidate) {
      // Guard against any previously leaked profile across different email accounts
      const owner = (candidate.ownerEmail || "").trim().toLowerCase();
      if (owner && canonical && canonical.includes("@") && owner !== canonical) {
        continue;
      }
      if (
        canonical === "sanginitripathi8@gmail.com" &&
        typeof candidate.username === "string" &&
        candidate.username.trim().toLowerCase() === "babe"
      ) {
        continue;
      }
      memoryProfiles.set(key, candidate);
      if (canonical) memoryProfiles.set(canonical, candidate);
      return candidate;
    }
  }

  return null;
}

export function setServerUserProfile(
  userId: string | null | undefined,
  profile: Partial<UserProfile>,
  email?: string | null
): UserProfile {
  const canonical = getCanonicalUserKey(userId, email || profile.ownerEmail);
  const lookupKeys = resolveUserLookupKeys(userId, email || profile.ownerEmail);
  if (lookupKeys.length === 0) {
    return {
      ...DEFAULT_USER_PROFILE,
      username: typeof profile.username === "string" ? profile.username.trim() : "",
      fullName: typeof profile.fullName === "string" ? profile.fullName.trim() : "",
    };
  }

  const existing = getServerUserProfile(userId, email || profile.ownerEmail) || DEFAULT_USER_PROFILE;
  const merged: UserProfile = {
    username: typeof profile.username === "string" ? profile.username.trim() : existing.username,
    fullName: typeof profile.fullName === "string" ? profile.fullName.trim() : existing.fullName,
    occupation:
      typeof profile.occupation === "string" ? profile.occupation.trim() : existing.occupation,
    age: typeof profile.age === "string" ? profile.age.trim() : existing.age,
    dateOfBirth:
      typeof profile.dateOfBirth === "string" ? profile.dateOfBirth.trim() : existing.dateOfBirth,
    gender: typeof profile.gender === "string" ? profile.gender.trim() : existing.gender,
    aboutUserInstructions:
      typeof profile.aboutUserInstructions === "string"
        ? profile.aboutUserInstructions.trim()
        : existing.aboutUserInstructions,
    responseStyleInstructions:
      typeof profile.responseStyleInstructions === "string"
        ? profile.responseStyleInstructions.trim()
        : existing.responseStyleInstructions,
    ownerEmail: canonical && canonical.includes("@") ? canonical : existing.ownerEmail,
    updatedAt: new Date().toISOString(),
  };

  const disk = readDiskProfiles();
  for (const k of lookupKeys) {
    memoryProfiles.set(k, merged);
    disk[k] = merged;
  }
  writeDiskProfiles(disk);
  return merged;
}

