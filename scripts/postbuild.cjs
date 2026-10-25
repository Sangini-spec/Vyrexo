const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const frontendDir = path.join(rootDir, "frontend");
const frontendNextDir = path.join(frontendDir, ".next");
const rootNextDir = path.join(rootDir, ".next");

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.cpSync(src, dest, { recursive: true, force: true });
}

if (!fs.existsSync(frontendNextDir)) {
  console.error("[postbuild] Error: frontend/.next directory not found after build.");
  process.exit(1);
}

const standaloneDir = path.join(frontendNextDir, "standalone");
const staticDir = path.join(frontendNextDir, "static");

if (!fs.existsSync(standaloneDir)) {
  console.error("[postbuild] Error: frontend/.next/standalone directory not found. Ensure output: 'standalone' is enabled.");
  process.exit(1);
}

const nestedFrontendStandalone = path.join(standaloneDir, "frontend");
const nestedServerJs = path.join(nestedFrontendStandalone, "server.js");

if (fs.existsSync(nestedServerJs)) {
  // Copy static and public assets into the nested workspace standalone folder
  copyRecursive(staticDir, path.join(nestedFrontendStandalone, ".next", "static"));
  copyRecursive(path.join(frontendDir, "public"), path.join(nestedFrontendStandalone, "public"));
  copyRecursive(path.join(rootDir, "public"), path.join(nestedFrontendStandalone, "public"));

  // Create root entrypoint at .next/standalone/server.js that delegates to ./frontend/server.js
  const rootEntryJs = path.join(standaloneDir, "server.js");
  fs.writeFileSync(
    rootEntryJs,
    [
      'process.env.HOSTNAME = process.env.HOSTNAME || "0.0.0.0";',
      'process.env.PORT = process.env.PORT || "3000";',
      'require("./frontend/server.js");',
      "",
    ].join("\n"),
    "utf8"
  );
} else {
  copyRecursive(staticDir, path.join(standaloneDir, ".next", "static"));
  copyRecursive(path.join(frontendDir, "public"), path.join(standaloneDir, "public"));
  copyRecursive(path.join(rootDir, "public"), path.join(standaloneDir, "public"));
}

// Mirror frontend/.next to root .next so root-level artifact uploaders find .next/standalone and .next/static
if (fs.existsSync(rootNextDir)) {
  fs.rmSync(rootNextDir, { recursive: true, force: true });
}
copyRecursive(frontendNextDir, rootNextDir);

console.log("[postbuild] Successfully prepared .next/standalone and .next/static artifacts at root and frontend.");
