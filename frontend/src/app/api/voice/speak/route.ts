import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import { getElevenLabsConfig } from "@/lib/ai-provider-config";
import { detectEmotionFromContext, type EmotionTone } from "@/lib/emotion-detector";

// In-memory LRU audio cache for synthesized phrases to eliminate duplicate API calls and guarantee <5ms response
const globalForCache = globalThis as unknown as {
  __vyrexoVoiceAudioCache?: Map<string, { buffer: Buffer; contentType: string; timestamp: number }>;
};
const voiceAudioCache =
  globalForCache.__vyrexoVoiceAudioCache ||
  (globalForCache.__vyrexoVoiceAudioCache = new Map<
    string,
    { buffer: Buffer; contentType: string; timestamp: number }
  >());
const MAX_CACHE_ENTRIES = 300;

function getCachedAudio(key: string): { buffer: Buffer; contentType: string } | null {
  const item = voiceAudioCache.get(key);
  if (!item) return null;
  return { buffer: item.buffer, contentType: item.contentType };
}

function setCachedAudio(key: string, buffer: Buffer, contentType: string = "audio/mpeg"): void {
  if (voiceAudioCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = voiceAudioCache.keys().next().value;
    if (oldestKey) voiceAudioCache.delete(oldestKey);
  }
  voiceAudioCache.set(key, { buffer, contentType, timestamp: Date.now() });
}
 
// Per-key cooldown map for ElevenLabs monthly quota or credit exhaustion
// Ensures a newly integrated API key has 0 cooldown even if a previous key was exhausted
const globalForVoice = globalThis as unknown as {
  __vyrexoElevenLabsKeyCooldowns?: Map<string, number>;
};

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

interface ElevenLabsSynthResult {
  buffer: Buffer | null;
  quotaExceeded: boolean;
  modelUsed?: string;
  error?: string;
}

// Synthesizes speech using ElevenLabs v2 Turbo API exclusively (zero v4 usage; ultra-low latency ~200-450ms & 50% lower credit usage)
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
            setTimeout(() => resolve(null), 4500)
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
  const elevenConfig = getElevenLabsConfig();
  const activeKey =
    elevenConfig.elevenLabsApiKey ||
    process.env.ELEVENLABS_API_KEY?.trim() ||
    process.env.ELEVEN_LABS_API_KEY?.trim() ||
    process.env.XI_API_KEY?.trim();
  const hasEleven = Boolean(activeKey);
  const hasGemini = Boolean(process.env.GEMINI_API_KEY?.trim());
  const cooldownUntil = getElevenLabsCooldownUntil(activeKey);
  const isCooldown = Date.now() < cooldownUntil;

  return NextResponse.json({
    ok: true,
    primaryProvider: "elevenlabs",
    primaryModel: elevenConfig.elevenLabsModel || "eleven_turbo_v2_5",
    primaryStatus: hasEleven ? (isCooldown ? "monthly_credits_exhausted" : "active") : "unconfigured",
    emotionalVoiceEngine: "attached",
    fallbackProvider: "gemini",
    fallbackStatus: hasGemini ? "ready" : "unconfigured",
    cooldownActive: isCooldown,
    cooldownRemainingSec: Math.max(0, Math.round((cooldownUntil - Date.now()) / 1000)),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = (body.text as string) || "";
    const voiceId = (body.voice as string) || "adam";
    const speed = (body.speed as string) || "normal";
    const userPrompt = (body.userPrompt as string) || "";
    let emotion = (body.emotion as string) || "auto";
    if (!emotion || emotion === "auto") {
      emotion = detectEmotionFromContext(userPrompt || text, text);
    }

    if (!text.trim()) {
      return NextResponse.json({ ok: false, error: "Empty text" }, { status: 400 });
    }

    // Prepare complete, grammatically sound spoken text with zero stage directions
    const cleanText = cleanSpokenTextForTTS(text);
    if (!cleanText) {
      return NextResponse.json({ ok: false, error: "Empty cleaned text" }, { status: 400 });
    }

    // Check memory cache first to return in <1ms with 0 quota consumption
    const cacheKey = `${voiceId.toLowerCase()}:${emotion.toLowerCase()}:${speed.toLowerCase()}:${cleanText.toLowerCase()}`;
    const cachedItem = getCachedAudio(cacheKey);
    if (cachedItem) {
      return new Response(cachedItem.buffer as unknown as BodyInit, {
        status: 200,
        headers: {
          "Content-Type": cachedItem.contentType,
          "Content-Length": cachedItem.buffer.byteLength.toString(),
          "X-TTS-Provider": "neural-cached",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // ── TIER 1: ElevenLabs Turbo TTS (Primary, Server-Side Emotional Voice Engine) ──
    const elevenConfig = getElevenLabsConfig();
    const candidateElevenKeys = Array.from(
      new Set(
        [
          elevenConfig.elevenLabsApiKey,
          process.env.ELEVENLABS_API_KEY?.trim(),
          process.env.ELEVEN_LABS_API_KEY?.trim(),
          process.env.ELEVENLABS_API_KEY_2?.trim(),
          process.env.ELEVEN_LABS_API_KEY_2?.trim(),
          process.env.XI_API_KEY?.trim(),
        ].filter((k): k is string => Boolean(k && k.trim()))
      )
    );

    let fallbackReason: string | undefined;

    if (candidateElevenKeys.length > 0) {
      for (const candidateKey of candidateElevenKeys) {
        if (Date.now() < getElevenLabsCooldownUntil(candidateKey)) {
          fallbackReason = "elevenlabs_monthly_quota_exceeded";
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
          setCachedAudio(cacheKey, elevenResult.buffer, "audio/mpeg");
          return new Response(elevenResult.buffer as unknown as BodyInit, {
            status: 200,
            headers: {
              "Content-Type": "audio/mpeg",
              "Content-Length": elevenResult.buffer.byteLength.toString(),
              "X-TTS-Provider": "elevenlabs",
              "X-TTS-Model": elevenResult.modelUsed || "eleven_turbo_v2_5",
              "Cache-Control": "no-cache",
            },
          });
        }

        if (elevenResult.quotaExceeded) {
          fallbackReason = "elevenlabs_monthly_quota_exceeded";
        } else {
          fallbackReason = "elevenlabs_error";
        }
      }
    } else {
      fallbackReason = "elevenlabs_key_unattached";
    }

    // ── TIER 2: Google Gemini API TTS (Immediate Seamless Fallback when Credits Exceeded) ──
    const geminiResult = await synthesizeWithGeminiTTS(cleanText, voiceId, emotion, fallbackReason);
    if (geminiResult.buffer && geminiResult.buffer.byteLength > 200) {
      setCachedAudio(cacheKey, geminiResult.buffer, "audio/wav");
      return new Response(geminiResult.buffer as unknown as BodyInit, {
        status: 200,
        headers: {
          "Content-Type": "audio/wav",
          "Content-Length": geminiResult.buffer.byteLength.toString(),
          "X-TTS-Provider": "gemini",
          "X-TTS-Fallback-Reason": fallbackReason || "elevenlabs_quota_exceeded",
          "X-TTS-Gemini-Model": geminiResult.modelUsed || "gemini-2.5-flash-preview-tts",
          "Cache-Control": "no-cache",
        },
      });
    }

    // Immediate browser fallback (never block on 18s external Edge WebSocket timeout)
    return NextResponse.json({ ok: false, fallback: "browser", reason: fallbackReason || "tts_unavailable" });
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
