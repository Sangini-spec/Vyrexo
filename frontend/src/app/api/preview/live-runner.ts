import fs from "fs";
import path from "path";
import { exec, execSync } from "child_process";
import { promisify } from "util";
import { getWorkspaceDir } from "@/lib/workspace-executor";
import { getSessionConnectedProject, getSessionProject } from "@/lib/project-session-store";

const execAsync = promisify(exec);

export function generateLiveAppHtml(appCode: string, title: string, compiledJs?: string): string {
  // If we have compiled JavaScript from bun build, prepare it for native browser execution
  let executableScript = "";
  if (compiledJs) {
    const cleanedJs = compiledJs
      .replace(/import\s*\{[^}]*\}\s*from\s*["\x27]react[^"'\x27]*["\x27];?/g, "")
      .replace(/import\s*\{[^}]*\}\s*from\s*["\x27]react\/jsx-dev-runtime["\x27];?/g, "")
      .replace(/import\s*\{[^}]*\}\s*from\s*["\x27]react\/jsx-runtime["\x27];?/g, "")
      .replace(/export\s*\{[^}]*\};?/g, "")
      .replace(/export\s+default\s+/g, "")
      .replace(/export\s+(function|const|class)/g, "$1");

    executableScript = `
      <script>
        (function() {
          const rootEl = document.getElementById('root');
          window.onerror = function(msg, url, line, col, error) {
            if (rootEl) {
              const text = error?.stack || (error ? String(error) : (msg && msg !== 'Script error.' ? msg : 'Runtime evaluation error at line ' + line + ':' + col));
              rootEl.innerHTML = '<div class="p-6 m-6 bg-rose-950/90 border border-rose-800 rounded-xl text-rose-200 font-mono text-xs shadow-2xl">' +
                '<div class="flex items-center gap-2 font-bold text-rose-400 mb-2">' +
                  '<i class="fa-solid fa-triangle-exclamation text-sm"></i> Runtime Render Error' +
                '</div>' +
                '<pre class="whitespace-pre-wrap leading-relaxed">' + text + '</pre>' +
              '</div>';
            }
          };
          window.addEventListener('unhandledrejection', function(event) {
            if (rootEl) {
              const reason = event.reason?.stack || event.reason?.message || String(event.reason);
              rootEl.innerHTML = '<div class="p-6 m-6 bg-rose-950/90 border border-rose-800 rounded-xl text-rose-200 font-mono text-xs shadow-2xl">' +
                '<div class="flex items-center gap-2 font-bold text-rose-400 mb-2">' +
                  '<i class="fa-solid fa-triangle-exclamation text-sm"></i> Unhandled Promise Rejection' +
                '</div>' +
                '<pre class="whitespace-pre-wrap leading-relaxed">' + reason + '</pre>' +
              '</div>';
            }
          });

          try {
            const {
              useState,
              useEffect,
              useRef,
              useMemo,
              useCallback,
              createContext,
              useContext,
              Fragment,
              StrictMode,
              Suspense,
              memo,
              forwardRef
            } = window.React;
            window.Fragment = Fragment;

            function jsxDEV(type, props, key) {
              const p = props ? Object.assign({}, props) : {};
              if (key !== undefined) {
                p.key = key;
              }
              const actualType = type !== undefined ? type : (window.React ? window.React.Fragment : 'div');
              return window.React.createElement(actualType, p);
            }
            const jsx = jsxDEV;
            const jsxs = jsxDEV;

            ${cleanedJs}

            const root = ReactDOM.createRoot(rootEl);
            if (typeof App !== 'undefined') {
              root.render(React.createElement(App));
            } else if (typeof Calculator !== 'undefined') {
              root.render(React.createElement(Calculator));
            } else if (typeof CosmeticsStore !== 'undefined') {
              root.render(React.createElement(CosmeticsStore));
            } else if (typeof InvestmentAdvisorApp !== 'undefined') {
              root.render(React.createElement(InvestmentAdvisorApp));
            } else if (typeof Main !== 'undefined') {
              root.render(React.createElement(Main));
            } else if (typeof Component !== 'undefined') {
              root.render(React.createElement(Component));
            } else {
              rootEl.innerHTML = '<div class="p-8 text-center text-amber-400 font-mono text-xs"><i class="fa-solid fa-triangle-exclamation mb-2 text-xl block"></i>No App component found in bundle.</div>';
            }
          } catch (err) {
            console.error("[LivePreview] Execution error:", err);
            rootEl.innerHTML = '<div class="p-6 m-6 bg-rose-950/90 border border-rose-800 rounded-xl text-rose-200 font-mono text-xs shadow-2xl">' +
              '<div class="flex items-center gap-2 font-bold text-rose-400 mb-2">' +
                '<i class="fa-solid fa-circle-xmark text-sm"></i> Execution Error' +
              '</div>' +
              '<pre class="whitespace-pre-wrap leading-relaxed">' + (err.stack || err.message) + '</pre>' +
            '</div>';
          }
        })();
      </script>
    `;
  } else {
    // Fallback: Babel In-Browser transpiler with syntax cleaning
    const cleaned = appCode
      .replace(/^"use client";?\s*/m, "")
      .replace(/import\s+React[^\n]*\n?/g, "")
      .replace(/import\s+\{[^\}]*\}\s+from\s+["\x27]react["\x27];?\n?/g, "")
      .replace(/import\s+[^;]+;?\n?/g, "")
      .replace(/export\s+default\s+/g, "")
      .replace(/export\s+(function|const|class)/g, "$1")
      .replace(/^interface\s+\w+[\s\S]*?^\}/gm, "")
      .replace(/^type\s+\w+\s*=[\s\S]*?;/gm, "");

    executableScript = `
      <script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.5/babel.min.js"></script>
      <script>
        window.addEventListener('DOMContentLoaded', () => {
          const rootEl = document.getElementById('root');
          try {
            const raw = ${JSON.stringify(cleaned)};
            const transformed = Babel.transform(raw, {
              presets: [
                ['react', { runtime: 'classic' }],
                ['typescript', { isTSX: true, allExtensions: true }]
              ]
            }).code;

            const fn = new Function('React', 'ReactDOM', transformed + '\\nreturn typeof App !== "undefined" ? App : (typeof Main !== "undefined" ? Main : (typeof Calculator !== "undefined" ? Calculator : (typeof CosmeticsStore !== "undefined" ? CosmeticsStore : (typeof InvestmentAdvisorApp !== "undefined" ? InvestmentAdvisorApp : null))));');
            const Comp = fn(window.React, window.ReactDOM);
            if (Comp) {
              const root = ReactDOM.createRoot(rootEl);
              root.render(React.createElement(Comp));
            } else {
              rootEl.innerHTML = '<div class="p-8 text-center text-amber-400 font-mono text-xs">No App component defined.</div>';
            }
          } catch (err) {
            console.error("[LivePreview] Babel transform error:", err);
            rootEl.innerHTML = '<div class="p-6 m-6 bg-rose-950/90 border border-rose-800 rounded-xl text-rose-200 font-mono text-xs shadow-2xl">' +
              '<div class="flex items-center gap-2 font-bold text-rose-400 mb-2">' +
                '<i class="fa-solid fa-triangle-exclamation text-sm"></i> Transpilation Error' +
              '</div>' +
              '<pre class="whitespace-pre-wrap leading-relaxed">' + (err.stack || err.message) + '</pre>' +
            '</div>';
          }
        });
      </script>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
  <script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.6); }
    ::-webkit-scrollbar-thumb { background: rgba(51, 65, 85, 0.8); border-radius: 9999px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.8); }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen">
  <div id="root">
    <div class="p-8 text-center text-slate-500 font-mono text-xs">
      <i class="fa-solid fa-circle-notch fa-spin text-lg mb-2 block text-indigo-400"></i> Loading live sandbox...
    </div>
  </div>

  ${executableScript}
</body>
</html>`;
}

export function getWorkspaceAppCode(sessionId: string): { code: string; title: string; compiledJs?: string } | null {
  // 1. Check disk workspace first
  try {
    const wsDir = getWorkspaceDir(sessionId);
    const compDir = path.join(wsDir, "src", "components");

    let appPath = path.join(compDir, "App.tsx");
    if (!fs.existsSync(appPath) && fs.existsSync(compDir)) {
      const files = fs.readdirSync(compDir);
      const tsxFile = files.find((f) => f.endsWith(".tsx"));
      if (tsxFile) {
        appPath = path.join(compDir, tsxFile);
      }
    }

    const bundlePath = path.join(wsDir, "dist", "App.js");
    let compiledJs: string | undefined;
    if (fs.existsSync(bundlePath)) {
      compiledJs = fs.readFileSync(bundlePath, "utf-8");
    }

    if (fs.existsSync(appPath)) {
      const code = fs.readFileSync(appPath, "utf-8");
      const proj = getSessionProject(sessionId);
      const metaPath = path.join(wsDir, "project-meta.json");
      let title = proj?.title || "Autonomous Application";
      if (fs.existsSync(metaPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
          if (meta.title) title = meta.title;
        } catch {}
      }

      // If bundle doesn't exist yet or is empty, trigger quick sync compilation
      if (!compiledJs) {
        try {
          const outDir = path.join(wsDir, "dist");
          if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
          execSync(
            `bun build "${appPath}" --outfile "${bundlePath}" --external react --external react-dom`,
            { cwd: wsDir, timeout: 5000 }
          );
          if (fs.existsSync(bundlePath)) {
            compiledJs = fs.readFileSync(bundlePath, "utf-8");
          }
        } catch {}
      }

      return { code, title, compiledJs };
    }
  } catch (err) {
    console.warn("[getWorkspaceAppCode] Error reading workspace:", err);
  }

  // 2. Check connectedSessionProjects
  try {
    const connected = getSessionConnectedProject(sessionId);
    if (connected && connected.files) {
      const appFile = connected.files.find(
        (f) => f.path.endsWith("App.tsx") || f.path.endsWith("App.jsx") || f.path === "src/components/App.tsx"
      );
      if (appFile && appFile.content) {
        return { code: appFile.content, title: connected.name };
      }
    }
  } catch (err) {
    console.warn("[getWorkspaceAppCode] Error reading connected project:", err);
  }

  return null;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
