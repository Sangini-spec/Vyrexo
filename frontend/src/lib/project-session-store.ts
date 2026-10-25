/**
 * In-memory Project Session Store
 * Tracks the active software project, specifications, features, and code structure
 * for each user session, ensuring persistent cognitive context across turns.
 */

import {
  isBlockedLegacySessionId,
  getSessionOwner,
  areSameUserIdentity,
} from "./session-persistent-storage";

export interface SessionProject {
  id: string;
  userId?: string;
  type: "investment_advisor" | "ecommerce" | "cosmetics_ecommerce" | "room_canvas" | "calculator" | "rest_api" | "custom";
  title: string;
  summary: string;
  features: string[];
  techStack: string[];
  components: string[];
  files?: Array<{ path: string; content?: string; purpose?: string }>;
  previewUrl: string;
  createdAt: number;
}

export interface ProjectFile {
  path: string;
  content: string;
  size?: number;
  lastModified?: number;
}

export interface ConnectedProject {
  id: string;
  sessionId: string;
  userId?: string;
  name: string;
  localFolderName?: string;
  path: string;
  source: "local_folder" | "workspace" | "preset";
  summary: string;
  techStack: string[];
  filesCount: number;
  files: ProjectFile[];
  connectedAt: number;
  lastUpdatedAt: number;
}

export function verifySessionProjectOwnership(sessionId: string, userId?: string | null): boolean {
  if (!sessionId || isBlockedLegacySessionId(sessionId)) return false;
  const sessionOwner = getSessionOwner(sessionId);
  const inMemProj = sessionProjects.get(sessionId);
  const inMemConn = connectedSessionProjects.get(sessionId);
  const diskMeta = loadSessionProjectMetadataFromDisk(sessionId);
  const recordedOwner =
    sessionOwner ||
    inMemProj?.userId ||
    inMemConn?.userId ||
    diskMeta?.project?.userId ||
    diskMeta?.connected?.userId ||
    null;

  if (recordedOwner && userId) {
    return areSameUserIdentity(recordedOwner, userId);
  }
  return true;
}

// Map sessionId -> SessionProject (for high-level cognitive context)
const globalSessionStore = globalThis as unknown as {
  __sessionProjects?: Map<string, SessionProject>;
  __connectedSessionProjects?: Map<string, ConnectedProject>;
};

if (!globalSessionStore.__sessionProjects) {
  globalSessionStore.__sessionProjects = new Map<string, SessionProject>();
}
if (!globalSessionStore.__connectedSessionProjects) {
  globalSessionStore.__connectedSessionProjects = new Map<string, ConnectedProject>();
}

const sessionProjects = globalSessionStore.__sessionProjects;
const connectedSessionProjects = globalSessionStore.__connectedSessionProjects;

export const PRESET_PROJECTS: Record<string, Omit<SessionProject, "id" | "createdAt">> = {
  room_canvas: {
    type: "room_canvas",
    title: "Collaborative Virtual Space & Room Canvas",
    summary:
      "A real-time spatial 2D room canvas and collaborative virtual workspace featuring live peer presence, moving avatars, spatial audio indicators, spawnable furniture and objects, and real-time state synchronization.",
    features: [
      "Interactive 2D Spatial Canvas: Pan, zoom, and coordinate navigation across customizable room boundaries, grid lines, and physical layout.",
      "Real-time Peer Presence & Avatars: Smooth cursor and avatar movement broadcast with active status badges (Focusing, In Meeting, Designing) and proximity calculation.",
      "Spatial Object & Furniture Manipulation: Spawn and drag-and-drop collaborative objects (Work Desks, Interactive Whiteboard, Plants, Sticky Notes, Screen Share podium).",
      "In-Room Chat & Floating Reactions: Live emoji bursts (👍, 🚀, 🎉, ❤️, 💡) that float dynamically above avatars across the room.",
      "Spatial Audio & Distance Attenuation: Audio proximity simulation calculating drop-off volume based on distance between peer avatars.",
    ],
    techStack: ["Next.js", "TypeScript", "Tailwind CSS", "HTML5 Canvas API", "WebSocket Presence Sync"],
    components: [
      "src/components/RoomCanvas.tsx",
      "src/hooks/usePresence.ts",
      "package.json",
      "README.md",
    ],
    previewUrl: "/api/preview",
  },
  investment_advisor: {
    type: "investment_advisor",
    title: "Hyper-Personalized Investment Advisor (ApexWealth AI)",
    summary:
      "An autonomous quantitative wealth management and robo-advisory web application that provides personalized portfolio construction, automated asset allocation, real-time risk profiling, dynamic rebalancing, and tax-loss harvesting.",
    features: [
      "Interactive Risk Tolerance Profiler: Real-time dynamic calibration sliders for Investment Horizon (1–30 years), Maximum Drawdown Tolerance (5–50%), and Emergency Cash Buffer. Automatically computes a composite Risk Score (20–95) and assigns an optimal risk tier (Conservative Preservation, Balanced Core, or Aggressive Growth).",
      "Modern Portfolio Theory (MPT) Asset Allocation: Algorithmic capital distribution across 5 institutional asset classes: US Large-Cap Equities (VTI), International Equities (VXUS), Fixed Income Treasury Bonds (BND), Real Estate REITs (VNQ), and Liquid Cash (SGOV).",
      "One-Click Automated Portfolio Rebalancer: Real-time drift detection engine that flags allocation drift against target weights and calculates exact zero-commission Buy/Sell execution orders to restore target risk alignment.",
      "Automated Tax-Loss Harvesting Engine: Daily lot scanning that detects paper losses exceeding $250, swapping into correlated partner funds to capture tax deductions while strictly avoiding IRS wash-sale violations.",
      "Monte Carlo 30-Year Wealth Simulation: Stochastic modeling forecasting wealth growth across Bear (-2σ), Base (Historical Mean), and Bull (+2σ) macroeconomic scenarios.",
      "Fiduciary AI Health Score & Guidance: Continuous portfolio risk scoring, dividend yield projections, and expense ratio optimization advice.",
    ],
    techStack: [
      "Next.js",
      "TypeScript",
      "Tailwind CSS",
      "Modern Portfolio Theory (MPT) Core",
      "Monte Carlo Stochastic Simulator",
      "FontAwesome 6",
    ],
    components: [
      "src/components/RiskToleranceProfiler.tsx",
      "src/components/AssetAllocationMatrix.tsx",
      "src/components/RebalanceModal.tsx",
      "src/components/TaxLossHarvestingCard.tsx",
      "src/components/MonteCarloSimulation.tsx",
      "src/components/FiduciaryAdvisorHeader.tsx",
    ],
    previewUrl: "/api/preview",
  },
  ecommerce: {
    type: "ecommerce",
    title: "AuraMart — Modern E-Commerce Suite",
    summary:
      "A full-featured digital shopping experience featuring dynamic department filtering, live search, slide-out cart drawer with real-time subtotal calculation, and order tracking.",
    features: [
      "Multi-Department Product Catalog: Instant filtering across Fashion & Clothes, Household Essentials, and Prime Deals.",
      "Real-Time Search & Autocomplete: Fast client-side catalog search across titles, descriptions, and tags.",
      "Interactive Cart & Checkout: Slide-out cart drawer with live quantity steppers, subtotal updates, and simulated checkout.",
      "Order History & Tracking: Real-time tracking of recent purchases and delivery statuses.",
    ],
    techStack: ["Next.js", "TypeScript", "Tailwind CSS", "FontAwesome 6"],
    components: [
      "src/components/Navbar.tsx",
      "src/components/ProductCatalog.tsx",
      "src/components/CartDrawer.tsx",
      "src/components/OrderHistory.tsx",
    ],
    previewUrl: "/api/preview",
  },
  cosmetics_ecommerce: {
    type: "cosmetics_ecommerce",
    title: "AuraBeauty — Cosmetics & Skincare E-Commerce Platform",
    summary:
      "A luxury botanical cosmetics and skincare shopping experience featuring targeted skin-type routine filtering, live search, 5-step facial kit routines, quick view drawer with ingredients analysis, shopping bag with promo voucher discount engine, and live order tracking.",
    features: [
      "Targeted Skin-Type Filtering: Filter clinical formulations for Sensitive, Dry, Oily/Acne-Prone, and Mature skin.",
      "Comprehensive Beauty Catalog: 5-Step Facial Kits, Pure Hyaluronic Serums, Matcha Cleansers, Bakuchiol Elixirs, and Detox Masks.",
      "Interactive Shopping Bag & Discount Engine: Live quantity updates, free eco-shipping progress indicator, and promotional coupon engine (code: GLOW20).",
      "Quick-View Ingredients Modal: Full active ingredient breakdown, dermatological test results, and application guide.",
      "Encrypted Checkout & Live Fulfillment Tracker: 256-bit simulated payment gateway with real-time laboratory batch formulation tracking.",
    ],
    techStack: ["Next.js", "TypeScript", "Tailwind CSS", "FontAwesome 6"],
    components: [
      "src/components/CosmeticsStore.tsx",
      "src/data/products.ts",
      "src/types/cosmetics.ts",
      "package.json",
      "README.md",
    ],
    previewUrl: "/api/preview",
  },
  calculator: {
    type: "calculator",
    title: "OmniCalc Pro — Scientific & Financial Calculation Suite",
    summary:
      "A high-precision scientific, financial, and unit conversion computation platform featuring BODMAS order of operations, trigonometry (DEG/RAD), financial loan amortization (EMI), dimensional unit conversion, calculation history, and memory registers.",
    features: [
      "Real-time expression evaluation with BODMAS precedence and IEEE 754 precision formatting.",
      "Scientific & Engineering Suite: Trigonometric functions (sin, cos, tan, inverse), logarithms (ln, log10), powers, factorials, and constants (π, e).",
      "Financial Loan Amortization: Interactive loan principal, interest rate, and tenure sliders calculating monthly EMI, total interest, and amortization schedule.",
      "Multi-Category Dimensional Unit Converter: Instant bidirectional conversions for Length, Mass, Temperature, and Digital Storage.",
      "Hardware Keyboard Navigation & Memory Bank: Support for MC, MR, M+, M-, and persistent calculation audit history.",
    ],
    techStack: ["Next.js", "TypeScript", "Tailwind CSS", "FontAwesome 6", "Math & Financial Engine"],
    components: [
      "src/components/Calculator.tsx",
      "src/utils/mathEngine.ts",
      "src/types/calculator.ts",
      "package.json",
      "tests/calculator.test.ts",
      "README.md",
    ],
    previewUrl: "/api/preview",
  },
};

function getWorkspacesRoot(): string {
  const fs = require("fs");
  const os = require("os");
  const path = require("path");
  const candidate = process.cwd().endsWith("frontend")
    ? path.resolve(process.cwd(), "..", "workspaces")
    : path.resolve(process.cwd(), "workspaces");
  try {
    if (!fs.existsSync(candidate)) {
      fs.mkdirSync(candidate, { recursive: true });
    }
    fs.accessSync(candidate, fs.constants.W_OK);
    return candidate;
  } catch {
    const fallback = path.join(os.tmpdir(), "vyrexo-workspaces");
    try {
      fs.mkdirSync(fallback, { recursive: true });
    } catch {}
    return fallback;
  }
}

function getDataRoot(): string {
  const fs = require("fs");
  const os = require("os");
  const path = require("path");
  const dir = process.cwd().endsWith("frontend")
    ? path.resolve(process.cwd(), "..", ".data")
    : path.resolve(process.cwd(), ".data");
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.accessSync(dir, fs.constants.W_OK);
    return dir;
  } catch {
    const fallback = path.join(os.tmpdir(), "vyrexo-data");
    try {
      fs.mkdirSync(fallback, { recursive: true });
    } catch {}
    return fallback;
  }
}

function cleanWorkspaceFolderName(sessionId: string): string {
  return sessionId.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function saveSessionProjectMetadataToDisk(
  sessionId: string,
  project: SessionProject,
  connected?: ConnectedProject | null
): void {
  try {
    const fs = require("fs");
    const path = require("path");
    const dataDir = getDataRoot();
    const storePath = path.join(dataDir, "session-projects.json");
    let map: Record<string, { project: SessionProject; connected?: ConnectedProject }> = {};
    if (fs.existsSync(storePath)) {
      try {
        map = JSON.parse(fs.readFileSync(storePath, "utf-8"));
      } catch {}
    }
    const existingConn = connected || connectedSessionProjects.get(sessionId) || map[sessionId]?.connected;
    map[sessionId] = {
      project,
      connected: existingConn
        ? {
            ...existingConn,
            files: existingConn.files,
          }
        : undefined,
    };
    fs.writeFileSync(storePath, JSON.stringify(map, null, 2), "utf-8");

    const wsDir = path.join(getWorkspacesRoot(), cleanWorkspaceFolderName(sessionId));
    if (fs.existsSync(wsDir)) {
      fs.writeFileSync(
        path.join(wsDir, ".vyrexo-project.json"),
        JSON.stringify(
          {
            project,
            connected: existingConn
              ? {
                  ...existingConn,
                  files: existingConn.files,
                }
              : undefined,
            updatedAt: Date.now(),
          },
          null,
          2
        ),
        "utf-8"
      );
    }
  } catch {}
}

function loadSessionProjectMetadataFromDisk(
  sessionId: string
): { project?: SessionProject; connected?: ConnectedProject } | null {
  if (!sessionId || isBlockedLegacySessionId(sessionId)) return null;
  try {
    const fs = require("fs");
    const path = require("path");
    const wsDir = path.join(getWorkspacesRoot(), cleanWorkspaceFolderName(sessionId));
    const metaFile = path.join(wsDir, ".vyrexo-project.json");
    if (fs.existsSync(metaFile)) {
      const parsed = JSON.parse(fs.readFileSync(metaFile, "utf-8"));
      if (parsed?.project || parsed?.connected) {
        return { project: parsed.project, connected: parsed.connected };
      }
    }

    const storePath = path.join(getDataRoot(), "session-projects.json");
    if (fs.existsSync(storePath)) {
      const map = JSON.parse(fs.readFileSync(storePath, "utf-8"));
      if (map?.[sessionId]) return map[sessionId];
    }

    const legacyMeta = path.join(wsDir, "project-meta.json");
    if (fs.existsSync(legacyMeta)) {
      const parsed = JSON.parse(fs.readFileSync(legacyMeta, "utf-8"));
      if (parsed?.title) {
        return {
          project: {
            id: `proj_${sessionId}`,
            type: "custom",
            title: parsed.title,
            summary: `${parsed.title} sandbox application.`,
            features: ["Interactive React UI", "TypeScript Domain Models", "Automated Unit Tests"],
            techStack: ["React 19", "TypeScript", "Tailwind CSS", "Vite", "Bun Test"],
            components: ["src/components/App.tsx", "src/types/index.ts", "package.json", "tests/app.test.ts"],
            previewUrl: `/api/preview?session=${encodeURIComponent(sessionId)}`,
            createdAt: parsed.updatedAt || Date.now(),
          },
        };
      }
    }
  } catch {}
  return null;
}

/**
 * Ensures a complete 10-file runnable project structure exists inside workspaces/<sessionId>
 * when a project is built or restored after restart.
 */
export function materializeCompleteWorkspaceOnDisk(
  sessionId: string,
  title: string,
  coreFiles: Array<{ path: string; content: string }>
): ProjectFile[] {
  if (!sessionId || isBlockedLegacySessionId(sessionId)) return [];
  try {
    const fs = require("fs");
    const path = require("path");
    const cleanId = cleanWorkspaceFolderName(sessionId);
    const wsDir = path.join(getWorkspacesRoot(), cleanId);
    fs.mkdirSync(wsDir, { recursive: true });

    const slug =
      (title || "vyrexo-app")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 45) || "vyrexo-app";

    const fileMap = new Map<string, string>();
    for (const f of coreFiles) {
      if (f?.path && typeof f.content === "string") {
        fileMap.set(f.path.replace(/^\/+/, ""), f.content);
      }
    }

    if (!fileMap.has("index.html")) {
      fileMap.set(
        "index.html",
        `<!DOCTYPE html>\n<html lang="en" class="dark">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>${title}</title>\n    <script src="https://cdn.tailwindcss.com"></script>\n    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />\n  </head>\n  <body class="bg-slate-950 text-slate-100 antialiased">\n    <div id="root"></div>\n    <script type="module" src="/src/main.tsx"></script>\n  </body>\n</html>\n`
      );
    }

    if (!fileMap.has("src/main.tsx")) {
      fileMap.set(
        "src/main.tsx",
        `import React from "react";\nimport { createRoot } from "react-dom/client";\nimport App from "./components/App";\nimport "./styles/globals.css";\n\nconst container = document.getElementById("root");\nif (container) {\n  createRoot(container).render(\n    <React.StrictMode>\n      <App />\n    </React.StrictMode>\n  );\n}\n`
      );
    }

    if (!fileMap.has("src/styles/globals.css")) {
      fileMap.set(
        "src/styles/globals.css",
        `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\nbody {\n  margin: 0;\n  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;\n}\n`
      );
    }

    if (!fileMap.has("tsconfig.json")) {
      fileMap.set(
        "tsconfig.json",
        JSON.stringify(
          {
            compilerOptions: {
              target: "ES2022",
              lib: ["DOM", "DOM.Iterable", "ESNext"],
              module: "ESNext",
              moduleResolution: "bundler",
              jsx: "react-jsx",
              strict: true,
              esModuleInterop: true,
              skipLibCheck: true,
              noEmit: true,
            },
            include: ["src", "tests"],
          },
          null,
          2
        )
      );
    }

    if (!fileMap.has("vite.config.ts")) {
      fileMap.set(
        "vite.config.ts",
        `import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react";\n\nexport default defineConfig({\n  plugins: [react()],\n  server: { port: 5173, open: true },\n});\n`
      );
    }

    const workspaceSpecName = `${slug}.code-workspace`;
    if (!fileMap.has(workspaceSpecName)) {
      fileMap.set(
        workspaceSpecName,
        JSON.stringify(
          {
            folders: [{ path: ".", name: `${title} (${cleanId})` }],
            settings: {
              "editor.formatOnSave": true,
              "files.exclude": {
                "**/node_modules": true,
                "**/.git": true,
                "**/.vyrexo-project.json": true,
              },
            },
          },
          null,
          2
        )
      );
    }

    try {
      const existingEntries = fs.readdirSync(wsDir);
      for (const entry of existingEntries) {
        if (entry.endsWith(".code-workspace") && entry !== workspaceSpecName) {
          try {
            fs.unlinkSync(path.join(wsDir, entry));
          } catch {}
        }
      }
    } catch {}

    const writtenFiles: ProjectFile[] = [];
    for (const [relPath, content] of Array.from(fileMap.entries())) {
      const fullPath = path.join(wsDir, relPath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content, "utf-8");
      writtenFiles.push({
        path: relPath,
        content,
        size: Buffer.byteLength(content, "utf-8"),
        lastModified: Date.now(),
      });
    }

    return writtenFiles;
  } catch {
    return coreFiles.map((f) => ({
      path: f.path,
      content: f.content,
      size: f.content.length,
      lastModified: Date.now(),
    }));
  }
}

export function setSessionProject(sessionId: string, project: SessionProject, userId?: string): void {
  if (!sessionId || isBlockedLegacySessionId(sessionId)) return;
  const owner = userId || project.userId || getSessionOwner(sessionId) || undefined;
  const enriched: SessionProject = owner ? { ...project, userId: owner } : project;
  sessionProjects.set(sessionId, enriched);
  saveSessionProjectMetadataToDisk(sessionId, enriched);
}

export function getSessionProject(sessionId: string, userId?: string | null): SessionProject | null {
  if (!sessionId || isBlockedLegacySessionId(sessionId)) return null;
  if (userId !== undefined && !verifySessionProjectOwnership(sessionId, userId)) {
    return null;
  }

  const existing = sessionProjects.get(sessionId);
  if (existing) return existing;

  const diskMeta = loadSessionProjectMetadataFromDisk(sessionId);
  if (diskMeta?.project) {
    sessionProjects.set(sessionId, diskMeta.project);
    return diskMeta.project;
  }

  const wsFiles = getSessionWorkspaceFiles(sessionId);
  if (wsFiles.length > 0) {
    let detectedTitle = "Sandbox Web Application";
    const readme = wsFiles.find((f) => f.path.toLowerCase() === "readme.md");
    if (readme) {
      const m = readme.content.match(/^#\s+(.+)$/m);
      if (m && m[1]) detectedTitle = m[1].trim();
    }
    const pkg = wsFiles.find((f) => f.path === "package.json");
    if (detectedTitle === "Sandbox Web Application" && pkg) {
      try {
        const parsed = JSON.parse(pkg.content);
        if (parsed.name) detectedTitle = parsed.name;
      } catch {}
    }

    const owner = getSessionOwner(sessionId) || undefined;
    const reconstructed: SessionProject = {
      id: sessionId,
      userId: owner,
      type: "custom",
      title: detectedTitle,
      summary: `Interactive software application for ${detectedTitle}.`,
      features: [
        `Dedicated isolated sandbox workspace (${wsFiles.length} files)`,
        "Interactive components and state management",
        "Automated build and unit test verification",
      ],
      techStack: ["React 19", "TypeScript", "Tailwind CSS", "Vite", "Bun Test"],
      components: wsFiles.map((f) => f.path),
      previewUrl: `/api/preview?session=${encodeURIComponent(sessionId)}`,
      createdAt: Date.now(),
    };
    sessionProjects.set(sessionId, reconstructed);
    saveSessionProjectMetadataToDisk(sessionId, reconstructed);
    return reconstructed;
  }

  return null;
}

export function updateSessionProjectType(
  sessionId: string,
  type: "investment_advisor" | "ecommerce" | "cosmetics_ecommerce" | "room_canvas" | "calculator" | "rest_api" | "custom",
  customTitle?: string,
  customSummary?: string,
  userId?: string
): SessionProject {
  const owner = userId || getSessionOwner(sessionId) || undefined;
  const preset = PRESET_PROJECTS[type];
  if (preset) {
    const proj: SessionProject = {
      ...preset,
      id: sessionId,
      userId: owner,
      previewUrl: `/api/preview?session=${encodeURIComponent(sessionId)}`,
      createdAt: Date.now(),
    };
    if (!isBlockedLegacySessionId(sessionId)) {
      sessionProjects.set(sessionId, proj);
      saveSessionProjectMetadataToDisk(sessionId, proj);
    }
    return proj;
  }

  const title = customTitle || "Custom Web Application";
  const customProj: SessionProject = {
    id: sessionId,
    userId: owner,
    type: "custom",
    title,
    summary: customSummary || `Interactive software application for ${title}.`,
    features: [
      `Dedicated isolated sandbox workspace for ${title}`,
      "Interactive state management and responsive UI layout",
      "Multi-agent architecture and type-safe components",
    ],
    techStack: ["React 19", "TypeScript", "Tailwind CSS", "Vite"],
    components: [
      "src/components/App.tsx",
      "src/types/index.ts",
      "src/main.tsx",
      "src/styles/globals.css",
      "tests/app.test.ts",
      "package.json",
      "vite.config.ts",
      "tsconfig.json",
      "index.html",
      "README.md",
    ],
    previewUrl: `/api/preview?session=${encodeURIComponent(sessionId)}`,
    createdAt: Date.now(),
  };
  if (!isBlockedLegacySessionId(sessionId)) {
    sessionProjects.set(sessionId, customProj);
    saveSessionProjectMetadataToDisk(sessionId, customProj);
  }
  return customProj;
}

// ── Connected Projects (Local folder or workspace bound to specific session) ──

export function setSessionConnectedProject(sessionId: string, project: ConnectedProject, userId?: string): void {
  if (!sessionId || isBlockedLegacySessionId(sessionId)) return;
  const owner = userId || project.userId || getSessionOwner(sessionId) || undefined;
  const enrichedConn: ConnectedProject = owner ? { ...project, userId: owner } : project;
  connectedSessionProjects.set(sessionId, enrichedConn);

  const cognitiveProj: SessionProject = {
    id: sessionId,
    userId: owner,
    type: "custom",
    title: project.name,
    summary: project.summary,
    features: [
      `Workspace: ${project.name} (${project.filesCount} files)`,
      `Tech Stack: ${project.techStack.join(", ")}`,
      "Direct folder access, multi-file inspection, and iterative AI code evolution enabled",
    ],
    techStack: project.techStack,
    components: project.files.slice(0, 15).map((f) => f.path),
    previewUrl: `/api/preview?session=${encodeURIComponent(sessionId)}`,
    createdAt: project.connectedAt,
  };
  sessionProjects.set(sessionId, cognitiveProj);
  saveSessionProjectMetadataToDisk(sessionId, cognitiveProj, enrichedConn);
}

export function getSessionConnectedProject(sessionId: string, userId?: string | null): ConnectedProject | null {
  if (!sessionId || isBlockedLegacySessionId(sessionId)) return null;
  if (userId !== undefined && !verifySessionProjectOwnership(sessionId, userId)) {
    return null;
  }

  const existing = connectedSessionProjects.get(sessionId);
  if (existing && ((existing.files && existing.files.length > 0) || existing.source === "local_folder")) {
    return existing;
  }

  const diskMeta = loadSessionProjectMetadataFromDisk(sessionId);
  const wsFiles = getSessionWorkspaceFiles(sessionId);
  if (wsFiles.length > 0 || diskMeta?.connected?.source === "local_folder") {
    let projectName = diskMeta?.project?.title || diskMeta?.connected?.name || "";
    if (!projectName || /^session-\d+$/i.test(projectName)) {
      const readme = wsFiles.find((f) => f.path.toLowerCase() === "readme.md");
      if (readme) {
        const m = readme.content.match(/^#\s+(.+)$/m);
        if (m && m[1]) projectName = m[1].trim();
      }
    }
    if (!projectName || /^session-\d+$/i.test(projectName)) {
      projectName = diskMeta?.connected?.localFolderName || `Workspace (${sessionId})`;
    }

    const cleanId = cleanWorkspaceFolderName(sessionId);
    const owner = diskMeta?.connected?.userId || diskMeta?.project?.userId || getSessionOwner(sessionId) || undefined;
    const savedPath = diskMeta?.connected?.path || "";
    const isContainerPath =
      !savedPath ||
      savedPath.startsWith("/app/applet") ||
      savedPath.startsWith("/workspaces/") ||
      savedPath.startsWith("/local/") ||
      savedPath.startsWith("~/") ||
      savedPath.startsWith("~\\") ||
      savedPath === ".";
    const localFolderName =
      diskMeta?.connected?.localFolderName ||
      (savedPath.startsWith("/local/") ? savedPath.replace(/^\/local\/+/, "") : undefined) ||
      (savedPath.startsWith("~/") || savedPath.startsWith("~\\")
        ? savedPath.replace(/^~[\\/]+(?:Desktop|VyrexoWorkspaces)?[\\/]?/i, "")
        : undefined);
    const cleanSlug =
      (localFolderName || projectName)
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 45) || cleanId;
    const displayPath = !isContainerPath
      ? savedPath
      : `C:\\Users\\hp\\OneDrive\\Desktop\\${localFolderName || cleanSlug}`;

    const conn: ConnectedProject = {
      id: `ws-${cleanId}`,
      sessionId,
      userId: owner,
      name: projectName,
      localFolderName,
      path: displayPath,
      source: diskMeta?.connected?.source || (localFolderName ? "local_folder" : "workspace"),
      summary: diskMeta?.project?.summary || diskMeta?.connected?.summary || `${projectName} workspace (${wsFiles.length} files)`,
      techStack: diskMeta?.project?.techStack || diskMeta?.connected?.techStack || ["React", "TypeScript", "Tailwind CSS", "Vite"],
      filesCount: wsFiles.length,
      files: wsFiles,
      connectedAt: diskMeta?.project?.createdAt || diskMeta?.connected?.connectedAt || Date.now(),
      lastUpdatedAt: Date.now(),
    };
    connectedSessionProjects.set(sessionId, conn);
    return conn;
  }

  return null;
}

export function removeSessionConnectedProject(sessionId: string): boolean {
  sessionProjects.delete(sessionId);
  const removed = connectedSessionProjects.delete(sessionId);
  try {
    const fs = require("fs");
    const path = require("path");
    const storePath = path.join(getDataRoot(), "session-projects.json");
    if (fs.existsSync(storePath)) {
      const map = JSON.parse(fs.readFileSync(storePath, "utf-8"));
      if (map && map[sessionId]) {
        delete map[sessionId];
        fs.writeFileSync(storePath, JSON.stringify(map, null, 2), "utf-8");
      }
    }
  } catch {}
  return removed;
}

export function updateProjectFile(sessionId: string, filePath: string, content: string): boolean {
  const cleanPath = filePath.replace(/^\/+/, "");

  try {
    const fs = require("fs");
    const path = require("path");
    const cleanId = cleanWorkspaceFolderName(sessionId);
    const wsDir = path.join(getWorkspacesRoot(), cleanId);
    if (fs.existsSync(wsDir)) {
      const fullPath = path.join(wsDir, cleanPath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content, "utf-8");
    }
  } catch {}

  const proj = getSessionConnectedProject(sessionId);
  if (!proj) return false;

  const existing = proj.files.find(
    (f) => f.path.replace(/^\/+/, "") === cleanPath || f.path.endsWith(cleanPath)
  );

  if (existing) {
    existing.content = content;
    existing.lastModified = Date.now();
    existing.size = Buffer.byteLength(content, "utf-8");
  } else {
    proj.files.push({
      path: cleanPath,
      content,
      size: Buffer.byteLength(content, "utf-8"),
      lastModified: Date.now(),
    });
    proj.filesCount = proj.files.length;
  }

  proj.lastUpdatedAt = Date.now();
  return true;
}

export function getProjectFile(sessionId: string, filePath: string): ProjectFile | null {
  const cleanPath = filePath.replace(/^\/+/, "");
  const proj = getSessionConnectedProject(sessionId);
  if (proj) {
    const found = proj.files.find(
      (f) => f.path.replace(/^\/+/, "") === cleanPath || f.path.endsWith(cleanPath)
    );
    if (found) return found;
  }

  const wsFiles = getSessionWorkspaceFiles(sessionId);
  return (
    wsFiles.find(
      (f) => f.path.replace(/^\/+/, "") === cleanPath || f.path.endsWith(cleanPath)
    ) || null
  );
}

export function buildFileTree(files: ProjectFile[]): any[] {
  const root: Record<string, any> = {};

  for (const f of files) {
    const cleanRel = f.path.replace(/^\/+/, "");
    if (
      cleanRel === ".vyrexo-project.json" ||
      cleanRel === "project-meta.json" ||
      cleanRel.endsWith(".code-workspace")
    ) {
      continue;
    }
    const parts = cleanRel.split("/");
    let current = root;
    let currentPath = "";

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      if (i === parts.length - 1) {
        current[part] = { name: part, path: currentPath, type: "file" };
      } else {
        if (!current[part]) {
          current[part] = { name: part, path: currentPath, type: "dir", children: {} };
        }
        current = current[part].children;
      }
    }
  }

  function toNodes(obj: Record<string, any>): any[] {
    return Object.values(obj)
      .map((val: any) => {
        if (val.type === "dir") {
          return {
            name: val.name,
            path: val.path,
            type: "dir" as const,
            children: toNodes(val.children),
          };
        }
        return {
          name: val.name,
          path: val.path,
          type: "file" as const,
        };
      })
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }

  return toNodes(root);
}

export function analyzeCodebase(
  name: string,
  files: ProjectFile[]
): { summary: string; techStack: string[]; keyFiles: string[] } {
  const techStackSet = new Set<string>();
  const keyFiles: string[] = [];
  let detectedDescription = "";

  const pkgFile = files.find(
    (f) => f.path === "package.json" || f.path.endsWith("/package.json")
  );
  if (pkgFile) {
    keyFiles.push(pkgFile.path);
    try {
      const pkg = JSON.parse(pkgFile.content);
      if (pkg.description) detectedDescription = pkg.description;
      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      if (deps["next"]) techStackSet.add("Next.js");
      if (deps["react"]) techStackSet.add("React");
      if (deps["vue"]) techStackSet.add("Vue.js");
      if (deps["svelte"]) techStackSet.add("Svelte");
      if (deps["@angular/core"]) techStackSet.add("Angular");
      if (deps["tailwindcss"]) techStackSet.add("Tailwind CSS");
      if (deps["typescript"]) techStackSet.add("TypeScript");
      if (deps["express"]) techStackSet.add("Express");
      if (deps["fastify"]) techStackSet.add("Fastify");
      if (deps["vite"]) techStackSet.add("Vite");
    } catch {}
  }

  const pyProject = files.find(
    (f) =>
      f.path === "pyproject.toml" ||
      f.path.endsWith("/pyproject.toml") ||
      f.path === "requirements.txt" ||
      f.path.endsWith("/requirements.txt")
  );
  if (pyProject) {
    keyFiles.push(pyProject.path);
    techStackSet.add("Python");
    const lower = pyProject.content.toLowerCase();
    if (lower.includes("fastapi")) techStackSet.add("FastAPI");
    if (lower.includes("django")) techStackSet.add("Django");
    if (lower.includes("flask")) techStackSet.add("Flask");
  }

  const readme = files.find(
    (f) => f.path.toLowerCase() === "readme.md" || f.path.toLowerCase().endsWith("/readme.md")
  );
  if (readme) {
    keyFiles.push(readme.path);
    if (!detectedDescription) {
      const lines = readme.content
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !l.startsWith("#"));
      if (lines.length > 0) {
        detectedDescription = lines[0].slice(0, 240);
      }
    }
  }

  for (const f of files) {
    if (f.path.endsWith(".ts") || f.path.endsWith(".tsx")) techStackSet.add("TypeScript");
    if (f.path.endsWith(".jsx") || f.path.endsWith(".js")) techStackSet.add("JavaScript");
    if (f.path.endsWith(".py")) techStackSet.add("Python");
    if (f.path.endsWith(".rs")) techStackSet.add("Rust");
    if (f.path.endsWith(".go")) techStackSet.add("Go");
    if (f.path.endsWith(".css") || f.path.endsWith(".scss")) techStackSet.add("CSS");
    if (f.path.endsWith(".html")) techStackSet.add("HTML5");

    const p = f.path.replace(/^\/+/, "");
    if (
      [
        "src/index.ts",
        "src/index.js",
        "src/App.tsx",
        "src/components/App.tsx",
        "src/App.jsx",
        "src/main.tsx",
        "src/main.py",
        "app/page.tsx",
        "src/app/page.tsx",
      ].some((cand) => p.endsWith(cand))
    ) {
      if (!keyFiles.includes(f.path)) keyFiles.push(f.path);
    }
  }

  const stack = Array.from(techStackSet);
  if (stack.length === 0) stack.push("Source Files");

  const summary = detectedDescription
    ? `${name}: ${detectedDescription} Contains ${files.length} indexed files using ${stack.join(", ")}.`
    : `${name} codebase with ${files.length} files organized across ${stack.join(", ")}. Ready for AI-assisted review, refactoring, and updates.`;

  return {
    summary,
    techStack: stack,
    keyFiles: keyFiles.slice(0, 8),
  };
}

// ── Persistent Chat History Store ──────────────────────────────────────────

export interface SessionChatTurn {
  role: "user" | "assistant";
  text: string;
  images?: string[];
  docs?: string[];
  timestamp: number;
}

const sessionChatHistories = new Map<string, SessionChatTurn[]>();
const sessionLastImages = new Map<string, string[]>();

export function setSessionLastImages(sessionId: string, images: string[]): void {
  if (images && images.length > 0) {
    sessionLastImages.set(sessionId, images);
  }
}

export function getSessionLastImages(sessionId: string): string[] {
  if (sessionLastImages.has(sessionId)) {
    return sessionLastImages.get(sessionId)!;
  }
  const turns = getSessionChatHistory(sessionId);
  for (let i = turns.length - 1; i >= 0; i--) {
    if (turns[i].images && turns[i].images!.length > 0) {
      return turns[i].images!;
    }
  }
  return [];
}

export function getSessionWorkspaceFiles(sessionId: string): ProjectFile[] {
  if (!sessionId || isBlockedLegacySessionId(sessionId)) return [];
  const connected = connectedSessionProjects.get(sessionId);
  if (connected && connected.files && connected.files.length > 0) {
    return connected.files;
  }

  try {
    const fs = require("fs");
    const path = require("path");
    const wsBase = getWorkspacesRoot();
    const cleanId = cleanWorkspaceFolderName(sessionId);
    const wsDir = path.join(wsBase, cleanId);

    if (fs.existsSync(wsDir)) {
      const results: ProjectFile[] = [];
      function walk(dir: string, prefix = "") {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (
            entry.name === "node_modules" ||
            entry.name === ".git" ||
            entry.name === ".next" ||
            entry.name === "dist" ||
            entry.name === ".vscode" ||
            entry.name === ".vyrexo-project.json" ||
            entry.name === "project-meta.json" ||
            entry.name.endsWith(".code-workspace")
          ) {
            continue;
          }
          const fullPath = path.join(dir, entry.name);
          const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
          if (entry.isDirectory()) {
            walk(fullPath, relPath);
          } else if (entry.isFile()) {
            if (
              /\.(tsx|ts|jsx|js|py|json|css|html|md|yml|yaml|toml|sql|sh)$/i.test(entry.name) ||
              entry.name === "Dockerfile" ||
              entry.name === ".gitignore"
            ) {
              try {
                const content = fs.readFileSync(fullPath, "utf-8");
                results.push({
                  path: relPath,
                  content,
                  size: Buffer.byteLength(content, "utf-8"),
                  lastModified: fs.statSync(fullPath).mtimeMs,
                });
              } catch {}
            }
          }
        }
      }
      walk(wsDir);
      if (results.length > 0) {
        return results;
      }
    }

    // If workspace directory is missing on disk, check saved session-projects.json metadata and restore exact files
    const diskMeta = loadSessionProjectMetadataFromDisk(sessionId);
    if (diskMeta?.connected?.files && diskMeta.connected.files.length > 0) {
      fs.mkdirSync(wsDir, { recursive: true });
      for (const f of diskMeta.connected.files) {
        if (!f?.path || typeof f.content !== "string") continue;
        const cleanRel = f.path.replace(/^\/+/, "");
        const fullPath = path.join(wsDir, cleanRel);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, f.content, "utf-8");
      }
      return diskMeta.connected.files;
    }
  } catch {}

  return [];
}

/**
 * Restores an already-built project workspace from disk for a session without EVER
 * mutating, overwriting, or fabricating fake templates from the chat/session name.
 */
export function ensureSessionWorkspaceMaterialized(
  sessionId: string,
  _sessionTitle?: string,
  _chatTurns?: Array<{ role: string; text: string }>
): ConnectedProject | null {
  if (!sessionId || isBlockedLegacySessionId(sessionId)) return null;

  const existingConn = getSessionConnectedProject(sessionId);
  if (existingConn && existingConn.files && existingConn.files.length > 0) {
    return existingConn;
  }

  return null;
}

export function getSessionChatHistory(sessionId: string): SessionChatTurn[] {
  if (!sessionId || isBlockedLegacySessionId(sessionId)) return [];
  const mem = sessionChatHistories.get(sessionId);
  if (mem && mem.length > 0) return mem;

  try {
    const { readPersistedHistories } = require("./session-persistent-storage");
    const all = readPersistedHistories();
    if (Array.isArray(all[sessionId]) && all[sessionId].length > 0) {
      sessionChatHistories.set(sessionId, all[sessionId]);
      return all[sessionId];
    }
  } catch {}

  return [];
}

export function saveSessionChatHistory(sessionId: string, turns: SessionChatTurn[]): void {
  if (!sessionId || isBlockedLegacySessionId(sessionId)) return;
  sessionChatHistories.set(sessionId, turns);
  try {
    const { writePersistedHistory } = require("./session-persistent-storage");
    writePersistedHistory(sessionId, turns);
  } catch {}
}

export function appendSessionChatTurn(
  sessionId: string,
  turn: Omit<SessionChatTurn, "timestamp"> & { timestamp?: number }
): void {
  if (!sessionId || isBlockedLegacySessionId(sessionId)) return;
  const current = getSessionChatHistory(sessionId);
  const updated: SessionChatTurn[] = [
    ...current,
    {
      role: turn.role,
      text: turn.text,
      images: turn.images,
      docs: turn.docs,
      timestamp: turn.timestamp || Date.now(),
    },
  ];
  sessionChatHistories.set(sessionId, updated);
  try {
    const { writePersistedHistory } = require("./session-persistent-storage");
    writePersistedHistory(sessionId, updated);
  } catch {}
}

export function clearSessionChatHistory(sessionId: string): void {
  sessionChatHistories.delete(sessionId);
  try {
    const { deletePersistedHistory } = require("./session-persistent-storage");
    deletePersistedHistory(sessionId);
  } catch {}
}

export function clearSessionChatsOlderThan(cutoffTimestamp: number): {
  deletedSessions: string[];
  remainingSessions: string[];
} {
  const deletedSessions: string[] = [];
  const remainingSessions: string[] = [];

  for (const [sId, turns] of Array.from(sessionChatHistories.entries())) {
    const lastTurnTime = turns.length > 0 ? turns[turns.length - 1].timestamp : 0;
    if (lastTurnTime < cutoffTimestamp) {
      sessionChatHistories.delete(sId);
      deletedSessions.push(sId);
    } else {
      remainingSessions.push(sId);
    }
  }

  return { deletedSessions, remainingSessions };
}

export function clearAllSessionChatHistories(): void {
  sessionChatHistories.clear();
  try {
    const { clearAllPersistedHistories } = require("./session-persistent-storage");
    clearAllPersistedHistories();
  } catch {}
}



