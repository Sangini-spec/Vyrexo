import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";

const CONFIG_DIR = path.join(os.homedir(), ".vyrexo");
const CONFIG_FILE = path.join(CONFIG_DIR, "agent-auth.json");

export interface StoredAuthConfig {
  token: string;
  port: number;
  authorizedDirectories: string[];
  createdAt: number;
}

export function getOrCreateAuthConfig(port: number = 4040): StoredAuthConfig {
  if (!fs.existsSync(CONFIG_DIR)) {
    try {
      fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
    } catch {}
  }

  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const content = fs.readFileSync(CONFIG_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (parsed.token) {
        return parsed;
      }
    } catch {}
  }

  // Generate a cryptographically secure token
  const token = `vyrexo_${crypto.randomBytes(24).toString("hex")}`;
  const defaultDir = path.join(CONFIG_DIR, "projects");
  if (!fs.existsSync(defaultDir)) {
    try {
      fs.mkdirSync(defaultDir, { recursive: true });
    } catch {}
  }

  const newConfig: StoredAuthConfig = {
    token,
    port,
    authorizedDirectories: [defaultDir, process.cwd()],
    createdAt: Date.now(),
  };

  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(newConfig, null, 2), {
      encoding: "utf-8",
      mode: 0o600,
    });
  } catch {}

  return newConfig;
}

export function saveAuthorizedDirectory(dirPath: string): boolean {
  try {
    const config = getOrCreateAuthConfig();
    const resolved = path.resolve(dirPath);
    if (!config.authorizedDirectories.includes(resolved)) {
      config.authorizedDirectories.push(resolved);
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates that a requested path resides inside an authorized directory
 * and does not attempt directory traversal.
 */
export function validatePathAuthorization(requestedPath: string, authorizedDirs: string[]): { allowed: boolean; normalizedPath: string; error?: string } {
  const raw = (requestedPath || "").trim();
  const expanded =
    raw.startsWith("~/") || raw.startsWith("~\\")
      ? path.join(os.homedir(), raw.slice(2))
      : raw;
  const normalized = path.resolve(expanded);

  const effectiveAuthDirs = [
    ...authorizedDirs,
    os.homedir(),
    path.join(os.homedir(), "vyrexo-projects"),
    process.cwd(),
  ];

  // Must reside inside at least one authorized directory or subfolder
  const isInsideAuthorized = effectiveAuthDirs.some((authDir) => {
    const normAuth = path.resolve(authDir);
    return normalized === normAuth || normalized.startsWith(normAuth + path.sep);
  });

  if (!isInsideAuthorized) {
    return {
      allowed: false,
      normalizedPath: normalized,
      error: `Access denied. Directory "${normalized}" is not on the authorized directories list for this local agent.`,
    };
  }

  if (!fs.existsSync(normalized)) {
    try {
      fs.mkdirSync(normalized, { recursive: true });
    } catch (err: any) {
      return {
        allowed: false,
        normalizedPath: normalized,
        error: `Could not create directory: ${normalized} (${err?.message || "unknown error"})`,
      };
    }
  }

  return { allowed: true, normalizedPath: normalized };
}

/**
 * Detects potentially destructive or hazardous terminal commands.
 */
export function isDangerousCommand(cmd: string): { dangerous: boolean; reason?: string } {
  const trimmed = cmd.trim().toLowerCase();

  // Explicitly hazardous system destruction patterns
  const dangerousPatterns = [
    { regex: /rm\s+-rf\s+(\/|~|\$home|\*)/i, reason: "Attempting to delete root, home directory, or entire filesystem." },
    { regex: /mkfs|fdisk|parted|dd\s+if=/i, reason: "Attempting low-level disk formatting or partition operations." },
    { regex: />\s*(\/etc\/|\/boot\/|\/sys\/|\/dev\/)/i, reason: "Attempting to overwrite system critical files." },
    { regex: /:(){ :|:& };:/i, reason: "Fork bomb detected." },
    { regex: /shutdown|reboot|poweroff|init\s+0/i, reason: "System shutdown/reboot command." },
  ];

  for (const p of dangerousPatterns) {
    if (p.regex.test(trimmed)) {
      return { dangerous: true, reason: p.reason };
    }
  }

  return { dangerous: false };
}
