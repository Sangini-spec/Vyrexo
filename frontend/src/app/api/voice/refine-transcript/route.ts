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

    // Return deterministic speech normalization immediately (<1ms) so voice turns never wait on extra LLM round-trips
    return NextResponse.json({
      ok: true,
      refinedText: heuristicText,
      originalText: rawTranscript,
      wasCorrected: heuristicText !== rawTranscript,
      engine: "heuristic-instant",
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
