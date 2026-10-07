"use client";

import { useState, useRef, useEffect } from "react";
import {
  speakHumanizedText,
  cancelHumanizedSpeech,
  EMOTION_OPTIONS,
  type EmotionTone,
  type VoiceSettings,
} from "@/lib/voice-synthesizer";

const AUDITION_SCRIPTS: Record<EmotionTone, string> = {
  warm: "Hey Developer! I'm Rex, your voice-first AI coding agent. Just think out loud, and together we'll architect, build, and deploy your ideas in real time.",
  upbeat: "Ready to move at lightspeed? Tell me what feature to build, and my multi-agent team will write the code, run tests, and commit directly to Git!",
  calm: "Take a breath. I'm right here with you. Point me to the problem, and we'll systematically trace the codebase and build a clean, resilient fix.",
  empathetic: "I understand how frustrating edge-case bugs can be. Let's break down the logic step-by-step and craft a rock-solid solution together.",
};

export function InteractiveVoiceHero() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionTone>("warm");
  const [currentText, setCurrentText] = useState("");
  const cancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      cancelRef.current?.();
      cancelHumanizedSpeech();
    };
  }, []);

  const handleAudition = (emotion: EmotionTone = selectedEmotion) => {
    if (isPlaying && emotion === selectedEmotion) {
      // Toggle off
      cancelRef.current?.();
      cancelHumanizedSpeech();
      setIsPlaying(false);
      setCurrentText("");
      return;
    }

    // Stop any existing playback
    cancelRef.current?.();
    cancelHumanizedSpeech();

    setSelectedEmotion(emotion);
    setIsPlaying(true);
    const script = AUDITION_SCRIPTS[emotion];
    setCurrentText(script);

    const settings: VoiceSettings = {
      voice: "adam",
      speed: "normal",
      emotion: emotion,
    };

    cancelRef.current = speakHumanizedText(script, settings, {
      onEnd: () => {
        setIsPlaying(false);
      },
      onError: () => {
        setIsPlaying(false);
      },
    });
  };

  return (
    <div className="relative w-full max-w-[620px] mx-auto p-5 sm:p-6 rounded-2xl border border-[#5a7aa025] bg-[var(--card)]/80 backdrop-blur-xl shadow-[0_20px_60px_-15px_rgba(59,89,152,0.18)] transition-all duration-700">
      {/* Subtle outer gradient halo */}
      <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-[#3B599822] via-[#7B93B018] to-[#C0C8D422] -z-10 blur-sm pointer-events-none" />

      {/* Top row: Status & Live Voice Orb */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Animated Mini 3D Voice Orb */}
          <div
            onClick={() => handleAudition(selectedEmotion)}
            className="relative flex items-center justify-center w-11 h-11 rounded-full cursor-pointer group transition-transform active:scale-95"
            title={isPlaying ? "Click to pause Rex" : "Click to hear Rex"}
          >
            {/* Outer expanding ripple */}
            <div
              className={`absolute inset-0 rounded-full transition-all duration-700 ${
                isPlaying
                  ? "animate-ping bg-[#5a7aa0] opacity-35"
                  : "bg-[#5a7aa015] group-hover:scale-110"
              }`}
            />
            {/* Ambient glow */}
            <div
              className={`absolute -inset-1 rounded-full blur-md transition-opacity duration-500 ${
                isPlaying ? "bg-[#7B93B0] opacity-60" : "bg-[#5a7aa0] opacity-20"
              }`}
            />
            {/* Core sphere */}
            <div
              className="relative w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md transition-all duration-500"
              style={{
                background: isPlaying
                  ? "radial-gradient(circle at 35% 35%, #C0C8D4, #7B93B0, #3B5998)"
                  : "radial-gradient(circle at 35% 35%, #8A9CB8, #5A7AA0, #2A4070)",
              }}
            >
              {isPlaying ? (
                <span className="w-2.5 h-2.5 bg-white rounded-sm" />
              ) : (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="white"
                  className="ml-0.5"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-[1.5px] text-[var(--text2)]">
                Audition Rex Voice
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#3B599818] text-[var(--steel)] border border-[#3B599825]">
                <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? "bg-[#4ade80] animate-pulse" : "bg-[var(--steel)]"}`} />
                {isPlaying ? "Speaking" : "Ready"}
              </span>
            </div>
            <p className="text-[12px] text-[var(--muted2)] mt-0.5">
              Experience the emotion-aware voice engine
            </p>
          </div>
        </div>

        {/* Play/Stop Pill Button */}
        <button
          onClick={() => handleAudition(selectedEmotion)}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-300 cursor-pointer ${
            isPlaying
              ? "bg-[#3B599825] text-[var(--text)] border border-[var(--steel)] shadow-[0_0_15px_rgba(59,89,152,0.3)]"
              : "bg-[var(--surface2)] text-[var(--muted2)] hover:text-[var(--text)] border border-[var(--border2)] hover:border-[var(--steel)]"
          }`}
        >
          {isPlaying ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-ping" />
              <span>Pause Voice</span>
            </>
          ) : (
            <>
              <span>▶ Hear Rex</span>
            </>
          )}
        </button>
      </div>

      {/* Dynamic Soundwave frequency visualizer */}
      <div className="flex items-center justify-center gap-1.5 my-3.5 h-6 px-2">
        {Array.from({ length: 28 }).map((_, i) => {
          const delays = [0.1, 0.3, 0.5, 0.2, 0.4, 0.6, 0.15, 0.35, 0.55];
          const delay = delays[i % delays.length];
          return (
            <div
              key={i}
              className={`w-1 rounded-full transition-all duration-150 ${
                isPlaying ? "bg-gradient-to-t from-[#3B5998] to-[#7B93B0]" : "bg-[var(--border2)]"
              }`}
              style={{
                height: isPlaying ? `${Math.max(6, Math.sin((i + Date.now() / 120) * 0.7) * 20 + 8)}px` : "4px",
                transition: "height 0.1s ease",
              }}
            />
          );
        })}
      </div>

      {/* Spoken transcript quote */}
      <div className="min-h-[44px] flex items-center justify-center text-center px-2 py-1">
        <p className="text-[13px] text-[var(--text2)] italic leading-relaxed">
          &ldquo;{currentText || AUDITION_SCRIPTS[selectedEmotion]}&rdquo;
        </p>
      </div>

      {/* Emotion selector tabs */}
      <div className="mt-4 pt-3 border-t border-[var(--border2)]/50 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] uppercase tracking-wider text-[var(--muted)] font-medium">
          Emotional Tones:
        </span>
        <div className="flex items-center gap-1.5">
          {EMOTION_OPTIONS.map((emo) => {
            const isActive = selectedEmotion === emo.id;
            return (
              <button
                key={emo.id}
                onClick={() => handleAudition(emo.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-300 cursor-pointer ${
                  isActive
                    ? "bg-[#3B599825] text-[var(--text)] border border-[var(--steel)] shadow-sm"
                    : "bg-[var(--surface)] text-[var(--muted2)] hover:text-[var(--text)] border border-transparent hover:border-[var(--border2)]"
                }`}
                title={emo.desc}
              >
                <span>{emo.icon}</span>
                <span>{emo.label.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
