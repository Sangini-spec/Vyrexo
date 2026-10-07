import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

let genAI: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!genAI) {
    genAI = new GoogleGenAI();
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
      } catch (err) {
        console.info(`[api/voice/transcribe] Model ${model} unavailable, trying next candidate...`);
      }
    }
    return NextResponse.json({ text, success: true });
  } catch (error: any) {
    console.error("[api/voice/transcribe] error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to transcribe audio", text: "" },
      { status: 500 }
    );
  }
}
