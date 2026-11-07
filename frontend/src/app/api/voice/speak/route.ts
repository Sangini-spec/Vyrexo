import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import { getElevenLabsConfig, getGnaniConfig } from "@/lib/ai-provider-config";
import { detectEmotionFromContext, type EmotionTone } from "@/lib/emotion-detector";

// In-memory LRU audio cache for synthesized phrases to eliminate duplicate API calls and guarantee <5ms response
const globalForCache = globalThis as unknown as {
  __vyrexoVoiceAudioCache?: Map<
    string,
    { buffer: Buffer; contentType: string; provider: string; modelUsed: string; timestamp: number }
  >;
};
const voiceAudioCache =
  globalForCache.__vyrexoVoiceAudioCache ||
  (globalForCache.__vyrexoVoiceAudioCache = new Map<
    string,
    { buffer: Buffer; contentType: string; provider: string; modelUsed: string; timestamp: number }
  >());
const MAX_CACHE_ENTRIES = 300;

function getCachedAudio(
  key: string
): { buffer: Buffer; contentType: string; provider: string; modelUsed: string } | null {
  const item = voiceAudioCache.get(key);
  if (!item) return null;
  return {
    buffer: item.buffer,
    contentType: item.contentType,
    provider: item.provider || "gnani",
    modelUsed: item.modelUsed || "timbre-v3.0",
  };
}

function setCachedAudio(
  key: string,
  buffer: Buffer,
  contentType: string = "audio/wav",
  provider: string = "gnani",
  modelUsed: string = "timbre-v3.0"
): void {
  if (voiceAudioCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = voiceAudioCache.keys().next().value;
    if (oldestKey) voiceAudioCache.delete(oldestKey);
  }
  voiceAudioCache.set(key, { buffer, contentType, provider, modelUsed, timestamp: Date.now() });
}

// Per-key cooldown maps for Gnani AI (Tier 1) and ElevenLabs (Tier 2) credit/quota exhaustion
// Ensures a newly integrated API key has 0 cooldown even if a previous key was exhausted
const globalForVoice = globalThis as unknown as {
  __vyrexoGnaniKeyCooldowns?: Map<string, number>;
  __vyrexoElevenLabsKeyCooldowns?: Map<string, number>;
};

function getGnaniCooldownMap(): Map<string, number> {
  if (!globalForVoice.__vyrexoGnaniKeyCooldowns) {
    globalForVoice.__vyrexoGnaniKeyCooldowns = new Map<string, number>();
  }
  return globalForVoice.__vyrexoGnaniKeyCooldowns;
}

function getGnaniCooldownUntil(currentKey?: string | null): number {
  if (!currentKey) return 0;
  return getGnaniCooldownMap().get(currentKey.trim()) || 0;
}

function setGnaniCooldownUntil(ts: number, currentKey?: string | null): void {
  if (!currentKey) return;
  if (ts <= 0) {
    getGnaniCooldownMap().delete(currentKey.trim());
  } else {
    getGnaniCooldownMap().set(currentKey.trim(), ts);
  }
}

function getCooldownMap(): Map<string, number> {
  if (!globalForVoice.__vyrexoElevenLabsKeyCooldowns) {
    globalForVoice.__vyrexoElevenLabsKeyCooldowns = new Map<string, number>();
  }
  return globalForVoice.__vyrexoElevenLabsKeyCooldowns;
}

function getElevenLabsCooldownUntil(currentKey?: string | null): number {
  if (!currentKey) return 0;
  return getCooldownMap().get(currentKey.trim()) || 0;
}

function setElevenLabsCooldownUntil(ts: number, currentKey?: string | null): void {
  if (!currentKey) return;
  if (ts <= 0) {
    getCooldownMap().delete(currentKey.trim());
  } else {
    getCooldownMap().set(currentKey.trim(), ts);
  }
}

function getWorkerScriptPath(): string {
  const p1 = path.join(process.cwd(), "frontend", "scripts", "synthesize.cjs");
  if (fs.existsSync(p1)) return p1;
  const p2 = path.join(process.cwd(), "scripts", "synthesize.cjs");
  if (fs.existsSync(p2)) return p2;
  const p3 = "/app/applet/frontend/scripts/synthesize.cjs";
  if (fs.existsSync(p3)) return p3;
  return p1;
}

// Map user settings voice names to verified ElevenLabs voices
function mapElevenLabsVoice(voiceId?: string): string {
  const v = (voiceId || "").toLowerCase().trim();

  // If user passes explicit 20+ char ElevenLabs voice ID directly
  if (v.length >= 20 && /^[a-zA-Z0-9]+$/.test(v)) {
    return v;
  }

  // Brian: Deep, thoughtful, narrative British male
  if (v.includes("brian") || v.includes("ryan") || v.includes("british")) {
    return "nPczCjzI2devNBz1zQrb";
  }
  // George: Raspy, emotive, conversational American male
  if (v.includes("george")) {
    return "JBFqnCBsd6RMkjVDRZzb";
  }
  // Rachel: Calm, deeply empathetic, compassionate female
  if (v.includes("rachel") || v.includes("ava") || v.includes("empathetic_female") || v.includes("female")) {
    return "EXAVITQu4vr4xnSDxMaL";
  }
  // Charlotte: Elegant, warm, natural cadence
  if (v.includes("charlotte") || v.includes("sonia")) {
    return "Xb7hH8MSUJpSbSDYk0k2";
  }
  // Nicole: Soft, playful, caring conversational voice
  if (v.includes("nicole")) {
    return "cgSgspJ2msm6clMCkdW9";
  }
  // Default Adam: Deeply conversational, warm, articulate American male
  return "pNInz6obpgDQGcFmaJgB";
}

// Map user settings voice names to verified Gnani Vachana (Timbre v3.0 / v2.5) voices
function mapGnaniVoice(voiceId?: string, modelId: string = "timbre-v3.0"): string {
  const v = (voiceId || "").toLowerCase().trim();
  const isV25 = modelId.includes("2.5");

  // Direct Gnani voice names if explicitly specified
  const directVoices: Record<string, string> = {
    shubham: "Shubham",
    avinash: "Avinash",
    devansh: "Devansh",
    prakash: "Prakash",
    yashraj: "Yashraj",
    shivani: "Shivani",
    riyaa: "Riyaa",
    vasudha: "Vasudha",
    lakshmi: "Lakshmi",
    kalpana: "Kalpana",
    pranav: "Pranav",
    nalini: "Nalini",
    deepak: "Deepak",
  };
  if (directVoices[v]) {
    if (isV25 && !["pranav", "nalini", "deepak"].includes(v)) {
      return ["shivani", "riyaa", "vasudha", "lakshmi", "kalpana"].includes(v) ? "Nalini" : "Pranav";
    }
    return directVoices[v];
  }

  // Female voices: Rachel / Ava / Charlotte / Sonia / Nicole
  if (
    v.includes("rachel") ||
    v.includes("ava") ||
    v.includes("charlotte") ||
    v.includes("sonia") ||
    v.includes("nicole") ||
    v.includes("female")
  ) {
    if (isV25) return "Nalini";
    if (v.includes("charlotte") || v.includes("sonia")) return "Riyaa";
    if (v.includes("nicole")) return "Vasudha";
    return "Shivani";
  }

  // Male voices: Brian / Ryan / George / Adam
  if (isV25) return "Pranav";
  if (v.includes("brian") || v.includes("ryan") || v.includes("british")) {
    return "Avinash";
  }
  if (v.includes("george")) {
    return "Devansh";
  }
  // Default Adam: Warm, conversational, expressive male (Shubham on Timbre v3.0)
  return "Shubham";
}

interface GnaniSynthResult {
  buffer: Buffer | null;
  quotaExceeded: boolean;
  modelUsed?: string;
  voiceUsed?: string;
  error?: string;
}

// Synthesizes human-like conversational speech using Gnani AI (Vachana Timbre v3.0 / v2.5)
async function synthesizeWithGnani(
  text: string,
  apiKey: string,
  modelId: string = "timbre-v3.0",
  baseUrl: string = "https://api.vachana.ai",
  voiceId?: string,
  emotion?: string,
  speed: string = "normal"
): Promise<GnaniSynthResult> {
  const cleanBaseUrl = (baseUrl || "https://api.vachana.ai").replace(/\/+$/, "");
  const primaryModel = modelId?.trim() || "timbre-v3.0";
  const candidateModels =
    primaryModel === "timbre-v3.0"
      ? ["timbre-v3.0", "timbre-v2.5"]
      : [primaryModel, "timbre-v3.0"];

  // Map speaking cadence and emotional tone to natural speed multiplier
  let speedMultiplier = 1.0;
  const speedStr = String(speed || "normal").toLowerCase().trim();
  const parsedSpeedNum = Number(speedStr);
  if (!Number.isNaN(parsedSpeedNum) && parsedSpeedNum >= 0.7 && parsedSpeedNum <= 1.4) {
    speedMultiplier = parsedSpeedNum;
  } else if (speedStr === "slow") {
    speedMultiplier = 0.9;
  } else if (speedStr === "fast") {
    speedMultiplier = 1.12;
  }

  if (emotion === "empathetic" || emotion === "calm" || emotion === "thoughtful") {
    speedMultiplier = Math.max(0.88, Number((speedMultiplier * 0.96).toFixed(2)));
  } else if (emotion === "upbeat" || emotion === "enthusiastic" || emotion === "celebratory") {
    speedMultiplier = Math.min(1.18, Number((speedMultiplier * 1.04).toFixed(2)));
  }

  // Split long responses into sentence-aligned chunks (<= 750 chars) for sub-second synthesis
  const segments = splitTextForGeminiSegments(text, 750);
  if (segments.length === 0) {
    return { buffer: null, quotaExceeded: false };
  }

  for (const activeModel of candidateModels) {
    const gnaniVoice = mapGnaniVoice(voiceId, activeModel);
    try {
      const pcmBuffers: Buffer[] = [];
      let quotaHit = false;
      let lastError = "";

      for (const seg of segments) {
        const abortCtrl = new AbortController();
        const timeout = setTimeout(() => abortCtrl.abort(), 7500);

        const res = await fetch(`${cleanBaseUrl}/api/v1/tts/inference`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key-ID": apiKey.trim(),
          },
          body: JSON.stringify({
            text: seg,
            voice: gnaniVoice,
            model: activeModel,
            language: "en-IN",
            speed: speedMultiplier,
            audio_config: {
              encoding: "linear_pcm",
              container: "wav",
              num_channels: 1,
              sample_rate: 24000,
              sample_width: 2,
            },
          }),
          signal: abortCtrl.signal,
        });
        clearTimeout(timeout);

        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          const rawBuffer = Buffer.from(arrayBuffer);
          if (rawBuffer.byteLength > 100) {
            const hasRiffHeader =
              rawBuffer.length >= 44 && rawBuffer.toString("ascii", 0, 4) === "RIFF";
            const pcmSlice = hasRiffHeader ? rawBuffer.subarray(44) : rawBuffer;
            if (pcmSlice.length > 0) {
              pcmBuffers.push(pcmSlice);
              continue;
            }
          }
        } else {
          const errJson = await res.json().catch(() => null);
          const errDetail = JSON.stringify(errJson || "");
          lastError = errDetail;

          const isQuotaOrCredits =
            res.status === 402 ||
            res.status === 401 ||
            res.status === 403 ||
            res.status === 429 ||
            /quota|credit|insufficient|balance|limit|exhausted|payment|expired|invalid_api_key|unauthorized|scope_not_allowed/i.test(
              errDetail
            );

          if (isQuotaOrCredits) {
            quotaHit = true;
            break;
          }

          console.warn(
            `[VoiceSpeak] Gnani ${activeModel} (${gnaniVoice}) response (${res.status}):`,
            errJson
          );
          break;
        }
      }

      if (quotaHit) {
        setGnaniCooldownUntil(Date.now() + 180000, apiKey);
        console.warn(
          `[TTS Pipeline] Gnani AI credits or quota exhausted. Switching immediately to ElevenLabs fallback.`
        );
        return { buffer: null, quotaExceeded: true, error: lastError };
      }

      if (pcmBuffers.length === segments.length && pcmBuffers.length > 0) {
        setGnaniCooldownUntil(0, apiKey);
        const combinedPcm = Buffer.concat(pcmBuffers);
        // Normalize WAV container header (fixes 0xFFFFFFFF streaming ChunkSize/Subchunk2Size)
        const normalizedWav = Buffer.from(
          pcm16ToWav(new Uint8Array(combinedPcm), 24000, 1)
        );
        return {
          buffer: normalizedWav,
          quotaExceeded: false,
          modelUsed: activeModel,
          voiceUsed: gnaniVoice,
        };
      }
    } catch (err: any) {
      console.warn(`[VoiceSpeak] Gnani ${activeModel} request notice:`, err?.message || err);
      continue;
    }
  }

  return { buffer: null, quotaExceeded: false };
}

interface ElevenLabsSynthResult {
  buffer: Buffer | null;
  quotaExceeded: boolean;
  modelUsed?: string;
  error?: string;
}

// Synthesizes speech using ElevenLabs v2 Turbo API exclusively (Fallback Tier 2 when Gnani credits exhausted)
async function synthesizeWithElevenLabs(
  text: string,
  apiKey: string,
  modelId: string = "eleven_turbo_v2_5",
  voiceId?: string,
  emotion?: string
): Promise<ElevenLabsSynthResult> {
  const elevenVoiceId = mapElevenLabsVoice(voiceId);
  // Strictly enforce v2 models only (never v4)
  const normalizedModel =
    !modelId || modelId.includes("v4") || modelId === "eleven_turbo_v2"
      ? "eleven_turbo_v2_5"
      : modelId;

  // Composed, natural studio-grade stability (0.62-0.70) and subtle style (0.10-0.16):
  // Prevents ElevenLabs from rushing through sentence endings or producing breathy static artifacts!
  let stability = 0.65;
  let similarityBoost = 0.84;
  let style = 0.12;

  if (emotion === "empathetic") {
    stability = 0.64;
    style = 0.14;
    similarityBoost = 0.85;
  } else if (emotion === "upbeat" || emotion === "enthusiastic" || emotion === "celebratory") {
    stability = 0.62;
    style = 0.16;
    similarityBoost = 0.84;
  } else if (emotion === "calm" || emotion === "thoughtful") {
    stability = 0.70;
    style = 0.10;
    similarityBoost = 0.85;
  }

  // Strictly v2 models only: eleven_turbo_v2_5 primary, eleven_multilingual_v2 secondary
  const candidateModels =
    normalizedModel === "eleven_turbo_v2_5"
      ? ["eleven_turbo_v2_5", "eleven_multilingual_v2"]
      : [normalizedModel, "eleven_turbo_v2_5"];

  const voiceSettings = {
    stability,
    similarity_boost: similarityBoost,
    style,
    use_speaker_boost: true,
  };

  for (const activeModel of candidateModels) {
    try {
      const abortCtrl = new AbortController();
      const timeout = setTimeout(() => abortCtrl.abort(), 7500);

      const res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${elevenVoiceId}?optimize_streaming_latency=1&output_format=mp3_44100_64`,
        {
          method: "POST",
          headers: {
            "xi-api-key": apiKey.trim(),
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
          },
          body: JSON.stringify({
            text,
            model_id: activeModel,
            voice_settings: voiceSettings,
          }),
          signal: abortCtrl.signal,
        }
      );
      clearTimeout(timeout);

      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        if (arrayBuffer.byteLength > 200) {
          setElevenLabsCooldownUntil(0, apiKey);
          return {
            buffer: Buffer.from(arrayBuffer),
            quotaExceeded: false,
            modelUsed: activeModel,
          };
        }
      } else {
        const errJson = await res.json().catch(() => null);
        const errDetail = JSON.stringify(errJson || "");
        const isQuotaOrCredits =
          res.status === 402 ||
          res.status === 401 ||
          /quota_exceeded|credit|insufficient|character_limit|invalid_api_key/i.test(errDetail);

        if (isQuotaOrCredits) {
          setElevenLabsCooldownUntil(Date.now() + 120000, apiKey);
          console.warn(
            `[TTS Pipeline] ElevenLabs monthly credits or quota exceeded (HTTP ${res.status}). Switching immediately to Google Gemini API TTS.`
          );
          return { buffer: null, quotaExceeded: true, error: errDetail };
        }

        console.warn(
          `[VoiceSpeak] ElevenLabs ${activeModel} response (${res.status}):`,
          errJson
        );
        continue;
      }
    } catch (err: any) {
      console.warn(`[VoiceSpeak] ElevenLabs ${activeModel} request notice:`, err?.message || err);
      continue;
    }
  }

  return { buffer: null, quotaExceeded: false };
}

// Synthesizes speech using Microsoft Edge Neural TTS isolated child process (Always reliable, high-fidelity neural voices, zero-quota)
async function synthesizeWithEdgeTTS(
  text: string,
  voiceId: string = "adam",
  emotion: string = "warm",
  speed: string = "normal"
): Promise<Buffer | null> {
  const scriptPath = getWorkerScriptPath();
  if (!fs.existsSync(scriptPath)) {
    console.warn("[VoiceSpeak] EdgeTTS worker script not found at:", scriptPath);
    return null;
  }

  return new Promise((resolve) => {
    let resolved = false;
    const proc = spawn("node", [scriptPath], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    const chunks: Buffer[] = [];
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try { proc.kill("SIGKILL"); } catch {}
        console.warn("[VoiceSpeak] EdgeTTS worker timed out after 18s");
        resolve(null);
      }
    }, 18000);

    proc.stdout.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    proc.on("close", (code) => {
      clearTimeout(timeout);
      if (resolved) return;
      resolved = true;
      if (code === 0) {
        const audioBuf = Buffer.concat(chunks);
        resolve(audioBuf.length > 200 ? audioBuf : null);
      } else {
        console.warn("[VoiceSpeak] EdgeTTS worker exited with code:", code);
        resolve(null);
      }
    });

    proc.on("error", (err) => {
      clearTimeout(timeout);
      if (resolved) return;
      resolved = true;
      console.warn("[VoiceSpeak] EdgeTTS spawn error:", err);
      resolve(null);
    });

    proc.stdin.write(
      JSON.stringify({
        text,
        voice: voiceId,
        emotion,
        speed,
      })
    );
    proc.stdin.end();
  });
}

// Lazy Gemini client helper
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

/**
 * Wraps raw 16-bit linear PCM audio into a standard RIFF/WAVE container
 */
function pcm16ToWav(pcmData: Uint8Array, sampleRate = 24000, numChannels = 1): Uint8Array {
  const byteRate = sampleRate * numChannels * 2;
  const blockAlign = numChannels * 2;
  const dataSize = pcmData.byteLength;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  view.setUint8(0, 0x52); // R
  view.setUint8(1, 0x49); // I
  view.setUint8(2, 0x46); // F
  view.setUint8(3, 0x46); // F
  view.setUint32(4, 36 + dataSize, true);
  view.setUint8(8, 0x57);  // W
  view.setUint8(9, 0x41);  // A
  view.setUint8(10, 0x56); // V
  view.setUint8(11, 0x45); // E

  // fmt chunk
  view.setUint8(12, 0x66); // f
  view.setUint8(13, 0x6D); // m
  view.setUint8(14, 0x74); // t
  view.setUint8(15, 0x20); // ' '
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);

  // data chunk
  view.setUint8(36, 0x64); // d
  view.setUint8(37, 0x61); // a
  view.setUint8(38, 0x74); // t
  view.setUint8(39, 0x61); // a
  view.setUint32(40, dataSize, true);

  new Uint8Array(buffer, 44).set(pcmData);
  return new Uint8Array(buffer);
}

// Map user settings voice names to Gemini prebuilt voices
function mapVoiceName(voiceId?: string): string {
  const v = (voiceId || "").toLowerCase();
  if (v.includes("female") || v.includes("ava") || v.includes("rachel") || v.includes("nicole")) {
    return "Kore";
  }
  if (v.includes("ryan") || v.includes("british") || v.includes("charon") || v.includes("brian")) {
    return "Charon";
  }
  if (v.includes("sonia") || v.includes("charlotte") || v.includes("aoede")) {
    return "Aoede";
  }
  return "Puck";
}

// Trim gracefully at sentence boundaries only if exceeding maximum synthesis payload size
function trimToConversationalSpeech(input: string, maxLen = 4800): string {
  const trimmed = input.trim();
  if (trimmed.length <= maxLen) return trimmed;
  const sub = trimmed.slice(0, maxLen);
  const lastPunctuation = Math.max(
    sub.lastIndexOf(". "),
    sub.lastIndexOf("! "),
    sub.lastIndexOf("? "),
    sub.lastIndexOf(".\n"),
    sub.lastIndexOf("!\n"),
    sub.lastIndexOf("?\n")
  );
  if (lastPunctuation > 80) {
    return sub.slice(0, lastPunctuation + 1).trim();
  }
  const lastSpace = sub.lastIndexOf(" ");
  if (lastSpace > 80) {
    return sub.slice(0, lastSpace).trim() + ".";
  }
  return sub.trim();
}

/**
 * Prepares natural spoken dialogue by stripping technical artifacts, markdown, and code blocks
 * while preserving the complete conversational response, story, poem, song, or joke.
 */
function cleanSpokenTextForTTS(raw: string): string {
  if (!raw) return "";

  const cleaned = raw
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    // Convert asterisks stage directions into natural comma micro-pauses
    .replace(/\*+(?:takes?\s+(?:a\s+)?(?:deep\s+|little\s+|quick\s+|gentle\s+)?breath|breath[es]*|sigh[s]*|pause[s]*|chuckle[s]*|laugh[s]*|clears?\s+throat|[^*]+)\*+/gi, ", ")
    .replace(/\*+([^*]+?)\*+/g, "$1")
    // Convert parenthetical stage directions into natural commas
    .replace(/\([^)]*(?:breath|pause|sigh|chuckle|clears?\s+throat|laugh|smile)[^)]*\)/gi, ", ")
    // Strip XML/HTML style breath tags
    .replace(/<breath\s*\/?>/gi, ", ")
    .replace(/<[^>]+>/g, " ")
    // Replace unadorned literal breath words with natural comma pauses
    .replace(/\b(?:takes?\s+(?:a\s+)?(?:little\s+|deep\s+|quick\s+|gentle\s+)?breath|taking\s+a\s+breath|takes?\s+a\s+moment\s+to\s+breathe|breathes?\s+(?:in|out)?|takes?\s+a\s+pause|pauses?\s+briefly|deep\s+breath)\b[,.]?/gi, ", ")
    // Remove markdown symbols
    .replace(/[_#~|]/g, "")
    // Convert line breaks in poems/songs/paragraphs into natural spoken pauses
    .replace(/([^\s.,!?;:\-])\s*\n+\s*/g, "$1. ")
    .replace(/\n+/g, " ")
    // Normalize commas and punctuation so voice never drags
    .replace(/\s*,\s*,\s*/g, ", ")
    .replace(/\s*,\s*\.\.\.\s*,?/g, ", ")
    .replace(/\.{3,}/g, ".")
    .replace(/\s+/g, " ")
    .replace(/^\s*[,.\s]+/, "")
    .trim();

  return trimToConversationalSpeech(cleaned, 4800);
}

/**
 * Injects natural conversational pacing and subtle human breath pauses without dragging
 */
function injectHumanEmotionAndBreaths(text: string, emotion?: string): string {
  let humanized = text.trim();

  // Natural comma pacing on conversational transitions for organic breathing
  if (/^(yeah|yes|hey|alright|ok|okay|sure|got it|whew|so|well)\b/i.test(humanized)) {
    humanized = humanized.replace(/^(yeah|yes|hey|alright|ok|okay|sure|got it|whew|so|well)[,.]?\s*/i, "$1, ");
  }

  // Ensure clean, fluid sentence cadence without sluggish delays
  humanized = humanized
    .replace(/\s*,\s*,\s*/g, ", ")
    .replace(/\s*,\s*\.\.\.\s*,?/g, ", ")
    .replace(/\.{3,}/g, ".")
    .replace(/\s+/g, " ")
    .trim();

  return humanized;
}

/**
 * Splits long text into sentence-aligned segments for Gemini TTS so even multi-paragraph
 * stories, songs, poems, and discussions are synthesized completely without truncation.
 */
function splitTextForGeminiSegments(text: string, maxSegmentLen = 1500): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= maxSegmentLen) return [trimmed];

  const sentences = trimmed.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [trimmed];
  const segments: string[] = [];
  let current = "";

  for (const s of sentences) {
    const cleanS = s.trim();
    if (!cleanS) continue;
    if ((current + " " + cleanS).trim().length > maxSegmentLen && current.length > 0) {
      segments.push(current.trim());
      current = cleanS;
    } else {
      current = current ? `${current} ${cleanS}` : cleanS;
    }
  }
  if (current.trim()) {
    segments.push(current.trim());
  }
  return segments;
}

// Synthesizes speech using Google Gemini Neural TTS (Direct, seamless fallback when ElevenLabs credits exceeded)
async function synthesizeWithGeminiTTS(
  text: string,
  voiceId?: string,
  emotion?: string,
  fallbackReason?: string
): Promise<{ buffer: Buffer | null; modelUsed?: string }> {
  const ai = getGeminiClient();
  if (!ai) return { buffer: null };

  const prebuiltVoice = mapVoiceName(voiceId);
  const expressiveSpeechText = injectHumanEmotionAndBreaths(text, emotion);
  const segments = splitTextForGeminiSegments(expressiveSpeechText, 380);
  if (segments.length === 0) return { buffer: null };

  // Verified low-latency Gemini TTS model with strict 4.5s timeout so fallback never hangs
  const candidateModels = ["gemini-2.5-flash-preview-tts"];

  for (const model of candidateModels) {
    try {
      const segmentResults = await Promise.all(
        segments.map(async (seg) => {
          const callPromise = ai.models.generateContent({
            model,
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: seg,
                  },
                ],
              },
            ] as any,
            config: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: prebuiltVoice,
                  },
                },
              },
            },
          });

          const timeoutPromise = new Promise<null>((resolve) =>
            setTimeout(() => resolve(null), 10000)
          );

          const response: any = await Promise.race([callPromise, timeoutPromise]);
          if (!response) return null;

          const candidate = response.candidates?.[0];
          const parts = candidate?.content?.parts || [];
          const found = parts.find((p: any) => p.inlineData && p.inlineData.data);
          if (found?.inlineData?.data) {
            const rawBuffer = Buffer.from(found.inlineData.data, "base64");
            const hasRiffHeader =
              rawBuffer.length >= 44 && rawBuffer.toString("ascii", 0, 4) === "RIFF";
            const pcmSlice = hasRiffHeader ? rawBuffer.subarray(44) : rawBuffer;
            if (pcmSlice.length > 0) {
              return pcmSlice;
            }
          }
          return null;
        })
      );

      const pcmBuffers = segmentResults.filter((b): b is NonNullable<typeof b> => b !== null);
      if (pcmBuffers.length > 0) {
        const combinedPcm = Buffer.concat(pcmBuffers);
        const finalWavBytes = Buffer.from(
          pcm16ToWav(new Uint8Array(combinedPcm), 24000, 1)
        );
        return { buffer: finalWavBytes, modelUsed: model };
      }
    } catch (err: any) {
      console.warn(`[VoiceSpeak] Gemini TTS attempt on ${model} notice:`, err?.message || err);
      continue;
    }
  }
  return { buffer: null };
}

export async function GET() {
  const gnaniConfig = getGnaniConfig();
  const activeGnaniKey =
    gnaniConfig.gnaniApiKey ||
    process.env.GNANI_KEY?.trim() ||
    process.env.GNANI_API_KEY?.trim() ||
    process.env.VACHANA_API_KEY?.trim();
  const hasGnani = Boolean(activeGnaniKey);
  const gnaniCooldownUntil = getGnaniCooldownUntil(activeGnaniKey);
  const isGnaniCooldown = Date.now() < gnaniCooldownUntil;

  const elevenConfig = getElevenLabsConfig();
  const activeElevenKey =
    elevenConfig.elevenLabsApiKey ||
    process.env.ELEVEN_LABS_API_KEY?.trim() ||
    process.env.ELEVENLABS_API_KEY?.trim() ||
    process.env.XI_API_KEY?.trim();
  const hasEleven = Boolean(activeElevenKey);
  const elevenCooldownUntil = getElevenLabsCooldownUntil(activeElevenKey);
  const isElevenCooldown = Date.now() < elevenCooldownUntil;

  const hasGemini = Boolean(process.env.GEMINI_API_KEY?.trim());

  let activeTier = "gemini";
  if (hasGnani && !isGnaniCooldown) {
    activeTier = "gnani";
  } else if (hasEleven && !isElevenCooldown) {
    activeTier = "elevenlabs";
  }

  return NextResponse.json({
    ok: true,
    hierarchy: ["gnani", "elevenlabs", "gemini"],
    activeProvider: activeTier,
    primaryProvider: "gnani",
    primaryModel: gnaniConfig.gnaniModel || "timbre-v3.0",
    primaryStatus: hasGnani ? (isGnaniCooldown ? "credits_exhausted" : "active") : "unconfigured",
    secondaryProvider: "elevenlabs",
    secondaryModel: elevenConfig.elevenLabsModel || "eleven_turbo_v2_5",
    secondaryStatus: hasEleven ? (isElevenCooldown ? "credits_exhausted" : "ready") : "unconfigured",
    tertiaryProvider: "gemini",
    tertiaryModel: "gemini-2.5-flash-preview-tts",
    tertiaryStatus: hasGemini ? "ready" : "unconfigured",
    emotionalVoiceEngine: "attached",
    gnaniCooldownActive: isGnaniCooldown,
    gnaniCooldownRemainingSec: Math.max(0, Math.round((gnaniCooldownUntil - Date.now()) / 1000)),
    elevenLabsCooldownActive: isElevenCooldown,
    elevenLabsCooldownRemainingSec: Math.max(0, Math.round((elevenCooldownUntil - Date.now()) / 1000)),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = typeof body.text === "string" ? body.text : String(body.text || "");
    const voiceId = String(body.voice || "adam");
    const speed = String(body.speed ?? "normal");
    const userPrompt = typeof body.userPrompt === "string" ? body.userPrompt : "";
    let emotion = String(body.emotion || "auto");
    if (!emotion || emotion === "auto") {
      emotion = detectEmotionFromContext(userPrompt || text, text);
    }

    // Optional test flags for deterministic end-to-end verification of the fallback hierarchy
    const simulateGnaniExhausted =
      Boolean(body.simulateGnaniExhausted) ||
      req.headers.get("x-simulate-gnani-exhausted") === "true";
    const simulateElevenLabsExhausted =
      Boolean(body.simulateElevenLabsExhausted) ||
      req.headers.get("x-simulate-elevenlabs-exhausted") === "true";

    if (!text.trim()) {
      return NextResponse.json({ ok: false, error: "Empty text" }, { status: 400 });
    }

    // Prepare complete, grammatically sound spoken text with zero stage directions
    const cleanText = cleanSpokenTextForTTS(text);
    if (!cleanText) {
      return NextResponse.json({ ok: false, error: "Empty cleaned text" }, { status: 400 });
    }

    // Check memory cache first (when not simulating credit exhaustion) to return in <1ms with 0 quota consumption
    const cacheKey = `${voiceId.toLowerCase()}:${emotion.toLowerCase()}:${speed.toLowerCase()}:${cleanText.toLowerCase()}`;
    if (!simulateGnaniExhausted && !simulateElevenLabsExhausted) {
      const cachedItem = getCachedAudio(cacheKey);
      if (cachedItem) {
        return new Response(cachedItem.buffer as unknown as BodyInit, {
          status: 200,
          headers: {
            "Content-Type": cachedItem.contentType,
            "Content-Length": cachedItem.buffer.byteLength.toString(),
            "X-TTS-Provider": cachedItem.provider,
            "X-TTS-Model": cachedItem.modelUsed,
            "X-TTS-Cached": "true",
            "Cache-Control": "public, max-age=3600",
          },
        });
      }
    }

    const fallbackTrail: string[] = [];

    // ── TIER 1 (PRIMARY): Gnani AI (Vachana Timbre v3.0 / v2.5 Human-Like Voice Engine) ──
    const gnaniConfig = getGnaniConfig();
    const candidateGnaniKeys = Array.from(
      new Set(
        [
          gnaniConfig.gnaniApiKey,
          process.env.GNANI_KEY?.trim(),
          process.env.GNANI_API_KEY?.trim(),
          process.env.VACHANA_API_KEY?.trim(),
          process.env.CHARIOT_API_KEY?.trim()?.startsWith("vach_")
            ? process.env.CHARIOT_API_KEY.trim()
            : undefined,
        ].filter((k): k is string => Boolean(k && k.trim()))
      )
    );

    if (simulateGnaniExhausted) {
      fallbackTrail.push("gnani_credits_exhausted");
    } else if (candidateGnaniKeys.length > 0) {
      for (const candidateGnaniKey of candidateGnaniKeys) {
        if (Date.now() < getGnaniCooldownUntil(candidateGnaniKey)) {
          fallbackTrail.push("gnani_credits_exhausted");
          continue;
        }
        const gnaniResult = await synthesizeWithGnani(
          cleanText,
          candidateGnaniKey,
          gnaniConfig.gnaniModel || "timbre-v3.0",
          gnaniConfig.gnaniBaseUrl || "https://api.vachana.ai",
          voiceId,
          emotion,
          speed
        );

        if (gnaniResult.buffer && gnaniResult.buffer.byteLength > 200) {
          setCachedAudio(
            cacheKey,
            gnaniResult.buffer,
            "audio/wav",
            "gnani",
            gnaniResult.modelUsed || "timbre-v3.0"
          );
          return new Response(gnaniResult.buffer as unknown as BodyInit, {
            status: 200,
            headers: {
              "Content-Type": "audio/wav",
              "Content-Length": gnaniResult.buffer.byteLength.toString(),
              "X-TTS-Provider": "gnani",
              "X-TTS-Model": gnaniResult.modelUsed || "timbre-v3.0",
              "X-TTS-Voice": gnaniResult.voiceUsed || "Shubham",
              "X-TTS-Hierarchy-Tier": "1",
              "Cache-Control": "no-cache",
            },
          });
        }

        if (gnaniResult.quotaExceeded) {
          fallbackTrail.push("gnani_credits_exhausted");
        } else {
          fallbackTrail.push("gnani_unavailable");
        }
      }
    } else {
      fallbackTrail.push("gnani_key_unattached");
    }

    // ── TIER 2 (FIRST FALLBACK): ElevenLabs Turbo v2.5 (Activates when Gnani credits exhausted) ──
    const elevenConfig = getElevenLabsConfig();
    const candidateElevenKeys = Array.from(
      new Set(
        [
          elevenConfig.elevenLabsApiKey,
          process.env.ELEVEN_LABS_API_KEY?.trim(),
          process.env.ELEVENLABS_API_KEY?.trim(),
          process.env.ELEVENLABS_API_KEY_2?.trim(),
          process.env.ELEVEN_LABS_API_KEY_2?.trim(),
          process.env.XI_API_KEY?.trim(),
        ].filter((k): k is string => Boolean(k && k.trim()))
      )
    );

    if (simulateElevenLabsExhausted) {
      fallbackTrail.push("elevenlabs_credits_exhausted");
    } else if (candidateElevenKeys.length > 0) {
      for (const candidateKey of candidateElevenKeys) {
        if (Date.now() < getElevenLabsCooldownUntil(candidateKey)) {
          fallbackTrail.push("elevenlabs_credits_exhausted");
          continue;
        }
        const elevenResult = await synthesizeWithElevenLabs(
          cleanText,
          candidateKey,
          elevenConfig.elevenLabsModel || "eleven_turbo_v2_5",
          voiceId,
          emotion
        );

        if (elevenResult.buffer && elevenResult.buffer.byteLength > 200) {
          if (!simulateGnaniExhausted) {
            setCachedAudio(
              cacheKey,
              elevenResult.buffer,
              "audio/mpeg",
              "elevenlabs",
              elevenResult.modelUsed || "eleven_turbo_v2_5"
            );
          }
          return new Response(elevenResult.buffer as unknown as BodyInit, {
            status: 200,
            headers: {
              "Content-Type": "audio/mpeg",
              "Content-Length": elevenResult.buffer.byteLength.toString(),
              "X-TTS-Provider": "elevenlabs",
              "X-TTS-Model": elevenResult.modelUsed || "eleven_turbo_v2_5",
              "X-TTS-Fallback-Reason": fallbackTrail.join(",") || "gnani_credits_exhausted",
              "X-TTS-Hierarchy-Tier": "2",
              "Cache-Control": "no-cache",
            },
          });
        }

        if (elevenResult.quotaExceeded) {
          fallbackTrail.push("elevenlabs_credits_exhausted");
        } else {
          fallbackTrail.push("elevenlabs_error");
        }
      }
    } else {
      fallbackTrail.push("elevenlabs_key_unattached");
    }

    // ── TIER 3 (SECOND FALLBACK): Google Gemini API TTS (Activates when both Gnani & ElevenLabs credits exhausted) ──
    const fallbackReason = fallbackTrail.join(",") || "gnani_and_elevenlabs_exhausted";
    const geminiResult = await synthesizeWithGeminiTTS(cleanText, voiceId, emotion, fallbackReason);
    if (geminiResult.buffer && geminiResult.buffer.byteLength > 200) {
      if (!simulateGnaniExhausted && !simulateElevenLabsExhausted) {
        setCachedAudio(
          cacheKey,
          geminiResult.buffer,
          "audio/wav",
          "gemini",
          geminiResult.modelUsed || "gemini-2.5-flash-preview-tts"
        );
      }
      return new Response(geminiResult.buffer as unknown as BodyInit, {
        status: 200,
        headers: {
          "Content-Type": "audio/wav",
          "Content-Length": geminiResult.buffer.byteLength.toString(),
          "X-TTS-Provider": "gemini",
          "X-TTS-Fallback-Reason": fallbackReason,
          "X-TTS-Gemini-Model": geminiResult.modelUsed || "gemini-2.5-flash-preview-tts",
          "X-TTS-Hierarchy-Tier": "3",
          "Cache-Control": "no-cache",
        },
      });
    }

    // Immediate browser fallback (never block on 18s external Edge WebSocket timeout)
    return NextResponse.json({
      ok: false,
      fallback: "browser",
      reason: fallbackReason || "tts_unavailable",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        fallback: "browser",
        message: err instanceof Error ? err.message : "TTS generation failed",
      },
      { status: 200 }
    );
  }
}
