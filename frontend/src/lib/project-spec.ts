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
export function extractProjectName(
  prompt: string,
  history?: Array<{ role: string; content: string }>
): string {
  if (!prompt || typeof prompt !== "string") return "ApexApp";

  const clean = prompt.trim();
  const lower = clean.toLowerCase();
  const historyText = (history || []).map((h) => h.content.toLowerCase()).join(" ");
  const combined = `${lower} ${historyText}`;

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
      // Ensure candidate is not a generic sentence fragment
      if (
        !/^(a|an|the|this|my|our|new|modern|simple|cool|awesome|interactive|fast|beautiful)$/i.test(candidate) &&
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

  if (lower.includes("productivity") || lower.includes("task") || lower.includes("project management") || lower.includes("employee")) {
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

  if (lower.includes("chat") || lower.includes("social") || lower.includes("community") || lower.includes("messaging")) {
    return "PulseChat";
  }

  if (lower.includes("dashboard") || lower.includes("analytics") || lower.includes("metrics") || lower.includes("telemetry")) {
    return "NexusDash";
  }

  // Fallback: extract 1-2 prominent keywords (never a sentence!)
  const words = clean
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(
      (w) =>
        !/^(build|make|create|develop|code|generate|implement|want|need|please|like|a|an|the|for|in|on|with|to|of|and|is|me|us|our|app|application|website|platform|software|system|tool)$/i.test(
          w
        )
    );

  if (words.length > 0) {
    const word1 = words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
    const word2 = words[1] ? words[1].charAt(0).toUpperCase() + words[1].slice(1).toLowerCase() : "Hub";
    return `${word1}${word2}`.slice(0, 20);
  }

  return "NexusApp";
}

/**
 * Intelligent Chat Naming (Strictly maximum 2 words):
 * ChatGPT-style concise, punchy topic labels.
 * Examples:
 * - "Build me an AI-powered food recommendation app" -> "Food AI"
 * - "Create a SaaS dashboard for tracking employee productivity" -> "Productivity SaaS"
 * - "Help me build an autonomous coding agent" -> "Coding Agent"
 * - "How is your mom?" -> "Casual Chat"
 * - "Fix the login bug in navbar" -> "Navbar Fix"
 */
export function generateChatTitle(prompt: string, projectName?: string): string {
  if (!prompt || typeof prompt !== "string") return "New Project";

  const lower = prompt.trim().toLowerCase();

  // Social / casual topics
  if (lower.includes("how are you") || lower.includes("what's up") || lower.includes("how's it going") || lower.includes("hello") || lower.includes("hey")) {
    return "Casual Chat";
  }
  if (lower.includes("mom") || lower.includes("family") || lower.includes("human") || lower.includes("who are you")) {
    return "Rex Chat";
  }
  if (lower.includes("useless") || lower.includes("joke") || lower.includes("funny") || lower.includes("haha") || lower.includes("lol")) {
    return "Team Banter";
  }
  if (lower.includes("why is this") || lower.includes("still broken") || lower.includes("debug") || lower.includes("error") || lower.includes("not working")) {
    return "Debug Help";
  }
  if (lower.includes("dark mode") || lower.includes("theme") || lower.includes("color")) {
    return "Theme Styling";
  }
  if (lower.includes("auth") || lower.includes("login") || lower.includes("signup") || lower.includes("oauth")) {
    return "Auth Flow";
  }

  // Food / restaurant applications
  if (lower.includes("food") && (lower.includes("ai") || lower.includes("recommend"))) {
    return "Food AI";
  }
  if (lower.includes("food") || lower.includes("restaurant") || lower.includes("delivery") || lower.includes("meal")) {
    return "Food Delivery";
  }

  // SaaS / productivity
  if (lower.includes("productivity") || lower.includes("employee")) {
    return "Productivity SaaS";
  }
  if (lower.includes("dashboard") && lower.includes("saas")) {
    return "SaaS Dashboard";
  }
  if (lower.includes("dashboard") || lower.includes("analytics")) {
    return "Analytics Dash";
  }

  // Coding agent / AI
  if (lower.includes("coding agent") || lower.includes("code agent") || lower.includes("autonomous agent")) {
    return "Coding Agent";
  }
  if (lower.includes("landing page") || lower.includes("landing")) {
    if (lower.includes("ai")) return "AI Landing";
    if (lower.includes("saas")) return "SaaS Landing";
    return "Landing Page";
  }

  // E-commerce & store
  if (lower.includes("clothing") || lower.includes("clothes") || lower.includes("fashion")) {
    return "Clothing Store";
  }
  if (lower.includes("cosmetic") || lower.includes("makeup") || lower.includes("beauty") || lower.includes("skincare")) {
    return "Beauty Store";
  }
  if (lower.includes("ecommerce") || lower.includes("e-commerce") || lower.includes("store") || lower.includes("shop")) {
    return "Online Store";
  }

  // Finance / crypto
  if (lower.includes("crypto") || lower.includes("bitcoin") || lower.includes("ethereum")) {
    return "Crypto Tracker";
  }
  if (lower.includes("investment") || lower.includes("portfolio") || lower.includes("wealth") || lower.includes("stock")) {
    return "Wealth Advisor";
  }

  // Calculator / tools
  if (lower.includes("calculator") || lower.includes("math")) {
    return "Smart Calculator";
  }

  // If a clean project name was derived, use 2-word variation
  if (projectName && projectName.length > 2 && projectName.length <= 15) {
    if (lower.includes("app") || lower.includes("application")) return `${projectName} App`;
    if (lower.includes("platform")) return `${projectName} Platform`;
    return projectName;
  }

  // Extract up to 2 salient nouns
  const keywords = prompt
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(
      (w) =>
        !/^(build|make|create|develop|code|generate|implement|want|need|please|like|a|an|the|for|in|on|with|to|of|and|is|me|us|our|my|you|this|that|so|from|it|by|at)$/i.test(
          w
        )
    )
    .slice(0, 2);

  if (keywords.length >= 2) {
    const k1 = keywords[0].charAt(0).toUpperCase() + keywords[0].slice(1).toLowerCase();
    const k2 = keywords[1].charAt(0).toUpperCase() + keywords[1].slice(1).toLowerCase();
    return `${k1} ${k2}`;
  }

  if (keywords.length === 1) {
    const k1 = keywords[0].charAt(0).toUpperCase() + keywords[0].slice(1).toLowerCase();
    return `${k1} App`;
  }

  return "Project Workspace";
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
