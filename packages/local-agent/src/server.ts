import http from "http";
import path from "path";
import fs from "fs";
import os from "os";
import {
  getOrCreateAuthConfig,
  validatePathAuthorization,
  isDangerousCommand,
  saveAuthorizedDirectory,
} from "./security";
import { LocalProcessManager } from "./process-manager";
import { openDirectoryInVSCode } from "./vscode";
import type {
  CommandExecutionRequest,
  VSCodeOpenRequest,
  SyncProjectRequest,
} from "./types";

export function createLocalAgentServer(port: number = 4040) {
  const authConfig = getOrCreateAuthConfig(port);
  const processManager = new LocalProcessManager();

  const server = http.createServer(async (req, res) => {
    // Enable CORS for web apps (Vyrexo frontend running locally or on Render)
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Vyrexo-Token"
    );

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);

    // Helper to send JSON responses
    const sendJson = (statusCode: number, data: any) => {
      res.writeHead(statusCode, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data));
    };

    // Helper to parse JSON body
    const parseBody = (): Promise<any> => {
      return new Promise((resolve) => {
        let body = "";
        req.on("data", (chunk) => (body += chunk.toString("utf-8")));
        req.on("end", () => {
          try {
            resolve(JSON.parse(body || "{}"));
          } catch {
            resolve({});
          }
        });
      });
    };

    // 1. Health check (public / lightweight)
    if (url.pathname === "/health" || url.pathname === "/api/health") {
      sendJson(200, {
        status: "ok",
        version: "0.2.0",
        service: "Vyrexo Local Agent",
        platform: process.platform,
        arch: process.arch,
        hostname: os.hostname(),
        authorizedDirectories: authConfig.authorizedDirectories,
        runningProcessesCount: processManager.getRunningProcesses().length,
      });
      return;
    }

    // Auth verification helper: token in header or body
    const tokenHeader = req.headers["x-vyrexo-token"] as string | undefined;
    const authHeader = req.headers["authorization"] as string | undefined;
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : undefined;
    const clientToken = tokenHeader || bearerToken;

    // Optional token validation (for localhost pairing, if configured)
    const isLocalhostClient =
      req.socket.remoteAddress === "127.0.0.1" ||
      req.socket.remoteAddress === "::1" ||
      req.socket.remoteAddress === "::ffff:127.0.0.1";

    const isAuthorized =
      !authConfig.token ||
      clientToken === authConfig.token ||
      (isLocalhostClient && !req.headers["origin"]?.includes("malicious"));

    if (!isAuthorized && url.pathname !== "/api/auth/token") {
      sendJson(401, {
        ok: false,
        error: "Unauthorized: Invalid or missing Vyrexo Agent security token.",
      });
      return;
    }

    // 2. Token retrieval for initial localhost setup
    if (url.pathname === "/api/auth/token" && req.method === "GET") {
      if (!isLocalhostClient) {
        sendJson(403, { ok: false, error: "Token retrieval only permitted from localhost" });
        return;
      }
      sendJson(200, { ok: true, token: authConfig.token, port: authConfig.port });
      return;
    }

    // 3. Authorize directory
    if (url.pathname === "/api/authorize-dir" && req.method === "POST") {
      const body = await parseBody();
      const dirPath = body.directory as string;
      if (!dirPath) {
        sendJson(400, { ok: false, error: "Missing directory path" });
        return;
      }
      const success = saveAuthorizedDirectory(dirPath);
      sendJson(200, {
        ok: success,
        authorizedDirectories: getOrCreateAuthConfig().authorizedDirectories,
      });
      return;
    }

    // 4. Open VS Code
    if (url.pathname === "/api/vscode/open" && req.method === "POST") {
      const body: VSCodeOpenRequest = await parseBody();
      const targetPath = body.path || process.cwd();

      const validation = validatePathAuthorization(
        targetPath,
        authConfig.authorizedDirectories
      );

      // If directory is not yet authorized, auto-authorize it if inside user home
      if (!validation.allowed && targetPath.startsWith(os.homedir())) {
        saveAuthorizedDirectory(targetPath);
      } else if (!validation.allowed) {
        sendJson(403, { ok: false, error: validation.error });
        return;
      }

      const launchResult = await openDirectoryInVSCode(
        targetPath,
        body.reuseWindow ?? true
      );
      sendJson(launchResult.ok ? 200 : 500, launchResult);
      return;
    }

    // 5. Execute Terminal Command
    if (url.pathname === "/api/terminal/exec" && req.method === "POST") {
      const body: CommandExecutionRequest = await parseBody();
      const { command, cwd = process.cwd(), timeoutMs = 60000, isBackground = false, env = {} } = body;

      if (!command?.trim()) {
        sendJson(400, { ok: false, error: "Empty command string" });
        return;
      }

      // Check dangerous command filter
      const dangerCheck = isDangerousCommand(command);
      if (dangerCheck.dangerous) {
        sendJson(400, {
          ok: false,
          error: `Command rejected by Vyrexo safety filter: ${dangerCheck.reason}`,
        });
        return;
      }

      // Check path authorization
      const validation = validatePathAuthorization(
        cwd,
        authConfig.authorizedDirectories
      );
      if (!validation.allowed && cwd.startsWith(os.homedir())) {
        saveAuthorizedDirectory(cwd);
      } else if (!validation.allowed) {
        sendJson(403, { ok: false, error: validation.error });
        return;
      }

      const execResult = await processManager.executeCommand({
        command,
        cwd,
        timeoutMs,
        isBackground,
        env,
      });

      sendJson(execResult.ok ? 200 : 500, execResult);
      return;
    }

    // 6. List and stop running processes
    if (url.pathname === "/api/terminal/processes" && req.method === "GET") {
      sendJson(200, {
        ok: true,
        processes: processManager.getRunningProcesses(),
      });
      return;
    }

    if (url.pathname === "/api/terminal/stop" && req.method === "POST") {
      const body = await parseBody();
      const commandId = body.commandId as string;
      const stopped = processManager.stopProcess(commandId);
      sendJson(200, { ok: stopped, message: stopped ? "Process stopped" : "Process not found" });
      return;
    }

    // 7. Synchronize Cloud Project Files to Local Directory
    if (url.pathname === "/api/sync-project" && req.method === "POST") {
      const body: SyncProjectRequest = await parseBody();
      const { projectName, targetDirectory, files = [] } = body;

      const baseDir =
        targetDirectory ||
        path.join(os.homedir(), ".vyrexo", "projects", projectName.toLowerCase().replace(/[^a-z0-9_-]/g, "-"));

      try {
        if (!fs.existsSync(baseDir)) {
          fs.mkdirSync(baseDir, { recursive: true });
        }

        for (const file of files) {
          const fullPath = path.join(baseDir, file.path);
          const dir = path.dirname(fullPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(fullPath, file.content, "utf-8");
        }

        saveAuthorizedDirectory(baseDir);

        sendJson(200, {
          ok: true,
          projectPath: baseDir,
          filesWritten: files.length,
          message: `Synchronized ${files.length} project files to ${baseDir}`,
        });
      } catch (err: any) {
        sendJson(500, {
          ok: false,
          error: `Failed to synchronize files: ${err.message}`,
        });
      }
      return;
    }

    // 404 for unknown endpoints
    sendJson(404, { ok: false, error: "Endpoint not found on Vyrexo Local Agent" });
  });

  return {
    server,
    start: () => {
      return new Promise<void>((resolve) => {
        server.listen(port, "127.0.0.1", () => {
          console.log(`\n=============================================================`);
          console.log(`🚀 Vyrexo Local Agent daemon running on http://127.0.0.1:${port}`);
          console.log(`🔒 Security Token: ${authConfig.token}`);
          console.log(`📁 Authorized Workspace: ${authConfig.authorizedDirectories.join(", ")}`);
          console.log(`💻 Ready to execute terminal commands & launch VS Code.`);
          console.log(`=============================================================\n`);
          resolve();
        });
      });
    },
    stop: () => {
      processManager.stopAll();
      server.close();
    },
  };
}
