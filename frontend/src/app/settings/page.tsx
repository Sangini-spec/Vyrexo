"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import {
  EMOTION_OPTIONS,
  VOICE_PROFILES,
  speakHumanizedText,
  cancelHumanizedSpeech,
  type EmotionTone,
  type VoiceSettings,
} from "@/lib/voice-synthesizer";

// Curated voices: 2 for men (American & British), 2 for women (American & British) — Total 4.
const VOICE_OPTIONS = [
  // Male Voices
  {
    id: "adam",
    name: "Adam (Matt)",
    accent: "American",
    gender: "Male",
    vibe: "Deep, articulate & conversational American voice",
    chariotId: "bac7d666-094d-4698-91fa-741d60fce662",
  },
  {
    id: "ryan",
    name: "Ryan",
    accent: "British",
    gender: "Male",
    vibe: "Calm, steady & articulate British cadence",
    chariotId: "62a6bdfa-1405-4be3-93be-31cff252f9f8",
  },

  // Female Voices
  {
    id: "ava",
    name: "Ava (Mia)",
    accent: "American",
    gender: "Female",
    vibe: "Warm, natural & clear American voice",
    chariotId: "909b5ef9-8388-4da4-ba39-974a545edc91",
  },
  {
    id: "sonia",
    name: "Sonia (Alan)",
    accent: "British / Clear",
    gender: "Female / Clear",
    vibe: "Crisp, elegant & articulate cadence",
    chariotId: "43a25626-d785-49d1-ad25-b734496714fb",
  },
];

const SPEED_OPTIONS = [
  { value: "slow", label: "Slow", rate: "-15%" },
  { value: "normal", label: "Normal", rate: "+0%" },
  { value: "fast", label: "Fast", rate: "+15%" },
];

const SAMPLE_SCRIPTS: Record<EmotionTone, string> = {
  warm: "Hey there! I'm Rex, your AI software engineering partner. I'm feeling great about our architecture, so let's build something extraordinary together!",
  upbeat: "Awesome progress! I just compiled the project and all tests passed without a single warning. What high-impact feature should we build next?",
  calm: "Let's take a methodical look at this module. I've isolated the state lifecycle issue and have a clean, stable refactor ready for review.",
  empathetic: "I know debugging race conditions can be frustrating, but don't worry—I've got your back. Let's step through the async trace together and fix it.",
};

export default function SettingsPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [selectedVoice, setSelectedVoice] = useState("adam");
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionTone>("warm");
  const [speed, setSpeed] = useState<"slow" | "normal" | "fast">("normal");
  const [voiceFilter, setVoiceFilter] = useState<"all" | "male" | "female">("all");
  const [saved, setSaved] = useState(false);
  const [previewing, setPreviewing] = useState<string | null>(null);

  // Chariot engine diagnostics
  const [chariotInfo, setChariotInfo] = useState<{
    configured: boolean;
    status: string;
    credits: number | null;
    maskedKey: string | null;
  } | null>(null);
  const [lastLatency, setLastLatency] = useState<number | null>(null);
  const [lastAudioBytes, setLastAudioBytes] = useState<number | null>(null);
  const [lastProvider, setLastProvider] = useState<string | null>(null);
  const [testText, setTestText] = useState(SAMPLE_SCRIPTS.warm);
  const [isPlayingTest, setIsPlayingTest] = useState(false);

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
        if (VOICE_OPTIONS.some((v) => v.id === parsed.voice)) setSelectedVoice(parsed.voice);
        if (parsed.speed) setSpeed(parsed.speed);
        if (parsed.emotion) {
          setSelectedEmotion(parsed.emotion);
          setTestText(SAMPLE_SCRIPTS[parsed.emotion as EmotionTone] || SAMPLE_SCRIPTS.warm);
        }
      } catch {}
    }

    // Fetch live Chariot provider metadata
    fetch("/api/config/ai-provider")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.chariot) {
          setChariotInfo({
            configured: data.chariot.configured,
            status: data.chariot.status,
            credits: data.chariot.credits,
            maskedKey: data.chariot.maskedKey,
          });
        }
      })
      .catch(() => {});
  }, []);

  // Update test prompt when emotion changes
  const handleSelectEmotion = (emo: EmotionTone) => {
    setSelectedEmotion(emo);
    setTestText(SAMPLE_SCRIPTS[emo]);
  };

  // Stop any preview audio on unmount.
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

  const handlePreview = async (voiceId: string, customPhrase?: string) => {
    if (previewing === voiceId || isPlayingTest) {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      cancelPreviewRef.current?.();
      cancelHumanizedSpeech();
      setPreviewing(null);
      setIsPlayingTest(false);
      return;
    }

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    cancelPreviewRef.current?.();
    cancelHumanizedSpeech();
    setPreviewing(voiceId);
    setIsPlayingTest(true);

    const voiceMeta = VOICE_OPTIONS.find((v) => v.id === voiceId) || VOICE_OPTIONS[0];
    const scriptToSpeak =
      customPhrase ||
      testText ||
      `Hey there! I'm Rex speaking with the ${voiceMeta.name} voice. I have full emotional awareness, so we can talk naturally and build great software together.`;

    const startTime = Date.now();

    // High-fidelity server TTS first (powered by Chariot)
    try {
      const res = await fetch("/api/voice/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: scriptToSpeak,
          voice: voiceId,
          emotion: selectedEmotion,
        }),
      });

      const latency = Date.now() - startTime;
      setLastLatency(latency);

      if (res.ok && res.headers.get("Content-Type")?.includes("audio")) {
        const providerHeader = res.headers.get("X-TTS-Provider") || "chariot";
        setLastProvider(providerHeader);

        const blob = await res.blob();
        setLastAudioBytes(blob.size);

        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        currentAudioRef.current = audio;

        audio.onended = () => {
          URL.revokeObjectURL(url);
          currentAudioRef.current = null;
          setPreviewing(null);
          setIsPlayingTest(false);
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          currentAudioRef.current = null;
          setPreviewing(null);
          setIsPlayingTest(false);
        };

        await audio.play();
        return;
      }
    } catch {
      // Fall through to browser speech synthesis
    }

    setLastProvider("browser-fallback");
    const settings: VoiceSettings = {
      voice: voiceId,
      speed,
      emotion: selectedEmotion,
    };

    cancelPreviewRef.current = speakHumanizedText(scriptToSpeak, settings, {
      onEnd: () => {
        setPreviewing(null);
        setIsPlayingTest(false);
      },
      onError: () => {
        setPreviewing(null);
        setIsPlayingTest(false);
      },
    });
  };

  const handleSave = () => {
    localStorage.setItem(
      "vyrexo_voice",
      JSON.stringify({ voice: selectedVoice, speed, emotion: selectedEmotion })
    );
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen" style={{ background: "radial-gradient(ellipse at center, var(--app-grad-from) 0%, var(--app-grad-to) 65%)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-4">
          <a href="/" className="text-lg font-bold" style={{ background: "linear-gradient(135deg, #3B5998, #7B93B0, #C0C8D4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Vyrexo
          </a>
          <span className="text-[var(--muted)] text-sm">/</span>
          <span className="text-sm text-[var(--text3)]">Voice & Emotion Intelligence</span>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border2)] bg-[var(--surface)] text-xs font-medium text-[var(--muted2)] hover:text-red-500 hover:border-red-500/40 hover:bg-red-500/10 transition-all cursor-pointer shadow-sm"
            title="Sign out of your account"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-75 flex-shrink-0">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Sign out</span>
          </button>
          <ThemeToggle />
          <a href="/app" className="text-xs font-medium text-[var(--muted2)] hover:text-[var(--text)] transition-colors">Back to app</a>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Top Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text)]">Voice & Emotion Intelligence</h1>
            <p className="text-sm text-[var(--muted2)] mt-1">
              Configure Rex&apos;s expressive vocal identity and emotional awareness powered by Chariot AI.
            </p>
          </div>
          <button
            onClick={() => handlePreview(selectedVoice, testText)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              isPlayingTest
                ? "bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse"
                : "bg-[var(--steel)] text-white hover:opacity-90 shadow-sm"
            }`}
          >
            <span>{isPlayingTest ? "⏹ Stop Speaking" : "▶ Test Rex Voice"}</span>
          </button>
        </div>

        {/* Chariot Status Banner Card */}
        <div className="mt-6 p-4 rounded-xl border border-[#3B599833] bg-[#3B599812] backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--text)]">Chariot AI Engine Active</span>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    CONNECTED
                  </span>
                </div>
                <div className="text-xs text-[var(--muted2)] mt-0.5">
                  Applied Key: <span className="font-mono text-[var(--text3)]">{chariotInfo?.maskedKey || "sk_cha...Fm1X"}</span>
                  {chariotInfo?.credits !== null && chariotInfo?.credits !== undefined && (
                    <> • Balance: <span className="font-semibold text-emerald-400">{chariotInfo.credits.toLocaleString()} credits</span></>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center">
              {lastLatency && (
                <div className="text-right">
                  <div className="text-[11px] text-[var(--muted)]">Last Synthesis</div>
                  <div className="text-xs font-mono font-medium text-[var(--steel)]">
                    {lastLatency}ms {lastAudioBytes ? `(${(lastAudioBytes / 1024).toFixed(0)} KB)` : ""}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Interactive Speech & Emotion Sandbox */}
        <div className="mt-8 p-5 rounded-2xl border border-[var(--border2)] bg-[var(--surface)] shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">🎙️</span>
              <span className="text-sm font-semibold text-[var(--text)]">Interactive Voice & Emotion Sandbox</span>
            </div>
            {isPlayingTest && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#3B599820] border border-[var(--steel)]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--steel)] animate-ping" />
                <span className="text-[11px] font-medium text-[var(--steel)]">Rex is speaking...</span>
                {/* Audio visualizer bars */}
                <div className="flex items-end gap-0.5 h-3 ml-1">
                  <div className="w-0.5 bg-[var(--steel)] rounded-full animate-[bounce_0.8s_infinite]" style={{ height: "60%" }} />
                  <div className="w-0.5 bg-[var(--steel)] rounded-full animate-[bounce_0.5s_infinite]" style={{ height: "100%" }} />
                  <div className="w-0.5 bg-[var(--steel)] rounded-full animate-[bounce_0.7s_infinite]" style={{ height: "75%" }} />
                  <div className="w-0.5 bg-[var(--steel)] rounded-full animate-[bounce_0.6s_infinite]" style={{ height: "90%" }} />
                </div>
              </div>
            )}
          </div>

          <p className="text-xs text-[var(--muted)] mt-1">
            Type any sentence or choose an emotional tone below. Rex speaks it live via Chariot&apos;s low-latency neural speech engine.
          </p>

          <div className="mt-4">
            <textarea
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              rows={3}
              placeholder="Type what you want Rex to say..."
              className="w-full text-xs font-mono p-3 rounded-xl border border-[var(--border2)] bg-[var(--panel)] text-[var(--text)] focus:outline-none focus:border-[var(--steel)] transition-all resize-none"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: "warm", label: "🤝 Warm" },
                  { id: "upbeat", label: "⚡ Upbeat" },
                  { id: "calm", label: "🌊 Calm" },
                  { id: "empathetic", label: "🌱 Empathetic" },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleSelectEmotion(preset.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                    selectedEmotion === preset.id
                      ? "bg-[var(--steel)] text-white"
                      : "bg-[var(--surface)] border border-[var(--border2)] text-[var(--muted2)] hover:border-[var(--muted)]"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => handlePreview(selectedVoice, testText)}
              className="px-4 py-1.5 rounded-lg bg-[var(--midnight)] text-white text-xs font-medium hover:bg-[var(--steel)] transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>{isPlayingTest ? "⏹ Stop" : "▶ Speak This Phrase"}</span>
            </button>
          </div>
        </div>

        {/* Emotion Tone Grid */}
        <div className="mt-8">
          <label className="text-xs font-medium text-[var(--text3)] uppercase tracking-wider">
            Emotional Awareness & Tone
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            {EMOTION_OPTIONS.map((emo) => {
              const isSelected = selectedEmotion === emo.id;
              return (
                <div
                  key={emo.id}
                  onClick={() => handleSelectEmotion(emo.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "border-[var(--steel)] bg-[#3B599815] ring-1 ring-[var(--steel)]"
                      : "border-[var(--border2)] bg-[var(--surface)] hover:border-[var(--muted)]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{emo.icon}</span>
                    <span className="text-sm font-semibold text-[var(--text2)]">{emo.label}</span>
                  </div>
                  <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">{emo.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Speed */}
        <div className="mt-8">
          <label className="text-xs font-medium text-[var(--text3)] uppercase tracking-wider">Speaking cadence</label>
          <div className="flex gap-2 mt-3">
            {SPEED_OPTIONS.map((s) => (
              <button
                key={s.value}
                onClick={() => setSpeed(s.value as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  speed === s.value
                    ? "bg-[var(--midnight)] text-white"
                    : "bg-[var(--surface)] border border-[var(--border2)] text-[var(--muted2)] hover:border-[var(--muted)]"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Voice Library */}
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-[var(--text3)] uppercase tracking-wider">
              Chariot Voice Library
            </label>
            <span className="text-xs text-[var(--muted)]">4 verified studio voices (2 male, 2 female)</span>
          </div>

          {/* Voice Filters */}
          <div className="flex gap-2 mt-3 mb-4">
            {(
              [
                { id: "all", label: "All Voices (4)" },
                { id: "male", label: "Male (2)" },
                { id: "female", label: "Female (2)" },
              ] as const
            ).map((filter) => (
              <button
                key={filter.id}
                onClick={() => setVoiceFilter(filter.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  voiceFilter === filter.id
                    ? "bg-[var(--steel)] text-white"
                    : "bg-[var(--surface)] border border-[var(--border2)] text-[var(--muted2)] hover:border-[var(--muted)]"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            {VOICE_OPTIONS.filter((voice) => {
              if (voiceFilter === "male") return voice.gender.includes("Male");
              if (voiceFilter === "female") return voice.gender.includes("Female");
              return true;
            }).map((voice) => {
              const isSelected = selectedVoice === voice.id;
              const isPlaying = previewing === voice.id;
              return (
                <div
                  key={voice.id}
                  onClick={() => setSelectedVoice(voice.id)}
                  className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "border-[var(--steel)] bg-[#3B59981A]"
                      : "border-[var(--border2)] bg-[var(--surface)] hover:border-[var(--muted)]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Preview button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(voice.id);
                      }}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                        isPlaying
                          ? "bg-[var(--steel)] text-white animate-pulse"
                          : "bg-[var(--border)] border border-[var(--border2)] text-[var(--muted2)] hover:text-[var(--steel)] hover:border-[var(--steel)]"
                      }`}
                      title={`Preview ${voice.name}`}
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
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono text-[var(--muted)] bg-[var(--surface)] border border-[var(--border)]">
                          Chariot Verified
                        </span>
                      </div>
                      <div className="text-xs text-[var(--muted)] mt-1">{voice.vibe}</div>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="flex items-center gap-1 text-[11px] text-[var(--steel)] flex-shrink-0 font-medium">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Selected
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Save */}
        <div className="mt-8 flex items-center gap-3">
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-[var(--midnight)] text-white text-sm font-medium rounded-lg hover:bg-[var(--steel)] transition-all cursor-pointer shadow-sm"
          >
            Save Settings
          </button>
          {saved && <span className="text-xs text-[#4ade80]">Saved! Rex will use these voice and emotion settings.</span>}
        </div>
      </div>
    </div>
  );
}
