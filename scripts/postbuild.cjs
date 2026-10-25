const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const frontendDir = path.join(rootDir, "frontend");
const frontendNextDir = path.join(frontendDir, ".next");
const rootNextDir = path.join(rootDir, ".next");

if (!fs.existsSync(frontendNextDir)) {
  console.error("[postbuild] Error: frontend/.next directory not found after build.");
  process.exit(1);
}

const srcStandaloneDir = path.join(frontendNextDir, "standalone");
const srcStaticDir = path.join(frontendNextDir, "static");

if (!fs.existsSync(srcStandaloneDir)) {
  console.error(
    "[postbuild] Error: frontend/.next/standalone directory not found. Ensure output: 'standalone' is enabled."
  );
  process.exit(1);
}

/**
 * Copy a directory or file recursively while dereferencing all symlinks
 * so ZERO broken or absolute symlinks exist in the standalone Cloud Run container.
 */
function copyDereferenced(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src); // follows symlinks
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyDereferenced(path.join(src, entry), path.join(dest, entry));
    }
  } else if (stat.isFile()) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

/**
 * Flatten Bun's `.bun/<pkg>@<ver>/node_modules/<pkg>` store into standard top-level
 * `node_modules/<pkg>` directories with zero symlinks.
 */
function buildFlatNodeModules(srcNodeModules, destNodeModules) {
  fs.mkdirSync(destNodeModules, { recursive: true });
  if (!fs.existsSync(srcNodeModules)) return;

  const bunDir = path.join(srcNodeModules, ".bun");
  if (fs.existsSync(bunDir)) {
    const bunEntries = fs.readdirSync(bunDir, { withFileTypes: true });
    for (const bunEntry of bunEntries) {
      if (!bunEntry.isDirectory() || bunEntry.name === "node_modules") continue;
      const innerNm = path.join(bunDir, bunEntry.name, "node_modules");
      if (!fs.existsSync(innerNm)) continue;

      for (const pkgEntry of fs.readdirSync(innerNm, { withFileTypes: true })) {
        const pkgPath = path.join(innerNm, pkgEntry.name);
        if (pkgEntry.isSymbolicLink()) continue; // skip peer symlinks; copy real package folders first

        if (pkgEntry.name.startsWith("@") && pkgEntry.isDirectory()) {
          for (const scopedEntry of fs.readdirSync(pkgPath, { withFileTypes: true })) {
            if (scopedEntry.isSymbolicLink()) continue;
            const scopedSrc = path.join(pkgPath, scopedEntry.name);
            const scopedDest = path.join(destNodeModules, pkgEntry.name, scopedEntry.name);
            if (!fs.existsSync(scopedDest)) {
              copyDereferenced(scopedSrc, scopedDest);
            }
          }
        } else if (pkgEntry.isDirectory()) {
          const pkgDest = path.join(destNodeModules, pkgEntry.name);
          if (!fs.existsSync(pkgDest)) {
            copyDereferenced(pkgPath, pkgDest);
          }
        }
      }
    }
  }

  // Also copy any non-.bun packages from srcNodeModules (dereferencing symlinks if not already present)
  for (const entry of fs.readdirSync(srcNodeModules, { withFileTypes: true })) {
    if (entry.name === ".bun" || entry.name === ".cache") continue;
    const srcPath = path.join(srcNodeModules, entry.name);
    const destPath = path.join(destNodeModules, entry.name);
    if (!fs.existsSync(destPath)) {
      copyDereferenced(srcPath, destPath);
    }
  }
}

// Prepare a clean, flat standalone staging directory
const stagingStandalone = path.join(rootDir, ".next-standalone-staging");
if (fs.existsSync(stagingStandalone)) {
  fs.rmSync(stagingStandalone, { recursive: true, force: true });
}
fs.mkdirSync(stagingStandalone, { recursive: true });

const nestedFrontendDir = path.join(srcStandaloneDir, "frontend");
const appSourceDir = fs.existsSync(path.join(nestedFrontendDir, "server.js"))
  ? nestedFrontendDir
  : srcStandaloneDir;

// 1. Copy server.js directly to root of standalone
copyDereferenced(
  path.join(appSourceDir, "server.js"),
  path.join(stagingStandalone, "server.js")
);

// 2. Copy .next server build artifacts into standalone/.next
copyDereferenced(
  path.join(appSourceDir, ".next"),
  path.join(stagingStandalone, ".next")
);

// 3. Copy static assets into standalone/.next/static
copyDereferenced(
  srcStaticDir,
  path.join(stagingStandalone, ".next", "static")
);

// 4. Copy public assets from both root/public and frontend/public into standalone/public and root/public
const rootPublicDir = path.join(rootDir, "public");
const frontendPublicDir = path.join(frontendDir, "public");
copyDereferenced(rootPublicDir, path.join(stagingStandalone, "public"));
copyDereferenced(frontendPublicDir, path.join(stagingStandalone, "public"));
copyDereferenced(frontendPublicDir, rootPublicDir);

// 5. Copy optional helper scripts (e.g., edge-tts-synth.mjs)
if (fs.existsSync(path.join(appSourceDir, "scripts"))) {
  copyDereferenced(
    path.join(appSourceDir, "scripts"),
    path.join(stagingStandalone, "scripts")
  );
}

// 6. Flatten & dereference node_modules so zero symlinks exist
const destNodeModules = path.join(stagingStandalone, "node_modules");
buildFlatNodeModules(path.join(srcStandaloneDir, "node_modules"), destNodeModules);
if (appSourceDir !== srcStandaloneDir) {
  buildFlatNodeModules(path.join(appSourceDir, "node_modules"), destNodeModules);
}

// 7. Write clean production package.json for standalone root
const standalonePkg = {
  name: "vyrexo-standalone",
  version: "0.1.0",
  private: true,
  scripts: {
    start: "node server.js",
  },
};
fs.writeFileSync(
  path.join(stagingStandalone, "package.json"),
  JSON.stringify(standalonePkg, null, 2) + "\n",
  "utf8"
);

// 8. Populate root /.next/standalone and /.next/static
if (fs.existsSync(rootNextDir)) {
  fs.rmSync(rootNextDir, { recursive: true, force: true });
}
fs.mkdirSync(rootNextDir, { recursive: true });
copyDereferenced(stagingStandalone, path.join(rootNextDir, "standalone"));
copyDereferenced(srcStaticDir, path.join(rootNextDir, "static"));

// Also replace frontend/.next/standalone with the clean flat standalone directory
fs.rmSync(srcStandaloneDir, { recursive: true, force: true });
copyDereferenced(stagingStandalone, srcStandaloneDir);

// Clean up staging directory
fs.rmSync(stagingStandalone, { recursive: true, force: true });

console.log(
  "[postbuild] Prepared flat, symlink-free .next/standalone and .next/static artifacts for Cloud Run."
);
