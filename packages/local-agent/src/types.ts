export interface AgentConfig {
  port: number;
  token: string;
  allowedOrigins: string[];
  authorizedDirectories: string[];
}

export interface CommandExecutionRequest {
  command: string;
  cwd: string;
  timeoutMs?: number;
  isBackground?: boolean;
  env?: Record<string, string>;
}

export interface CommandExecutionResult {
  ok: boolean;
  commandId: string;
  command: string;
  cwd: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  isBackground?: boolean;
  detectedUrl?: string;
  error?: string;
}

export interface RunningProcess {
  id: string;
  pid: number;
  command: string;
  cwd: string;
  startedAt: number;
  detectedUrl?: string;
  status: "running" | "stopped" | "failed";
}

export interface VSCodeOpenRequest {
  path: string;
  sessionId?: string;
  reuseWindow?: boolean;
}

export interface SyncProjectRequest {
  projectName: string;
  targetDirectory?: string;
  files: Array<{ path: string; content: string }>;
}
