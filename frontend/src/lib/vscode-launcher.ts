import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface VSCodeLaunchResult {
  ok: boolean;
  targetPath: string;
  source: "local_agent" | "host_cli" | "uri_scheme" | "cloud_sync_needed";
  commandExecuted?: string;
  vscodeUri: string;
  cursorUri: string;
  windsurfUri: string;
  vscodeInsidersUri: string;
  message: string;
  requiresLocalSync?: boolean;
  syncPackageUrl?: string;
  error?: string;
}

export type SupportedIDE = "vscode" | "cursor" | "windsurf" | "vscode-insiders";

/**
 * Detects common executable paths for the requested IDE on the operating system
 */
export function getIDEExecutableCandidates(ide: SupportedIDE = "vscode", platform: NodeJS.Platform = process.platform): string[] {
  const home = process.env.HOME || "";
  const localAppData = process.env.LOCALAPPDATA || "";
  const programFiles = process.env.ProgramFiles || "C:\\Program Files";

  if (ide === "cursor") {
    const list = ["cursor"];
    if (platform === "darwin") {
      list.push(
        "/Applications/Cursor.app/Contents/Resources/app/bin/cursor",
        path.join(home, "Applications/Cursor.app/Contents/Resources/app/bin/cursor")
      );
    } else if (platform === "win32") {
      list.push(
        path.join(localAppData, "Programs\\cursor\\resources\\app\\bin\\cursor.cmd"),
        path.join(localAppData, "Programs\\Cursor\\resources\\app\\bin\\cursor.cmd"),
        path.join(programFiles, "Cursor\\resources\\app\\bin\\cursor.cmd")
      );
    } else {
      list.push("/usr/bin/cursor", "/usr/local/bin/cursor", "/snap/bin/cursor");
    }
    return list;
  }

  if (ide === "windsurf") {
    const list = ["windsurf"];
    if (platform === "darwin") {
      list.push(
        "/Applications/Windsurf.app/Contents/Resources/app/bin/windsurf",
        path.join(home, "Applications/Windsurf.app/Contents/Resources/app/bin/windsurf")
      );
    } else if (platform === "win32") {
      list.push(
        path.join(localAppData, "Programs\\Windsurf\\bin\\windsurf.cmd"),
        path.join(localAppData, "Programs\\windsurf\\bin\\windsurf.cmd"),
        path.join(programFiles, "Windsurf\\bin\\windsurf.cmd")
      );
    } else {
      list.push("/usr/bin/windsurf", "/usr/local/bin/windsurf", "/snap/bin/windsurf");
    }
    return list;
  }

  if (ide === "vscode-insiders") {
    const list = ["code-insiders"];
    if (platform === "darwin") {
      list.push(
        "/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin/code-insiders",
        path.join(home, "Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin/code-insiders")
      );
    } else if (platform === "win32") {
      list.push(
        path.join(localAppData, "Programs\\Microsoft VS Code Insiders\\bin\\code-insiders.cmd"),
        path.join(programFiles, "Microsoft VS Code Insiders\\bin\\code-insiders.cmd")
      );
    } else {
      list.push("/usr/bin/code-insiders", "/usr/local/bin/code-insiders", "/snap/bin/code-insiders");
    }
    return list;
  }

  // Default: VS Code
  const list = ["code", "code-insiders"];
  if (platform === "darwin") {
    list.push(
      "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code",
      "/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin/code-insiders",
      path.join(home, "Applications/Visual Studio Code.app/Contents/Resources/app/bin/code")
    );
  } else if (platform === "win32") {
    list.push(
      path.join(localAppData, "Programs\\Microsoft VS Code\\bin\\code.cmd"),
      path.join(localAppData, "Programs\\Microsoft VS Code Insiders\\bin\\code-insiders.cmd"),
      path.join(programFiles, "Microsoft VS Code\\bin\\code.cmd")
    );
  } else {
    list.push(
      "/usr/bin/code",
      "/usr/local/bin/code",
      "/snap/bin/code",
      "/usr/bin/code-insiders"
    );
  }
  return list;
}

export function getVSCodeExecutableCandidates(platform: NodeJS.Platform = process.platform): string[] {
  return getIDEExecutableCandidates("vscode", platform);
}

/**
 * Attempts to launch requested IDE via local CLI on the machine executing this code.
 */
export async function launchVSCodeCLI(
  targetPath: string,
  ide: SupportedIDE = "vscode"
): Promise<{ success: boolean; command?: string; error?: string }> {
  const candidates = getIDEExecutableCandidates(ide);
  const ideName = ide === "cursor" ? "Cursor" : ide === "windsurf" ? "Windsurf" : "VS Code";

  for (const exe of candidates) {
    try {
      // Execute command to open the entire workspace directory
      const cmd = `"${exe}" "${targetPath}"`;
      await execAsync(cmd, { timeout: 4000 });
      return { success: true, command: cmd };
    } catch {
      continue;
    }
  }

  // Fallback: try raw command without quotes
  const rawCmd = ide === "cursor" ? "cursor" : ide === "windsurf" ? "windsurf" : ide === "vscode-insiders" ? "code-insiders" : "code";
  try {
    const cmd = `${rawCmd} "${targetPath}"`;
    await execAsync(cmd, { timeout: 4000 });
    return { success: true, command: cmd };
  } catch (err: any) {
    return {
      success: false,
      error: `${ideName} CLI ('${rawCmd}') was not found in PATH or standard installation directories. ${err?.message || ""}`,
    };
  }
}

/**
 * Resolves a reliable absolute path and prepares IDE launch specifications.
 */
export function resolveWorkspaceLaunchInfo(
  requestedPath?: string,
  sessionId?: string,
  isCloudEnvironment: boolean = true,
  projectName?: string
): {
  targetPath: string;
  isCloudWorkspace: boolean;
  vscodeUri: string;
  cursorUri: string;
  windsurfUri: string;
  vscodeInsidersUri: string;
  workspaceFile?: string;
  workspaceUri: string;
  cursorWorkspaceUri: string;
  windsurfWorkspaceUri: string;
} {
  const raw = (requestedPath || "").trim();
  const isWindowsAbs = /^[a-zA-Z]:[\\/]/.test(raw);
  let cleanPath: string;
  if (!raw || raw === "." || raw === "default") {
    cleanPath = process.cwd();
  } else if (isWindowsAbs) {
    cleanPath = raw.replace(/\//g, "\\").replace(/\\+$/, "");
  } else {
    cleanPath = path.normalize(raw).replace(/\/+$/, "") || "/";
  }

  // Detect whether the path points to a cloud-hosted temporary container directory
  const isCloudWorkspace =
    isCloudEnvironment &&
    (cleanPath.includes("/app/applet") ||
      cleanPath.includes("/workspaces/") ||
      cleanPath.startsWith("/tmp/") ||
      cleanPath.startsWith("/opt/render"));

  // Format path for deep-link URI (ensure forward slashes)
  const normalizedForUri = cleanPath.replace(/\\/g, "/").replace(/\/+$/, "");
  const uriPath = normalizedForUri.startsWith("/") ? normalizedForUri : `/${normalizedForUri}`;
  const safeProjectSlug = (projectName || sessionId || "project")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-");
  const workspaceFileName = `${safeProjectSlug}.code-workspace`;

  return {
    targetPath: cleanPath,
    isCloudWorkspace,
    vscodeUri: `vscode://file${uriPath}`,
    cursorUri: `cursor://file${uriPath}`,
    windsurfUri: `windsurf://file${uriPath}`,
    vscodeInsidersUri: `vscode-insiders://file${uriPath}`,
    workspaceFile: isWindowsAbs
      ? `${cleanPath}\\${workspaceFileName}`
      : path.join(cleanPath, workspaceFileName),
    workspaceUri: `vscode://file${uriPath}`,
    cursorWorkspaceUri: `cursor://file${uriPath}`,
    windsurfWorkspaceUri: `windsurf://file${uriPath}`,
  };
}
