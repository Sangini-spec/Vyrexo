import { NextRequest, NextResponse } from "next/server";
import { materializeProjectOnDisk } from "@/lib/project-export";
import { isBlockedLegacySessionId } from "@/lib/session-persistent-storage";

function buildBridgeNodeScript(
  sessionId: string,
  folderName: string,
  targetPathHint: string,
  files: Array<{ path: string; content: string }>,
  ide: string = "vscode"
): string {
  const payloadJson = JSON.stringify({
    sessionId,
    folderName,
    targetPathHint,
    ide,
    files,
  });
  const payloadBase64 = Buffer.from(payloadJson, "utf-8").toString("base64");

  return `
const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { exec } = require("child_process");

const initialPayload = JSON.parse(Buffer.from("${payloadBase64}", "base64").toString("utf8"));

function resolveLocalFolder(folderName, customPath) {
  const home = os.homedir();
  const cleanFolder = (folderName || "amaze").replace(/[\\\\/:*?"<>|]+/g, "-");
  if (
    customPath &&
    typeof customPath === "string" &&
    !customPath.startsWith("/app/applet") &&
    !customPath.startsWith("/workspaces/") &&
    !customPath.startsWith("/local/") &&
    !customPath.startsWith("~/") &&
    !customPath.startsWith("~\\\\")
  ) {
    // Check if the parent directory exists on this machine (e.g. C:\\Users\\hp\\OneDrive\\Desktop)
    const resolved = path.resolve(customPath);
    const parentDir = path.dirname(resolved);
    if (fs.existsSync(parentDir)) {
      return resolved;
    }
  }

  const candidateDesktops = [
    path.join(home, "OneDrive", "Desktop"),
    path.join(home, "Desktop"),
    path.join(home, "OneDrive", "Documents"),
    path.join(home, "Documents"),
    home,
  ];

  // 1. If the folder already exists in any candidate location, use it directly
  for (const base of candidateDesktops) {
    const candidate = path.join(base, cleanFolder);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
  }

  // 2. Otherwise use the first existing Desktop folder (e.g. C:\\Users\\hp\\OneDrive\\Desktop\\<folder>)
  for (const base of candidateDesktops) {
    if (fs.existsSync(base) && fs.statSync(base).isDirectory()) {
      return path.join(base, cleanFolder);
    }
  }

  return path.join(home, cleanFolder);
}

function syncAndOpenWorkspace(data) {
  const fn = data.localFolderName || data.folderName || data.projectSlug || "amaze";
  const targetDir = resolveLocalFolder(fn, data.path || data.targetPathHint);
  fs.mkdirSync(targetDir, { recursive: true });

  const files = Array.isArray(data.files) ? data.files : [];
  let entryFile = "";

  for (const f of files) {
    if (!f || !f.path || String(f.path).includes("..")) continue;
    const rel = String(f.path).replace(/\\\\/g, "/").replace(/^\\/+/, "");
    const full = path.join(targetDir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, typeof f.content === "string" ? f.content : "", "utf8");
    if (!entryFile && (rel === "src/components/App.tsx" || rel === "src/App.tsx" || rel === "README.md")) {
      entryFile = full;
    }
  }

  if (data.openIde !== false) {
    const ideBin =
      data.ide === "cursor"
        ? "cursor"
        : data.ide === "windsurf"
        ? "windsurf"
        : data.ide === "vscode-insiders"
        ? "code-insiders"
        : "code";
    const cmd = entryFile
      ? \`\${ideBin} -n "\${targetDir}" "\${entryFile}"\`
      : \`\${ideBin} -n "\${targetDir}"\`;
    exec(cmd, (err) => {
      if (err && ideBin !== "code") {
        exec(\`code -n "\${targetDir}"\`);
      }
    });
  }

  return targetDir;
}

// Immediately materialize the current session's files and launch VS Code with the folder opened!
try {
  const syncedPath = syncAndOpenWorkspace({ ...initialPayload, openIde: true });
  console.log("\\n[Vyrexo] Synced " + (initialPayload.files ? initialPayload.files.length : 0) + " files to: " + syncedPath);
  console.log("[Vyrexo] Opening folder in VS Code: " + syncedPath + "\\n");
} catch (e) {
  console.error("[Vyrexo] Initial sync error:", e.message);
}

// Keep the Local Desktop Bridge running on 127.0.0.1:4040 so future clicks in Vyrexo open in 1 click!
const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Access-Control-Request-Private-Network");
  res.setHeader("Access-Control-Allow-Private-Network", "true");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  if (req.method === "GET" && (req.url === "/health" || req.url === "/status")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ status: "ok", port: 4040 }));
  }

  if (req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");
        const targetDir = syncAndOpenWorkspace(data);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          ok: true,
          targetPath: targetDir,
          path: targetDir,
          cliLaunched: true,
        }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

server.on("error", () => {
  // Port 4040 is already running in another process; exit cleanly after initial sync
  process.exit(0);
});

server.listen(4040, "127.0.0.1", () => {
  console.log("[Vyrexo] Local Desktop Bridge active on http://127.0.0.1:4040 (Every VS Code click will now sync & open automatically)");
});
`.trim();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = (searchParams.get("sessionId") || searchParams.get("session") || "").trim();
  const format = (searchParams.get("format") || "js").toLowerCase();
  const ide = (searchParams.get("ide") || "vscode").toLowerCase();
  const customPath = (searchParams.get("path") || "").trim();

  if (!sessionId || isBlockedLegacySessionId(sessionId)) {
    return NextResponse.json({ ok: false, error: "Valid sessionId is required" }, { status: 400 });
  }

  const materialized = materializeProjectOnDisk(sessionId);
  const folderName = materialized.localFolderName || materialized.projectSlug || "amaze";
  const targetPathHint = customPath || materialized.localTargetPath;

  const nodeScript = buildBridgeNodeScript(
    sessionId,
    folderName,
    targetPathHint,
    materialized.files,
    ide
  );

  if (format === "cmd" || format === "bat") {
    const scriptB64 = Buffer.from(nodeScript, "utf-8").toString("base64");
    const cmdContent = [
      "@echo off",
      `title Vyrexo VS Code Sync - ${folderName}`,
      `echo Syncing ${materialized.files.length} files into your local "${folderName}" folder and launching VS Code...`,
      `node -e "eval(Buffer.from('${scriptB64}','base64').toString('utf8'))"`,
      "",
    ].join("\r\n");

    return new NextResponse(cmdContent, {
      status: 200,
      headers: {
        "Content-Type": "application/x-bat; charset=utf-8",
        "Content-Disposition": `attachment; filename="Open-${folderName}-in-VSCode.cmd"`,
        "Cache-Control": "no-store",
      },
    });
  }

  return new NextResponse(nodeScript, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    },
  });
}
