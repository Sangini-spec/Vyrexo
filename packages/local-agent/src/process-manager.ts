import { spawn, ChildProcess } from "child_process";
import crypto from "crypto";
import type { RunningProcess, CommandExecutionResult } from "./types";

export class LocalProcessManager {
  private processes: Map<string, { proc: ChildProcess; info: RunningProcess }> = new Map();

  /**
   * Scans terminal output for local development server URLs.
   */
  public detectServerUrl(text: string): string | undefined {
    const match = text.match(/https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0):(\d+)/i);
    if (match) {
      return match[0].replace("0.0.0.0", "localhost");
    }
    return undefined;
  }

  /**
   * Executes a command synchronously (with timeout) or starts it in background.
   */
  public async executeCommand(params: {
    command: string;
    cwd: string;
    timeoutMs?: number;
    isBackground?: boolean;
    env?: Record<string, string>;
    onStdout?: (data: string) => void;
    onStderr?: (data: string) => void;
  }): Promise<CommandExecutionResult> {
    const { command, cwd, timeoutMs = 60000, isBackground = false, env = {}, onStdout, onStderr } = params;
    const commandId = `cmd_${crypto.randomBytes(8).toString("hex")}`;
    const startTime = Date.now();

    return new Promise((resolve) => {
      let stdoutAcc = "";
      let stderrAcc = "";
      let detectedUrl: string | undefined;

      const proc = spawn(command, [], {
        cwd,
        shell: true,
        env: { ...process.env, ...env, FORCE_COLOR: "1" },
      });

      if (!proc.pid) {
        resolve({
          ok: false,
          commandId,
          command,
          cwd,
          exitCode: 1,
          stdout: "",
          stderr: "Failed to spawn process",
          durationMs: Date.now() - startTime,
          error: "Process spawn failed",
        });
        return;
      }

      const procInfo: RunningProcess = {
        id: commandId,
        pid: proc.pid,
        command,
        cwd,
        startedAt: startTime,
        status: "running",
      };

      this.processes.set(commandId, { proc, info: procInfo });

      proc.stdout?.on("data", (chunk: Buffer) => {
        const text = chunk.toString("utf-8");
        stdoutAcc += text;
        onStdout?.(text);

        const foundUrl = this.detectServerUrl(text);
        if (foundUrl && !detectedUrl) {
          detectedUrl = foundUrl;
          procInfo.detectedUrl = foundUrl;
        }
      });

      proc.stderr?.on("data", (chunk: Buffer) => {
        const text = chunk.toString("utf-8");
        stderrAcc += text;
        onStderr?.(text);
      });

      // If background process (e.g. dev server), resolve early once spawned or url detected
      if (isBackground) {
        setTimeout(() => {
          resolve({
            ok: true,
            commandId,
            command,
            cwd,
            exitCode: null,
            stdout: stdoutAcc,
            stderr: stderrAcc,
            durationMs: Date.now() - startTime,
            isBackground: true,
            detectedUrl,
          });
        }, 1500);
        return;
      }

      // Timeout safety
      const timer = setTimeout(() => {
        this.stopProcess(commandId);
        resolve({
          ok: false,
          commandId,
          command,
          cwd,
          exitCode: 124,
          stdout: stdoutAcc,
          stderr: `${stderrAcc}\n[Execution timed out after ${timeoutMs}ms]`,
          durationMs: Date.now() - startTime,
          error: "Command execution timed out",
        });
      }, timeoutMs);

      proc.on("close", (code) => {
        clearTimeout(timer);
        this.processes.delete(commandId);
        resolve({
          ok: code === 0,
          commandId,
          command,
          cwd,
          exitCode: code,
          stdout: stdoutAcc,
          stderr: stderrAcc,
          durationMs: Date.now() - startTime,
          detectedUrl,
        });
      });

      proc.on("error", (err) => {
        clearTimeout(timer);
        this.processes.delete(commandId);
        resolve({
          ok: false,
          commandId,
          command,
          cwd,
          exitCode: 1,
          stdout: stdoutAcc,
          stderr: `${stderrAcc}\n${err.message}`,
          durationMs: Date.now() - startTime,
          error: err.message,
        });
      });
    });
  }

  public getRunningProcesses(): RunningProcess[] {
    return Array.from(this.processes.values()).map((p) => p.info);
  }

  public stopProcess(commandId: string): boolean {
    const entry = this.processes.get(commandId);
    if (!entry) return false;

    try {
      entry.proc.kill("SIGTERM");
      setTimeout(() => {
        try {
          entry.proc.kill("SIGKILL");
        } catch {}
      }, 2000);
      entry.info.status = "stopped";
      this.processes.delete(commandId);
      return true;
    } catch {
      return false;
    }
  }

  public stopAll(): void {
    for (const id of this.processes.keys()) {
      this.stopProcess(id);
    }
  }
}
