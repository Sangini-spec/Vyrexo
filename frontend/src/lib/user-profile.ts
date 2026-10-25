export interface UserProfile {
  username: string;
  fullName: string;
  occupation: string;
  age: string;
  dateOfBirth: string;
  gender: string;
  aboutUserInstructions: string;
  responseStyleInstructions: string;
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
const PROFILE_STORAGE_FALLBACK = "vyrexo_user_profile_v1:default";

export function getProfileStorageKey(userId?: string | null): string {
  const cleanId = (userId || "").trim();
  return cleanId ? `${PROFILE_STORAGE_PREFIX}${cleanId}` : PROFILE_STORAGE_FALLBACK;
}

export function loadUserProfile(
  userId?: string | null,
  fallbackUser?: { id?: string; email?: string; user_metadata?: { full_name?: string; username?: string } } | null
): UserProfile {
  const effectiveUserId = userId || fallbackUser?.id || "";
  const emailPrefix = fallbackUser?.email ? fallbackUser.email.split("@")[0].trim() : "";
  const rawMetaFullName = (fallbackUser?.user_metadata?.full_name || "").trim();
  const defaultFullName =
    rawMetaFullName && rawMetaFullName.toLowerCase() !== emailPrefix.toLowerCase()
      ? rawMetaFullName
      : "";
  const defaultUsername = (fallbackUser?.user_metadata?.username || "").trim();

  if (typeof window === "undefined") {
    return {
      ...DEFAULT_USER_PROFILE,
      fullName: defaultFullName,
      username: defaultUsername,
    };
  }

  try {
    const primaryKey = getProfileStorageKey(effectiveUserId);
    const raw = localStorage.getItem(primaryKey) || localStorage.getItem(PROFILE_STORAGE_FALLBACK);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<UserProfile>;
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
      return {
        username: parsedUsername,
        fullName: cleanedFullName,
        occupation: typeof parsed.occupation === "string" ? parsed.occupation.trim() : "",
        age: typeof parsed.age === "string" ? parsed.age.trim() : "",
        dateOfBirth: typeof parsed.dateOfBirth === "string" ? parsed.dateOfBirth.trim() : "",
        gender: typeof parsed.gender === "string" ? parsed.gender.trim() : "",
        aboutUserInstructions:
          typeof parsed.aboutUserInstructions === "string" ? parsed.aboutUserInstructions.trim() : "",
        responseStyleInstructions:
          typeof parsed.responseStyleInstructions === "string" ? parsed.responseStyleInstructions.trim() : "",
        updatedAt: parsed.updatedAt,
      };
    }
  } catch {}

  return {
    ...DEFAULT_USER_PROFILE,
    fullName: defaultFullName,
    username: defaultUsername,
  };
}

export function saveUserProfile(profile: UserProfile, userId?: string | null): UserProfile {
  const normalized: UserProfile = {
    username: (profile.username || "").trim(),
    fullName: (profile.fullName || "").trim(),
    occupation: (profile.occupation || "").trim(),
    age: (profile.age || "").trim(),
    dateOfBirth: (profile.dateOfBirth || "").trim(),
    gender: (profile.gender || "").trim(),
    aboutUserInstructions: (profile.aboutUserInstructions || "").trim(),
    responseStyleInstructions: (profile.responseStyleInstructions || "").trim(),
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    try {
      const key = getProfileStorageKey(userId);
      localStorage.setItem(key, JSON.stringify(normalized));
      localStorage.setItem(PROFILE_STORAGE_FALLBACK, JSON.stringify(normalized));

      // Also sync full_name & username into vyrexo_user in localStorage so auth context / header pill reflects changes immediately
      const rawUser = localStorage.getItem("vyrexo_user");
      if (rawUser) {
        const parsedUser = JSON.parse(rawUser);
        parsedUser.user_metadata = {
          ...(parsedUser.user_metadata || {}),
          ...(normalized.fullName ? { full_name: normalized.fullName } : {}),
          username: normalized.username,
        };
        localStorage.setItem("vyrexo_user", JSON.stringify(parsedUser));
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
