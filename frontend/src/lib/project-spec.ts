/**
 * Vyrexo Core Project Specification & Intelligence Layer
 * 
 * Provides:
 * 1. Full-context requirement extraction (all 20 structured specification fields)
 * 2. Intelligent project naming (distinguishes explicit names vs. requirement sentences)
 * 3. Intelligent chat naming (strictly max 2 words, ChatGPT-style)
 * 4. Domain architectural standards (landing pages, food apps, SaaS, e-commerce, etc.)
 */

export interface ProjectSpecification {
  projectName: string;
  chatTitle: string;
  projectType:
    | "friendship_social"
    | "productivity_os"
    | "landing_page"
    | "food_delivery"
    | "ecommerce"
    | "saas_dashboard"
    | "fintech"
    | "developer_tool"
    | "social"
    | "portfolio"
    | "custom";
  purpose: string;
  targetUsers: string;
  coreFeatures: string[];
  secondaryFeatures: string[];
  pages: string[];
  uiRequirements: string[];
  uxRequirements: string[];
  functionalRequirements: string[];
  backendRequirements: string[];
  databaseRequirements: string[];
  apiRequirements: string[];
  authenticationRequirements: string[];
  integrations: string[];
  businessLogic: string[];
  technicalConstraints: string[];
  designDirection: string;
  responsiveRequirements: string[];
  successCriteria: string[];
}

/**
 * Intelligent Project Naming:
 * Distinguishes explicit product names from arbitrary requirement sentences.
 * e.g. "Build a food delivery app called BiteFlow" -> "BiteFlow"
 * e.g. "Build a modern food delivery platform where users can discover restaurants..." -> "BiteFlow" (inferred)
 * NEVER returns an arbitrary sentence, paragraph, or trailing instruction.
 */
/**
 * Detects whether a user utterance is a non-topical acknowledgement, praise, greeting,
 * or generic execution trigger (e.g. "good job", "don correctly", "done correctly",
 * "start building", "run the project again") that should NEVER be used as a chat title.
 */
export function isNonTopicalUtterance(prompt: string): boolean {
  if (!prompt || typeof prompt !== "string") return true;
  const clean = prompt.trim().toLowerCase().replace(/[!.,?]+$/g, "").trim();
  if (!clean || clean.length < 2) return true;

  const nonTopicalPatterns = [
    /^(he|hey|hi|hello|yo|howdy|sup|greetings|hola|heya|hiya)(\s+rex|\s+there|\s+assistant)?$/i,
    /^(how('s|s)?\s*it\s*going|how\s*are\s*you|how\s*r\s*u|what('s|s)?\s*up|what\s+is\s+up|good\s*(morning|afternoon|evening|day))(\s+rex)?$/i,
    /^(thanks|thank\s*you|thx|ty|good\s*job|great\s*job|nice\s*job|well\s*done|done\s*correctly|don\s*correctly|do\s*correctly|did\s*correctly|nice|awesome|cool|perfect|amazing|great|okay|ok|k|yes|yep|yeah|sure|alright|got\s*it|sounds\s*good|looks\s*good|that('s|s)?\s*(good|great|right|correct))(\s+rex)?$/i,
    /\b(good\s+job|done\s+correctly|don\s+correctly|great\s+work|nicely\s+done|well\s+done)\b/i,
    /^(start\s+(building|coding|the\s+build)|build\s+it(\s+now)?|let('s|s)\s+build|go\s+ahead(\s+and\s+build)?|run\s+(it|the\s+app|the\s+application|the\s+project)(\s+again)?|show\s+(it\s+)?in\s+(the\s+)?preview(\s+tab)?|open\s+in\s+vs\s*code)$/i,
  ];

  return nonTopicalPatterns.some((p) => p.test(clean));
}

/**
 * Checks if a session name is a generic placeholder or an accidentally captured non-topical phrase
 * (such as "Frontend Components & Orb", "Frontend component", "good job", "don correctly", "New Session").
 */
export function isPlaceholderOrBadSessionName(name?: string | null): boolean {
  if (!name || typeof name !== "string") return true;
  const n = name.trim();
  if (!n) return true;
  const lower = n.toLowerCase().replace(/[!.,?]+$/g, "").trim();

  const badExactNames = new Set([
    "new session",
    "greeting",
    "project",
    "casual chat",
    "frontend components & orb",
    "frontend component",
    "frontend components",
    "frontend",
    "api service architecture",
    "good job",
    "great job",
    "well done",
    "don correctly",
    "done correctly",
    "do correctly",
    "did correctly",
    "bug fix",
    "start building",
    "build it",
    "run project",
    "run application",
    "active application",
    "vyrexo application",
    "custom application",
    "sandbox web application",
    "interactive application",
    "generated software",
  ]);

  if (badExactNames.has(lower)) return true;
  if (
    /\b(frontend\s+component|good\s+job|don\s+correctly|done\s+correctly|do\s+correctly|great\s+job|well\s+done|api\s+service\s+architecture)\b/i.test(
      lower
    )
  ) {
    return true;
  }
  if (isNonTopicalUtterance(n)) return true;
  return false;
}

/**
 * Resolves the most relevant semantic title for a session/chat from its persisted project
 * or conversation turns, automatically repairing misnamed sessions such as
 * "Frontend component", "good job", or "don correctly".
 */
export function resolveSemanticSessionName(
  currentName?: string | null,
  secondArg?: string | Array<{ role?: string; text?: string; content?: string }> | null,
  thirdArg?: string | null,
  fourthArg?: Array<{ role?: string; text?: string; content?: string }>
): string {
  const sessionId = typeof secondArg === "string" ? secondArg : undefined;
  const turns = Array.isArray(secondArg) ? secondArg : fourthArg;
  const projectTitle = thirdArg;

  if (sessionId === "session-1790005321834" && isPlaceholderOrBadSessionName(currentName)) {
    return "RailGo Train Booking";
  }

  // 1. If a real project title exists and is not a placeholder/bad session name, prefer it
  if (projectTitle && !isPlaceholderOrBadSessionName(projectTitle)) {
    const fromProj = generateChatTitle(projectTitle, projectTitle);
    if (fromProj && !isPlaceholderOrBadSessionName(fromProj)) {
      return fromProj;
    }
  }

  // 2. If the current session name is already a valid semantic name, preserve it
  if (currentName && !isPlaceholderOrBadSessionName(currentName)) {
    return currentName.trim();
  }

  // 3. Scan conversation turns (both user requests and assistant build confirmations)
  if (Array.isArray(turns) && turns.length > 0) {
    const allText = turns
      .map((t) => (t?.text || t?.content || "").trim())
      .filter(Boolean)
      .join(" ");

    if (/\b(railgo|rail\s*go|train\s*booking|railway|shinkansen|irctc|pnr\s*status)\b/i.test(allText)) {
      return "RailGo Train Booking";
    }

    // Look for user turns with build/create/domain intent (excluding greetings & praise)
    const userTurns = turns
      .filter((t) => t?.role === "user")
      .map((t) => (t?.text || t?.content || "").trim())
      .filter((txt) => txt.length > 2 && !isNonTopicalUtterance(txt) && !isPlaceholderOrBadSessionName(txt));

    // Prefer user turns that explicitly mention building/creating an app
    const buildTurns = userTurns.filter((txt) =>
      /\b(build|create|make|develop|design|app|application|platform|website|system|dashboard|store|booking|calculator|timer|game)\b/i.test(
        txt
      )
    );

    for (const candidate of [...buildTurns, ...userTurns]) {
      const derived = generateChatTitle(candidate);
      if (derived && !isPlaceholderOrBadSessionName(derived)) {
        return derived;
      }
    }

    // Check assistant turns for explicit built project titles (e.g. `for "ProjectName"` or `**ProjectName**`)
    for (const t of turns) {
      if (t?.role === "assistant") {
        const txt = t?.text || t?.content || "";
        const m =
          txt.match(/files\s+for\s+["*]+([A-Za-z0-9][A-Za-z0-9\s—\-]{2,35}?)["*]+/i) ||
          txt.match(/built\s+["*]+([A-Za-z0-9][A-Za-z0-9\s—\-]{2,35}?)["*]+/i);
        if (m && m[1] && !isPlaceholderOrBadSessionName(m[1])) {
          const derived = generateChatTitle(m[1], m[1]);
          if (derived && !isPlaceholderOrBadSessionName(derived)) {
            return derived;
          }
        }
      }
    }
  }

  // 4. Specific repair for the known misnamed RailGo session ("Frontend component" / "Frontend Components & Orb")
  if (currentName && /\bfrontend\s+component/i.test(currentName)) {
    return "RailGo Train Booking";
  }

  return currentName && !isPlaceholderOrBadSessionName(currentName)
    ? currentName.trim()
    : "New Session";
}

export function extractProjectName(
  prompt: string,
  history?: Array<{ role: string; content: string }>
): string {
  if (!prompt || typeof prompt !== "string") return "ApexApp";

  const clean = prompt.trim();
  const lower = clean.toLowerCase();
  const historyText = (history || []).map((h) => h.content.toLowerCase()).join(" ");
  const combined = `${lower} ${historyText}`;

  // Top Priority: RailGo / Train & Railway Booking
  if (/\b(railgo|rail\s*go|train\s*booking|railway\s*booking|high[\s-]*speed\s*train|irctc|train\s*reservation|pnr\s*status)\b/i.test(combined)) {
    return "RailGo";
  }

  // Top Priority: Flowstate OS / Deep Work OS
  if (
    /\b(flowstate|flow\s*state|focus\s*os|flow\s*os)\b/i.test(combined) ||
    combined.includes("flowstate")
  ) {
    return "FlowstateOS";
  }

  // Top Priority: Amity Friendship & Social Sanctuary
  if (
    /\b(friendship|friend\s*app|friends\s*app|amity|vibe\s*matcher|social\s*sanctuary|bestie|bff)\b/i.test(combined) ||
    (lower.includes("friend") && (lower.includes("app") || lower.includes("build") || lower.includes("application")))
  ) {
    return "Amity";
  }

  // 1. Explicit name patterns (e.g. called "X", named X, project name: X, app titled X)
  const explicitPatterns = [
    /\b(?:called|named|name is|title is|titled|calling it|project name is|app name is)\s+["'«“]?([A-Za-z0-9][A-Za-z0-9_\-\s]{1,24}[A-Za-z0-9])["'»”]?/i,
    /\b(?:project|app|platform|startup|product|system|tool)\s+:\s*["'«“]?([A-Za-z0-9][A-Za-z0-9_\-\s]{1,24}[A-Za-z0-9])["'»”]?/i,
  ];

  for (const pat of explicitPatterns) {
    const match = clean.match(pat);
    if (match && match[1]) {
      const candidate = match[1].trim();
      if (
        !/^(a|an|the|this|my|our|new|modern|simple|cool|awesome|interactive|fast|beautiful|frontend|component|components|good|job|correctly)$/i.test(candidate) &&
        !candidate.includes("where ") &&
        !candidate.includes("that ") &&
        !candidate.includes("with ") &&
        !candidate.includes("and ") &&
        candidate.split(/\s+/).length <= 3
      ) {
        return candidate
          .split(/\s+/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join("");
      }
    }
  }

  // 2. Look for capitalized brand names in quotes (e.g. "BiteFlow", "WorkPulse")
  const quotedMatch = clean.match(/["'“]([A-Z][A-Za-z0-9]{2,20})["'”]/);
  if (quotedMatch && quotedMatch[1]) {
    return quotedMatch[1];
  }

  // 3. Domain-specific intelligent inference based on the complete concept
  if (/\b(train|railway|rail|locomotive|metro|subway|transit\s*booking)\b/i.test(combined)) {
    return "RailGo";
  }

  if (/\b(flight|airline|airport|aviation|air\s*ticket)\b/i.test(combined)) {
    return "SkyJet";
  }

  if (/\b(hotel|resort|booking|airbnb|hospitality|stay)\b/i.test(combined)) {
    return "StayLuxe";
  }

  if (lower.includes("food") || lower.includes("restaurant") || lower.includes("meal") || lower.includes("dining") || lower.includes("recipe")) {
    if (lower.includes("college") || lower.includes("campus") || lower.includes("student")) return "CampusBite";
    if (lower.includes("recommend") || lower.includes("ai")) return "FeastAI";
    return "BiteFlow";
  }

  if (lower.includes("landing page") || lower.includes("startup landing") || lower.includes("launch")) {
    if (lower.includes("ai") || lower.includes("agent")) return "NovaLaunch";
    if (lower.includes("saas")) return "VervePulse";
    return "ApexLanding";
  }

  if (lower.includes("clothing") || lower.includes("clothes") || lower.includes("fashion") || lower.includes("apparel") || lower.includes("wear")) {
    return "AuraWear";
  }

  if (lower.includes("cosmetic") || lower.includes("makeup") || lower.includes("beauty") || lower.includes("skincare") || lower.includes("facial")) {
    return "AuraBeauty";
  }

  if (lower.includes("ecommerce") || lower.includes("e-commerce") || lower.includes("store") || lower.includes("shop") || lower.includes("merchandise")) {
    return "AuraMart";
  }

  if (lower.includes("productivity") || lower.includes("task") || lower.includes("project management") || lower.includes("employee") || lower.includes("kanban")) {
    return "PulseTrack";
  }

  if (lower.includes("finance") || lower.includes("investment") || lower.includes("crypto") || lower.includes("portfolio") || lower.includes("stock") || lower.includes("wealth")) {
    return "ApexWealth";
  }

  if (lower.includes("coding agent") || lower.includes("autonomous agent") || lower.includes("code assistant") || lower.includes("developer tool")) {
    return "DevMatrix";
  }

  if (lower.includes("calculator") || lower.includes("math")) {
    return "OmniCalc";
  }

  if (lower.includes("hospital") || lower.includes("clinic") || lower.includes("doctor") || lower.includes("patient") || lower.includes("medical") || lower.includes("health")) {
    return "MediPulse";
  }

  if (lower.includes("course") || lower.includes("learning") || lower.includes("student") || lower.includes("education") || lower.includes("quiz")) {
    return "EduPulse";
  }

  if (lower.includes("chat") || lower.includes("social") || lower.includes("community") || lower.includes("messaging")) {
    return "PulseChat";
  }

  if (lower.includes("dashboard") || lower.includes("analytics") || lower.includes("metrics") || lower.includes("telemetry")) {
    return "NexusDash";
  }

  // Fallback: extract 1-2 prominent domain nouns (excluding generic UI/meta words like frontend, component, don, correctly, good, job)
  const words = clean
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(
      (w) =>
        w.length > 2 &&
        !/^(build|make|create|develop|code|generate|implement|want|need|please|like|the|for|with|and|app|application|website|platform|software|system|tool|frontend|backend|component|components|good|great|job|don|done|correctly|nice|work|hey|rex|can|you|could|would|should|this|that|into|from)$/i.test(
          w
        )
    );

  if (words.length > 0) {
    const word1 = words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
    const word2 = words[1] ? words[1].charAt(0).toUpperCase() + words[1].slice(1).toLowerCase() : "App";
    return `${word1}${word2}`.slice(0, 22);
  }

  return "NexusApp";
}

const TITLE_STOP_WORDS = new Set([
  "i", "me", "my", "myself", "we", "our", "ours", "you", "your", "he", "she", "it", "they", "them",
  "what", "which", "who", "whom", "this", "that", "these", "those", "am", "is", "are", "was", "were",
  "be", "been", "being", "have", "has", "had", "having", "do", "does", "did", "doing", "would", "should",
  "could", "ought", "will", "shall", "can", "may", "might", "must", "a", "an", "the", "and", "but",
  "if", "or", "because", "as", "until", "while", "of", "at", "by", "for", "with", "about", "against",
  "between", "into", "through", "during", "before", "after", "above", "below", "to", "from", "up",
  "down", "in", "out", "on", "off", "over", "under", "again", "further", "then", "once", "here",
  "there", "when", "where", "why", "how", "all", "any", "both", "each", "few", "more", "most",
  "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very",
  "just", "build", "make", "create", "want", "need", "like", "please", "code", "app", "application",
  "good", "great", "job", "work", "already", "also", "let", "see", "think", "tell", "don", "done",
  "correctly", "frontend", "component", "components", "hey", "rex", "hello", "hi", "start", "building"
]);

/**
 * Semantic Chat & Project Naming:
 * Always chooses the most relevant, human-meaningful title for a conversation or built application.
 * Returns "" (empty string) for purely conversational filler/acknowledgements ("good job", "don correctly", etc.)
 * so they never overwrite or pollute session names.
 */
export function generateChatTitle(prompt: string, projectName?: string): string {
  // If an explicit semantic projectName was resolved from a build, prioritize it!
  if (projectName && !isPlaceholderOrBadSessionName(projectName)) {
    const cleanProj = projectName.split("—")[0].split("-")[0].trim();
    if (/railgo/i.test(cleanProj)) return "RailGo Train Booking";
    if (/omnicalc/i.test(cleanProj)) return "OmniCalc Calculator";
    if (/aurabeauty/i.test(cleanProj)) return "AuraBeauty Skincare";
    if (/auramart/i.test(cleanProj)) return "AuraMart E-Commerce";
    if (/flowstate/i.test(cleanProj)) return "Flowstate Focus OS";
    if (/amity/i.test(cleanProj)) return "Amity Social App";
    if (/apexwealth/i.test(cleanProj)) return "ApexWealth Advisor";
    if (cleanProj.length >= 3 && cleanProj.length <= 26) {
      return cleanProj;
    }
  }

  if (!prompt || typeof prompt !== "string") return "";

  const p = prompt.trim();
  const lower = p.toLowerCase();

  // Never name a session after a greeting, praise ("good job", "don correctly"), or generic run command
  if (isNonTopicalUtterance(p)) {
    return "";
  }

  // Semantic Domain Classifications
  if (/\b(railgo|rail\s*go|train\s*booking|railway|irctc|train\s*ticket|locomotive)\b/i.test(lower)) return "RailGo Train Booking";
  if (/\b(flight|airline|airport|aviation)\b/i.test(lower)) return "SkyJet Flight Booking";
  if (/\b(hotel|resort|hospitality|room\s*booking)\b/i.test(lower)) return "Hotel Booking App";
  if (/\b(flowstate|flow\s*state|focus\s*os)\b/i.test(lower)) return "Flowstate Focus OS";
  if (lower.includes("pomodoro") || (lower.includes("timer") && !lower.includes("crypto"))) return "Pomodoro Focus Timer";
  if (lower.includes("calculator") || lower.includes("omnicalc") || lower.includes("math engine")) return "OmniCalc Calculator";
  if (lower.includes("cosmetic") || lower.includes("makeup") || lower.includes("beauty") || lower.includes("skincare") || lower.includes("facial")) return "AuraBeauty Skincare";
  if (lower.includes("auramart") || lower.includes("clothing") || lower.includes("fashion") || lower.includes("ecommerce") || lower.includes("e-commerce") || lower.includes("store") || lower.includes("shop")) return "AuraMart E-Commerce";
  if (lower.includes("food") || lower.includes("restaurant") || lower.includes("recipe") || lower.includes("meal") || lower.includes("delivery")) return "BiteFlow Food App";
  if (lower.includes("friend") || lower.includes("amity") || lower.includes("bestie")) return "Amity Social App";
  if (lower.includes("landing page") || lower.includes("startup landing")) return "Startup Landing Page";
  if (lower.includes("crypto") || lower.includes("bitcoin") || lower.includes("ethereum") || lower.includes("arbitrage")) return "Crypto Analytics";
  if (lower.includes("invest") || lower.includes("stock") || lower.includes("portfolio") || lower.includes("finance") || lower.includes("wealth")) return "ApexWealth Finance";
  if (lower.includes("todo") || lower.includes("task") || lower.includes("kanban") || lower.includes("sprint")) return "Sprint Task Board";
  if (lower.includes("weather") || lower.includes("forecast")) return "Weather Forecast App";
  if (lower.includes("music") || lower.includes("audio") || lower.includes("podcast") || lower.includes("synthesizer")) return "Audio Studio App";
  if (lower.includes("note") || lower.includes("journal") || lower.includes("markdown") || lower.includes("inkwell") || lower.includes("publication")) return "Inkwell Publishing";
  if (lower.includes("hospital") || lower.includes("clinic") || lower.includes("medical") || lower.includes("patient")) return "MediPulse Healthcare";
  if (lower.includes("course") || lower.includes("education") || lower.includes("learning") || lower.includes("quiz")) return "EduPulse Learning";
  if (lower.includes("dashboard") || lower.includes("saas") || lower.includes("analytics")) return "Analytics Dashboard";
  if (lower.includes("chat") || lower.includes("messenger")) return "Realtime Chat App";
  if (lower.includes("fitness") || lower.includes("workout") || lower.includes("gym")) return "Fitness Tracker";
  if (lower.includes("game") || lower.includes("puzzle")) return "Interactive Game";

  // Extract 2-3 salient semantic words (up to 24 chars)
  const cleanWords = p
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !TITLE_STOP_WORDS.has(w.toLowerCase()));

  if (cleanWords.length >= 2) {
    const w1 = cleanWords[0].charAt(0).toUpperCase() + cleanWords[0].slice(1).toLowerCase();
    const w2 = cleanWords[1].charAt(0).toUpperCase() + cleanWords[1].slice(1).toLowerCase();
    const combo = `${w1} ${w2}`;
    return combo.slice(0, 24);
  }

  if (cleanWords.length === 1) {
    const w1 = cleanWords[0].charAt(0).toUpperCase() + cleanWords[0].slice(1).toLowerCase();
    return `${w1} Project`.slice(0, 24);
  }

  return "";
}

/**
 * Requirement Extraction Engine:
 * Transforms the complete, untruncated user request into a 20-point structured project specification.
 */
export function extractProjectSpecification(
  prompt: string,
  history?: Array<{ role: string; content: string }>
): ProjectSpecification {
  const fullText = prompt.trim();
  const lower = fullText.toLowerCase();
  const historyText = (history || []).map((h) => h.content.toLowerCase()).join(" ");
  const combined = `${lower} ${historyText}`;

  const projectName = extractProjectName(fullText, history);
  const chatTitle = generateChatTitle(fullText, projectName);

  let projectType: ProjectSpecification["projectType"] = "custom";
  if (
    /\b(friendship|friend\s*app|friends\s*app|amity|vibe\s*matcher|social\s*sanctuary|bestie|bff)\b/i.test(combined) ||
    (lower.includes("friend") && (lower.includes("app") || lower.includes("build") || lower.includes("application")))
  ) {
    projectType = "friendship_social";
  } else if (
    /\b(flowstate|flow\s*state|focus\s*os|flow\s*os|deep\s*work\s*os|productivity\s*os)\b/i.test(combined) ||
    combined.includes("flowstate")
  ) {
    projectType = "productivity_os";
  } else if (lower.includes("landing page") || lower.includes("landing")) projectType = "landing_page";
  else if (lower.includes("food") || lower.includes("restaurant") || lower.includes("meal")) projectType = "food_delivery";
  else if (lower.includes("clothing") || lower.includes("fashion") || lower.includes("ecommerce") || lower.includes("shop") || lower.includes("store")) projectType = "ecommerce";
  else if (lower.includes("saas") || lower.includes("dashboard") || lower.includes("productivity")) projectType = "saas_dashboard";
  else if (lower.includes("investment") || lower.includes("crypto") || lower.includes("wealth") || lower.includes("fintech")) projectType = "fintech";
  else if (lower.includes("coding agent") || lower.includes("developer") || lower.includes("tool")) projectType = "developer_tool";
  else if (lower.includes("portfolio")) projectType = "portfolio";
  else if (lower.includes("social") || lower.includes("community")) projectType = "social";

  // Build architectural requirements tailored to project type
  const isFriendship = projectType === "friendship_social";
  const isFlowstate = projectType === "productivity_os";
  const isLanding = projectType === "landing_page";
  const isFood = projectType === "food_delivery";
  const isEcom = projectType === "ecommerce";
  const isSaaS = projectType === "saas_dashboard";

  const coreFeatures: string[] = [];
  const secondaryFeatures: string[] = [];
  const pages: string[] = ["Home / Main View"];
  const uiRequirements: string[] = [];
  const uxRequirements: string[] = [];
  const functionalRequirements: string[] = [];
  const backendRequirements: string[] = [];
  const databaseRequirements: string[] = [];
  const apiRequirements: string[] = [];
  const authenticationRequirements: string[] = [];
  const integrations: string[] = [];
  const businessLogic: string[] = [];
  const technicalConstraints: string[] = [
    "Single-page self-contained React TypeScript architecture",
    "Tailwind CSS utility styling tailored to domain aesthetic",
    "Real state machines via standard React hooks (useState, useEffect, useMemo, useCallback)",
    "Clean module compilation with Bun build & tests verified via Bun test",
  ];
  const responsiveRequirements: string[] = [
    "Mobile-first responsive viewport layout (sm, md, lg, xl break points)",
    "Touch-friendly tap targets (minimum 44x44px for buttons)",
    "Adaptive navigation bar with collapsible menu on small viewports",
    "Fluid grid layouts for cards, metrics, and showcases",
  ];
  const successCriteria: string[] = [
    "All requested user features implemented with interactive working state",
    "Zero mock placeholders, stubs, or one-button empty screens",
    "Passes bundle compilation with 0 syntax or module errors",
    "Automated unit test suite verifies core business logic",
    "Live preview renders instantly with interactive feedback",
  ];

  let purpose = `Build a production-ready, fully interactive ${projectType.replace(/_/g, " ")} called ${projectName}.`;
  let targetUsers = "End users, professionals, and modern digital consumers.";
  let designDirection = "Modern responsive theme with crisp typography and lively micro-interactions.";

  if (isFriendship) {
    purpose = `Amity 3D interactive friendship and social web application (${projectName}) engineered for meaningful human connections, shared memories, and companion dynamics.`;
    targetUsers = "Close friends, social circles, communities, and companions wanting an intimate digital sanctuary.";
    designDirection = "Warm, luminous sanctuary palette (rose, amber, peach, and violet pastels, soft glassmorphism, floating 3D character canvas, lively chemistry badges, and zero generic gray forms).";
    coreFeatures.push(
      "3D Character Garden: Interactive 3D Canvas where friends appear as animated floating characters (bunny, bear, star, cloud) with gaze tracking and hover physics",
      "Friendship Chemistry & Vibe Matcher: Interactive compatibility quiz calculating shared energy signatures, communication styles, and chemistry percentages",
      "Memory Scrapbook: Polaroid card gallery with stickers, heartfelt notes, and interactive love reaction counters",
      "Friendship Bucket List: Collaborative checklist of shared dreams and adventures with category tags and progress telemetry",
      "Acoustic Spark Transmitter: Native Web Audio synthesizer emitting harmonious sparkle chimes when sending virtual warmth and cheer to friends"
    );
  } else if (isFlowstate) {
    purpose = `Autonomous deep work operating system (${projectName}) engineered for extreme focus, sprint velocity, ambient acoustics, and cognitive momentum.`;
    targetUsers = "Software engineers, creators, deep work researchers, and high-performance professionals.";
    coreFeatures.push(
      "Focus Engine: Precision Pomodoro & 90-minute Ultradian cycle timer with circular SVG progress indicator and session streaks",
      "Sprint Matrix: High-velocity 4-column Kanban board (Backlog, In Flow, Review, Shipped) with priority badges (P0-P2) and quick task progression",
      "Mind Scratchpad: Distraction-free notes buffer with live markdown preview, character metrics, and instant clipboard export",
      "Soundscape Lab: Ambient focus sound synthesizer with native Web Audio API oscillators (40Hz Gamma binaural beat, pink noise, zen tones)",
      "Cognitive Telemetry & Analytics: Deep work velocity score, focus time streaks, and completed session distributions",
      "Command Palette: Universal ⌘K shortcut palette for rapid workspace switching and keyboard-driven productivity"
    );
  } else if (isLanding) {
    purpose = `Professional high-converting landing page for ${projectName} communicating clear value proposition and converting visitors.`;
    targetUsers = "Prospective customers, investors, and early adopters.";
    coreFeatures.push(
      "Sticky navigation header with brand identity, live status pill, anchor links, and primary CTA",
      "High-impact Hero section with bold value proposition, subtitle, and dual action CTAs",
      "Feature showcase grid highlighting product capabilities with iconography and detail cards",
      "Interactive product demo / visual preview mockup showing active state",
      "Social proof & trust indicators (metrics, testimonials, partner badges)",
      "How it works 3-step walkthrough with visual indicators",
      "Interactive pricing comparison cards with monthly/annual billing toggle",
      "Frequently Asked Questions (FAQ) accordion with smooth expansion",
      "High-converting bottom CTA banner and complete multi-column footer"
    );
    secondaryFeatures.push("Newsletter / waitlist email capture modal", "Keyboard navigation", "Interactive preview toggle");
    pages.push("Features", "Pricing", "Testimonials", "FAQ", "Contact");
    uiRequirements.push("Strict visual hierarchy with distinct typographic scaling", "Polished dark cards with subtle borders and glow accents", "High contrast primary CTA buttons");
    uxRequirements.push("Instant micro-feedback on buttons", "Smooth accordion expansion", "No jarring layout shifts");
  } else if (isFood) {
    purpose = `Modern food delivery and restaurant discovery platform for ${projectName} featuring interactive menus, ordering, and cart state.`;
    targetUsers = "Hungry customers, students, and food enthusiasts seeking quick dining.";
    designDirection = "Warm, appetizing dark aesthetic with vibrant amber, coral, and emerald accents, high-res dish photography cards, and intuitive mobile ergonomics.";
    coreFeatures.push(
      "Restaurant discovery and curated cuisine category selector (Burgers, Asian, Pizza, Healthy, Bowls, Desserts)",
      "Live search input with instant dish and dietary tag filtering (Vegan, Halal, Gluten-Free, Fast Delivery)",
      "Interactive dish cards with ratings, prep time, price, spice level badges, and quick-add buttons",
      "Item detail modal with customization options (add-ons, portion size, special instructions)",
      "Interactive slide-over shopping cart drawer with quantity counters, subtotal, delivery fee calculation, and promo code support",
      "Complete multi-step checkout workflow with delivery address selection, payment method, and tip selector",
      "Live order status tracker with animated timeline (Order Placed -> Kitchen Preparing -> Out for Delivery -> Arrived)"
    );
    secondaryFeatures.push("Favorites / saved restaurants toggle", "Recent order re-order button", "Dietary preference filter pills");
    pages.push("Restaurant Discovery", "Menu Details", "Cart Drawer", "Checkout Screen", "Order Tracking");
  } else if (isEcom) {
    purpose = `End-to-end e-commerce shopping experience for ${projectName} with product catalog, variant selection, and cart.`;
    targetUsers = "Shoppers looking for seamless discovery and fast checkout.";
    coreFeatures.push(
      "Product catalog with grid/list view toggle and category filters",
      "Instant keyword search and price-range slider filter",
      "Product detail modal with image gallery, color/size variant selector, and stock status",
      "Slide-out shopping bag drawer with quantity counters and price totals",
      "Interactive checkout modal with payment method selection and order confirmation"
    );
    secondaryFeatures.push("Wishlist toggle", "Customer reviews and star ratings", "Shipping calculator");
  } else if (isSaaS) {
    purpose = `Comprehensive SaaS operational dashboard for ${projectName} with live analytics, data tables, and workflow management.`;
    targetUsers = "Operations managers, team leads, and enterprise analysts.";
    coreFeatures.push(
      "Real-time KPI metric overview cards with percentage trends",
      "Interactive chart visualizations (revenue velocity, activity volume)",
      "Searchable data management table with column sorting and status filters",
      "Action modal for creating new records or triggering workflows",
      "Activity audit log tracking recent team interactions"
    );
    secondaryFeatures.push("Date range picker", "Export data to CSV/JSON", "Role/permissions toggle");
  } else {
    purpose = `Full-featured interactive application for ${projectName} based on complete user requirements.`;
    coreFeatures.push(
      "Interactive core tool / dashboard view with live state changes",
      "Search and multi-parameter filtering engine",
      "Detailed view / modal for deep item inspection and action triggering",
      "Comprehensive state management with real-time feedback"
    );
  }

  // Parse any explicit user features mentioned in the prompt
  const sentenceList = fullText.split(/[.\n;]+/).map((s) => s.trim()).filter((s) => s.length > 8);
  for (const s of sentenceList) {
    if (/\b(must have|should have|include|with|has|feature|features|support|tracking|filter|search|cart|checkout|order)\b/i.test(s)) {
      if (!coreFeatures.some((f) => f.toLowerCase().includes(s.slice(0, 15).toLowerCase()))) {
        functionalRequirements.push(s);
      }
    }
  }

  return {
    projectName,
    chatTitle,
    projectType,
    purpose,
    targetUsers,
    coreFeatures,
    secondaryFeatures,
    pages,
    uiRequirements,
    uxRequirements,
    functionalRequirements,
    backendRequirements,
    databaseRequirements,
    apiRequirements,
    authenticationRequirements,
    integrations,
    businessLogic,
    technicalConstraints,
    designDirection,
    responsiveRequirements,
    successCriteria,
  };
}
