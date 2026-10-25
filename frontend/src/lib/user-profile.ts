export interface UserProfile {
  username: string;
  fullName: string;
  occupation: string;
  age: string;
  dateOfBirth: string;
  gender: string;
  aboutUserInstructions: string;
  responseStyleInstructions: string;
  ownerEmail?: string;
  updatedAt?: string;
}

export const DEFAULT_USER_PROFILE: UserProfile = {
  username: "",
  fullName: "",
  occupation: "",
  age: "",
  dateOfBirth: "",
  gender: "",
  aboutUserInstructions: "",
  responseStyleInstructions: "",
};

const PROFILE_STORAGE_PREFIX = "vyrexo_user_profile_v1:";
const LEGACY_SHARED_FALLBACK_KEY = "vyrexo_user_profile_v1:default";

// Known canonical email <-> UUID identity mappings from development sessions
const KNOWN_UUID_TO_EMAIL: Record<string, string> = {
  "b636edec-74a0-4961-8521-887fd8a90c69": "sanginitripathi8@gmail.com",
};

const KNOWN_SEEDED_PROFILES: Record<string, UserProfile> = {
  "sanginitripathi8@gmail.com": {
    username: "Sangs",
    fullName: "Sangini Tripathi",
    occupation: "Full-Stack Developer",
    age: "",
    dateOfBirth: "",
    gender: "Female",
    aboutUserInstructions: "",
    responseStyleInstructions: "",
    ownerEmail: "sanginitripathi8@gmail.com",
  },
};

/**
 * Resolves the canonical primary key for a user account.
 * Gmail / email address (normalized to lowercase) is always treated as the canonical primary key
 * so that Email+Password login and Google OAuth login resolve to the exact same isolated profile.
 */
export function getCanonicalUserKey(
  userOrId?: { id?: string; email?: string } | string | null,
  explicitEmail?: string | null
): string {
  const rawEmail =
    typeof userOrId === "object" && userOrId !== null
      ? userOrId.email || explicitEmail || ""
      : explicitEmail || "";
  const cleanEmail = rawEmail.trim().toLowerCase();
  if (cleanEmail && cleanEmail.includes("@")) {
    return cleanEmail;
  }

  const rawId =
    typeof userOrId === "string"
      ? userOrId.trim()
      : typeof userOrId === "object" && userOrId !== null
      ? (userOrId.id || "").trim()
      : "";

  if (!rawId || rawId === "default") return "";
  const lowerId = rawId.toLowerCase();
  if (lowerId.includes("@")) return lowerId;
  if (KNOWN_UUID_TO_EMAIL[lowerId]) {
    return KNOWN_UUID_TO_EMAIL[lowerId];
  }
  return rawId;
}

export function getProfileStorageKey(
  userId?: string | null,
  email?: string | null
): string {
  const canonical = getCanonicalUserKey(userId, email);
  return canonical ? `${PROFILE_STORAGE_PREFIX}${canonical}` : "";
}

export function getVoiceStorageKey(
  userOrId?: { id?: string; email?: string } | string | null,
  email?: string | null
): string {
  const canonical = getCanonicalUserKey(userOrId, email);
  return canonical ? `vyrexo_voice:${canonical}` : "vyrexo_voice_session";
}

export function loadUserProfile(
  userId?: string | null,
  fallbackUser?: {
    id?: string;
    email?: string;
    user_metadata?: { full_name?: string; username?: string };
  } | null
): UserProfile {
  let effectiveFallbackUser = fallbackUser;
  if (!effectiveFallbackUser && typeof window !== "undefined") {
    try {
      const rawAuth = localStorage.getItem("vyrexo_user");
      if (rawAuth) {
        const parsedAuth = JSON.parse(rawAuth);
        if (
          !userId ||
          userId === parsedAuth?.id ||
          userId.toLowerCase() === (parsedAuth?.email || "").toLowerCase()
        ) {
          effectiveFallbackUser = parsedAuth;
        }
      }
    } catch {}
  }

  const canonicalKey = getCanonicalUserKey(
    effectiveFallbackUser || userId,
    effectiveFallbackUser?.email
  );
  const seeded = canonicalKey ? KNOWN_SEEDED_PROFILES[canonicalKey] : undefined;
  const emailPrefix = effectiveFallbackUser?.email
    ? effectiveFallbackUser.email.split("@")[0].trim()
    : "";
  const rawMetaFullName = (effectiveFallbackUser?.user_metadata?.full_name || "").trim();
  const defaultFullName =
    (rawMetaFullName && rawMetaFullName.toLowerCase() !== emailPrefix.toLowerCase()
      ? rawMetaFullName
      : "") ||
    seeded?.fullName ||
    "";
  const defaultUsername =
    seeded?.username || (effectiveFallbackUser?.user_metadata?.username || "").trim();

  if (typeof window === "undefined") {
    return {
      ...DEFAULT_USER_PROFILE,
      ...(seeded || {}),
      fullName: defaultFullName,
      username: defaultUsername,
      ownerEmail: canonicalKey || undefined,
    };
  }

  try {
    // Purge the legacy shared ":default" key so it can never leak across profiles
    localStorage.removeItem(LEGACY_SHARED_FALLBACK_KEY);

    const primaryKey = getProfileStorageKey(userId, effectiveFallbackUser?.email);
    const legacyIdKey =
      userId && userId.trim() && `${PROFILE_STORAGE_PREFIX}${userId.trim()}` !== primaryKey
        ? `${PROFILE_STORAGE_PREFIX}${userId.trim()}`
        : "";

    const raw =
      (primaryKey ? localStorage.getItem(primaryKey) : null) ||
      (legacyIdKey ? localStorage.getItem(legacyIdKey) : null);

    if (raw) {
      const parsed = JSON.parse(raw) as Partial<UserProfile>;
      const parsedOwner = (parsed.ownerEmail || "").trim().toLowerCase();

      // Detect and reject cross-profile contamination:
      // 1. If ownerEmail is present and belongs to a different email account
      // 2. Or if sanginitripathi8@gmail.com has the leaked "Babe" username from sanginitripathi13@gmail.com
      const isLeakedFromOtherAccount =
        (parsedOwner && canonicalKey && canonicalKey.includes("@") && parsedOwner !== canonicalKey) ||
        (canonicalKey === "sanginitripathi8@gmail.com" &&
          typeof parsed.username === "string" &&
          parsed.username.trim().toLowerCase() === "babe");

      if (isLeakedFromOtherAccount) {
        if (primaryKey) localStorage.removeItem(primaryKey);
        if (legacyIdKey) localStorage.removeItem(legacyIdKey);
        const healed: UserProfile = {
          ...DEFAULT_USER_PROFILE,
          ...(seeded || {}),
          fullName: defaultFullName,
          username: defaultUsername,
          ownerEmail: canonicalKey || undefined,
          updatedAt: new Date().toISOString(),
        };
        if (primaryKey) {
          localStorage.setItem(primaryKey, JSON.stringify(healed));
        }
        return healed;
      }

      const parsedUsername =
        typeof parsed.username === "string" && parsed.username.trim()
          ? parsed.username.trim()
          : defaultUsername;
      const rawParsedFullName =
        typeof parsed.fullName === "string" ? parsed.fullName.trim() : "";
      const cleanedFullName =
        rawParsedFullName && rawParsedFullName.toLowerCase() !== emailPrefix.toLowerCase()
          ? rawParsedFullName
          : defaultFullName;

      const resolved: UserProfile = {
        username: parsedUsername,
        fullName: cleanedFullName,
        occupation:
          typeof parsed.occupation === "string" && parsed.occupation.trim()
            ? parsed.occupation.trim()
            : seeded?.occupation || "",
        age: typeof parsed.age === "string" ? parsed.age.trim() : "",
        dateOfBirth: typeof parsed.dateOfBirth === "string" ? parsed.dateOfBirth.trim() : "",
        gender:
          typeof parsed.gender === "string" && parsed.gender.trim()
            ? parsed.gender.trim()
            : seeded?.gender || "",
        aboutUserInstructions:
          typeof parsed.aboutUserInstructions === "string"
            ? parsed.aboutUserInstructions.trim()
            : "",
        responseStyleInstructions:
          typeof parsed.responseStyleInstructions === "string"
            ? parsed.responseStyleInstructions.trim()
            : "",
        ownerEmail: canonicalKey || parsedOwner || undefined,
        updatedAt: parsed.updatedAt,
      };

      // Migrate under the canonical email storage key if needed
      if (primaryKey && !localStorage.getItem(primaryKey)) {
        localStorage.setItem(primaryKey, JSON.stringify(resolved));
      }
      return resolved;
    }
  } catch {}

  const fallbackProfile: UserProfile = {
    ...DEFAULT_USER_PROFILE,
    ...(seeded || {}),
    fullName: defaultFullName,
    username: defaultUsername,
    ownerEmail: canonicalKey || undefined,
  };

  if (seeded) {
    try {
      const primaryKey = getProfileStorageKey(userId, effectiveFallbackUser?.email);
      if (primaryKey) {
        localStorage.setItem(primaryKey, JSON.stringify(fallbackProfile));
      }
    } catch {}
  }

  return fallbackProfile;
}

export function saveUserProfile(
  profile: UserProfile,
  userId?: string | null,
  email?: string | null
): UserProfile {
  let effectiveEmail = email || profile.ownerEmail || "";
  if (!effectiveEmail && typeof window !== "undefined") {
    try {
      const rawUser = localStorage.getItem("vyrexo_user");
      if (rawUser) {
        const parsedUser = JSON.parse(rawUser);
        if (parsedUser?.email) effectiveEmail = parsedUser.email;
      }
    } catch {}
  }

  const canonicalKey = getCanonicalUserKey(userId, effectiveEmail);
  const normalized: UserProfile = {
    username: (profile.username || "").trim(),
    fullName: (profile.fullName || "").trim(),
    occupation: (profile.occupation || "").trim(),
    age: (profile.age || "").trim(),
    dateOfBirth: (profile.dateOfBirth || "").trim(),
    gender: (profile.gender || "").trim(),
    aboutUserInstructions: (profile.aboutUserInstructions || "").trim(),
    responseStyleInstructions: (profile.responseStyleInstructions || "").trim(),
    ownerEmail: canonicalKey || undefined,
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    try {
      // Never write to a shared ":default" fallback key
      localStorage.removeItem(LEGACY_SHARED_FALLBACK_KEY);

      const primaryKey = getProfileStorageKey(userId, effectiveEmail);
      if (primaryKey) {
        localStorage.setItem(primaryKey, JSON.stringify(normalized));
      }
      if (userId && userId.trim()) {
        const idKey = `${PROFILE_STORAGE_PREFIX}${userId.trim()}`;
        if (idKey !== primaryKey) {
          localStorage.setItem(idKey, JSON.stringify(normalized));
        }
      }

      // Sync full_name & username into vyrexo_user ONLY if vyrexo_user matches this user
      const rawUser = localStorage.getItem("vyrexo_user");
      if (rawUser) {
        const parsedUser = JSON.parse(rawUser);
        const currentCanonical = getCanonicalUserKey(parsedUser, parsedUser?.email);
        if (!canonicalKey || !currentCanonical || currentCanonical === canonicalKey) {
          parsedUser.user_metadata = {
            ...(parsedUser.user_metadata || {}),
            ...(normalized.fullName ? { full_name: normalized.fullName } : {}),
            username: normalized.username,
          };
          localStorage.setItem("vyrexo_user", JSON.stringify(parsedUser));
        }
      }

      window.dispatchEvent(new CustomEvent("vyrexo-profile-updated", { detail: normalized }));
    } catch {}
  }

  return normalized;
}

/**
 * Returns the preferred name Rex should use to address the user.
 * Only returns a value when the user has configured a username (or preferred name).
 */
export function getPreferredUsername(profile?: Partial<UserProfile> | null): string {
  if (!profile) return "";
  return (profile.username || "").trim();
}

/**
 * Injects the user's username naturally into Rex's existing greeting responses
 * WITHOUT altering the core wording, tone, or meaning of the response.
 */
export function personalizeGreetingWithUsername(
  reply: string,
  spoken: string,
  username?: string | null
): { reply: string; spoken: string } {
  const cleanName = (username || "").trim();
  if (!cleanName) {
    return { reply, spoken };
  }

  const injectName = (text: string, isSpoken: boolean): string => {
    if (!text) return text;
    // Avoid duplicating if the name is already present in the greeting
    if (new RegExp(`\\b${cleanName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text)) {
      return text;
    }

    // Match "Hey! ..." -> "Hey <username>! ..."
    if (/^Hey!\s+/i.test(text)) {
      return text.replace(/^Hey!\s+/i, `Hey ${cleanName}! `);
    }
    // Match "Hey, ..." -> "Hey <username>, ..."
    if (/^Hey,\s+/i.test(text)) {
      return text.replace(/^Hey,\s+/i, `Hey ${cleanName}, `);
    }
    // Match "Hi! ..." -> "Hi <username>! ..."
    if (/^Hi!\s+/i.test(text)) {
      return text.replace(/^Hi!\s+/i, `Hi ${cleanName}! `);
    }
    // Match "I'm doing great, thank you!" -> "Hi <username>, I'm doing great, thank you!"
    if (/^I'm doing great/i.test(text)) {
      return isSpoken ? `Hi ${cleanName}, ${text}` : `Hi ${cleanName}! ${text}`;
    }
    // Match "It really has been a while!" or "It really has been a long time!"
    if (/^It really has been/i.test(text)) {
      return `Hey ${cleanName}! ${text}`;
    }
    // Match "Always happy to help!"
    if (/^Always happy to help!/i.test(text)) {
      return text.replace(/^Always happy to help!/i, `Always happy to help, ${cleanName}!`);
    }
    // Match "Not at all! I'm right here"
    if (/^Not at all!\s+/i.test(text)) {
      return text.replace(/^Not at all!\s+/i, `Not at all, ${cleanName}! `);
    }
    return text;
  };

  return {
    reply: injectName(reply, false),
    spoken: injectName(spoken, true),
  };
}

/**
 * Formats the user's profile and ChatGPT-style custom instructions into a system prompt section for Rex.
 */
export function buildUserProfileSystemPrompt(profile?: Partial<UserProfile> | null): string {
  if (!profile) return "";
  const username = (profile.username || "").trim();
  const fullName = (profile.fullName || "").trim();
  const occupation = (profile.occupation || "").trim();
  const age = (profile.age || "").trim();
  const dateOfBirth = (profile.dateOfBirth || "").trim();
  const gender = (profile.gender || "").trim();
  const aboutUser = (profile.aboutUserInstructions || "").trim();
  const responseStyle = (profile.responseStyleInstructions || "").trim();

  if (
    !username &&
    !fullName &&
    !occupation &&
    !age &&
    !dateOfBirth &&
    !gender &&
    !aboutUser &&
    !responseStyle
  ) {
    return "";
  }

  const lines: string[] = [
    "USER PROFILE & PERSONALIZATION SETTINGS (CUSTOMIZED FOR THIS USER):",
  ];

  if (username) {
    lines.push(
      `- PREFERRED USERNAME (CRUCIAL): The user's username is "${username}". Always address or call the user "${username}" naturally in greetings, status replies, and conversation (e.g., "Hi ${username}, I'm good! What about you?" or "Hey ${username}!"). Keep your signature warm Rex personality while using their name "${username}".`
    );
  }
  if (fullName && fullName.toLowerCase() !== username.toLowerCase()) {
    lines.push(`- Full Name: ${fullName}`);
  }
  if (occupation) {
    lines.push(
      `- Occupation / Role / What They Do: ${occupation} (Tailor technical depth, examples, and domain context to someone who is a ${occupation}).`
    );
  }
  if (age) {
    lines.push(`- Age: ${age}`);
  }
  if (dateOfBirth) {
    lines.push(`- Date of Birth: ${dateOfBirth}`);
  }
  if (gender) {
    lines.push(`- Gender: ${gender}`);
  }
  if (aboutUser) {
    lines.push(
      `- Custom Instructions (What the user wants Rex to know about them):\n  "${aboutUser}"`
    );
  }
  if (responseStyle) {
    lines.push(
      `- Custom Response Preferences (How the user wants Rex to respond):\n  "${responseStyle}"`
    );
  }

  return "\n" + lines.join("\n") + "\n";
}
