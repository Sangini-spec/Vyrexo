// Humanized, emotion-aware voice synthesis engine for Vyrexo
// Solves browser speech truncation, Chrome GC cutoff, and robotic monotone delivery.

export type EmotionTone = "warm" | "upbeat" | "calm" | "empathetic";

export interface VoiceSettings {
  voice: string; // "adam" | "ryan" | "ava" | "sonia"
  speed: "slow" | "normal" | "fast";
  emotion: EmotionTone;
}

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  voice: "adam",
  speed: "normal",
  emotion: "warm",
};

export const EMOTION_OPTIONS: Array<{
  id: EmotionTone;
  label: string;
  desc: string;
  icon: string;
}> = [
  {
    id: "warm",
    label: "Friendly & Warm",
    desc: "Natural conversational inflection, approachable, and encouraging",
    icon: "🤝",
  },
  {
    id: "upbeat",
    label: "Enthusiastic & Upbeat",
    desc: "Lively, energetic, dynamic pitch modulation, great for brainstorming",
    icon: "⚡",
  },
  {
    id: "calm",
    label: "Calm & Focused",
    desc: "Gentle, measured cadence, relaxed pace for deep coding sessions",
    icon: "🌊",
  },
  {
    id: "empathetic",
    label: "Empathetic & Attentive",
    desc: "Patient, supportive, attentive listening tone when solving tough bugs",
    icon: "🌱",
  },
];

export interface VoiceProfile {
  name: string;
  gender: "Male" | "Female";
  accent: "American" | "British";
  vibe: string;
  preferredNames: string[];
  basePitch: number;
  baseRate: number;
}

// Curated 6 voice profiles (3 male, 3 female)
export const VOICE_PROFILES: Record<string, VoiceProfile> = {
  // ── MALE VOICES ──
  adam: {
    name: "Adam",
    gender: "Male",
    accent: "American",
    vibe: "Deep, articulate & conversational American voice",
    preferredNames: [
      "Microsoft Guy Online (Natural)",
      "Microsoft Guy",
      "Microsoft David Online (Natural)",
      "Microsoft David",
      "Microsoft Christopher Online (Natural)",
      "Microsoft Mark",
      "Alex",
      "Fred",
    ],
    basePitch: 0.98,
    baseRate: 1.08,
  },
  brian: {
    name: "Brian",
    gender: "Male",
    accent: "British",
    vibe: "Calm, thoughtful & narrative British cadence",
    preferredNames: [
      "Microsoft Brian Online (Natural)",
      "Microsoft Brian",
      "Microsoft Ryan Online (Natural)",
      "Microsoft Ryan",
      "Google UK English Male",
      "Daniel",
      "Oliver",
      "Arthur",
    ],
    basePitch: 0.96,
    baseRate: 1.05,
  },
  ryan: {
    name: "Brian",
    gender: "Male",
    accent: "British",
    vibe: "Calm, steady & articulate British cadence",
    preferredNames: [
      "Microsoft Brian Online (Natural)",
      "Microsoft Brian",
      "Microsoft Ryan Online (Natural)",
      "Microsoft Ryan",
      "Google UK English Male",
      "Daniel",
      "Oliver",
      "Arthur",
    ],
    basePitch: 0.96,
    baseRate: 1.05,
  },

  // ── FEMALE VOICES ──
  ava: {
    name: "Ava",
    gender: "Female",
    accent: "American",
    vibe: "Warm, natural & clear American voice",
    preferredNames: [
      "Microsoft Jenny Online (Natural)",
      "Microsoft Aria Online (Natural)",
      "Google US English",
      "Samantha",
      "Victoria",
      "Allison",
      "Microsoft Zira",
    ],
    basePitch: 1.04,
    baseRate: 1.08,
  },
  rachel: {
    name: "Rachel",
    gender: "Female",
    accent: "American",
    vibe: "Calm, compassionate & deeply empathetic American voice",
    preferredNames: [
      "Microsoft Jenny Online (Natural)",
      "Microsoft Aria Online (Natural)",
      "Google US English",
      "Samantha",
      "Victoria",
    ],
    basePitch: 1.02,
    baseRate: 1.04,
  },
  sonia: {
    name: "Sonia",
    gender: "Female",
    accent: "British",
    vibe: "Crisp, elegant & articulate British cadence",
    preferredNames: [
      "Microsoft Sonia Online (Natural)",
      "Microsoft Libby Online (Natural)",
      "Google UK English Female",
      "Serena",
      "Fiona",
      "Stephanie",
      "Microsoft Hazel",
    ],
    basePitch: 1.02,
    baseRate: 1.06,
  },
  charlotte: {
    name: "Charlotte",
    gender: "Female",
    accent: "British",
    vibe: "Elegant, warm & natural British cadence",
    preferredNames: [
      "Microsoft Sonia Online (Natural)",
      "Microsoft Libby Online (Natural)",
      "Google UK English Female",
      "Serena",
    ],
    basePitch: 1.02,
    baseRate: 1.05,
  },
  george: {
    name: "George",
    gender: "Male",
    accent: "American",
    vibe: "Warm, raspy & articulate expressive male voice",
    preferredNames: [
      "Microsoft Guy Online (Natural)",
      "Microsoft David Online (Natural)",
      "Alex",
    ],
    basePitch: 0.95,
    baseRate: 1.06,
  },
  nicole: {
    name: "Nicole",
    gender: "Female",
    accent: "American",
    vibe: "Soft, gentle & caring conversational female voice",
    preferredNames: [
      "Microsoft Jenny Online (Natural)",
      "Google US English",
      "Samantha",
    ],
    basePitch: 1.05,
    baseRate: 1.04,
  },

  // ── BACKWARD-COMPATIBILITY FALLBACK ALIASES ──
  andrew: {
    name: "Adam",
    gender: "Male",
    accent: "American",
    vibe: "Deep, articulate & conversational American voice",
    preferredNames: ["Microsoft Guy Online (Natural)", "Microsoft David", "Alex"],
    basePitch: 0.98,
    baseRate: 1.08,
  },
  antoni: {
    name: "Adam",
    gender: "Male",
    accent: "American",
    vibe: "Deep, articulate & conversational American voice",
    preferredNames: ["Microsoft Guy Online (Natural)", "Microsoft David", "Alex"],
    basePitch: 0.98,
    baseRate: 1.08,
  },
  josh: {
    name: "Adam",
    gender: "Male",
    accent: "American",
    vibe: "Deep, articulate & conversational American voice",
    preferredNames: ["Microsoft Guy Online (Natural)", "Alex"],
    basePitch: 0.98,
    baseRate: 1.08,
  },
};

// Global reference store to prevent Chrome garbage collector from destroying active utterances mid-speech
declare global {
  interface Window {
    __rexActiveUtterances?: Set<SpeechSynthesisUtterance>;
    __rexHeartbeatInterval?: number;
    __rexWatchdogTimer?: number;
  }
}

/**
 * Strips code blocks, markdown noise, and technical syntax to create natural spoken text.
 * Leaves the spoken dialogue clear and human-sounding.
 */
export function cleanTextForSpeech(raw: string): string {
  if (!raw) return "";

  let text = raw;

  // Replace code blocks with natural conversational narration
  text = text.replace(/```[\s\S]*?```/g, " Here is the code snippet, which you can see in the chat. ");

  // Strip inline code brackets
  text = text.replace(/`([^`]+)`/g, "$1");

  // Strip markdown links [text](url) -> text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // Turn asterisks stage directions and breath cues (*takes a deep breath*, *sighs*, *chuckles*, etc.)
  // into organic comma micro-pauses (, ) so speech takes a human breath without long awkward silences
  text = text.replace(/\*+(?:takes?\s+(?:a\s+)?(?:deep\s+|little\s+|quick\s+|gentle\s+)?breath|breath[es]*|sigh[s]*|pause[s]*|chuckle[s]*|laugh[s]*|clears?\s+throat|[^*]+)\*+/gi, ", ");
  text = text.replace(/\*+[^*]+?\*+/g, ", ");

  // Turn parenthetical stage directions into natural commas
  text = text.replace(/\([^)]*(?:breath|pause|sigh|chuckle|clears?\s+throat|laugh|smile)[^)]*\)/gi, ", ");

  // Strip XML/HTML style breath tags
  text = text.replace(/<breath\s*\/?>/gi, ", ");
  text = text.replace(/<[^>]+>/g, " ");

  // Replace unadorned literal breath words with natural comma pauses
  text = text.replace(/\b(?:takes?\s+(?:a\s+)?(?:little\s+|deep\s+|quick\s+|gentle\s+)?breath|taking\s+a\s+breath|takes?\s+a\s+moment\s+to\s+breathe|breathes?\s+(?:in|out)?|takes?\s+a\s+pause|pauses?\s+briefly|deep\s+breath)\b[,.]?/gi, ", ");

  // Strip markdown formatting characters
  text = text.replace(/[*_~#]/g, "");

  // Convert numbered lists into natural spoken transitions
  text = text.replace(/^\s*\d+\.\s+/gm, " ");

  // Convert bullets
  text = text.replace(/^\s*[-•*]\s+/gm, " ");

  // Clean excessive pauses, multiple commas, and whitespace
  text = text.replace(/\s*,\s*,\s*/g, ", ");
  text = text.replace(/\s*,\s*\.\.\.\s*,?/g, ", ");
  text = text.replace(/\.{3,}/g, ".");
  text = text.replace(/\n\s*\n/g, ". ").replace(/\n/g, " ");
  text = text.replace(/\s{2,}/g, " ").trim();

  return text;
}

/**
 * Breaks spoken text into natural, complete conversational sentences.
 * Keeps entire clauses unified so speech is fluid, continuous, and never stutters.
 */
export function splitIntoSpeechChunks(text: string): string[] {
  if (!text) return [];

  // Match sentences ending in punctuation
  const rawChunks = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
  const results: string[] = [];

  for (const chunk of rawChunks) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;

    // Only split if a single uninterrupted sentence is exceptionally long (> 240 chars)
    if (trimmed.length > 240) {
      const subParts = trimmed.split(/([,;:]\s+)/);
      let current = "";
      for (const part of subParts) {
        if ((current + part).length > 200 && current.length > 30) {
          results.push(current.trim());
          current = part;
        } else {
          current += part;
        }
      }
      if (current.trim()) results.push(current.trim());
    } else {
      results.push(trimmed);
    }
  }

  return results.length > 0 ? results : [text];
}

const FEMALE_VOICE_PATTERNS = /(female|woman|zira|jenny|aria|samantha|victoria|karen|susan|catherine|lisa|stephanie|hazel|helena|eva|fiona|veena|tessa|moira|google us english|sonia|ava)/i;
const MALE_VOICE_PATTERNS = /(male|man|guy|david|mark|george|richard|daniel|oliver|alex|fred|google uk english male|christopher|ryan|andrew|adam|brian)/i;

// Cache resolved browser voice per profile to guarantee 100% voice consistency across all turns
const resolvedVoiceCache = new Map<string, SpeechSynthesisVoice>();

/**
 * Finds the highest quality, most natural browser voice matching the requested profile.
 * Locks the voice for the session so Rex's timbre never flips mid-dialogue.
 */
export function pickBrowserVoice(
  profileId: string,
  availableVoices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | null {
  if (!availableVoices || availableVoices.length === 0) return null;

  const cached = resolvedVoiceCache.get(profileId);
  if (cached && availableVoices.some((v) => v.name === cached.name)) {
    return cached;
  }

  const profile = VOICE_PROFILES[profileId] || VOICE_PROFILES.adam;
  const isMale = profile.gender === "Male";
  const isBritish = profile.accent === "British";

  let selected: SpeechSynthesisVoice | null = null;

  // 1. First attempt: match against profile's specific curated preferred voice list
  for (const preferred of profile.preferredNames) {
    const match = availableVoices.find(
      (v) =>
        v.name.toLowerCase().includes(preferred.toLowerCase()) ||
        v.voiceURI.toLowerCase().includes(preferred.toLowerCase())
    );
    if (match) {
      if (isMale && FEMALE_VOICE_PATTERNS.test(match.name) && !MALE_VOICE_PATTERNS.test(match.name)) {
        continue;
      }
      selected = match;
      break;
    }
  }

  // 2. Exact Accent & Gender candidate filtering
  if (!selected) {
    const targetPrefix = isBritish ? "en-gb" : "en-us";
    const accentVoices = availableVoices.filter((v) =>
      v.lang.replace("_", "-").toLowerCase().startsWith(targetPrefix)
    );

    if (accentVoices.length > 0) {
      if (isMale) {
        const maleAccent = accentVoices.find(
          (v) => MALE_VOICE_PATTERNS.test(v.name) && !FEMALE_VOICE_PATTERNS.test(v.name)
        );
        selected = maleAccent || accentVoices.filter((v) => !FEMALE_VOICE_PATTERNS.test(v.name))[0] || null;
      } else {
        const femaleAccent = accentVoices.find((v) => FEMALE_VOICE_PATTERNS.test(v.name));
        selected = femaleAccent || accentVoices.filter((v) => !MALE_VOICE_PATTERNS.test(v.name))[0] || null;
      }
    }
  }

  // 3. Fallback: Any English voices matching gender
  if (!selected) {
    const englishVoices = availableVoices.filter((v) => v.lang.startsWith("en"));
    const voicePool = englishVoices.length > 0 ? englishVoices : availableVoices;

    if (isMale) {
      const maleCandidate = voicePool.find(
        (v) => MALE_VOICE_PATTERNS.test(v.name) && !FEMALE_VOICE_PATTERNS.test(v.name)
      );
      selected = maleCandidate || voicePool.filter((v) => !FEMALE_VOICE_PATTERNS.test(v.name))[0] || availableVoices[0];
    } else {
      const femaleCandidate = voicePool.find((v) => FEMALE_VOICE_PATTERNS.test(v.name));
      selected = femaleCandidate || voicePool.filter((v) => !MALE_VOICE_PATTERNS.test(v.name))[0] || availableVoices[0];
    }
  }

  if (selected) {
    resolvedVoiceCache.set(profileId, selected);
  }

  return selected;
}

/**
 * Computes humanized pitch and rate based on voice profile, user speed preference, and emotion tone.
 * Calibrated for a prompt, natural conversational tempo (never sluggish or dragging).
 */
export function calculateAcousticParams(
  settings: VoiceSettings,
  actualVoiceName?: string
): { pitch: number; rate: number } {
  const profile = VOICE_PROFILES[settings.voice] || VOICE_PROFILES.adam;

  let speedMultiplier = 1.0;
  if (settings.speed === "slow") speedMultiplier = 0.94;
  if (settings.speed === "fast") speedMultiplier = 1.15;

  let emotionPitchOffset = 0.0;
  let emotionRateOffset = 0.0;

  switch (settings.emotion) {
    case "upbeat":
      emotionPitchOffset = +0.04;
      emotionRateOffset = +0.04;
      break;
    case "warm":
      emotionPitchOffset = +0.02;
      emotionRateOffset = +0.01;
      break;
    case "calm":
      emotionPitchOffset = -0.02;
      emotionRateOffset = -0.02;
      break;
    case "empathetic":
      emotionPitchOffset = +0.01;
      emotionRateOffset = 0.0;
      break;
  }

  let basePitch = profile.basePitch;

  if (profile.gender === "Male" && actualVoiceName && FEMALE_VOICE_PATTERNS.test(actualVoiceName)) {
    basePitch = 0.88;
  }

  const finalPitch = Math.max(0.80, Math.min(1.25, basePitch + emotionPitchOffset));
  const finalRate = Math.max(1.0, Math.min(1.28, profile.baseRate * speedMultiplier + emotionRateOffset));

  return { pitch: finalPitch, rate: finalRate };
}

export interface SpeakOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
  onChunkStart?: (index: number, total: number, text: string) => void;
}

let isCancelled = false;
let currentWatchdog: ReturnType<typeof setTimeout> | null = null;
let currentHeartbeat: ReturnType<typeof setInterval> | null = null;

/**
 * Primes and unfreezes the browser speech synthesis engine and audio context.
 * Must be called on user interactions (click, spacebar, mic toggle) so the browser
 * never blocks subsequent asynchronous speech playback.
 */
export function primeSpeechSynthesis(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    const synth = window.speechSynthesis;
    if (synth.paused) {
      synth.resume();
    }
    synth.resume();
  } catch {}
}

/**
 * Main function: Speaks text with humanized inflection, chunk-by-chunk playback,
 * garbage-collection immunity, and automatic recovery.
 */
export function speakHumanizedText(
  text: string,
  settings: VoiceSettings = DEFAULT_VOICE_SETTINGS,
  options?: SpeakOptions
): () => void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    options?.onEnd?.();
    return () => {};
  }

  // Cancel any existing speech cleanly and unpause engine
  cancelHumanizedSpeech();
  isCancelled = false;

  const synth = window.speechSynthesis;
  try {
    if (synth.paused) synth.resume();
    synth.resume();
  } catch {}

  const cleaned = cleanTextForSpeech(text);
  if (!cleaned) {
    options?.onEnd?.();
    return () => {};
  }

  const chunks = splitIntoSpeechChunks(cleaned);
  const { pitch, rate } = calculateAcousticParams(settings);

  // Initialize GC keeper set
  if (!window.__rexActiveUtterances) {
    window.__rexActiveUtterances = new Set();
  }

  let chunkIndex = 0;
  let hasStarted = false;

  const cleanup = () => {
    if (currentHeartbeat) {
      clearInterval(currentHeartbeat);
      currentHeartbeat = null;
    }
    if (currentWatchdog) {
      clearTimeout(currentWatchdog);
      currentWatchdog = null;
    }
    window.__rexActiveUtterances?.clear();
  };

  const resetChunkWatchdog = () => {
    if (currentWatchdog) {
      clearTimeout(currentWatchdog);
      currentWatchdog = null;
    }
    // 7s per chunk watchdog: prevents Rex from ever hanging in speaking state
    currentWatchdog = setTimeout(() => {
      if (!isCancelled) {
        console.warn("[VoiceSynthesizer] Chunk stall watchdog hit, advancing chunk");
        chunkIndex++;
        if (chunkIndex < chunks.length) {
          speakNextChunk();
        } else {
          cleanup();
          options?.onEnd?.();
        }
      }
    }, 7000);
  };

  const speakNextChunk = () => {
    if (isCancelled || chunkIndex >= chunks.length) {
      cleanup();
      options?.onEnd?.();
      return;
    }

    resetChunkWatchdog();

    const chunkText = chunks[chunkIndex];
    const utterance = new SpeechSynthesisUtterance(chunkText);

    // Pick best voice
    const voices = synth.getVoices();
    const matchedVoice = pickBrowserVoice(settings.voice, voices);
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    const { pitch, rate } = calculateAcousticParams(settings, matchedVoice?.name);
    utterance.pitch = pitch;
    utterance.rate = rate;

    // Keep reference in window set to defeat GC
    window.__rexActiveUtterances?.add(utterance);

    // Active heartbeat to prevent Chrome background sleep on utterances
    if (!currentHeartbeat) {
      currentHeartbeat = setInterval(() => {
        if (!isCancelled && synth.speaking) {
          try {
            synth.pause();
            synth.resume();
          } catch {}
        }
      }, 3500);
    }

    const startFallbackTimer = setTimeout(() => {
      if (!hasStarted && !isCancelled) {
        hasStarted = true;
        options?.onStart?.();
      }
    }, 300);

    utterance.onstart = () => {
      clearTimeout(startFallbackTimer);
      if (!hasStarted) {
        hasStarted = true;
        options?.onStart?.();
      }
      options?.onChunkStart?.(chunkIndex, chunks.length, chunkText);
    };

    utterance.onend = () => {
      window.__rexActiveUtterances?.delete(utterance);
      if (isCancelled) return;

      chunkIndex++;
      if (chunkIndex < chunks.length) {
        // Natural breath pause between sentences (50ms)
        setTimeout(() => {
          if (!isCancelled) speakNextChunk();
        }, 50);
      } else {
        cleanup();
        options?.onEnd?.();
      }
    };

    utterance.onerror = (e) => {
      console.warn("[VoiceSynthesizer] Utterance error:", e);
      window.__rexActiveUtterances?.delete(utterance);
      if (isCancelled) return;

      chunkIndex++;
      if (chunkIndex < chunks.length) {
        speakNextChunk();
      } else {
        cleanup();
        options?.onEnd?.();
      }
    };

    try {
      if (synth.paused) synth.resume();
      synth.resume();
      synth.speak(utterance);
    } catch (err) {
      console.error("[VoiceSynthesizer] synth.speak error:", err);
      cleanup();
      options?.onEnd?.();
    }
  };

  // Ensure voices are loaded before starting first chunk
  const voices = synth.getVoices();
  if (voices.length === 0) {
    const onVoicesChanged = () => {
      synth.removeEventListener("voiceschanged", onVoicesChanged);
      if (!isCancelled) speakNextChunk();
    };
    synth.addEventListener("voiceschanged", onVoicesChanged);
    setTimeout(() => {
      if (!isCancelled && !hasStarted && chunkIndex === 0) {
        speakNextChunk();
      }
    }, 150);
  } else {
    speakNextChunk();
  }

  return () => {
    cancelHumanizedSpeech();
  };
}

/**
 * Hard cancellation of voice synthesis.
 */
export function cancelHumanizedSpeech(): void {
  isCancelled = true;
  if (currentHeartbeat) {
    clearInterval(currentHeartbeat);
    currentHeartbeat = null;
  }
  if (currentWatchdog) {
    clearTimeout(currentWatchdog);
    currentWatchdog = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
      // Crucial: calling resume() immediately unpauses Chromium speech queue
      window.speechSynthesis.resume();
    } catch {}
  }
  window.__rexActiveUtterances?.clear();
}
