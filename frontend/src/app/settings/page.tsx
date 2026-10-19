"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import {
  type VoiceSettings,
  speakHumanizedText,
  cancelHumanizedSpeech,
} from "@/lib/voice-synthesizer";

// Curated voices (3 male, 3 female)
const VOICE_OPTIONS = [
  // Male Voices
  {
    id: "adam",
    name: "Adam",
    accent: "American",
    gender: "Male",
    vibe: "Deep, articulate & conversational tone with natural warmth",
    previewText: "Hey there! I'm Adam. I'm ready to design architectures, review code, and build software with you.",
  },
  {
    id: "brian",
    name: "Brian",
    accent: "British",
    gender: "Male",
    vibe: "Calm, thoughtful & narrative British cadence for deep engineering sessions",
    previewText: "Hello there. I'm Brian. Let's take a calm, methodical look at your application architecture.",
  },
  {
    id: "george",
    name: "George",
    accent: "American",
    gender: "Male",
    vibe: "Warm, raspy & expressive conversational voice with lively inflection",
    previewText: "Hey! George here. Ready to dive into the codebase and make some great progress today.",
  },

  // Female Voices
  {
    id: "rachel",
    name: "Rachel",
    accent: "American",
    gender: "Female",
    vibe: "Calm, compassionate & deeply empathetic tone for attentive problem-solving",
    previewText: "Hi, I'm Rachel. I'm here to listen, solve tough problems, and work through every detail with you.",
  },
  {
    id: "charlotte",
    name: "Charlotte",
    accent: "British",
    gender: "Female",
    vibe: "Crisp, elegant & articulate British cadence with natural pacing",
    previewText: "Hello! I'm Charlotte. Let's build something extraordinary and keep our code pristine.",
  },
  {
    id: "nicole",
    name: "Nicole",
    accent: "American",
    gender: "Female",
    vibe: "Soft, gentle & caring conversational voice with natural micro-pauses",
    previewText: "Hey, I'm Nicole. Take your time—we're in this together, and I'm ready whenever you are.",
  },
];

const SPEED_OPTIONS = [
  { value: "slow", label: "Slow", rate: "-15%" },
  { value: "normal", label: "Normal", rate: "+0%" },
  { value: "fast", label: "Fast", rate: "+15%" },
];

export default function SettingsPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  const [selectedVoice, setSelectedVoice] = useState("adam");
  const [speed, setSpeed] = useState<"slow" | "normal" | "fast">("normal");
  const [voiceFilter, setVoiceFilter] = useState<"all" | "male" | "female">("all");
  const [saved, setSaved] = useState(false);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);

  const cancelPreviewRef = useRef<(() => void) | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [user, loading, router]);

  useEffect(() => {
    const stored = localStorage.getItem("vyrexo_voice");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.voice) {
          // Normalize legacy voice ids if present
          if (parsed.voice === "ava") setSelectedVoice("rachel");
          else if (parsed.voice === "ryan") setSelectedVoice("brian");
          else if (parsed.voice === "sonia") setSelectedVoice("charlotte");
          else setSelectedVoice(parsed.voice);
        }
        if (parsed.speed) setSpeed(parsed.speed);
      } catch {}
    }
  }, []);

  // Clean up any preview audio on unmount
  useEffect(() => {
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      cancelPreviewRef.current?.();
      cancelHumanizedSpeech();
    };
  }, []);

  const handlePreview = async (voiceId: string, previewScript: string) => {
    if (previewingVoice === voiceId) {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      cancelPreviewRef.current?.();
      cancelHumanizedSpeech();
      setPreviewingVoice(null);
      return;
    }

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    cancelPreviewRef.current?.();
    cancelHumanizedSpeech();
    setPreviewingVoice(voiceId);

    try {
      const res = await fetch("/api/voice/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: previewScript,
          voice: voiceId,
          emotion: "warm",
          speed,
        }),
      });

      if (res.ok && res.headers.get("Content-Type")?.includes("audio")) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        currentAudioRef.current = audio;

        audio.onended = () => {
          URL.revokeObjectURL(url);
          currentAudioRef.current = null;
          setPreviewingVoice(null);
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          currentAudioRef.current = null;
          setPreviewingVoice(null);
        };

        await audio.play();
        return;
      }
    } catch {
      // Fall through to browser speech synthesis
    }

    const settings: VoiceSettings = {
      voice: voiceId,
      speed,
      emotion: "warm",
    };

    cancelPreviewRef.current = speakHumanizedText(previewScript, settings, {
      onEnd: () => setPreviewingVoice(null),
      onError: () => setPreviewingVoice(null),
    });
  };

  const handleSave = () => {
    localStorage.setItem(
      "vyrexo_voice",
      JSON.stringify({ voice: selectedVoice, speed, emotion: "auto" })
    );
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading || !user) return null;

  return (
    <div
      className="min-h-screen"
      style={{
        background: "radial-gradient(ellipse at center, var(--app-grad-from) 0%, var(--app-grad-to) 65%)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-4">
          <a
            href="/"
            className="text-lg font-bold"
            style={{
              background: "linear-gradient(135deg, #3B5998, #7B93B0, #C0C8D4)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Vyrexo
          </a>
          <span className="text-[var(--muted)] text-sm">/</span>
          <span className="text-sm text-[var(--text3)]">Voice Settings</span>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border2)] bg-[var(--surface)] text-xs font-medium text-[var(--muted2)] hover:text-red-500 hover:border-red-500/40 hover:bg-red-500/10 transition-all cursor-pointer shadow-sm"
            title="Sign out of your account"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="opacity-75 flex-shrink-0"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Sign out</span>
          </button>
          <ThemeToggle />
          <a
            href="/app"
            className="text-xs font-medium text-[var(--muted2)] hover:text-[var(--text)] transition-colors"
          >
            Back to app
          </a>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Top Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text)]">Voice Settings</h1>
            <p className="text-sm text-[var(--muted2)] mt-1 max-w-xl leading-relaxed">
              Choose Rex&apos;s vocal identity. Emotional cadence, tone, and inflection adapt automatically in real time
              based on your conversation.
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-medium flex-shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Emotion Adaptation Active</span>
          </div>
        </div>

        {/* ── AUTONOMOUS EMOTION STATUS BANNER ── */}
        <div className="mt-6 p-4 rounded-xl border border-[#3B599833] bg-[#3B599812] backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 border border-indigo-500/30 flex items-center justify-center text-lg flex-shrink-0">
              🎙️
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text)]">
                  Autonomous Emotional Awareness Engine Active
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  ElevenLabs Primary • Gemini TTS Fallback
                </span>
              </div>
              <div className="text-[11.5px] text-[var(--muted2)] mt-1 leading-relaxed">
                Rex automatically senses your mood: shifting to excited enthusiasm when you celebrate a win, deep empathy and calm support when you&apos;re frustrated or sharing a personal concern, and focused clarity during complex system design. Powered continuously by ElevenLabs with instant automated fallback to Gemini API TTS if monthly credits are exceeded.
              </div>
            </div>
          </div>
        </div>

        {/* ── VOICE LIBRARY (6 VOICES) ── */}
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-[var(--text3)] uppercase tracking-wider">
              Voice Library
            </label>
            <span className="text-xs text-[var(--muted)]">6 curated voices (3 male, 3 female)</span>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mt-3 mb-4">
            {(
              [
                { id: "all", label: "All Voices (6)" },
                { id: "male", label: "Male (3)" },
                { id: "female", label: "Female (3)" },
              ] as const
            ).map((filter) => (
              <button
                key={filter.id}
                onClick={() => setVoiceFilter(filter.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  voiceFilter === filter.id
                    ? "bg-[var(--steel)] text-white shadow-sm"
                    : "bg-[var(--surface)] border border-[var(--border2)] text-[var(--muted2)] hover:border-[var(--muted)]"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Voice Cards */}
          <div className="flex flex-col gap-3">
            {VOICE_OPTIONS.filter((voice) => {
              if (voiceFilter === "male") return voice.gender === "Male";
              if (voiceFilter === "female") return voice.gender === "Female";
              return true;
            }).map((voice) => {
              const isSelected = selectedVoice === voice.id;
              const isPlaying = previewingVoice === voice.id;

              return (
                <div
                  key={voice.id}
                  onClick={() => setSelectedVoice(voice.id)}
                  className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "border-[var(--steel)] bg-[#3B59981A] ring-1 ring-[var(--steel)]"
                      : "border-[var(--border2)] bg-[var(--surface)] hover:border-[var(--muted)]"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    {/* Audio preview button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(voice.id, voice.previewText);
                      }}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 cursor-pointer ${
                        isPlaying
                          ? "bg-[var(--steel)] text-white animate-pulse shadow-md"
                          : "bg-[var(--border)] border border-[var(--border2)] text-[var(--muted2)] hover:text-[var(--steel)] hover:border-[var(--steel)]"
                      }`}
                      title={`Listen to ${voice.name}`}
                    >
                      {isPlaying ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <rect x="6" y="5" width="4" height="14" rx="1" />
                          <rect x="14" y="5" width="4" height="14" rx="1" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="6 4 20 12 6 20 6 4" />
                        </svg>
                      )}
                    </button>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[var(--text)]">{voice.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-[var(--border)] text-[var(--muted2)] border border-[var(--border2)]">
                          {voice.gender}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-[#3B59981A] text-[var(--steel)] border border-[var(--steel)]/30">
                          {voice.accent}
                        </span>
                      </div>
                      <div className="text-xs text-[var(--muted)] mt-1">{voice.vibe}</div>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="flex items-center gap-1.5 text-xs text-[var(--steel)] flex-shrink-0 font-medium">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Selected</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── SPEAKING CADENCE (SPEED) ── */}
        <div className="mt-8">
          <label className="text-xs font-medium text-[var(--text3)] uppercase tracking-wider block mb-2">
            Speaking Cadence
          </label>
          <div className="flex gap-2">
            {SPEED_OPTIONS.map((s) => (
              <button
                key={s.value}
                onClick={() => setSpeed(s.value as any)}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  speed === s.value
                    ? "bg-[var(--midnight)] text-white shadow-sm"
                    : "bg-[var(--surface)] border border-[var(--border2)] text-[var(--muted2)] hover:border-[var(--muted)]"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── SAVE BUTTON ── */}
        <div className="mt-8 flex items-center gap-3">
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-[var(--midnight)] text-white text-sm font-medium rounded-lg hover:bg-[var(--steel)] transition-all cursor-pointer shadow-sm"
          >
            Save Settings
          </button>
          {saved && (
            <span className="text-xs text-[#4ade80]">
              Settings saved! Rex will use your chosen voice and adapt his emotional tone automatically.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
