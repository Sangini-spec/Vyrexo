import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendDir = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(frontendDir, "..");

const standaloneServer = path.join(workspaceRoot, ".next", "standalone", "server.js");
const staticDir = path.join(workspaceRoot, ".next", "static");

if (!fs.existsSync(standaloneServer) || !fs.existsSync(staticDir)) {
  console.log("[ensure-build] Production standalone artifacts missing; building in background...");
  const child = spawn("npm", ["run", "build"], {
    cwd: frontendDir,
    stdio: "ignore",
    detached: true,
    env: { ...process.env, NODE_ENV: "production" },
  });
  child.unref();
}
