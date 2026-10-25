import fs from "fs";
import path from "path";
import os from "os";
import { DEFAULT_USER_PROFILE, type UserProfile } from "@/lib/user-profile";

const PROFILE_STORE_PATH = path.join(os.tmpdir(), "vyrexo-user-profiles.json");

const memoryProfiles = new Map<string, UserProfile>();

function readDiskProfiles(): Record<string, UserProfile> {
  try {
    if (fs.existsSync(PROFILE_STORE_PATH)) {
      const raw = fs.readFileSync(PROFILE_STORE_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    }
  } catch {}
  return {};
}

function writeDiskProfiles(data: Record<string, UserProfile>): void {
  try {
    fs.writeFileSync(PROFILE_STORE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch {}
}

export function getServerUserProfile(userId?: string | null): UserProfile | null {
  const key = (userId || "default").trim() || "default";
  const disk = readDiskProfiles();
  if (disk[key]) {
    memoryProfiles.set(key, disk[key]);
    return disk[key];
  }
  if (memoryProfiles.has(key)) {
    return memoryProfiles.get(key) || null;
  }
  if (disk["default"]) {
    return disk["default"];
  }
  return null;
}

export function setServerUserProfile(
  userId: string | null | undefined,
  profile: Partial<UserProfile>
): UserProfile {
  const key = (userId || "default").trim() || "default";
  const existing = getServerUserProfile(key) || DEFAULT_USER_PROFILE;
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
    updatedAt: new Date().toISOString(),
  };

  memoryProfiles.set(key, merged);
  memoryProfiles.set("default", merged);
  const disk = readDiskProfiles();
  disk[key] = merged;
  disk["default"] = merged;
  writeDiskProfiles(disk);
  return merged;
}
