/**
 * In-memory Project Session Store
 * Tracks the active software project, specifications, features, and code structure
 * for each user session, ensuring persistent cognitive context across turns.
 */

export interface SessionProject {
  id: string;
  type: "investment_advisor" | "ecommerce" | "cosmetics_ecommerce" | "room_canvas" | "calculator" | "rest_api" | "custom";
  title: string;
  summary: string;
  features: string[];
  techStack: string[];
  components: string[];
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
  name: string;
  path: string;
  source: "local_folder" | "workspace" | "preset";
  summary: string;
  techStack: string[];
  filesCount: number;
  files: ProjectFile[];
  connectedAt: number;
  lastUpdatedAt: number;
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

export function setSessionProject(sessionId: string, project: SessionProject): void {
  sessionProjects.set(sessionId, project);
}

export function getSessionProject(sessionId: string): SessionProject | null {
  const existing = sessionProjects.get(sessionId);
  if (existing) return existing;

  // Strict session truth: If no project has been built or scaffolded in this session yet,
  // return null so Rex never hallucinates a pre-existing project like ApexWealth.
  return null;
}

export function updateSessionProjectType(
  sessionId: string,
  type: "investment_advisor" | "ecommerce" | "cosmetics_ecommerce" | "room_canvas" | "calculator" | "rest_api" | "custom",
  customTitle?: string,
  customSummary?: string
): SessionProject {
  const preset = PRESET_PROJECTS[type];
  if (preset) {
    const proj: SessionProject = {
      ...preset,
      id: sessionId,
      createdAt: Date.now(),
    };
    sessionProjects.set(sessionId, proj);
    return proj;
  }

  const title = customTitle || "Custom Web Application";
  const customProj: SessionProject = {
    id: sessionId,
    type: "custom",
    title,
    summary: customSummary || `Interactive software application for ${title}.`,
    features: [
      `Dedicated isolated sandbox workspace for ${title}`,
      "Interactive state management and responsive UI layout",
      "Multi-agent architecture and type-safe components",
    ],
    techStack: ["Next.js", "TypeScript", "Tailwind CSS"],
    components: ["src/components/App.tsx", "src/styles/globals.css"],
    previewUrl: `/api/preview?session=${encodeURIComponent(sessionId)}`,
    createdAt: Date.now(),
  };
  sessionProjects.set(sessionId, customProj);
  return customProj;
}

// ── Connected Projects (Local folder or workspace bound to specific session) ──

export function setSessionConnectedProject(sessionId: string, project: ConnectedProject): void {
  connectedSessionProjects.set(sessionId, project);

  // Synchronize high-level cognitive context so Gemini & fallbacks know the exact project
  const cognitiveProj: SessionProject = {
    id: sessionId,
    type: "custom",
    title: project.name,
    summary: project.summary,
    features: [
      `Local Connected Workspace: ${project.name} (${project.filesCount} files)`,
      `Tech Stack: ${project.techStack.join(", ")}`,
      "Direct folder access, multi-file inspection, and in-place code editing enabled",
    ],
    techStack: project.techStack,
    components: project.files.slice(0, 15).map((f) => f.path),
    previewUrl: `/api/preview?session=${encodeURIComponent(sessionId)}`,
    createdAt: project.connectedAt,
  };
  sessionProjects.set(sessionId, cognitiveProj);
}

export function getSessionConnectedProject(sessionId: string): ConnectedProject | null {
  return connectedSessionProjects.get(sessionId) || null;
}

export function removeSessionConnectedProject(sessionId: string): boolean {
  return connectedSessionProjects.delete(sessionId);
}

export function updateProjectFile(sessionId: string, filePath: string, content: string): boolean {
  const proj = connectedSessionProjects.get(sessionId);
  if (!proj) return false;

  const cleanPath = filePath.replace(/^\/+/, "");
  const existing = proj.files.find(
    (f) => f.path.replace(/^\/+/, "") === cleanPath || f.path.endsWith(cleanPath)
  );

  if (existing) {
    existing.content = content;
    existing.lastModified = Date.now();
    existing.size = new Blob([content]).size;
  } else {
    proj.files.push({
      path: cleanPath,
      content,
      size: new Blob([content]).size,
      lastModified: Date.now(),
    });
    proj.filesCount = proj.files.length;
  }

  proj.lastUpdatedAt = Date.now();
  return true;
}

export function getProjectFile(sessionId: string, filePath: string): ProjectFile | null {
  const proj = connectedSessionProjects.get(sessionId);
  if (!proj) return null;
  const cleanPath = filePath.replace(/^\/+/, "");
  return (
    proj.files.find(
      (f) => f.path.replace(/^\/+/, "") === cleanPath || f.path.endsWith(cleanPath)
    ) || null
  );
}

export function buildFileTree(files: ProjectFile[]): any[] {
  const root: Record<string, any> = {};

  for (const f of files) {
    const parts = f.path.replace(/^\/+/, "").split("/");
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

  // 1. Inspect package.json
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

  // 2. Inspect Python requirements / pyproject
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

  // 3. Inspect README.md
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

  // 4. File extension heuristics
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

// Map sessionId -> array of turns
const sessionChatHistories = new Map<string, SessionChatTurn[]>();
// Map sessionId -> last uploaded images (for cross-turn multimodal persistence)
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
  // Fallback: search backwards through turns in sessionChatHistories
  const turns = sessionChatHistories.get(sessionId) || [];
  for (let i = turns.length - 1; i >= 0; i--) {
    if (turns[i].images && turns[i].images!.length > 0) {
      return turns[i].images!;
    }
  }
  return [];
}

export function getSessionWorkspaceFiles(sessionId: string): ProjectFile[] {
  // 1. Check connectedSessionProjects
  const connected = getSessionConnectedProject(sessionId);
  if (connected && connected.files && connected.files.length > 0) {
    return connected.files;
  }

  // 2. Read from disk if available
  try {
    const fs = require("fs");
    const path = require("path");
    const wsBase = process.cwd().endsWith("frontend")
      ? path.resolve(process.cwd(), "..", "workspaces")
      : path.resolve(process.cwd(), "workspaces");
    const cleanId = sessionId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const wsDir = path.join(wsBase, cleanId);

    if (fs.existsSync(wsDir)) {
      const results: ProjectFile[] = [];
      function walk(dir: string, prefix = "") {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") continue;
          const fullPath = path.join(dir, entry.name);
          const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
          if (entry.isDirectory()) {
            walk(fullPath, relPath);
          } else if (entry.isFile()) {
            if (/\.(tsx|ts|jsx|js|json|css|html|md)$/i.test(entry.name)) {
              try {
                const content = fs.readFileSync(fullPath, "utf-8");
                results.push({
                  path: relPath,
                  content,
                  size: content.length,
                  lastModified: fs.statSync(fullPath).mtimeMs,
                });
              } catch {}
            }
          }
        }
      }
      walk(wsDir);
      if (results.length > 0) return results;
    }
  } catch {}

  return [];
}

export function getSessionChatHistory(sessionId: string): SessionChatTurn[] {
  return sessionChatHistories.get(sessionId) || [];
}

export function saveSessionChatHistory(sessionId: string, turns: SessionChatTurn[]): void {
  sessionChatHistories.set(sessionId, turns);
}

export function appendSessionChatTurn(sessionId: string, turn: Omit<SessionChatTurn, "timestamp"> & { timestamp?: number }): void {
  const current = sessionChatHistories.get(sessionId) || [];
  sessionChatHistories.set(sessionId, [
    ...current,
    {
      role: turn.role,
      text: turn.text,
      images: turn.images,
      docs: turn.docs,
      timestamp: turn.timestamp || Date.now(),
    },
  ]);
}

export function clearSessionChatHistory(sessionId: string): void {
  sessionChatHistories.delete(sessionId);
}

export function clearSessionChatsOlderThan(cutoffTimestamp: number): { deletedSessions: string[]; remainingSessions: string[] } {
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
}


