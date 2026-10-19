import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

let genAI: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  if (!genAI) {
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { audio, mimeType = "audio/webm" } = body;

    if (!audio || typeof audio !== "string") {
      return NextResponse.json(
        { error: "Audio data is required as base64 string", text: "" },
        { status: 400 }
      );
    }

    // Clean base64 if it has data URL prefix
    const base64Data = audio.replace(/^data:[^;]+;base64,/, "");

    const ai = getGenAI();
    if (!ai) {
      return NextResponse.json({ text: "", success: false, error: "Transcription service unavailable" });
    }

    const candidateModels = ["gemini-3.5-transcribe", "gemini-3.8-flash", "gemini-flash-latest"];
    let text = "";

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    mimeType: mimeType.split(";")[0], // e.g. "audio/webm" or "audio/wav"
                    data: base64Data,
                  },
                },
                {
                  text: `You are an accurate, real-time speech-to-text transcriber for a developer assistant named Rex.
Transcribe the user's spoken words verbatim into English text.
Do not add any preamble, explanation, markdown formatting, or quotes.
If the audio contains only silence, background noise, or unintelligible noise, output exactly empty string.`,
                },
              ],
            },
          ],
        });
        text = (response.text || "").trim();
        if (text) break;
      } catch {
        console.info(`[api/voice/transcribe] Model ${model} unavailable, trying next candidate...`);
      }
    }
    return NextResponse.json({ text, success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to transcribe audio", text: "" },
      { status: 500 }
    );
  }
}
