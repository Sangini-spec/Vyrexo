import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getChariotConfig } from "@/lib/ai-provider-config";

// In-memory flag tracking whether Chariot API has run out of credits to prevent voice jitter mid-session
let isChariotCreditsExhausted = false;

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

  // fmt subchunk
  view.setUint8(12, 0x66); // f
  view.setUint8(13, 0x6d); // m
  view.setUint8(14, 0x74); // t
  view.setUint8(15, 0x20); // ' '
  view.setUint32(16, 16, true);          // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true);           // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true);  // SampleRate
  view.setUint32(28, byteRate, true);    // ByteRate
  view.setUint16(32, blockAlign, true);  // BlockAlign
  view.setUint16(34, 16, true);          // BitsPerSample

  // data subchunk
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
  if (v.includes("charon")) {
    return "Charon";
  }
  // Default natural masculine voice for Rex
  return "Puck";
}

// Map user settings voice names to verified Chariot voice IDs (all tested with HTTP 200 on api.chariot.in)
function mapChariotVoice(voiceId?: string): string {
  const v = (voiceId || "").toLowerCase();
  if (v.includes("ava") || v.includes("female") || v.includes("mia") || v.includes("rachel")) {
    return "909b5ef9-8388-4da4-ba39-974a545edc91"; // Mia / Ava (American Female, expressive & natural)
  }
  if (v.includes("ryan") || v.includes("british")) {
    return "62a6bdfa-1405-4be3-93be-31cff252f9f8"; // Ryan (British Male, calm & steady)
  }
  if (v.includes("sonia") || v.includes("alan")) {
    return "43a25626-d785-49d1-ad25-b734496714fb"; // Alan / Sonia (Articulate & clear)
  }
  // Default natural American male voice for Rex
  return "bac7d666-094d-4698-91fa-741d60fce662"; // Matt / Adam (American Male, confident & articulate)
}

// Trim gracefully at sentence boundary to ensure complete, natural thoughts
function trimToSentenceBoundary(input: string, maxLen = 560): string {
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
  if (lastPunctuation > 180) {
    return sub.slice(0, lastPunctuation + 1).trim();
  }
  const lastSpace = sub.lastIndexOf(" ");
  if (lastSpace > 180) {
    return sub.slice(0, lastSpace).trim() + "...";
  }
  return sub.trim();
}

/**
 * Cleans text for TTS synthesis: completely strips any asterisks stage directions
 * (e.g. *takes a deep breath*, *sighs*, *chuckles*) and replaces them with natural
 * acoustic micro-pauses (, ... ) so the voice engine inhales/pauses organically
 * without ever reading the literal words aloud.
 */
function cleanSpokenTextForTTS(raw: string): string {
  let cleaned = raw
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]+`/g, " ")
    // Strip asterisks stage directions and action cues: *takes a deep breath*, *sighs*, etc.
    .replace(/\*+[^*]+?\*+/g, ", ... ")
    // Strip parenthetical stage directions: (takes a breath), (pauses), etc.
    .replace(/\([^)]*(?:breath|pause|sigh|chuckle|clears?\s+throat|laugh|smile)[^)]*\)/gi, ", ... ")
    // Strip XML/HTML style breath tags
    .replace(/<breath\s*\/?>/gi, ", ... ")
    .replace(/<[^>]+>/g, " ")
    // Strip unadorned literal breath words so TTS engines NEVER speak "takes a little breath" aloud
    .replace(/\b(?:takes?\s+(?:a\s+)?(?:little\s+|deep\s+|quick\s+|gentle\s+)?breath|taking\s+a\s+breath|takes?\s+a\s+moment\s+to\s+breathe|breathes?\s+(?:in|out)?|takes?\s+a\s+pause|pauses?\s+briefly|deep\s+breath)\b[,.]?/gi, ", ... ")
    // Remove markdown symbols
    .replace(/[_#~|]/g, "")
    // Normalize ellipses and comma pauses
    .replace(/\s*,\s*\.\.\.\s*,?/g, ", ... ")
    .replace(/\.{3,}/g, "...")
    .replace(/\s+/g, " ")
    .replace(/^\s*[,.\s]+/, "")
    .trim();

  return trimToSentenceBoundary(cleaned, 560);
}

/**
 * Injects natural conversational pacing and acoustic breath pauses for human-like delivery
 */
function injectHumanEmotionAndBreaths(text: string, emotion?: string): string {
  let humanized = text.trim();

  // If text starts with conversational transitions, ensure smooth human breath
  if (/^(yeah|yes|hey|alright|ok|okay|sure|got it|whew|so|well)\b/i.test(humanized)) {
    humanized = humanized.replace(/^(yeah|yes|hey|alright|ok|okay|sure|got it|whew|so|well)[,.]?\s*/i, "$1, ... ");
  }

  // If text has multiple sentences, insert an organic acoustic pause at major transitions
  const sentences = humanized.split(/(?<=[.!?])\s+/);
  if (sentences.length >= 2 && humanized.length > 50) {
    humanized = sentences
      .map((s, idx) => {
        if (idx === 1 && /^(and|also|now|so|first|second|then|here|let's|let us|we can)\b/i.test(s)) {
          return `, ... ${s}`;
        }
        if (idx === 2 && /^(finally|plus|overall|what's next|how does)\b/i.test(s)) {
          return `, ... ${s}`;
        }
        return s;
      })
      .join(" ");
  }

  // Ensure friendly, authentic phrasing without robotic meta-tags
  humanized = humanized
    .replace(/\s*,\s*\.\.\.\s*,?/g, ", ... ")
    .replace(/\s+/g, " ")
    .trim();

  return humanized;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = (body.text as string) || "";
    const voiceId = (body.voice as string) || "adam";
    const emotion = (body.emotion as string) || "warm";
    const preferGemini = Boolean(body.preferGemini || body.saveCredits);

    if (!text.trim()) {
      return NextResponse.json({ ok: false, error: "Empty text" }, { status: 400 });
    }

    // Prepare complete, grammatically sound spoken text with zero stage directions
    const cleanText = cleanSpokenTextForTTS(text);

    // 1. High-fidelity Chariot TTS synthesis if configured, not exhausted, and not in credit-saving mode
    const chariotKey = process.env.CHARIOT_API_KEY?.trim() || getChariotConfig().chariotApiKey;
    if (chariotKey && !preferGemini && !isChariotCreditsExhausted) {
      try {
        const chariotVoiceId = mapChariotVoice(voiceId);
        const chariotRes = await fetch("https://api.chariot.in/v1/tts", {
          method: "POST",
          headers: {
            "chariotai-api-key": chariotKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            voice_id: chariotVoiceId,
            text: cleanText,
          }),
        });

        if (chariotRes.ok) {
          const wavArrayBuffer = await chariotRes.arrayBuffer();
          return new Response(wavArrayBuffer, {
            status: 200,
            headers: {
              "Content-Type": "audio/wav",
              "Content-Length": wavArrayBuffer.byteLength.toString(),
              "X-TTS-Provider": "chariot",
              "Cache-Control": "no-cache",
            },
          });
        }

        // If credits exhausted or rate limited, permanently latch to Gemini TTS to maintain 100% consistent voice
        if (chariotRes.status === 403 || chariotRes.status === 402 || chariotRes.status === 429) {
          isChariotCreditsExhausted = true;
          console.info(`[api/voice/speak] Chariot credits depleted (${chariotRes.status}), stabilizing permanently on Gemini TTS.`);
        } else {
          console.warn(`[api/voice/speak] Chariot TTS status ${chariotRes.status}, routing to Gemini TTS...`);
        }
      } catch (chariotErr) {
        console.warn("[api/voice/speak] Chariot error, routing to Gemini TTS:", chariotErr);
      }
    }

    const ai = getGeminiClient();
    if (!ai) {
      return NextResponse.json({ ok: false, fallback: "browser", reason: "no_gemini_client" });
    }

    const prebuiltVoice = mapVoiceName(voiceId);
    const expressiveSpeechText = injectHumanEmotionAndBreaths(cleanText, emotion);

    // Emotion style mapping for natural human pacing and breath
    const emotionStyle =
      emotion === "upbeat"
        ? "Energetic, articulate software engineer teammate with natural conversational cadence, authentic vocal inflection, and organic breath pauses"
        : emotion === "calm"
        ? "Thoughtful, grounded software architect with calm cadence, natural breath pauses, and warm vocal inflection"
        : emotion === "empathetic"
        ? "Empathetic, attentive collaborator speaking naturally with gentle breath pauses and friendly cadence"
        : "Warm, authentic human voice, conversational pacing, natural teammate inflection with organic breath pauses";

    const candidateModels = ["gemini-3.8-flash-tts", "gemini-3.8-flash-lite-tts"];
    let audioPart: any = null;

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: expressiveSpeechText,
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

        const candidate = response.candidates?.[0];
        const parts = candidate?.content?.parts || [];
        const found = parts.find((p: any) => p.inlineData && p.inlineData.data);
        if (found?.inlineData?.data) {
          audioPart = found;
          break;
        }
      } catch (err) {
        console.info(`[api/voice/speak] Model ${model} not available, trying next...`);
      }
    }

    if (!audioPart || !audioPart.inlineData?.data) {
      return NextResponse.json({ ok: false, fallback: "browser", reason: "no_audio_part" });
    }

    const base64Data = audioPart.inlineData.data;
    const rawBuffer = Buffer.from(base64Data, "base64");

    // Gemini 3.8 unary default returns a complete WAV file with RIFF header.
    // Verify whether buffer already has RIFF header to avoid corrupting with a double-header.
    const hasRiffHeader = rawBuffer.length >= 12 && rawBuffer.toString("ascii", 0, 4) === "RIFF";
    const finalWavBytes = hasRiffHeader
      ? rawBuffer
      : Buffer.from(pcm16ToWav(new Uint8Array(rawBuffer), 24000, 1));

    return new Response(finalWavBytes.buffer as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": finalWavBytes.byteLength.toString(),
        "X-TTS-Provider": "gemini",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err: any) {
    // Graceful fallback on quota limits or network errors
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
