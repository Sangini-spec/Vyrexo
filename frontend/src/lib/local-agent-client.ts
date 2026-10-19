export interface LocalAgentHealth {
  status: "ok" | "unreachable";
  version?: string;
  platform?: string;
  hostname?: string;
  authorizedDirectories?: string[];
  runningProcessesCount?: number;
}

export interface LocalCommandResult {
  ok: boolean;
  commandId?: string;
  command: string;
  cwd: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  detectedUrl?: string;
  isBackground?: boolean;
  error?: string;
}

export const DEFAULT_LOCAL_AGENT_URL = "http://127.0.0.1:4040";

/**
 * Checks if the Vyrexo Local Agent is running on the user's machine.
 */
export async function checkLocalAgentHealth(agentUrl: string = DEFAULT_LOCAL_AGENT_URL): Promise<LocalAgentHealth> {
  try {
    const abortCtrl = new AbortController();
    const timeout = setTimeout(() => abortCtrl.abort(), 1200);

    const res = await fetch(`${agentUrl}/health`, {
      method: "GET",
      signal: abortCtrl.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      return {
        status: "ok",
        version: data.version,
        platform: data.platform,
        hostname: data.hostname,
        authorizedDirectories: data.authorizedDirectories || [],
        runningProcessesCount: data.runningProcessesCount || 0,
      };
    }
  } catch {}
  return { status: "unreachable" };
}

/**
 * Requests the local agent on the user's computer to open a project directory in VS Code.
 */
export async function openProjectInLocalVSCode(
  projectPath: string,
  reuseWindow: boolean = false,
  agentUrl: string = DEFAULT_LOCAL_AGENT_URL,
  ide: string = "vscode",
  files?: Array<{ path: string; content: string }>,
  projectName?: string
): Promise<{ ok: boolean; message: string; command?: string; error?: string }> {
  try {
    const res = await fetch(`${agentUrl}/api/vscode/open`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: projectPath,
        reuseWindow,
        ide,
        files: files || [],
        projectName: projectName || "project",
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) {
      return { ok: true, message: data.message, command: data.command };
    }
    return {
      ok: false,
      message: data.message || "Failed to open VS Code via Local Agent",
      error: data.error,
    };
  } catch (err: any) {
    return {
      ok: false,
      message: "Local Agent unreachable on http://127.0.0.1:4040. Run 'npm run agent' on your machine.",
      error: err?.message,
    };
  }
}

/**
 * Executes a terminal command on the user's local machine via the Local Agent.
 */
export async function executeLocalTerminalCommand(params: {
  command: string;
  cwd?: string;
  isBackground?: boolean;
  timeoutMs?: number;
  agentUrl?: string;
}): Promise<LocalCommandResult> {
  const { command, cwd, isBackground = false, timeoutMs = 60000, agentUrl = DEFAULT_LOCAL_AGENT_URL } = params;

  try {
    const res = await fetch(`${agentUrl}/api/terminal/exec`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command, cwd, isBackground, timeoutMs }),
    });

    const data = await res.json().catch(() => ({}));
    return {
      ok: data.ok ?? false,
      commandId: data.commandId,
      command,
      cwd: data.cwd || cwd || "",
      exitCode: data.exitCode ?? (data.ok ? 0 : 1),
      stdout: data.stdout || "",
      stderr: data.stderr || "",
      durationMs: data.durationMs || 0,
      detectedUrl: data.detectedUrl,
      isBackground: data.isBackground,
      error: data.error,
    };
  } catch (err: any) {
    return {
      ok: false,
      command,
      cwd: cwd || "",
      exitCode: 1,
      stdout: "",
      stderr: `Local Agent connection failed: ${err.message}`,
      durationMs: 0,
      error: err.message,
    };
  }
}

/**
 * Synchronizes project files from Vyrexo to the user's local disk.
 */
export async function syncProjectToLocalDisk(params: {
  projectName: string;
  files: Array<{ path: string; content: string }>;
  targetDirectory?: string;
  agentUrl?: string;
}): Promise<{ ok: boolean; projectPath?: string; message: string; error?: string }> {
  const { projectName, files, targetDirectory, agentUrl = DEFAULT_LOCAL_AGENT_URL } = params;

  try {
    const res = await fetch(`${agentUrl}/api/sync-project`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectName, files, targetDirectory }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) {
      return { ok: true, projectPath: data.projectPath, message: data.message };
    }
    return {
      ok: false,
      message: data.message || "Synchronization failed",
      error: data.error,
    };
  } catch (err: any) {
    return {
      ok: false,
      message: "Could not connect to Local Agent to write project files.",
      error: err?.message,
    };
  }
}
