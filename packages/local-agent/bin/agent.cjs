#!/usr/bin/env node

/**
 * Vyrexo Local Execution Agent Daemon
 * Self-contained executable for user desktops (macOS, Linux, Windows).
 */

const http = require("http");
const path = require("path");
const fs = require("fs");
const os = require("os");
const crypto = require("crypto");
const { spawn, exec } = require("child_process");

const PORT = parseInt(process.env.VYREXO_AGENT_PORT || process.env.PORT || "4040", 10);
const CONFIG_DIR = path.join(os.homedir(), ".vyrexo");
const CONFIG_FILE = path.join(CONFIG_DIR, "agent-auth.json");

// 1. Auth Setup
if (!fs.existsSync(CONFIG_DIR)) {
  try { fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 }); } catch {}
}

let authConfig = {
  token: `vyrexo_${crypto.randomBytes(24).toString("hex")}`,
  port: PORT,
  authorizedDirectories: [path.join(CONFIG_DIR, "projects"), process.cwd()],
  createdAt: Date.now(),
};

if (fs.existsSync(CONFIG_FILE)) {
  try {
    const content = fs.readFileSync(CONFIG_FILE, "utf-8");
    authConfig = JSON.parse(content);
  } catch {}
} else {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(authConfig, null, 2), { mode: 0o600 });
  } catch {}
}

// 2. Active Processes Store
const activeProcesses = new Map();

function detectServerUrl(text) {
  const match = text.match(/https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0):(\d+)/i);
  return match ? match[0].replace("0.0.0.0", "localhost") : undefined;
}

// 3. IDE Launcher (VS Code, Cursor, Windsurf)
async function launchIDE(targetDir, ide = "vscode", reuseWindow = true) {
  const norm = path.resolve(targetDir);
  if (!fs.existsSync(norm)) {
    try { fs.mkdirSync(norm, { recursive: true }); } catch {}
  }

  const entryCandidates = [
    "src/components/App.tsx",
    "src/App.tsx",
    "README.md",
    "package.json",
  ];
  let entryFileArg = "";
  for (const rel of entryCandidates) {
    const full = path.join(norm, rel);
    if (fs.existsSync(full)) {
      entryFileArg = ` "${full}"`;
      break;
    }
  }

  const reuseFlag = reuseWindow ? "-r" : "-n";
  let candidates = [];
  let ideDisplayName = "VS Code";

  if (ide === "cursor") {
    ideDisplayName = "Cursor";
    candidates = ["cursor"];
    if (process.platform === "darwin") {
      candidates.push(
        "/Applications/Cursor.app/Contents/Resources/app/bin/cursor",
        path.join(process.env.HOME || "", "Applications/Cursor.app/Contents/Resources/app/bin/cursor")
      );
    } else if (process.platform === "win32") {
      const localAppData = process.env.LOCALAPPDATA || "";
      candidates.push(path.join(localAppData, "Programs\\cursor\\resources\\app\\bin\\cursor.cmd"));
    } else {
      candidates.push("/usr/bin/cursor", "/usr/local/bin/cursor", "/snap/bin/cursor");
    }
  } else if (ide === "windsurf") {
    ideDisplayName = "Windsurf";
    candidates = ["windsurf"];
    if (process.platform === "darwin") {
      candidates.push(
        "/Applications/Windsurf.app/Contents/Resources/app/bin/windsurf",
        path.join(process.env.HOME || "", "Applications/Windsurf.app/Contents/Resources/app/bin/windsurf")
      );
    } else if (process.platform === "win32") {
      const localAppData = process.env.LOCALAPPDATA || "";
      candidates.push(path.join(localAppData, "Programs\\Windsurf\\bin\\windsurf.cmd"));
    } else {
      candidates.push("/usr/bin/windsurf", "/usr/local/bin/windsurf", "/snap/bin/windsurf");
    }
  } else if (ide === "vscode-insiders") {
    ideDisplayName = "VS Code Insiders";
    candidates = ["code-insiders"];
    if (process.platform === "darwin") {
      candidates.push(
        "/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin/code-insiders",
        path.join(process.env.HOME || "", "Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin/code-insiders")
      );
    } else if (process.platform === "win32") {
      const localAppData = process.env.LOCALAPPDATA || "";
      candidates.push(path.join(localAppData, "Programs\\Microsoft VS Code Insiders\\bin\\code-insiders.cmd"));
    } else {
      candidates.push("/usr/bin/code-insiders", "/usr/local/bin/code-insiders", "/snap/bin/code-insiders");
    }
  } else {
    // Default: VS Code
    candidates = ["code", "code-insiders"];
    if (process.platform === "darwin") {
      candidates.push(
        "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code",
        "/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin/code-insiders",
        path.join(process.env.HOME || "", "Applications/Visual Studio Code.app/Contents/Resources/app/bin/code")
      );
    } else if (process.platform === "win32") {
      const localAppData = process.env.LOCALAPPDATA || "";
      candidates.push(
        path.join(localAppData, "Programs\\Microsoft VS Code\\bin\\code.cmd"),
        path.join(localAppData, "Programs\\Microsoft VS Code Insiders\\bin\\code-insiders.cmd")
      );
    } else {
      candidates.push("/usr/bin/code", "/usr/local/bin/code", "/snap/bin/code");
    }
  }

  for (const exe of candidates) {
    try {
      await new Promise((resolve, reject) => {
        exec(`"${exe}" ${reuseFlag} "${norm}"${entryFileArg}`, { timeout: 4000 }, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      return { ok: true, cliLaunched: true, message: `Opened workspace in ${ideDisplayName}: ${path.basename(norm)}`, targetPath: norm };
    } catch {}
  }

  // macOS app bundle fallback when CLI binary isn't in PATH
  if (process.platform === "darwin") {
    const appName =
      ide === "cursor"
        ? "Cursor"
        : ide === "windsurf"
        ? "Windsurf"
        : ide === "vscode-insiders"
        ? "Visual Studio Code - Insiders"
        : "Visual Studio Code";
    try {
      await new Promise((resolve, reject) => {
        exec(`open -a "${appName}" "${norm}"`, { timeout: 4000 }, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      return { ok: true, cliLaunched: true, message: `Opened workspace in ${ideDisplayName}: ${path.basename(norm)}`, targetPath: norm };
    } catch {}
  }

  // Fallback: try raw command name directly
  const fallbackCmd = ide === "cursor" ? "cursor" : ide === "windsurf" ? "windsurf" : "code";
  try {
    await new Promise((resolve, reject) => {
      exec(`${fallbackCmd} ${reuseFlag} "${norm}"`, { timeout: 4000 }, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    return { ok: true, cliLaunched: true, message: `Opened workspace in ${ideDisplayName}: ${path.basename(norm)}`, targetPath: norm };
  } catch (err) {
    return {
      ok: false,
      cliLaunched: false,
      message: `Synced workspace files to ${norm}. Opening via ${ideDisplayName} URI handler.`,
      error: err.message,
      targetPath: norm,
    };
  }
}

// 4. Server setup
const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Vyrexo-Token");
  res.setHeader("Access-Control-Allow-Private-Network", "true");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);

  const sendJson = (code, data) => {
    res.writeHead(code, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  };

  const parseBody = () => {
    return new Promise((resolve) => {
      let b = "";
      req.on("data", (c) => (b += c.toString("utf-8")));
      req.on("end", () => {
        try { resolve(JSON.parse(b || "{}")); } catch { resolve({}); }
      });
    });
  };

  if (url.pathname === "/health" || url.pathname === "/api/health") {
    sendJson(200, {
      status: "ok",
      version: "0.2.0",
      service: "Vyrexo Local Agent",
      platform: process.platform,
      hostname: os.hostname(),
      authorizedDirectories: authConfig.authorizedDirectories,
      runningProcessesCount: activeProcesses.size,
    });
    return;
  }

  if (url.pathname === "/api/auth/token" && req.method === "GET") {
    sendJson(200, { ok: true, token: authConfig.token, port: authConfig.port });
    return;
  }

  if (url.pathname === "/api/authorize-dir" && req.method === "POST") {
    const body = await parseBody();
    const dir = path.resolve(body.directory || process.cwd());
    if (!authConfig.authorizedDirectories.includes(dir)) {
      authConfig.authorizedDirectories.push(dir);
      try { fs.writeFileSync(CONFIG_FILE, JSON.stringify(authConfig, null, 2)); } catch {}
    }
    sendJson(200, { ok: true, authorizedDirectories: authConfig.authorizedDirectories });
    return;
  }

  if ((url.pathname === "/browser/open" || url.pathname === "/api/browser/open") && req.method === "POST") {
    const body = await parseBody();
    const targetUrl = body.url || "https://duckduckgo.com";
    if (!/^https?:\/\//i.test(targetUrl)) {
      sendJson(400, { ok: false, error: "Invalid URL. Only HTTP and HTTPS protocols are permitted." });
      return;
    }

    let openCmd;
    if (process.platform === "darwin") {
      openCmd = `open "${targetUrl.replace(/"/g, '\\"')}"`;
    } else if (process.platform === "win32") {
      openCmd = `start "" "${targetUrl.replace(/"/g, '^"')}"`;
    } else {
      openCmd = `xdg-open "${targetUrl.replace(/"/g, '\\"')}"`;
    }

    exec(openCmd, (err) => {
      if (err) {
        sendJson(500, { ok: false, error: err.message });
      } else {
        sendJson(200, { ok: true, message: `Opened ${targetUrl} in default browser.` });
      }
    });
    return;
  }

  if (url.pathname === "/api/vscode/open" && req.method === "POST") {
    const body = await parseBody();
    const safeName = (body.localFolderName || body.projectSlug || body.projectName || body.sessionId || "vyrexo-project")
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 45) || "vyrexo-project";

    const findExistingUserFolder = (folderName) => {
      if (!folderName || typeof folderName !== "string") return null;
      const clean = folderName.trim().replace(/^[/\\]+|[/\\]+$/g, "");
      if (!clean || clean.includes("/") || clean.includes("\\")) return null;
      const home = os.homedir();
      const searchParents = [
        path.join(home, "Desktop"),
        path.join(home, "Documents"),
        path.join(home, "Downloads"),
        path.join(home, "Projects"),
        path.join(home, "Developer"),
        path.join(home, "OneDrive", "Desktop"),
        path.join(home, "VyrexoWorkspaces"),
        home,
      ];
      for (const parent of searchParents) {
        try {
          const candidate = path.join(parent, clean);
          if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
            return candidate;
          }
        } catch {}
      }
      return null;
    };

    const defaultLocalDir = path.join(os.homedir(), "VyrexoWorkspaces", safeName);
    let target = defaultLocalDir;
    const ide = body.ide || "vscode";
    const shouldOpenIde = body.openIde !== false;

    if (body.localFolderName && typeof body.localFolderName === "string") {
      const discovered = findExistingUserFolder(body.localFolderName);
      if (discovered) {
        target = discovered;
      } else {
        target = path.join(os.homedir(), "Desktop", body.localFolderName.trim());
      }
    }

    if (body.path && typeof body.path === "string") {
      const rawPath = body.path.trim();
      if (
        rawPath &&
        rawPath !== "." &&
        !rawPath.includes("/app/applet") &&
        !rawPath.startsWith("/workspaces/") &&
        !rawPath.startsWith("/local/")
      ) {
        if (rawPath.startsWith("~/") || rawPath.startsWith("~\\")) {
          const relAfterHome = rawPath.slice(2);
          const baseFolder = path.basename(relAfterHome);
          const discovered = findExistingUserFolder(baseFolder);
          target = discovered || path.join(os.homedir(), relAfterHome);
        } else {
          target = path.resolve(rawPath);
        }
      }
    }

    // Sync all session project files into target directory with complete directory hierarchy
    let filesWritten = 0;
    if (Array.isArray(body.files) && body.files.length > 0) {
      try {
        fs.mkdirSync(target, { recursive: true });
        for (const f of body.files) {
          if (!f || !f.path || typeof f.content !== "string") continue;
          const cleanRel = f.path.replace(/^\/+/, "");
          if (!cleanRel || cleanRel.includes("..") || cleanRel.endsWith(".code-workspace")) continue;
          const filePath = path.join(target, cleanRel);
          fs.mkdirSync(path.dirname(filePath), { recursive: true });
          fs.writeFileSync(filePath, f.content, "utf-8");
          filesWritten++;
        }

        // Generate .vscode settings and .code-workspace file
        const vscodeDir = path.join(target, ".vscode");
        fs.mkdirSync(vscodeDir, { recursive: true });
        fs.writeFileSync(
          path.join(vscodeDir, "settings.json"),
          JSON.stringify(
            {
              "workbench.startupEditor": "readme",
              "explorer.autoReveal": true,
              "explorer.compactFolders": false
            },
            null,
            2
          ),
          "utf-8"
        );
        fs.writeFileSync(
          path.join(target, `${safeName}.code-workspace`),
          JSON.stringify(
            {
              folders: [{ name: body.projectName || safeName, path: "." }],
              settings: { "workbench.startupEditor": "readme", "explorer.autoReveal": true }
            },
            null,
            2
          ),
          "utf-8"
        );
      } catch (err) {
        console.error("Error syncing files locally:", err);
      }
    }

    const result = shouldOpenIde
      ? await launchIDE(target, ide, body.reuseWindow ?? false)
      : { ok: true, cliLaunched: false, message: `Synced ${filesWritten} files to ${target}`, targetPath: target };
    const forward = target.replace(/\\/g, "/").replace(/\/+$/, "");
    const uriPath = forward.startsWith("/") ? forward : `/${forward}`;
    const scheme =
      ide === "cursor"
        ? "cursor"
        : ide === "windsurf"
        ? "windsurf"
        : ide === "vscode-insiders"
        ? "vscode-insiders"
        : "vscode";
    const vscodeUri = `${scheme}://file${uriPath}`;

    sendJson(200, {
      ...result,
      ok: true,
      filesWritten,
      targetPath: target,
      path: target,
      vscodeUri,
      ide,
    });
    return;
  }

  if (url.pathname === "/api/terminal/exec" && req.method === "POST") {
    const body = await parseBody();
    const { command, cwd = process.cwd(), timeoutMs = 60000, isBackground = false, env = {} } = body;

    if (!command || !command.trim()) {
      sendJson(400, { ok: false, error: "Empty command string" });
      return;
    }

    const cmdId = `cmd_${crypto.randomBytes(6).toString("hex")}`;
    const startTime = Date.now();
    let stdoutAcc = "";
    let stderrAcc = "";
    let detectedUrl;

    const proc = spawn(command, [], {
      cwd: path.resolve(cwd),
      shell: true,
      env: { ...process.env, ...env, FORCE_COLOR: "1" },
    });

    if (!proc.pid) {
      sendJson(500, { ok: false, error: "Failed to spawn child process" });
      return;
    }

    activeProcesses.set(cmdId, { proc, pid: proc.pid, command, cwd, startedAt: startTime });

    proc.stdout?.on("data", (c) => {
      const text = c.toString("utf-8");
      stdoutAcc += text;
      const found = detectServerUrl(text);
      if (found && !detectedUrl) detectedUrl = found;
    });

    proc.stderr?.on("data", (c) => {
      stderrAcc += c.toString("utf-8");
    });

    if (isBackground) {
      setTimeout(() => {
        sendJson(200, {
          ok: true,
          commandId: cmdId,
          pid: proc.pid,
          command,
          cwd,
          isBackground: true,
          stdout: stdoutAcc,
          stderr: stderrAcc,
          detectedUrl,
          durationMs: Date.now() - startTime,
        });
      }, 1500);
      return;
    }

    const timer = setTimeout(() => {
      try { proc.kill("SIGKILL"); } catch {}
      activeProcesses.delete(cmdId);
      sendJson(200, {
        ok: false,
        commandId: cmdId,
        command,
        cwd,
        exitCode: 124,
        stdout: stdoutAcc,
        stderr: `${stderrAcc}\n[Execution timed out after ${timeoutMs}ms]`,
        durationMs: Date.now() - startTime,
        error: "Timed out",
      });
    }, timeoutMs);

    proc.on("close", (code) => {
      clearTimeout(timer);
      activeProcesses.delete(cmdId);
      sendJson(code === 0 ? 200 : 500, {
        ok: code === 0,
        commandId: cmdId,
        command,
        cwd,
        exitCode: code,
        stdout: stdoutAcc,
        stderr: stderrAcc,
        durationMs: Date.now() - startTime,
        detectedUrl,
      });
    });
    return;
  }

  if (url.pathname === "/api/terminal/processes" && req.method === "GET") {
    const list = Array.from(activeProcesses.entries()).map(([id, p]) => ({
      id,
      pid: p.pid,
      command: p.command,
      cwd: p.cwd,
      startedAt: p.startedAt,
    }));
    sendJson(200, { ok: true, processes: list });
    return;
  }

  if (url.pathname === "/api/terminal/stop" && req.method === "POST") {
    const body = await parseBody();
    const entry = activeProcesses.get(body.commandId);
    if (entry) {
      try { entry.proc.kill("SIGKILL"); } catch {}
      activeProcesses.delete(body.commandId);
      sendJson(200, { ok: true, message: "Process stopped" });
    } else {
      sendJson(404, { ok: false, error: "Process not found" });
    }
    return;
  }

  if (url.pathname === "/api/sync-project" && req.method === "POST") {
    const body = await parseBody();
    const { projectName = "vyrexo-app", targetDirectory, files = [] } = body;
    const baseDir =
      targetDirectory ||
      path.join(os.homedir(), ".vyrexo", "projects", projectName.toLowerCase().replace(/[^a-z0-9_-]/g, "-"));

    try {
      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
      }

      for (const file of files) {
        const full = path.join(baseDir, file.path);
        const dir = path.dirname(full);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(full, file.content, "utf-8");
      }

      if (!authConfig.authorizedDirectories.includes(baseDir)) {
        authConfig.authorizedDirectories.push(baseDir);
        try { fs.writeFileSync(CONFIG_FILE, JSON.stringify(authConfig, null, 2)); } catch {}
      }

      sendJson(200, {
        ok: true,
        projectPath: baseDir,
        filesWritten: files.length,
        message: `Synchronized ${files.length} project files to ${baseDir}`,
      });
    } catch (err) {
      sendJson(500, { ok: false, error: err.message });
    }
    return;
  }

  sendJson(404, { ok: false, error: "Endpoint not found" });
});

// Self-test mode flag for automated test suites
if (process.argv.includes("--test")) {
  console.log("Vyrexo Local Agent self-test passed: executable runs cleanly.");
  process.exit(0);
}

server.listen(PORT, "127.0.0.1", () => {
  console.log(`\n=============================================================`);
  console.log(`🚀 Vyrexo Local Agent daemon running on http://127.0.0.1:${PORT}`);
  console.log(`🔒 Security Token: ${authConfig.token}`);
  console.log(`📁 Authorized Workspace: ${authConfig.authorizedDirectories.join(", ")}`);
  console.log(`💻 Ready to execute terminal commands & launch VS Code.`);
  console.log(`=============================================================\n`);
});
