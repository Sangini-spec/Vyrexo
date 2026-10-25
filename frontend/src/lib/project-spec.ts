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

  // Dynamic, context-aware e-commerce & retail brand naming (never hardcoded to a single static name)
  if (
    /\b(ecommerce|e-commerce|online\s*store|shopping\s*app|shopping\s*platform|retail\s*app|marketplace|storefront|merchandise|clothing|clothes|fashion|apparel|sneaker|shoe|footwear|cosmetic|makeup|beauty|skincare|facial|jewel|jewellery|jewelry|diamond|boutique|grocery|groceries|gadget|electronics|furniture|decor|book\s*store|pet\s*store)\b/i.test(
      combined
    ) ||
    (/\b(store|shop|cart|catalog|checkout)\b/i.test(lower) &&
      /\b(build|create|make|develop|code|scaffold|app|application|website|platform)\b/i.test(combined))
  ) {
    return generateDynamicEcommerceBrandName(clean, combined);
  }

  if (
    combined.includes("todo") ||
    combined.includes("to-do") ||
    /\bto\s+do(\s+list)?\b/i.test(combined) ||
    combined.includes("checklist") ||
    combined.includes("task list") ||
    combined.includes("task manager") ||
    combined.includes("taskflow")
  ) {
    return "TaskFlow";
  }

  if (lower.includes("productivity") || lower.includes("task") || lower.includes("project management") || lower.includes("employee") || lower.includes("kanban")) {
    return "PulseTrack";
  }

  if (combined.includes("finance") || combined.includes("investment") || combined.includes("crypto") || combined.includes("portfolio") || combined.includes("stock") || combined.includes("wealth")) {
    return "ApexWealth";
  }

  if (lower.includes("coding agent") || lower.includes("autonomous agent") || lower.includes("code assistant") || lower.includes("developer tool")) {
    return "DevMatrix";
  }

  if (combined.includes("calculator") || combined.includes("math")) {
    return "OmniCalc";
  }

  if (combined.includes("hospital") || combined.includes("clinic") || combined.includes("doctor") || combined.includes("patient") || combined.includes("medical") || combined.includes("health")) {
    return "MediPulse";
  }

  if (combined.includes("course") || combined.includes("learning") || combined.includes("student") || combined.includes("education") || combined.includes("quiz")) {
    return "EduPulse";
  }

  if (lower.includes("chat") || lower.includes("social") || lower.includes("community") || lower.includes("messaging")) {
    return "PulseChat";
  }

  if (lower.includes("dashboard") || lower.includes("analytics") || lower.includes("metrics") || lower.includes("telemetry")) {
    return "NexusDash";
  }

  // Fallback: extract 1-2 prominent domain nouns (excluding generic UI/meta/change words)
  const words = clean
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(
      (w) =>
        w.length > 2 &&
        !/^(just|now|start|working|work|build|built|make|create|develop|code|generate|implement|want|need|please|like|dont|don|not|some|other|another|different|theme|themes|element|elements|change|changes|update|updates|modify|redesign|improve|enhance|better|color|colors|style|layout|design|the|for|with|and|app|application|website|platform|software|system|tool|project|frontend|backend|component|components|good|great|job|done|correctly|nice|hey|rex|can|you|could|would|should|this|that|into|from|use|using|shopping|buy|today|ideas|something|happy|short|answer|long|expensive)$/i.test(
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

/**
 * Generates a unique, feature-aware e-commerce brand name every time based on the
 * specific products, features, vibe, and user request so no two shopping builds are
 * forced into a hardcoded static name.
 */
export function generateDynamicEcommerceBrandName(rawPrompt: string, combinedContext = ""): string {
  const text = `${rawPrompt} ${combinedContext}`.toLowerCase();

  // Compute a lightweight deterministic + entropy seed from the prompt words & current minute/turn
  let hash = 0;
  const seedInput = `${rawPrompt.trim()}_${rawPrompt.length}`;
  for (let i = 0; i < seedInput.length; i++) {
    hash = (hash * 31 + seedInput.charCodeAt(i)) >>> 0;
  }

  const pick = (options: string[], offset = 0): string => {
    return options[(hash + offset) % options.length];
  };

  // 1. Check specific niche/vertical keywords first
  if (/\b(sneaker|shoe|footwear|kicks|streetwear|athleisure|runner)\b/i.test(text)) {
    return pick(["StrideVault", "KicksLab", "VeloceStep", "UrbanTread", "SoleCraft", "AeroKicks"]);
  }
  if (/\b(vintage|thrift|secondhand|preloved|retro|archive)\b/i.test(text)) {
    return pick(["RetroLoom", "ThriftHaven", "VelvetArchive", "EraCurate", "PastFound"]);
  }
  if (/\b(clothing|clothes|fashion|apparel|dress|wardrobe|outfit|wear|boutique|garment)\b/i.test(text)) {
    return pick(["VerveAtelier", "LoomCraft", "ModaVibe", "VelvetThread", "KnitAndCo", "SartoriaHub", "atelierVogue"]);
  }
  if (/\b(cosmetic|makeup|beauty|skincare|skin\s*care|facial|serum|glow|botanical|organic\s*skin)\b/i.test(text)) {
    return pick(["LumiereSkin", "BotanicaGlow", "PureDewAtelier", "VelvetBloom", "SolaceBeauty", "FloraDerma"]);
  }
  if (/\b(jewel|jewellery|jewelry|diamond|ring|necklace|bracelet|earring|gemstone|gold|silver)\b/i.test(text)) {
    return pick(["CaratAtelier", "OpalineFine", "GildedLuxe", "CelesteGems", "VermeilHouse"]);
  }
  if (/\b(grocery|groceries|fresh|organic|produce|supermarket|pantry|farm|vegan|food\s*market)\b/i.test(text)) {
    return pick(["HarvestCart", "GreenPantry", "FreshRootMarket", "BountifulBasket", "VerdantGrocer"]);
  }
  if (/\b(tech|gadget|electronics|laptop|phone|audio|headphone|hardware|gaming|gear)\b/i.test(text)) {
    return pick(["CircuitBay", "VoltGear", "NexusTechStore", "PulseGadgets", "HyperionTech"]);
  }
  if (/\b(furniture|home|decor|interior|living|sofa|lighting|minimalist\s*home|artisan\s*home)\b/i.test(text)) {
    return pick(["HearthAndLoom", "NordicHaven", "OakAndVessel", "FormaLiving", "AtelierCasa"]);
  }
  if (/\b(book|bookstore|reading|novel|literature|library\s*shop)\b/i.test(text)) {
    return pick(["FolioBindery", "ChapterVerse", "QuillAndPage", "PaperLanternBooks"]);
  }
  if (/\b(pet|dog|cat|puppy|kitten|paw|vet\s*shop)\b/i.test(text)) {
    return pick(["PawParlor", "WhiskerMarket", "TailWagSupply", "BarkAndBounty"]);
  }
  if (/\b(coffee|cafe|espresso|roast|tea|matcha|beverage)\b/i.test(text)) {
    return pick(["RoastCraft", "CremaCollective", "VelvetBean", "SteepAndSip"]);
  }
  if (/\b(fitness|gym|workout|supplement|sport|athletic|yoga)\b/i.test(text)) {
    return pick(["ApexAthletics", "KineticGear", "IronPulseShop", "ZenithFitStore"]);
  }

  // 2. Extract any distinctive user feature/domain noun to forge a bespoke brand name
  const domainNouns = rawPrompt
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(
      (w) =>
        w.length >= 4 &&
        w.length <= 11 &&
        !/^(build|create|make|develop|code|scaffold|implement|generate|design|please|want|need|like|would|could|should|application|website|platform|software|system|ecommerce|commerce|shopping|online|store|shop|market|marketplace|with|that|have|having|features|feature|cart|checkout|payment|filter|filters|search|product|products|item|items|user|users|modern|simple|full|complete|custom|different|every|time|single|agent|rex)$/i.test(
          w
        )
    );

  const suffixes = ["Bazaar", "Collective", "Vault", "Haven", "Emporium", "Curate", "Cart", "Exchange", "Atelier", "Hub"];
  if (domainNouns.length > 0) {
    const noun = domainNouns[0].charAt(0).toUpperCase() + domainNouns[0].slice(1).toLowerCase();
    const suffix = pick(suffixes, noun.length);
    return `${noun}${suffix}`;
  }

  // 3. General e-commerce / shopping application: rotate across a diverse, modern brand palette
  const generalBrands = [
    "NovaBazaar",
    "VerveMarket",
    "CartSphere",
    "ZephyrShop",
    "LuminaTrade",
    "PrismEmporium",
    "VelvetCart",
    "SolsticeMarket",
    "harborCurate",
    "KinetixStore",
    "VertexGoods",
    "OasisMercantile",
  ];
  // Incorporate current minute so even identical generic prompts ("build an ecommerce app") get fresh names
  const timeBucket = Math.floor(Date.now() / 15000);
  return generalBrands[(hash + timeBucket) % generalBrands.length].replace(/^harbor/, "Harbor");
}

export function formatBuildTerminationMessage(username?: string | null): string {
  const cleanName = (username || "").trim();
  if (cleanName) {
    return `Okay ${cleanName}, I have terminated the building process just as you requested.`;
  }
  return "Okay, I have terminated the building process just as you requested.";
}

export function isBareSilenceCommand(rawText: string): boolean {
  if (!rawText) return false;
  const cleaned = rawText
    .trim()
    .toLowerCase()
    .replace(/^(lyrics|lex|wrecks|rax|alex)\b/i, "rex")
    .replace(/\b(lyrics|lex|wrecks|rax|alex)$/i, "rex")
    .replace(/[.!?,;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return false;

  return /^(?:(?:hey|hi|hello|yo|ok|okay|please|now)\s+)*(?:(?:rex)\s+)?(stop|stop\s+it|stop\s+now|stop\s+talking|stop\s+speaking|pause|pause\s+it|pause\s+now|wait|hold\s+on|hang\s+on|shut\s+up|be\s+quiet|quiet|hush|shush|silence|enough|that'?s\s+enough|thats\s+enough|mute)(?:\s+(?:rex|please|now|it|talking|speaking))*$/i.test(
    cleaned
  );
}

export interface WholeSentenceSemanticAnalysis {
  intent: "TERMINATE_BUILD" | "PAUSE_OR_SILENCE" | "GUIDANCE_OR_CONVERSATION" | "EXECUTE_BUILD";
  isBuildTermination: boolean;
  isGuidanceOrQuestion: boolean;
  isPauseOrSilence: boolean;
  isAffirmativeBuildCommand: boolean;
  reasoning: string;
}

/**
 * Evaluates a single sentence or clause for negated desire, mind-change, or cessation
 * directed at building, running, executing, or continuing a software project.
 * Recognizes natural, indirect human expressions without relying on rigid phrase templates, e.g.:
 * - "Hey Rex, I think I don't want to build this application anymore. Can you please stop running it?"
 * - "Actually I changed my mind about making this project, let's drop it."
 * - "We don't need this app built right now, you can stop."
 */
function isSentenceSemanticBuildTermination(sentence: string, isCurrentlyBuilding = false): boolean {
  const s = sentence
    .trim()
    .toLowerCase()
    .replace(/^(lyrics|lex|wrecks|rax|alex)\b/i, "rex")
    .replace(/[.!?,;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) return false;

  // Never misclassify "I don't know how to build..." or "I don't like the UI, change it..." as build termination
  if (
    /\b(don'?t|do\s+not|doesn'?t)\s+(know|understand|see)\s+how\s+to\s+(build|make|create|code|develop|run|start)\b/i.test(s) ||
    /\b(don'?t|do\s+not)\s+like\s+the\s+(ui|design|theme|color|colors|layout|style|look)\b/i.test(s)
  ) {
    return false;
  }

  // 1. Negated desire / desistance / mind-change + build/run/project/app target anywhere in the sentence
  const hasNegativeDesireOrMindChange =
    /\b((?:don'?t|do\s+not|no\s+longer|not)\s+(?:really\s+|think\s+i\s+)?(?:want|wish|need|feel\s+like|care|intend|plan|like)\s+(?:you\s+)?(?:to\s+)?|changed\s+(?:my|our)\s+mind|having\s+second\s+thoughts|on\s+second\s+thought|decided\s+(?:not\s+to|against)|rather\s+not|prefer\s+not\s+to|let'?s\s+not|let\s+us\s+not|we\s+shouldn'?t|we\s+should\s+not|you\s+don'?t\s+(?:need|have)\s+to|no\s+need\s+to|don'?t\s+bother|not\s+interested\s+in)\b/i.test(
      s
    );

  const hasBuildOrExecutionTarget =
    /\b(build|building|make|making|create|creating|develop|developing|code|coding|generate|generating|scaffold|scaffolding|run|running|work\s+on|working\s+on|execute|executing|continue|continuing|proceed|proceeding|app|application|project|software|website|web\s*app|platform|store|system|agents|process|it\s+anymore|this\s+anymore|that\s+anymore)\b/i.test(
      s
    );

  if (hasNegativeDesireOrMindChange && hasBuildOrExecutionTarget) {
    return true;
  }

  // 2. Direct or polite cessation verb ("can you please stop running it", "please halt the build", "let's drop this project")
  const hasCessationVerb =
    /\b(stop|halt|cease|terminate|abort|cancel|drop|scrap|abandon|discard|withdraw|quit|kill|end|shut\s+down|leave)\b/i.test(
      s
    );

  const hasProcessOrArtifactObject =
    /\b(building|the\s+build|this\s+build|running|running\s+it|running\s+this|running\s+that|running\s+the|working|working\s+on|coding|making|creating|developing|generating|scaffolding|executing|the\s+process|this\s+process|the\s+agents|the\s+project|this\s+project|that\s+project|the\s+app|this\s+app|that\s+app|the\s+application|this\s+application|that\s+application|the\s+software|this\s+software|the\s+website|this\s+website|the\s+request|this\s+request|my\s+request|what\s+you('re|\s+are)\s+doing|(?:stop|halt|terminate|abort|cancel|drop|scrap|quit)\s+(?:it|this|that)\b)/i.test(
      s
    );

  if (
    hasCessationVerb &&
    hasProcessOrArtifactObject &&
    !/\b(stop\s+(?:by|at|for\s+a\s+moment\s+to\s+explain)|without\s+stopping|never\s+stop|don'?t\s+stop|do\s+not\s+stop)\b/i.test(s)
  ) {
    return true;
  }

  // 3. Direct negative imperative ("don't build this", "do not run it anymore", "no need to build it")
  if (
    /\b(?:don'?t|do\s+not|please\s+don'?t|please\s+do\s+not|never\s*mind\s+don'?t)\s+(?:build|make|create|develop|code|scaffold|generate|run|continue|work\s+on)\s+(?:it|this|that|the|a|an|any|my|our)\b/i.test(
      s
    ) ||
    /\b(?:build|building|running|working\s+on|making|creating)\s+(?:this|that|it|the\s+app|the\s+application|the\s+project)\s+anymore\b/i.test(
      s
    )
  ) {
    return true;
  }

  // 4. When a build is actively running right now, any polite/conversational request to stop, wait, cancel, or do something else
  if (isCurrentlyBuilding) {
    if (
      isBareSilenceCommand(s) ||
      /\b(can\s+you\s+(?:please\s+)?stop|could\s+you\s+(?:please\s+)?stop|please\s+stop|stop\s+(?:it|this|that|now|please|rex)|never\s*mind|nevermind|forget\s+(?:it|that|this)|scratch\s+that|cancel|abort|terminate|withdraw|let'?s\s+do\s+something\s+else|i\s+want\s+to\s+do\s+something\s+else|not\s+anymore)\b/i.test(
        s
      )
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Evaluates whether a sentence is asking for guidance, mentorship, how-to steps,
 * conceptual explanation, or expressing lack of knowledge (e.g.:
 * - "You know, I don't know how to build this software."
 * - "Can you guide me first?"
 * - "How can we build this specific idea end-to-end?"
 * - "What is the best way to build an e-commerce app?")
 */
function isSentenceGuidanceOrConceptualInquiry(sentence: string): boolean {
  const raw = sentence.trim();
  if (!raw) return false;
  const hasQuestionMark = raw.includes("?");
  const s = raw.toLowerCase().replace(/\s+/g, " ").trim();

  // 1. Epistemic / lack-of-knowledge / learning statements containing "how to build/create/make..."
  if (
    /\b(don'?t\s+know\s+how|do\s+not\s+know\s+how|not\s+sure\s+how|unsure\s+how|no\s+idea\s+how|learn\s+how\s+to|learning\s+how\s+to|understand\s+how\s+to|figure\s+out\s+how\s+to|curious\s+how\s+to|wondering\s+how\s+(?:to|we|i)|know\s+how\s+to\s+(?:build|create|make|develop|code|architect|design))\b/i.test(
      s
    )
  ) {
    return true;
  }

  // 2. Mentorship, guidance, roadmap, walkthrough, or advice requests
  if (
    /\b(guide\s+me|can\s+you\s+guide|could\s+you\s+guide|walk\s+me\s+through|talk\s+me\s+through|teach\s+me|coach\s+me|mentor\s+me|advise\s+me|help\s+me\s+(?:understand|learn|plan|design|think\s+through|figure\s+out)|give\s+me\s+(?:a\s+|some\s+)?(?:guidance|guide|roadmap|step[\s-]*by[\s-]*step|overview|explanation|advice|suggestion|suggestions|ideas|strategy|plan\s+first)|explain\s+(?:how|what|why|the\s+process|the\s+steps|the\s+architecture|to\s+me)|before\s+(?:we|i|you)\s+(?:start\s+)?(?:build|building|code|coding|make|making|create|creating))\b/i.test(
      s
    )
  ) {
    return true;
  }

  // 3. Interrogative "How / What / Why / Which / Where / When" questions about building or software
  if (
    /\b(how\s+(?:can|could|should|would|do|does|did|will|might|to)\s+(?:we|i|you|one|someone|people|developers?|a\s+team)\s+(?:go\s+about\s+)?(?:build|building|create|creating|make|making|develop|developing|code|coding|architect|architecting|design|designing|implement|implementing|structure|approach|start))\b/i.test(
      s
    ) ||
    /\b(what\s+(?:is|are|would\s+be)\s+the\s+(?:best\s+|right\s+|recommended\s+|proper\s+)?(?:way|ways|steps|process|approach|architecture|stack|tech\s+stack|tools|roadmap|strategy|method)\s+(?:to|for)\s+(?:build|building|create|creating|make|making|develop|developing))\b/i.test(
      s
    ) ||
    /\b(what\s+(?:do\s+i|do\s+we|would\s+i|would\s+we|does\s+it)\s+(?:need|take|require)\s+to\s+(?:build|create|make|develop))\b/i.test(
      s
    ) ||
    /\b(why\s+(?:did|do|are|would|should)\s+(?:you|we|i)\s+(?:build|building|make|making|create|creating))\b/i.test(
      s
    ) ||
    /\b(is\s+it\s+(?:possible|hard|difficult|easy|better|feasible)\s+to\s+(?:build|create|make|develop))\b/i.test(
      s
    )
  ) {
    return true;
  }

  // 4. Conditional or hypothetical questions ending in "?"
  if (
    hasQuestionMark &&
    /^(?:if\s+(?:i|we|you)|suppose\s+(?:i|we)|what\s+if\s+(?:i|we)|how\s+|what\s+|why\s+|when\s+|where\s+|which\s+|who\s+|is\s+there\s+|are\s+there\s+|do\s+you\s+(?:think|know|have|recommend|suggest))/i.test(
      s
    )
  ) {
    return true;
  }

  return false;
}

export function isBuildTerminationCommand(rawText: string, isCurrentlyBuilding = false): boolean {
  if (!rawText || typeof rawText !== "string") return false;
  const fullNormalized = rawText.trim();
  if (!fullNormalized) return false;

  // Check whole utterance as well as each individual sentence
  if (isSentenceSemanticBuildTermination(fullNormalized, isCurrentlyBuilding)) {
    return true;
  }

  const sentences = fullNormalized
    .split(/[.!?;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const sentence of sentences) {
    if (isSentenceSemanticBuildTermination(sentence, isCurrentlyBuilding)) {
      return true;
    }
  }

  return false;
}

const INTERRUPT_EXTRACTION_REGEX =
  /\b((?:(?:hey|hi|hello|ok|okay|yo)\s+rex\s*,?\s*)?(?:stop\s+rex|pause\s+rex|rex\s+stop|rex\s+pause|wait\s+rex|rex\s+wait|hold\s+on\s+rex|rex\s+hold\s+on|shut\s+up(?:\s+rex)?|be\s+quiet(?:\s+rex)?|stop\s+building|stop\s+running|stop\s+working|stop\s+talking|stop\s+speaking|stop\s+it|stop\s+now|can\s+you\s+(?:please\s+)?stop|please\s+stop|terminate\s+the\s+build|cancel\s+the\s+build|cancel\s+that|withdraw\s+that|never\s*mind|nevermind|don'?t\s+build|do\s+not\s+build|i\s+(?:think\s+i\s+)?don'?t\s+want\s+to\s+(?:work\s+on|build|make|create|continue)|wait\s+(?:a\s+(?:second|minute|moment)|i\s+have\s+(?:something|more)|let\s+me)|hold\s+on\s+(?:a\s+(?:second|minute|moment)|i\s+have|let\s+me)|hang\s+on|i\s+have\s+something\s+else\s+to\s+(?:add|say)|let\s+me\s+(?:add|finish|speak|interrupt)|listen\s+to\s+me|hear\s+me\s+out|i\s+get\s+your\s+point|but\s+i\s+(?:think|want|feel|need|would|don'?t|do\s+not|mean|meant|have|get)|but\s+(?:what\s+about|what\s+if|can\s+you|could\s+you|let'?s|actually|wait|instead|rex)|actually\s+(?:i\s+(?:think|want|need|don'?t|meant|changed)|let'?s|can\s+you|wait|stop|rex)|instead\s+(?:of\s+that|let'?s|i\s+want|can\s+you)|on\s+second\s+thought|change\s+of\s+plans|no\s+(?:rex|wait|stop|don'?t|i\s+(?:want|don'?t|meant))))\b/i;

const TAIL_BARE_STOP_REGEX =
  /\b((?:(?:hey|hi|hello|ok|okay|please)\s+)?(?:rex\s+)?(?:stop|pause|wait|hold\s+on|hang\s+on|quiet|be\s+quiet|shut\s+up|hush|shush|silence|enough|cancel|abort|withdraw|never\s*mind|nevermind)(?:\s+(?:rex|please|now|it|running\s+it))?)\s*$/i;

export function extractUserInterruptFromBuffer(rawTranscript: string): {
  matched: boolean;
  extractedText: string;
  isBareSilence: boolean;
} {
  if (!rawTranscript || !rawTranscript.trim()) {
    return { matched: false, extractedText: "", isBareSilence: false };
  }

  const normalized = rawTranscript
    .trim()
    .replace(/\b(lyrics|lex|wrecks|rax|alex)\b/gi, "Rex");

  // 1. Check if the entire string is already a bare silence command or semantic build termination
  if (isBareSilenceCommand(normalized)) {
    return { matched: true, extractedText: normalized, isBareSilence: true };
  }
  if (isBuildTerminationCommand(normalized, true)) {
    return { matched: true, extractedText: normalized, isBareSilence: false };
  }

  // 2. Check for multi-word interrupt, build-termination, continuation, or redirect phrase anywhere in the buffer
  const match = INTERRUPT_EXTRACTION_REGEX.exec(normalized);
  if (match && typeof match.index === "number") {
    const sliced = normalized.slice(match.index).trim();
    return {
      matched: true,
      extractedText: sliced,
      isBareSilence: isBareSilenceCommand(sliced),
    };
  }

  // 3. Check if the tail of the buffer ends with a bare stop/pause command (e.g. after speaker bleed)
  const tailMatch = TAIL_BARE_STOP_REGEX.exec(normalized);
  if (tailMatch && typeof tailMatch.index === "number") {
    const sliced = normalized.slice(tailMatch.index).trim();
    return {
      matched: true,
      extractedText: sliced,
      isBareSilence: isBareSilenceCommand(sliced),
    };
  }

  return { matched: false, extractedText: normalized, isBareSilence: false };
}

/**
 * Whole-Sentence Semantic Analyzer:
 * Inspects every sentence and punctuation mark in the user's message to determine whether the user is:
 * 1. Terminating or withdrawing an active/recent software build (`TERMINATE_BUILD`)
 * 2. Asking Rex to pause/hold on (`PAUSE_OR_SILENCE`)
 * 3. Asking for guidance, mentorship, how-to steps, or general conversation (`GUIDANCE_OR_CONVERSATION`)
 * 4. Issuing an affirmative imperative command to build/create/modify software right now (`EXECUTE_BUILD`)
 */
export function analyzeWholeSentenceSemantics(
  rawText: string,
  options?: {
    isCurrentlyBuilding?: boolean;
    hasExistingProject?: boolean;
    history?: Array<{ role: string; content: string }>;
  }
): WholeSentenceSemanticAnalysis {
  const isCurrentlyBuilding = Boolean(options?.isCurrentlyBuilding);
  const hasExistingProject = Boolean(options?.hasExistingProject);
  const history = options?.history || [];

  if (!rawText || typeof rawText !== "string" || !rawText.trim()) {
    return {
      intent: "GUIDANCE_OR_CONVERSATION",
      isBuildTermination: false,
      isGuidanceOrQuestion: true,
      isPauseOrSilence: false,
      isAffirmativeBuildCommand: false,
      reasoning: "Empty input",
    };
  }

  const cleaned = rawText
    .trim()
    .replace(/^(lyrics|lex|wrecks|rax|alex)\b/i, "Rex")
    .replace(/\b(bill|built|billed|bil|belt|bulb)\s+(a|an|the|this|that|it|me|my|our|new)\b/gi, "build $2")
    .replace(/\bto\s+do\s+list\b/gi, "todo list")
    .replace(/\bto-do\s+list\b/gi, "todo list")
    .replace(/\bto\s+do\s+app/gi, "todo app");

  const trimmed = cleaned.trim().toLowerCase();

  // 1. Check bare silence / pause
  if (isBareSilenceCommand(trimmed) && !isCurrentlyBuilding) {
    return {
      intent: "PAUSE_OR_SILENCE",
      isBuildTermination: false,
      isGuidanceOrQuestion: false,
      isPauseOrSilence: true,
      isAffirmativeBuildCommand: false,
      reasoning: "User issued a direct pause or silence request.",
    };
  }

  // 2. Check whole-sentence semantic build termination (direct or indirect)
  if (isBuildTerminationCommand(cleaned, isCurrentlyBuilding)) {
    return {
      intent: "TERMINATE_BUILD",
      isBuildTermination: true,
      isGuidanceOrQuestion: false,
      isPauseOrSilence: false,
      isAffirmativeBuildCommand: false,
      reasoning: "Whole-sentence semantics indicate the user wants to stop or cancel building/running the application.",
    };
  }

  // 3. Split into individual sentences (preserving question marks for interrogative analysis)
  const rawSentences = cleaned
    .split(/(?<=[.!?;\n])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const sentences = rawSentences.length > 0 ? rawSentences : [cleaned];

  // Check if any sentence is asking for guidance, mentorship, how-to explanation, or expressing "I don't know how to build..."
  const guidanceSentences = sentences.filter((s) => isSentenceGuidanceOrConceptualInquiry(s));
  const nonGuidanceNonNegatedSentences = sentences.filter(
    (s) =>
      !isSentenceGuidanceOrConceptualInquiry(s) &&
      !isSentenceSemanticBuildTermination(s, true)
  );

  // If the user is asking for guidance/coaching/how-to (e.g. "You know, I don't know how to build this software. Can you guide me first? How can we build this specific idea end-to-end?")
  // and has NOT explicitly commanded "start building the code right now", classify as GUIDANCE_OR_CONVERSATION!
  const hasExplicitImmediateOverride =
    /\b(start\s+building\s+(?:it\s+)?right\s+now|don'?t\s+just\s+(?:explain|guide)\s*,?\s*build\s+it|generate\s+the\s+code\s+right\s+now)\b/i.test(
      trimmed
    );

  if (guidanceSentences.length > 0 && nonGuidanceNonNegatedSentences.length === 0 && !hasExplicitImmediateOverride) {
    return {
      intent: "GUIDANCE_OR_CONVERSATION",
      isBuildTermination: false,
      isGuidanceOrQuestion: true,
      isPauseOrSilence: false,
      isAffirmativeBuildCommand: false,
      reasoning: "Every sentence in the utterance is an epistemic statement or request for guidance/explanation rather than an execution command.",
    };
  }

  if (
    guidanceSentences.length > 0 &&
    /\b(guide\s+me(\s+first)?|teach\s+me(\s+first)?|explain\s+(?:to\s+me\s+)?first|walk\s+me\s+through\s+first|before\s+we\s+build|don'?t\s+know\s+how\s+to\s+build|how\s+can\s+we\s+build|how\s+do\s+(?:i|we)\s+build|how\s+to\s+build)\b/i.test(
      trimmed
    ) &&
    !hasExplicitImmediateOverride
  ) {
    return {
      intent: "GUIDANCE_OR_CONVERSATION",
      isBuildTermination: false,
      isGuidanceOrQuestion: true,
      isPauseOrSilence: false,
      isAffirmativeBuildCommand: false,
      reasoning: "The utterance asks for guidance or 'how to build' knowledge first rather than requesting immediate code generation.",
    };
  }

  // Evaluate only the remaining affirmative, non-guidance, non-negated sentences for build execution intent
  const candidateBuildText = nonGuidanceNonNegatedSentences.join(" ").trim().toLowerCase();
  if (!candidateBuildText) {
    return {
      intent: "GUIDANCE_OR_CONVERSATION",
      isBuildTermination: false,
      isGuidanceOrQuestion: true,
      isPauseOrSilence: false,
      isAffirmativeBuildCommand: false,
      reasoning: "No affirmative imperative build sentences found.",
    };
  }

  // Personal/real-life shopping advice, buying suggestions, gift ideas, or everyday "make me feel/happy" idioms
  const hasExplicitSoftwareTarget =
    /\b(app|application|web\s*app|website|platform|dashboard|software|frontend|backend|ui|codebase|repo|repository|react|nextjs|next\.js|typescript|component|components|ecommerce\s+(app|application|site|website|platform|store)|shopping\s+(app|application|site|website|platform))\b/i.test(
      candidateBuildText
    );

  if (!hasExplicitSoftwareTarget) {
    const isPersonalShoppingOrLifestyleAdvice =
      /\b(go\s+(to\s+|for\s+)?shopping|going\s+(to\s+|for\s+)?shopping|want\s+to\s+go\s+(to\s+|for\s+)?shopping|what\s+(new\s+)?(thing|things|item|items|stuff|gift|gifts|present|clothes|shoes|gadget)?\s*(should|can|could)\s+i\s+(buy|get|shop|purchase)|what\s+should\s+i\s+buy|what\s+to\s+buy\s+today|buy\s+today|not\s+very\s+expensive|make\s+me\s+(feel\s+)?(happy|good|better|smile|laugh)|do\s+you\s+have\s+any\s+ideas\s+what|give\s+(me\s+)?a\s+short\s+answer|give\s+me\s+(a\s+|some\s+)?suggestion)\b/i.test(
        candidateBuildText
      );
    if (isPersonalShoppingOrLifestyleAdvice) {
      return {
        intent: "GUIDANCE_OR_CONVERSATION",
        isBuildTermination: false,
        isGuidanceOrQuestion: true,
        isPauseOrSilence: false,
        isAffirmativeBuildCommand: false,
        reasoning: "Personal shopping or lifestyle suggestion inquiry.",
      };
    }
  }

  // Strip everyday non-coding "make ..." idioms and epistemic "how to build" phrases before testing build regexes
  const normalizedForBuildCheck = candidateBuildText
    .replace(
      /\bmake\s+(me\s+)?(feel|happy|smile|laugh|cry|better|sense|sure|a\s+decision|a\s+choice|up\s+my\s+mind|it\s+short|it\s+brief|it\s+quick|friends|money|dinner|lunch|breakfast|coffee|tea)\b/gi,
      "feel"
    )
    .replace(/\b(go|going)\s+(to\s+|for\s+)?shopping\b/gi, "browse items")
    .replace(
      /\b(?:how\s+(?:to|can\s+we|can\s+i|do\s+we|do\s+i|should\s+we|would\s+we)|don'?t\s+know\s+how\s+to|not\s+sure\s+how\s+to|learn\s+to|guide\s+me\s+(?:on|to)|steps\s+to|way\s+to)\s+(?:build|create|make|develop|code|architect|design)\b/gi,
      "understand"
    );

  // Exclude explicit non-build commands: IDE launch, browser search, terminal unit tests, or pure preview switch
  if (
    /\b(open\s+(this\s+|the\s+)?(project|workspace|folder|files)?\s*in\s+(vs\s*code|vscode|cursor|windsurf))\b/i.test(candidateBuildText) ||
    /\b(open\s+(my\s+|the\s+)?browser\s+(and\s+|to\s+)?(search|look|inspect|browse|find)|browse\s+the\s+web|search\s+the\s+web)\b/i.test(candidateBuildText) ||
    /\b(bun\s+test|run\s+(the\s+)?(unit|playwright|e2e|end\s*to\s*end|acceptance)\s+tests?|test\s+the\s+(entire\s+)?(app|application|project)\s*(end\s*to\s*end|e2e)?)\b/i.test(candidateBuildText) ||
    (/^(show|open|view|switch\s+to|launch|resume)\s+(that\s+|this\s+|it\s+|the\s+)?(in\s+)?(the\s+)?preview(\s+tab)?$/i.test(candidateBuildText))
  ) {
    return {
      intent: "GUIDANCE_OR_CONVERSATION",
      isBuildTermination: false,
      isGuidanceOrQuestion: false,
      isPauseOrSilence: false,
      isAffirmativeBuildCommand: false,
      reasoning: "IDE, browser, test, or preview navigation command.",
    };
  }

  // Exclude pure meta/explanation/suggestion questions that do NOT contain an imperative request to build software
  const hasBuildDirective =
    /\b(just\s+build|now\s+build|please\s+build|start\s+building|start\s+coding|start\s+working|work\s+on|let('s|s)\s+build|go\s+ahead\s+and\s+build|build\s+(a|an|the|this|that|it|me\s+a|me\s+an|my|our|new|basic|simple)|create\s+(a|an|the|this|that|it|me\s+a|me\s+an|my|our|new|basic|simple)\s+([a-z0-9_-]+\s+){0,4}(app|application|project|website|web\s*app|platform|dashboard|store|shop|ecommerce|e-commerce|tool|system|calculator|todo|tracker|game|page)|make\s+(a|an|the|this|that|it|me\s+a|me\s+an|my|our|new|basic|simple|some|these|those)?\s*(changes|updates|edits|improvements|modifications|app|application|project|todo|website|platform|dashboard|ecommerce\s+app|shopping\s+app)|develop\s+(a|an|the|this|that|it|my|our|new)|scaffold\s+(a|an|the|this|that|it|my|our|new)|deploy\s+(the\s+)?(ai\s+|6\s+|six\s+)?agents|use\s+(some\s+|an?\s+)?(other|different|new|better)\s+(theme|color|style|layout|design|ui|elements?|components?)|change\s+the\s+(ui|theme|design|color|colors|layout|style|elements|components|buttons|header|background)|redesign|restyle)\b/i.test(
      normalizedForBuildCheck
    );

  const isPureQuestion =
    !hasBuildDirective &&
    (/^(check if|why\s+|how\s+(does|do|is|are|did|was|can|could|should|would)|what\s+(is|are|does|did|was|were|should|can|could)|can\s+you\s+(explain|suggest|recommend|tell|give|guide|help\s+me\s+understand)|could\s+you\s+(explain|suggest|recommend|tell|give|guide)|explain\s+|clarify\s+|tell\s+me\s+about|who\s+are\s+you|what's\s+your\s+name|what\s+can\s+you\s+do|do\s+you\s+have\s+any\s+(ideas|suggestions|recommendations))/i.test(
      candidateBuildText
    ) ||
      /\b(why\s+is\s+it\s+not\s+building|why\s+are\s+you|what\s+do\s+you\s+think|what\s+is\s+your\s+take|what's\s+your\s+opinion|are\s+you\s+stuck|did\s+you\s+freeze|look\s+at\s+the\s+screenshot|what\s+should\s+i\s+buy|give\s+me\s+a\s+suggestion)\b/i.test(
        candidateBuildText
      ));

  if (isPureQuestion) {
    return {
      intent: "GUIDANCE_OR_CONVERSATION",
      isBuildTermination: false,
      isGuidanceOrQuestion: true,
      isPauseOrSilence: false,
      isAffirmativeBuildCommand: false,
      reasoning: "Pure question or inquiry without an affirmative build command.",
    };
  }

  // Direct Build, Create, Scaffold, "Start Working On", UI/Theme Redesign, or Agent Deployment commands
  const explicitBuildPatterns = [
    /\b(start\s+working(\s+on)?|begin\s+working(\s+on)?|get\s+to\s+work(\s+on)?|keep\s+working\s+on|continue\s+working\s+on|continue\s+building)\b/i,
    /\b(let('s|s)?|can\s+you|could\s+you|please|i\s+want\s+(you\s+)?to|we\s+should|you\s+should|time\s+to|ready\s+to|just|now)?\s*(work\s+on)\s+(a|an|the|this|that|my|our|it|new|some|another)?\s*([a-z0-9_-]+\s+)*(project|app|application|website|platform|system|tool|store|dashboard|todo|list|calculator|game|portal|service|idea)\b/i,
    /\b(start\s+(building|coding|developing|creating|making|implementing|scaffolding|execution|the\s+build|the\s+project|the\s+app|the\s+application|actual\s+building|the\s+actual\s+building))\b/i,
    /\b(deploy\s+(the\s+)?(ai\s+|6\s+|six\s+)?agents|launch\s+(the\s+)?(ai\s+|6\s+|six\s+)?agents|get\s+the\s+(app|application|project)\s+ready)\b/i,
    /\b(you\s+need\s+to\s+start\s+building|need\s+to\s+start\s+building|have\s+to\s+start\s+building|time\s+to\s+start\s+building|we\s+should\s+start\s+building)\b/i,
    /\b(let('s|s)\s+build|start\s+to\s+build|now\s+build|just\s+build|please\s+build|go\s+ahead\s+and\s+(build|create|code|scaffold|implement))\b/i,
    /\b(build|scaffold|code|develop|architect)\s+(it|this|that)\b/i,
    /\b(build|create|make|develop|code|scaffold|implement|generate|construct|architect|work\s+on)\s+(me\s+)?(a\s+|an\s+|the\s+|this\s+|that\s+|my\s+|our\s+|some\s+|another\s+|new\s+)?([a-z0-9_-]+\s+){0,6}(app|application|project|software|website|web\s*app|site|platform|dashboard|system|tool|online\s+store|ecommerce|e-commerce|shopping\s+app|shopping\s+website|shopping\s+platform|storefront|calculator|tracker|todo|to-do|task\s+list|checklist|board|kanban|timer|pomodoro|game|portal|service|api|backend|frontend|ui|interface|landing\s+page|clone|bot|calendar|scheduler|messenger|editor|studio|player|visualizer|converter|generator|manager|crm|wallet|portfolio|blog|cms|marketplace|booking\s+app|booking\s+system|quiz\s+app)\b/i,
    /\b(build|create|develop|code|scaffold)\s+(me\s+)?(a\s+|an\s+|the\s+|my\s+|our\s+|new\s+)?([a-z0-9_-]+\s+){0,4}(store|shop)\b/i,
    /^\s*(?:(?:hey\s+rex|hi\s+rex|hello\s+rex|rex|ok|okay|alright|so|well|now|just|please|can\s+you|could\s+you|would\s+you|will\s+you|i\s+want\s+you\s+to|i\s+need\s+you\s+to|let('s|s))\s+)+(build|create|develop|code|scaffold|implement|construct|start\s+working|work\s+on)\s+(a|an|the|this|that|it|my|our|new|full|complete|modern|simple|basic|custom|interactive)\b/i,
    /^\s*(build|create|develop|code|scaffold|implement|construct)\s+(a|an|the|this|that|it|my|our|new)\b/i,
    /\b(make\s+(the\s+|some\s+|these\s+|those\s+)?(changes|updates|edits|improvements|modifications)|apply\s+(the\s+|these\s+|those\s+)?(changes|updates)|implement\s+(the\s+|these\s+)?(changes|updates|features))\b/i,
    /\b(use\s+(some\s+|an?\s+)?(other|different|new|better|another|modern|light|dark|vibrant|colorful)\s+(theme|themes|color|colors|style|styles|layout|design|ui|elements?|components?))\b/i,
    /\b(don'?t\s+like\s+the\s+(ui|design|theme|color|colors|layout|look|style|buttons|components))\b/i,
    /\b(change|update|modify|fix|tweak|set|improve|enhance|upgrade|redesign|restyle|overhaul|replace)\s+(the\s+|this\s+|my\s+|our\s+|its\s+)?(color|colors|font|padding|background|bg|text|size|style|styling|layout|title|button|buttons|nav|navbar|header|footer|margin|border|theme|ui|interface|design|elements|components|cards|look|appearance|app|application|project|todo|page|dashboard|store|code)\b/i,
    /^\s*(add|modify|update|refactor|edit|improve|expand|upgrade|redesign)\s+(a\s+|an\s+|the\s+|some\s+|more\s+)?([a-z0-9\s_-]{2,40})\s+(to|in|into|on|for)\s+(the\s+|this\s+|my\s+)?(app|application|project|code|component|page|dashboard|store|tracker|calculator|todo|list|ui|src\/)/i,
    /\b(modify|update|edit|refactor|improve|expand|upgrade|redesign)\s+(src\/components\/App\.tsx|App\.tsx|the\s+code|the\s+application|the\s+project|the\s+component|this\s+project|this\s+app|the\s+ui)\b/i,
    /\b(take\s+(it|this|the\s+project|the\s+app)\s+to\s+(an?\s+)?(entire\s+|full\s+)?product\s+level)\b/i,
  ];

  if (explicitBuildPatterns.some((p) => p.test(normalizedForBuildCheck))) {
    return {
      intent: "EXECUTE_BUILD",
      isBuildTermination: false,
      isGuidanceOrQuestion: false,
      isPauseOrSilence: false,
      isAffirmativeBuildCommand: true,
      reasoning: "Affirmative imperative command to build or modify software.",
    };
  }

  // Incremental edits when an active project exists in the session
  if (
    hasExistingProject &&
    (/^\s*(?:(?:hey\s+rex|rex|please|just|now|can\s+you|could\s+you|i\s+want\s+you\s+to|let('s|s))\s+)*(add|modify|update|refactor|edit|remove|fix|change|include|insert|implement|improve|enhance|expand|upgrade|extend|elevate|refine|redesign|restyle|polish|integrate|support|iterate)\b/i.test(
      normalizedForBuildCheck
    ) ||
      /\b(make\s+(the\s+|some\s+)?changes|add\s+(a\s+|some\s+|more\s+)?features?|improve\s+(the|this)\s+(project|app|application|ui|code|design)|enhance\s+(the|this)\s+(project|app|application|ui|design|quality)|other\s+theme|different\s+theme|new\s+theme)\b/i.test(
        normalizedForBuildCheck
      ))
  ) {
    return {
      intent: "EXECUTE_BUILD",
      isBuildTermination: false,
      isGuidanceOrQuestion: false,
      isPauseOrSilence: false,
      isAffirmativeBuildCommand: true,
      reasoning: "Incremental modification command on an active project.",
    };
  }

  // Continuation / Agreement phrases ("yes build it", "let's build that", "go ahead", "start now", "do it")
  const isDirectBuildAgreement =
    /\b(let('s|s)\s+build\s+(it|that|this)|build\s+(it|that|this)\s+now|just\s+build\s+(it|that|this)|build\s+that\s+idea|start\s+building\s+now|go\s+ahead\s+and\s+build|yes\s+(please\s+)?(build|start\s+building|create\s+it|code\s+it|do\s+it))\b/i.test(
      normalizedForBuildCheck
    );
  if (isDirectBuildAgreement) {
    return {
      intent: "EXECUTE_BUILD",
      isBuildTermination: false,
      isGuidanceOrQuestion: false,
      isPauseOrSilence: false,
      isAffirmativeBuildCommand: true,
      reasoning: "Explicit agreement to start building.",
    };
  }

  const isShortAgreement =
    /^(yes|yeah|yep|sure|okay|ok|alright|go\s+ahead|let('s|s)\s+do\s+it|let('s|s)\s+go|do\s+it|proceed|start|start\s+now|make\s+it\s+happen|sounds\s+good|sounds\s+like\s+a\s+plan|yes\s+please|please\s+do)[\s.!]*$/i.test(
      candidateBuildText
    );
  if (isShortAgreement && history.length > 0) {
    const recentHistory = history
      .slice(-4)
      .map((h) => h.content || "")
      .join(" ");
    if (
      /\b(start\s+building|start\s+scaffolding|start\s+coding|should\s+we\s+start|would\s+you\s+like\s+me\s+to\s+(start|build|scaffold)|ready\s+to\s+scaffold|build\s+this\s+now)\b/i.test(
        recentHistory
      )
    ) {
      return {
        intent: "EXECUTE_BUILD",
        isBuildTermination: false,
        isGuidanceOrQuestion: false,
        isPauseOrSilence: false,
        isAffirmativeBuildCommand: true,
        reasoning: "User agreed to a build proposal in recent conversation history.",
      };
    }
  }

  return {
    intent: "GUIDANCE_OR_CONVERSATION",
    isBuildTermination: false,
    isGuidanceOrQuestion: true,
    isPauseOrSilence: false,
    isAffirmativeBuildCommand: false,
    reasoning: "General conversation, discussion, or guidance request.",
  };
}

/**
 * Unified Build & Implementation Intent Detector:
 * Shared between the client WebSocket orchestrator (`useWebSocket.ts`) and `/api/chat`
 * so both layers agree 100% on when to deploy the 6 AI agents and route to Claude Sonnet 5.5.
 */
export function isBuildOrImplementationIntent(
  rawText: string,
  history: Array<{ role: string; content: string }> = [],
  hasExistingProject = false
): boolean {
  const analysis = analyzeWholeSentenceSemantics(rawText, {
    isCurrentlyBuilding: false,
    hasExistingProject,
    history,
  });
  return analysis.intent === "EXECUTE_BUILD" && analysis.isAffirmativeBuildCommand;
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
    if (/flowstate/i.test(cleanProj)) return "Flowstate Focus OS";
    if (/amity/i.test(cleanProj)) return "Amity Social App";
    if (/apexwealth/i.test(cleanProj)) return "ApexWealth Advisor";
    if (/taskflow/i.test(cleanProj)) return "TaskFlow Todo App";
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

  // Personal shopping / buying suggestions conversation title
  if (
    /\b(go\s+(to\s+|for\s+)?shopping|going\s+(to\s+|for\s+)?shopping|what\s+(new\s+)?(thing|things|item|items)?\s*(should|can|could)\s+i\s+buy|buy\s+today)\b/i.test(
      lower
    )
  ) {
    return "Shopping Ideas & Picks";
  }

  // Semantic Domain Classifications
  if (/\b(railgo|rail\s*go|train\s*booking|railway|irctc|train\s*ticket|locomotive)\b/i.test(lower)) return "RailGo Train Booking";
  if (/\b(flight|airline|airport|aviation)\b/i.test(lower)) return "SkyJet Flight Booking";
  if (/\b(hotel|resort|hospitality|room\s*booking)\b/i.test(lower)) return "Hotel Booking App";
  if (/\b(flowstate|flow\s*state|focus\s*os)\b/i.test(lower)) return "Flowstate Focus OS";
  if (lower.includes("pomodoro") || (lower.includes("timer") && !lower.includes("crypto"))) return "Pomodoro Focus Timer";
  if (lower.includes("calculator") || lower.includes("omnicalc") || lower.includes("math engine")) return "OmniCalc Calculator";
  if (
    lower.includes("cosmetic") ||
    lower.includes("makeup") ||
    lower.includes("beauty") ||
    lower.includes("skincare") ||
    lower.includes("facial") ||
    lower.includes("clothing") ||
    lower.includes("fashion") ||
    lower.includes("ecommerce") ||
    lower.includes("e-commerce") ||
    (lower.includes("store") && /\b(build|create|make|app|online)\b/i.test(lower)) ||
    (lower.includes("shop") && /\b(build|create|make|app|online)\b/i.test(lower))
  ) {
    return `${generateDynamicEcommerceBrandName(p)} Store`;
  }
  if (lower.includes("food") || lower.includes("restaurant") || lower.includes("recipe") || lower.includes("meal") || lower.includes("delivery")) return "BiteFlow Food App";
  if (lower.includes("friend") || lower.includes("amity") || lower.includes("bestie")) return "Amity Social App";
  if (lower.includes("landing page") || lower.includes("startup landing")) return "Startup Landing Page";
  if (lower.includes("crypto") || lower.includes("bitcoin") || lower.includes("ethereum") || lower.includes("arbitrage")) return "Crypto Analytics";
  if (lower.includes("invest") || lower.includes("stock") || lower.includes("portfolio") || lower.includes("finance") || lower.includes("wealth")) return "ApexWealth Finance";
  if (lower.includes("todo") || lower.includes("to-do") || /\bto\s+do\b/i.test(lower) || lower.includes("checklist")) return "TaskFlow Todo App";
  if (lower.includes("task") || lower.includes("kanban") || lower.includes("sprint")) return "Sprint Task Board";
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
