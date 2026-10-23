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

const rootNextDir = path.join(workspaceRoot, ".next");
const rootStandaloneDir = path.join(rootNextDir, "standalone");
const rootStaticDir = path.join(rootNextDir, "static");

function copyRealPackagesFromNodeModules(srcNodeModules, destNodeModules) {
  if (!fs.existsSync(srcNodeModules)) return;
  fs.mkdirSync(destNodeModules, { recursive: true });

  for (const entry of fs.readdirSync(srcNodeModules)) {
    if (entry === ".bun" || entry === ".bin" || entry === ".cache") continue;
    const entryPath = path.join(srcNodeModules, entry);
    let stat;
    try {
      stat = fs.lstatSync(entryPath);
    } catch {
      continue;
    }

    if (entry.startsWith("@")) {
      if (stat.isDirectory() && !stat.isSymbolicLink()) {
        const scopeDest = path.join(destNodeModules, entry);
        fs.mkdirSync(scopeDest, { recursive: true });
        for (const subEntry of fs.readdirSync(entryPath)) {
          const subPath = path.join(entryPath, subEntry);
          try {
            const subStat = fs.lstatSync(subPath);
            if (subStat.isDirectory() && !subStat.isSymbolicLink()) {
              const targetPkg = path.join(scopeDest, subEntry);
              if (!fs.existsSync(targetPkg)) {
                fs.cpSync(subPath, targetPkg, { recursive: true, dereference: true });
              }
            }
          } catch {}
        }
      }
    } else if (stat.isDirectory() && !stat.isSymbolicLink()) {
      const targetPkg = path.join(destNodeModules, entry);
      if (!fs.existsSync(targetPkg)) {
        fs.cpSync(entryPath, targetPkg, { recursive: true, dereference: true });
      }
    }
  }
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
    .replace(/"turbopack":\{"root":"[^"]*"\}/g, '"turbopack":{"root":__dirname}');
  fs.writeFileSync(serverJsDest, serverJsContent, "utf-8");

  // 2. Copy standalone .next server build artifacts into root .next/standalone/.next
  const standaloneNextSrc = path.join(appStandaloneSrc, ".next");
  const standaloneNextDest = path.join(rootStandaloneDir, ".next");
  fs.cpSync(standaloneNextSrc, standaloneNextDest, { recursive: true, dereference: true });

  // 3. Copy static assets to both root .next/static and root .next/standalone/.next/static
  fs.cpSync(frontendStaticDir, rootStaticDir, { recursive: true, dereference: true });
  fs.cpSync(frontendStaticDir, path.join(standaloneNextDest, "static"), {
    recursive: true,
    dereference: true,
  });

  // 4. Flatten traced node_modules into root .next/standalone/node_modules with zero symlinks
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

  // Also copy any non-symlink packages from standalone/node_modules and appStandaloneSrc/node_modules
  copyRealPackagesFromNodeModules(path.join(frontendStandaloneDir, "node_modules"), destNodeModules);
  copyRealPackagesFromNodeModules(path.join(appStandaloneSrc, "node_modules"), destNodeModules);

  // If any top-level symlinks in appStandaloneSrc/node_modules were not in .bun, dereference them
  const appNodeModules = path.join(appStandaloneSrc, "node_modules");
  if (fs.existsSync(appNodeModules)) {
    for (const entry of fs.readdirSync(appNodeModules)) {
      if (entry === ".bin" || entry === ".bun") continue;
      const srcPath = path.join(appNodeModules, entry);
      const destPath = path.join(destNodeModules, entry);
      if (!fs.existsSync(destPath)) {
        try {
          fs.cpSync(srcPath, destPath, { recursive: true, dereference: true });
        } catch {}
      }
    }
  }

  // 5. Copy preset workspaces (excluding any .env* files) into standalone/workspaces
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

  // 6. Write clean package.json inside standalone
  const standalonePkg = {
    name: "vyrexo-standalone",
    version: "0.1.0",
    private: true,
    scripts: {
      start: "node server.js",
    },
  };
  fs.writeFileSync(
    path.join(rootStandaloneDir, "package.json"),
    JSON.stringify(standalonePkg, null, 2),
    "utf-8"
  );

  console.log("[prepare-standalone] Prepared root .next/standalone and .next/static for deployment.");
}

main();
