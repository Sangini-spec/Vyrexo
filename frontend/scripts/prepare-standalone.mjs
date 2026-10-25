import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendDir = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(frontendDir, "..");

const frontendNextDir = path.join(frontendDir, ".next");
const frontendStandaloneDir = path.join(frontendNextDir, "standalone");
const frontendStaticDir = path.join(frontendNextDir, "static");
const frontendPublicDir = path.join(frontendDir, "public");

const rootNextDir = path.join(workspaceRoot, ".next");
const rootStandaloneDir = path.join(rootNextDir, "standalone");
const rootStaticDir = path.join(rootNextDir, "static");
const rootPublicDir = path.join(workspaceRoot, "public");

const EXCLUDED_RUNTIME_PACKAGES = new Set(["typescript", "eslint", "@types"]);

function copyRealPackagesFromNodeModules(srcNodeModules, destNodeModules, dereferenceSymlinks = false) {
  if (!fs.existsSync(srcNodeModules)) return;
  fs.mkdirSync(destNodeModules, { recursive: true });

  for (const entry of fs.readdirSync(srcNodeModules)) {
    if (
      entry === ".bun" ||
      entry === ".bin" ||
      entry === ".cache" ||
      EXCLUDED_RUNTIME_PACKAGES.has(entry)
    ) {
      continue;
    }
    const entryPath = path.join(srcNodeModules, entry);
    let stat;
    try {
      stat = dereferenceSymlinks ? fs.statSync(entryPath) : fs.lstatSync(entryPath);
    } catch {
      continue;
    }

    const isAllowedDir = dereferenceSymlinks
      ? stat.isDirectory()
      : stat.isDirectory() && !stat.isSymbolicLink();

    if (entry.startsWith("@")) {
      if (isAllowedDir) {
        const scopeDest = path.join(destNodeModules, entry);
        fs.mkdirSync(scopeDest, { recursive: true });
        for (const subEntry of fs.readdirSync(entryPath)) {
          const subPath = path.join(entryPath, subEntry);
          try {
            const subStat = dereferenceSymlinks ? fs.statSync(subPath) : fs.lstatSync(subPath);
            const isAllowedSubDir = dereferenceSymlinks
              ? subStat.isDirectory()
              : subStat.isDirectory() && !subStat.isSymbolicLink();
            if (isAllowedSubDir) {
              const targetPkg = path.join(scopeDest, subEntry);
              if (!fs.existsSync(targetPkg)) {
                fs.cpSync(subPath, targetPkg, { recursive: true, dereference: true });
              }
            }
          } catch {}
        }
      }
    } else if (isAllowedDir) {
      const targetPkg = path.join(destNodeModules, entry);
      if (!fs.existsSync(targetPkg)) {
        fs.cpSync(entryPath, targetPkg, { recursive: true, dereference: true });
      }
    }
  }
}

function rewriteRequiredServerFiles(filePath, targetAppDir) {
  if (!fs.existsSync(filePath)) return;
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    parsed.appDir = targetAppDir;
    parsed.relativeAppDir = "";
    fs.writeFileSync(filePath, JSON.stringify(parsed), "utf-8");
  } catch {}
}

function main() {
  if (!fs.existsSync(frontendStandaloneDir)) {
    console.error("[prepare-standalone] Missing frontend/.next/standalone directory");
    process.exit(1);
  }
  if (!fs.existsSync(frontendStaticDir)) {
    console.error("[prepare-standalone] Missing frontend/.next/static directory");
    process.exit(1);
  }

  // Clean any previous root .next directory
  fs.rmSync(rootNextDir, { recursive: true, force: true });
  fs.mkdirSync(rootNextDir, { recursive: true });

  // Copy all standard Next.js build manifests & server output from frontend/.next to root .next
  for (const entry of fs.readdirSync(frontendNextDir)) {
    if (entry === "cache" || entry === "standalone" || entry === ".next-dev") continue;
    const srcPath = path.join(frontendNextDir, entry);
    const destPath = path.join(rootNextDir, entry);
    try {
      fs.cpSync(srcPath, destPath, { recursive: true, dereference: true });
    } catch {}
  }

  rewriteRequiredServerFiles(
    path.join(rootNextDir, "required-server-files.json"),
    workspaceRoot
  );

  fs.mkdirSync(rootStandaloneDir, { recursive: true });
  fs.mkdirSync(rootStaticDir, { recursive: true });

  // Determine whether Next.js nested the app under standalone/frontend or placed it at standalone/
  const nestedFrontendDir = path.join(frontendStandaloneDir, "frontend");
  const appStandaloneSrc = fs.existsSync(path.join(nestedFrontendDir, "server.js"))
    ? nestedFrontendDir
    : frontendStandaloneDir;

  // 1. Copy server.js and rewrite outputFileTracingRoot/turbopack.root so it is self-contained
  const serverJsSrc = path.join(appStandaloneSrc, "server.js");
  const serverJsDest = path.join(rootStandaloneDir, "server.js");
  let serverJsContent = fs.readFileSync(serverJsSrc, "utf-8");
  serverJsContent = serverJsContent
    .replace(/"outputFileTracingRoot":"[^"]*"/g, '"outputFileTracingRoot":__dirname')
    .replace(/"turbopack":\{"root":"[^"]*"\}/g, '"turbopack":{"root":__dirname}')
    .replace(/"relativeAppDir":"frontend"/g, '"relativeAppDir":""');
  fs.writeFileSync(serverJsDest, serverJsContent, "utf-8");

  if (appStandaloneSrc !== frontendStandaloneDir) {
    fs.writeFileSync(path.join(frontendStandaloneDir, "server.js"), serverJsContent, "utf-8");
  }

  // 2. Copy standalone .next server build artifacts into root .next/standalone/.next
  const standaloneNextSrc = path.join(appStandaloneSrc, ".next");
  const standaloneNextDest = path.join(rootStandaloneDir, ".next");
  fs.cpSync(standaloneNextSrc, standaloneNextDest, { recursive: true, dereference: true });
  rewriteRequiredServerFiles(
    path.join(standaloneNextDest, "required-server-files.json"),
    rootStandaloneDir
  );

  // 3. Copy static assets to root .next/static (control-plane-api mounts /.next/static -> /.next/static in archive)
  fs.cpSync(frontendStaticDir, rootStaticDir, { recursive: true, dereference: true });

  // 4. Sync frontend/public into root public (control-plane-api mounts /public -> /public in archive)
  if (fs.existsSync(frontendPublicDir)) {
    fs.mkdirSync(rootPublicDir, { recursive: true });
    fs.cpSync(frontendPublicDir, rootPublicDir, { recursive: true, dereference: true });
  }

  // 5. Flatten traced node_modules into root .next/standalone/node_modules with zero symlinks
  const destNodeModules = path.join(rootStandaloneDir, "node_modules");
  fs.mkdirSync(destNodeModules, { recursive: true });

  const bunDir = path.join(frontendStandaloneDir, "node_modules", ".bun");
  if (fs.existsSync(bunDir)) {
    for (const pkgDirName of fs.readdirSync(bunDir)) {
      if (pkgDirName === "node_modules") continue;
      const innerNodeModules = path.join(bunDir, pkgDirName, "node_modules");
      copyRealPackagesFromNodeModules(innerNodeModules, destNodeModules);
    }
  }

  copyRealPackagesFromNodeModules(path.join(frontendStandaloneDir, "node_modules"), destNodeModules, true);
  copyRealPackagesFromNodeModules(path.join(appStandaloneSrc, "node_modules"), destNodeModules, true);

  const appNodeModules = path.join(appStandaloneSrc, "node_modules");
  if (fs.existsSync(appNodeModules)) {
    for (const entry of fs.readdirSync(appNodeModules)) {
      if (
        entry === ".bin" ||
        entry === ".bun" ||
        EXCLUDED_RUNTIME_PACKAGES.has(entry)
      ) {
        continue;
      }
      const srcPath = path.join(appNodeModules, entry);
      const destPath = path.join(destNodeModules, entry);
      if (!fs.existsSync(destPath)) {
        try {
          fs.cpSync(srcPath, destPath, { recursive: true, dereference: true });
        } catch {}
      }
    }
  }

  // 6. Copy preset workspaces (excluding any .env* files) into standalone/workspaces
  const workspacesSrc = path.join(workspaceRoot, "workspaces");
  const workspacesDest = path.join(rootStandaloneDir, "workspaces");
  if (fs.existsSync(workspacesSrc)) {
    fs.cpSync(workspacesSrc, workspacesDest, {
      recursive: true,
      dereference: true,
      filter: (src) => {
        const base = path.basename(src).toLowerCase();
        return !base.startsWith(".env");
      },
    });
  }

  console.log("[prepare-standalone] Prepared root .next/standalone and .next/static for deployment.");
}

main();
