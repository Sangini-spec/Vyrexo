const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const standaloneServer = path.join(__dirname, ".next", "standalone", "server.js");

if (fs.existsSync(standaloneServer)) {
  process.env.PORT = process.env.PORT || "3000";
  process.env.HOSTNAME = process.env.HOSTNAME || "0.0.0.0";
  require(standaloneServer);
} else {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const server = spawn(npm, ["run", "start", "--workspace=frontend"], {
    cwd: __dirname,
    env: process.env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  server.on("error", (error) => {
    console.error("Failed to start the Vyrexo Next.js server:", error);
    process.exitCode = 1;
  });

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      if (!server.killed) server.kill(signal);
    });
  }

  server.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
    } else {
      process.exitCode = code ?? 1;
    }
  });
}