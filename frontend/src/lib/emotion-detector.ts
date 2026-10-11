// Real-time autonomous emotional awareness and sentiment detection engine for Rex
// Automatically determines the optimal emotional delivery (upbeat, empathetic, calm, warm)
// based on user sentiment, conversational context, vulnerability, and technical difficulty.

export type EmotionTone = "warm" | "upbeat" | "calm" | "empathetic";

// 1. High-priority Frustration, Bug Fatigue, Sadness, Stress & Vulnerability patterns
const EMPATHETIC_PATTERNS = [
  // Frustration with bugs & code
  /\b(why\s+(the\s+hell|is\s+this|is\s+it)\s+(still\s+)?broken|why\s+is\s+it\s+failing|not\s+working|still\s+not\s+working|nothing\s+is\s+working|won't\s+work|does\s+not\s+work)\b/i,
  /\b(wtf|what\s+the\s+hell|damn\s+it|damnit|hate\s+this|hate\s+debugging|stupid\s+bug|terrible|horrible|waste\s+of\s+time|driving\s+me\s+crazy|pissing\s+me\s+off)\b/i,
  /\b(stuck\s+(on|with|in)|can't\s+figure\s+this\s+out|completely\s+lost|don't\s+understand\s+why|tried\s+everything|keeps\s+crashing|runtime\s+error|fatal\s+error|unhandled\s+exception)\b/i,
  /\b(broken\s+again|failed\s+again|keeps\s+breaking|keeps\s+failing|so\s+frustrated|frustrating|headache|pulling\s+my\s+hair\s+out)\b/i,

  // Emotional distress, personal sadness, anxiety, burnout, exhaustion
  /\b(feeling\s+(sad|down|blue|hopeless|depressed|lonely|awful|terrible|bad|exhausted|burnt\s*out|overwhelmed|anxious|scared|stressed))\b/i,
  /\b(i('m| am)\s+(sad|depressed|lonely|burnt\s*out|exhausted|struggling|crying|hurting|sick|tired|stressed\s*out|overwhelmed))\b/i,
  /\b(bad\s+day|rough\s+day|terrible\s+day|hard\s+time|having\s+a\s+hard\s+time|lost\s+my\s+job|heartbroken|broke\s+up|passed\s+away|grief|grieving)\b/i,
  /\b(need\s+someone\s+to\s+talk\s+to|nobody\s+cares|feel\s+alone|feeling\s+alone|can('t| not)\s+take\s+this|too\s+much\s+pressure)\b/i,
  /\b(sorry\s+to\s+bother\s+you|feel\s+like\s+a\s+failure|imposter\s+syndrome|not\s+good\s+enough)\b/i,
];

// 2. High-priority Celebration, Breakthrough, Joy, Excitement & Praise patterns
const UPBEAT_PATTERNS = [
  /\b(it\s+worked|finally\s+worked|finally\s+got\s+it|it's\s+working|holy\s+shit\s+it\s+works|omg\s+it\s+worked|yes+|yesss+|yass+)\b/i,
  /\b(let('s|s)\s+go+|boom|hooray|hurray|woohoo|we\s+did\s+it|you\s+did\s+it|nailed\s+it|crushed\s+it)\b/i,
  /\b(awesome|fantastic|amazing|incredible|brilliant|magnificent|spectacular|legendary|genius|masterpiece)\b/i,
  /\b(so\s+happy|love\s+this|love\s+it|this\s+is\s+sick|this\s+is\s+fire|super\s+cool|clean\s+code|smooth\s+as\s+butter)\b/i,
  /\b(haha+|hehe+|lol|lmao|rofl|hilarious|celebrate|cheers|victory|champion)\b/i,
  /!{2,}/, // Multiple exclamation marks indicating excitement
];

// 3. Deep Analytical, Architectural, Methodical & Contemplative patterns
const CALM_PATTERNS = [
  /\b(refactor|refactoring|architecture|architectural|system\s+design|database\s+schema|data\s+structure|algorithmic)\b/i,
  /\b(memory\s+leak|garbage\s+collector|concurrency|race\s+condition|thread\s+safety|asynchronous\s+lifecycle)\b/i,
  /\b(step\s+by\s+step|methodical|methodically|systematic|in-depth\s+analysis|trace\s+the\s+flow|code\s+audit)\b/i,
  /\b(performance\s+profiling|optimization|latency\s+budget|scalability|philosophical|success\s+vs\s+money)\b/i,
  /\b(let('s|s)\s+take\s+a\s+(deep\s+breath|step\s+back|calm\s+look)|focus\s+mode|flow\s+state|zen)\b/i,
];

/**
 * Autonomously detects the user's emotional state and determines Rex's responsive tone.
 * - When user is happy / celebrating -> 'upbeat' (lively, energetic, smiling delivery)
 * - When user is frustrated / stuck / sad / sharing concerning personal feelings -> 'empathetic' (gentle, caring, patient, supportive)
 * - When user is doing deep architecture / methodical analysis -> 'calm' (smooth, measured, composed)
 * - Default conversational baseline -> 'warm' (friendly, approachable, companionable)
 */
export function detectEmotionFromContext(
  userText?: string,
  assistantReply?: string,
  history?: Array<{ role: string; content: string }>
): EmotionTone {
  const user = (userText || "").trim();
  const reply = (assistantReply || "").trim();

  // Combine recent history if available to detect lingering frustration or ongoing celebration
  const recentHistory = (history || [])
    .slice(-3)
    .map((h) => h.content)
    .join(" ");

  const combined = `${user} ${recentHistory}`.toLowerCase();
  const replyLower = reply.toLowerCase();

  // 1. Check Empathetic Triggers (Highest Priority to guarantee supportive care)
  for (const pattern of EMPATHETIC_PATTERNS) {
    if (pattern.test(combined) || pattern.test(user)) {
      return "empathetic";
    }
  }

  // Check if assistant reply itself begins with an empathetic embrace
  if (
    /^(i\s+hear\s+you|i('m| am)\s+(so\s+)?sorry|don't\s+worry|let's\s+take\s+a\s+breath|we've\s+all\s+been\s+there|debugging\s+can\s+be\s+really\s+frustrating|it's\s+completely\s+understandable|take\s+your\s+time|i'm\s+here\s+for\s+you)\b/i.test(
      replyLower
    )
  ) {
    return "empathetic";
  }

  // 2. Check Upbeat & Excitement Triggers
  for (const pattern of UPBEAT_PATTERNS) {
    if (pattern.test(user) || pattern.test(combined)) {
      return "upbeat";
    }
  }

  // Check if assistant reply is celebrating a win
  if (
    /^(boom|let's\s+go|awesome|fantastic|that's\s+what\s+i'm\s+talking\s+about|we\s+did\s+it|all\s+tests\s+passed|compiled\s+cleanly|congratulations)\b/i.test(
      replyLower
    )
  ) {
    return "upbeat";
  }

  // 3. Check Calm & Deep Focus Triggers
  for (const pattern of CALM_PATTERNS) {
    if (pattern.test(user) || pattern.test(combined)) {
      return "calm";
    }
  }

  // 4. Default: Friendly, warm, engaging human baseline
  return "warm";
}

/**
 * Returns a human-friendly label and description of Rex's active emotional state
 */
export function getEmotionStateMeta(emotion: EmotionTone): {
  label: string;
  badge: string;
  auraColor: string;
  description: string;
} {
  switch (emotion) {
    case "empathetic":
      return {
        label: "Empathetic & Attentive",
        badge: "Supportive Care",
        auraColor: "#34d399", // Gentle Emerald
        description: "Gentle cadence with patient micro-pauses for problem-solving or personal sharing.",
      };
    case "upbeat":
      return {
        label: "Enthusiastic & Excited",
        badge: "High Energy",
        auraColor: "#38bdf8", // Vibrant Cyan
        description: "Lively vocal energy, dynamic pitch modulation, and celebratory cadence.",
      };
    case "calm":
      return {
        label: "Calm & Focused",
        badge: "Deep Clarity",
        auraColor: "#818cf8", // Sapphire Indigo
        description: "Smooth, measured tempo for architectural reasoning and complex systems.",
      };
    case "warm":
    default:
      return {
        label: "Friendly & Warm",
        badge: "Adaptive Flow",
        auraColor: "#60a5fa", // Warm Steel Blue
        description: "Natural conversational inflection, approachable, and encouraging companionship.",
      };
  }
}
