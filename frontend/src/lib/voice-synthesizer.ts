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

// Exactly 4 curated voice profiles: 2 male (American & British), 2 female (American & British)
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
    basePitch: 0.88,
    baseRate: 1.0,
  },
  ryan: {
    name: "Ryan",
    gender: "Male",
    accent: "British",
    vibe: "Calm, steady & articulate British cadence",
    preferredNames: [
      "Microsoft Ryan Online (Natural)",
      "Microsoft George Online (Natural)",
      "Microsoft George",
      "Google UK English Male",
      "Daniel",
      "Oliver",
      "Arthur",
    ],
    basePitch: 0.86,
    baseRate: 0.98,
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
    basePitch: 1.05,
    baseRate: 1.02,
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
    basePitch: 1.05,
    baseRate: 0.98,
  },

  // ── BACKWARD-COMPATIBILITY FALLBACK ALIASES ──
  andrew: {
    name: "Adam",
    gender: "Male",
    accent: "American",
    vibe: "Deep, articulate & conversational American voice",
    preferredNames: ["Microsoft Guy Online (Natural)", "Microsoft David", "Alex"],
    basePitch: 0.88,
    baseRate: 1.0,
  },
  brian: {
    name: "Ryan",
    gender: "Male",
    accent: "British",
    vibe: "Calm, steady & articulate British cadence",
    preferredNames: ["Microsoft Ryan Online (Natural)", "Google UK English Male", "Daniel"],
    basePitch: 0.86,
    baseRate: 0.98,
  },
  antoni: {
    name: "Adam",
    gender: "Male",
    accent: "American",
    vibe: "Deep, articulate & conversational American voice",
    preferredNames: ["Microsoft Guy Online (Natural)", "Microsoft David", "Alex"],
    basePitch: 0.88,
    baseRate: 1.0,
  },
  josh: {
    name: "Adam",
    gender: "Male",
    accent: "American",
    vibe: "Deep, articulate & conversational American voice",
    preferredNames: ["Microsoft Guy Online (Natural)", "Alex"],
    basePitch: 0.88,
    baseRate: 1.0,
  },
  rachel: {
    name: "Ava",
    gender: "Female",
    accent: "American",
    vibe: "Warm, natural & clear American voice",
    preferredNames: ["Microsoft Jenny Online (Natural)", "Google US English", "Samantha"],
    basePitch: 1.05,
    baseRate: 1.02,
  },
  nicole: {
    name: "Ava",
    gender: "Female",
    accent: "American",
    vibe: "Warm, natural & clear American voice",
    preferredNames: ["Microsoft Jenny Online (Natural)", "Google US English", "Samantha"],
    basePitch: 1.05,
    baseRate: 1.02,
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

  // Strip asterisks stage directions and breath cues (*takes a deep breath*, *sighs*, etc.)
  text = text.replace(/\*+(?:takes?\s+(?:a\s+)?(?:deep\s+|little\s+|quick\s+|gentle\s+)?breath|breath[es]*|sigh[s]*|pause[s]*|chuckle[s]*|laugh[s]*|clears?\s+throat|[^*]+)\*+/gi, ", ... ");
  text = text.replace(/\*+[^*]+?\*+/g, ", ... ");

  // Strip parenthetical stage directions: (takes a breath), (pauses), etc.
  text = text.replace(/\([^)]*(?:breath|pause|sigh|chuckle|clears?\s+throat|laugh|smile)[^)]*\)/gi, ", ... ");

  // Strip XML/HTML style breath tags: <breath>, <breath/>
  text = text.replace(/<breath\s*\/?>/gi, ", ... ");
  text = text.replace(/<[^>]+>/g, " ");

  // Strip unadorned literal breath words so TTS engines NEVER speak "takes a little breath" aloud
  text = text.replace(/\b(?:takes?\s+(?:a\s+)?(?:little\s+|deep\s+|quick\s+|gentle\s+)?breath|taking\s+a\s+breath|takes?\s+a\s+moment\s+to\s+breathe|breathes?\s+(?:in|out)?|takes?\s+a\s+pause|pauses?\s+briefly|deep\s+breath)\b[,.]?/gi, ", ... ");

  // Strip markdown formatting characters
  text = text.replace(/[*_~#]/g, "");

  // Convert numbered lists into natural spoken transitions
  text = text.replace(/^\s*\d+\.\s+/gm, " ");

  // Convert bullets
  text = text.replace(/^\s*[-•*]\s+/gm, " ");

  // Clean excessive pauses, whitespace and linebreaks
  text = text.replace(/\s*,\s*\.\.\.\s*,?/g, ", ... ");
  text = text.replace(/\.{3,}/g, "...");
  text = text.replace(/\n\s*\n/g, ". ").replace(/\n/g, " ");
  text = text.replace(/\s{2,}/g, " ").trim();

  return text;
}

/**
 * Breaks spoken text into natural, bite-sized conversational sentences.
 * This completely eliminates Chrome's 15-second speech synthesis buffer cutoff.
 */
export function splitIntoSpeechChunks(text: string): string[] {
  if (!text) return [];

  // Match sentences ending in punctuation or clause boundaries
  const rawChunks = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
  const results: string[] = [];

  for (const chunk of rawChunks) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;

    // If a sentence is very long (> 130 chars), split at commas or semi-colons for natural breath pauses
    if (trimmed.length > 130) {
      const subParts = trimmed.split(/([,;:]\s+)/);
      let current = "";
      for (const part of subParts) {
        if ((current + part).length > 120 && current.length > 20) {
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

/**
 * Finds the highest quality, most natural browser voice matching the requested profile.
 * Strictly honors requested Gender so male profiles never sound female.
 */
export function pickBrowserVoice(
  profileId: string,
  availableVoices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | null {
  if (!availableVoices || availableVoices.length === 0) return null;

  const profile = VOICE_PROFILES[profileId] || VOICE_PROFILES.adam;
  const isMale = profile.gender === "Male";
  const isBritish = profile.accent === "British";

  // 1. First attempt: match against profile's specific curated preferred voice list
  for (const preferred of profile.preferredNames) {
    const match = availableVoices.find(
      (v) =>
        v.name.toLowerCase().includes(preferred.toLowerCase()) ||
        v.voiceURI.toLowerCase().includes(preferred.toLowerCase())
    );
    if (match) {
      // If profile is male, verify this matched voice is not an accidental female match
      if (isMale && FEMALE_VOICE_PATTERNS.test(match.name) && !MALE_VOICE_PATTERNS.test(match.name)) {
        continue;
      }
      return match;
    }
  }

  // 2. Exact Accent & Gender candidate filtering (prioritize en-GB for British, en-US for American)
  const targetPrefix = isBritish ? "en-gb" : "en-us";
  const accentVoices = availableVoices.filter((v) =>
    v.lang.replace("_", "-").toLowerCase().startsWith(targetPrefix)
  );

  if (accentVoices.length > 0) {
    if (isMale) {
      const maleAccent = accentVoices.find(
        (v) => MALE_VOICE_PATTERNS.test(v.name) && !FEMALE_VOICE_PATTERNS.test(v.name)
      );
      if (maleAccent) return maleAccent;
      const nonFemale = accentVoices.filter((v) => !FEMALE_VOICE_PATTERNS.test(v.name));
      if (nonFemale.length > 0) return nonFemale[0];
    } else {
      const femaleAccent = accentVoices.find((v) => FEMALE_VOICE_PATTERNS.test(v.name));
      if (femaleAccent) return femaleAccent;
      const nonMale = accentVoices.filter((v) => !MALE_VOICE_PATTERNS.test(v.name));
      if (nonMale.length > 0) return nonMale[0];
    }
  }

  // 3. Fallback: Any English voices matching gender
  const englishVoices = availableVoices.filter((v) => v.lang.startsWith("en"));
  const voicePool = englishVoices.length > 0 ? englishVoices : availableVoices;

  if (isMale) {
    // Strictly find voices identified as male
    const maleCandidate = voicePool.find(
      (v) => MALE_VOICE_PATTERNS.test(v.name) && !FEMALE_VOICE_PATTERNS.test(v.name)
    );
    if (maleCandidate) return maleCandidate;

    // Reject known female voices
    const nonFemale = voicePool.filter((v) => !FEMALE_VOICE_PATTERNS.test(v.name));
    if (nonFemale.length > 0) return nonFemale[0];
  } else {
    // Female profile: prioritize female voices
    const femaleCandidate = voicePool.find((v) => FEMALE_VOICE_PATTERNS.test(v.name));
    if (femaleCandidate) return femaleCandidate;

    const nonMale = voicePool.filter((v) => !MALE_VOICE_PATTERNS.test(v.name));
    if (nonMale.length > 0) return nonMale[0];
  }

  // Fallback to first available voice
  return availableVoices[0] || null;
}

/**
 * Computes humanized pitch and rate based on voice profile, user speed preference, and emotion tone.
 */
export function calculateAcousticParams(
  settings: VoiceSettings,
  actualVoiceName?: string
): { pitch: number; rate: number } {
  const profile = VOICE_PROFILES[settings.voice] || VOICE_PROFILES.adam;

  let speedMultiplier = 1.0;
  if (settings.speed === "slow") speedMultiplier = 0.9;
  if (settings.speed === "fast") speedMultiplier = 1.15;

  let emotionPitchOffset = 0.0;
  let emotionRateOffset = 0.0;

  switch (settings.emotion) {
    case "upbeat":
      emotionPitchOffset = +0.07;
      emotionRateOffset = +0.05;
      break;
    case "warm":
      emotionPitchOffset = +0.03;
      emotionRateOffset = 0.0;
      break;
    case "calm":
      emotionPitchOffset = -0.04;
      emotionRateOffset = -0.06;
      break;
    case "empathetic":
      emotionPitchOffset = +0.02;
      emotionRateOffset = -0.04;
      break;
  }

  let basePitch = profile.basePitch;

  // If user chose a male voice, but browser voice is a generic or female voice like "Google US English",
  // pitch-shift downward to produce a deep masculine resonance rather than a female voice
  if (profile.gender === "Male" && actualVoiceName && FEMALE_VOICE_PATTERNS.test(actualVoiceName)) {
    basePitch = 0.78;
  }

  const finalPitch = Math.max(0.68, Math.min(1.4, basePitch + emotionPitchOffset));
  const finalRate = Math.max(0.7, Math.min(1.5, profile.baseRate * speedMultiplier + emotionRateOffset));

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
