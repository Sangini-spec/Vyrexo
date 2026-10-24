import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { normalizeSpokenTranscript } from "@/lib/speech-normalizer";

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: { "Client-Info": "vyrexo-ai-app/1.0.0" },
    },
  });
}

/**
 * Fast deterministic heuristic normalizer for common speech recognition glitches,
 * "WhatsApp" -> "What's up" disambiguation, and technical homophones.
 */
function applyHeuristicCorrections(raw: string): string {
  return normalizeSpokenTranscript(raw, { finalizePunctuation: true });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawTranscript: string = body.transcript || body.text || "";
    const history: Array<{ role: string; content: string }> = body.history || [];
    const activeProject: string = body.activeProject || "";

    if (!rawTranscript.trim()) {
      return NextResponse.json({ ok: false, error: "Empty transcript" }, { status: 400 });
    }

    const heuristicText = applyHeuristicCorrections(rawTranscript);

    // Call Gemini for ChatGPT-grade speech intelligence if API key is configured
    const gemini = getGeminiClient();
    if (gemini) {
      try {
        const recentContext = history
          .slice(-4)
          .map((h) => `${h.role === "user" ? "User" : "Rex"}: "${h.content.slice(0, 140)}"`)
          .join("\n");

        const prompt = `You are an intelligent Speech-to-Text Whisper AI layer for Rex, an engineering assistant.
The user spoke into their microphone. The raw speech-to-text transcript is:
"${rawTranscript}"

Conversational Context:
${recentContext || "No prior history"}
Active Project Domain: ${activeProject || "Software / Web Development"}

TASK:
1. Infer what the user genuinely meant to say, resolving phonetic speech slips, homophones, and misrecognitions:
   - "he whatever you have bed for or a Mart modern E-Commerce platform can you please show that in the preview tab" -> "Hey, whatever you have built for AuraMart modern E-Commerce platform, can you please show that in the preview tab?"
   - "start actual building" -> "Start actual building."
   - "can you make a to do list" -> "Can you make a todo list?"
   - "tell me about the tech stack" -> "Tell me about the tech stack."
   - "apex wealth" -> "ApexWealth"
   - "auramart" -> "AuraMart"
   - "aurabeauty" -> "AuraBeauty"
   - "roomcanvas" -> "RoomCanvas"
2. Add natural punctuation: question marks for requests/questions, commas, periods, apostrophes.
3. Fix sentence capitalization and proper nouns (Rex, AuraMart, AuraBeauty, ApexWealth, React, Next.js, etc.).
4. Strictly maintain the user's intent. Do NOT answer the user's question, do NOT provide code, and do NOT add commentary. Output ONLY the polished, punctuated user utterance.`;

        // Multi-model race with candidate models to guarantee ultra-fast response for voice turns
        const candidateModels = ["gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"];
        let refined = "";
        let usedEngine = "";

        for (const model of candidateModels) {
          try {
            const callPromise = gemini.models.generateContent({
              model,
              contents: prompt,
              config: {
                temperature: 0.1,
                maxOutputTokens: 120,
              },
            });

            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Gemini STT timeout")), 2500)
            );

            const res: any = await Promise.race([callPromise, timeoutPromise]);
            const rawText = typeof res?.text === "function" ? res.text() : res?.text || "";
            const candidateText = rawText.trim().replace(/^["']|["']$/g, "") || "";
            if (candidateText && candidateText.length >= 2) {
              refined = candidateText;
              usedEngine = model;
              break;
            }
          } catch {
            // Try next candidate
          }
        }

        if (refined && refined.length >= 2) {
          return NextResponse.json({
            ok: true,
            refinedText: refined,
            originalText: rawTranscript,
            wasCorrected: refined !== rawTranscript,
            engine: usedEngine,
          });
        }
      } catch (geminiErr) {
        console.warn("[stt-refine] Gemini STT error or timeout; using heuristic fallback:", geminiErr);
      }
    }

    // Heuristic fallback
    return NextResponse.json({
      ok: true,
      refinedText: heuristicText,
      originalText: rawTranscript,
      wasCorrected: heuristicText !== rawTranscript,
      engine: "heuristic-rules",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Internal STT error",
      },
      { status: 500 }
    );
  }
}
