import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import { analyzeWholeSentenceSemantics } from "@/lib/project-spec";

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text: string = (body.text || body.message || "").trim();
    const isCurrentlyBuilding: boolean = Boolean(body.isCurrentlyBuilding ?? body.isBuilding);
    const hasExistingProject: boolean = Boolean(body.hasExistingProject);
    const history: Array<{ role: string; content: string }> = Array.isArray(body.history)
      ? body.history.slice(-4)
      : [];

    const baseline = analyzeWholeSentenceSemantics(text, {
      isCurrentlyBuilding,
      hasExistingProject,
      history,
    });

    if (!text) {
      return NextResponse.json(baseline);
    }

    // Fast certainty paths where deterministic whole-sentence syntax is already 100% unambiguous
    if (baseline.intent === "TERMINATE_BUILD" || baseline.intent === "PAUSE_OR_SILENCE") {
      return NextResponse.json(baseline);
    }

    const ai = getGeminiClient();
    if (!ai) {
      return NextResponse.json(baseline);
    }

    const recentHistoryText = history
      .map((h) => `${h.role === "user" ? "User" : "Rex"}: ${(h.content || "").slice(0, 240)}`)
      .join("\n");

    const prompt = `Analyze the FULL semantic meaning of the user's complete message (every word, clause, and punctuation mark) rather than matching isolated keywords.

Context:
- Is Rex currently building an application right now? ${isCurrentlyBuilding ? "YES" : "NO"}
- Does this session already have an active project? ${hasExistingProject ? "YES" : "NO"}
${recentHistoryText ? `- Recent conversation:\n${recentHistoryText}\n` : ""}
User's complete message:
"""
${text}
"""

Classify the user's true intent into EXACTLY ONE of these 4 categories:
1. "TERMINATE_BUILD": ONLY when Rex is currently building an application (Is Rex currently building = YES) OR the user explicitly names stopping/cancelling a software build, application, or project (e.g., "Hey Rex, I think I don't want to build this application anymore. Can you please stop running it?", "Stop building this project"). IMPORTANT: If Rex is NOT currently building (NO) and the user simply asks to withdraw their last request, drop a question, or stop talking about a conversational topic (e.g., "you can withdraw that request", "withdraw the last request", "never mind that question"), do NOT classify as TERMINATE_BUILD — classify as "GUIDANCE_OR_CONVERSATION" so Rex can respond situationally to the conversation!
2. "PAUSE_OR_SILENCE": The user is asking Rex to pause speaking, wait, hold on, or listen while they add more thoughts, without cancelling a build or asking a substantive question.
3. "GUIDANCE_OR_CONVERSATION": The user is asking a question, withdrawing/changing a conversational topic or question when no build is running, asking for guidance/mentorship/steps/explanation (even if the sentence contains the word "build", e.g., "You know, I don't know how to build this software. Can you guide me first? How can we build this specific idea end-to-end?"), asking for advice/suggestions, or having a conversation WITHOUT commanding Rex to immediately generate/modify application code right now.
4. "EXECUTE_BUILD": The user is affirmatively instructing Rex to build, create, scaffold, code, or modify a software application/project right now.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            intent: {
              type: Type.STRING,
              description:
                "One of: TERMINATE_BUILD, PAUSE_OR_SILENCE, GUIDANCE_OR_CONVERSATION, EXECUTE_BUILD",
            },
            reasoning: {
              type: Type.STRING,
              description: "Brief 1-sentence explanation of the whole-sentence meaning.",
            },
          },
          required: ["intent", "reasoning"],
        },
      },
    });

    const rawJson = (response.text || "").trim();
    if (rawJson) {
      const parsed = JSON.parse(rawJson);
      const llmIntent = parsed.intent as
        | "TERMINATE_BUILD"
        | "PAUSE_OR_SILENCE"
        | "GUIDANCE_OR_CONVERSATION"
        | "EXECUTE_BUILD";

      // If baseline detected explicit guidance ("guide me first", "don't know how to build", "how can we build...?"),
      // never allow a false-positive EXECUTE_BUILD override.
      if (baseline.isGuidanceOrQuestion && llmIntent === "EXECUTE_BUILD" && text.includes("?")) {
        return NextResponse.json(baseline);
      }

      if (
        llmIntent === "TERMINATE_BUILD" ||
        llmIntent === "PAUSE_OR_SILENCE" ||
        llmIntent === "GUIDANCE_OR_CONVERSATION" ||
        llmIntent === "EXECUTE_BUILD"
      ) {
        return NextResponse.json({
          intent: llmIntent,
          isBuildTermination: llmIntent === "TERMINATE_BUILD",
          isGuidanceOrQuestion: llmIntent === "GUIDANCE_OR_CONVERSATION",
          isPauseOrSilence: llmIntent === "PAUSE_OR_SILENCE",
          isAffirmativeBuildCommand: llmIntent === "EXECUTE_BUILD",
          reasoning: parsed.reasoning || baseline.reasoning,
        });
      }
    }

    return NextResponse.json(baseline);
  } catch {
    return NextResponse.json({
      intent: "GUIDANCE_OR_CONVERSATION",
      isBuildTermination: false,
      isGuidanceOrQuestion: true,
      isPauseOrSilence: false,
      isAffirmativeBuildCommand: false,
      reasoning: "Fallback on parse error",
    });
  }
}
