"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

// The 5 curated voices (must match backend CURATED_VOICES / VOICE_PRESETS keys).
const VOICE_OPTIONS = [
  { id: "andrew", name: "Andrew", accent: "American", gender: "Male", vibe: "Warm & conversational" },
  { id: "ava", name: "Ava", accent: "American", gender: "Female", vibe: "Friendly & natural" },
  { id: "brian", name: "Brian", accent: "American", gender: "Male", vibe: "Casual & upbeat" },
  { id: "sonia", name: "Sonia", accent: "British", gender: "Female", vibe: "Crisp & clear" },
  { id: "ryan", name: "Ryan", accent: "British", gender: "Male", vibe: "Calm & steady" },
];

const SPEED_OPTIONS = [
  { value: "slow", label: "Slow", rate: "-15%" },
  { value: "normal", label: "Normal", rate: "+0%" },
  { value: "fast", label: "Fast", rate: "+15%" },
];

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [selectedVoice, setSelectedVoice] = useState("andrew");
  const [speed, setSpeed] = useState("normal");
  const [saved, setSaved] = useState(false);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [user, loading, router]);

  useEffect(() => {
    const stored = localStorage.getItem("vyrexo_voice");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Map any legacy accent_gender key to a curated voice if possible.
        if (VOICE_OPTIONS.some((v) => v.id === parsed.voice)) setSelectedVoice(parsed.voice);
        setSpeed(parsed.speed || "normal");
      } catch {}
    }
  }, []);

  // Stop any preview audio on unmount.
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const rateForSpeed = (s: string) => SPEED_OPTIONS.find((o) => o.value === s)?.rate || "+0%";

  const handlePreview = async (voiceId: string) => {
    // Stop a previous preview if one is playing.
    audioRef.current?.pause();
    setPreviewing(voiceId);
    try {
      const url = `/api/voice/preview?voice=${encodeURIComponent(voiceId)}&rate=${encodeURIComponent(rateForSpeed(speed))}`;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setPreviewing((p) => (p === voiceId ? null : p));
      audio.onerror = () => setPreviewing((p) => (p === voiceId ? null : p));
      await audio.play();
    } catch {
      setPreviewing(null);
    }
  };

  const handleSave = () => {
    localStorage.setItem("vyrexo_voice", JSON.stringify({ voice: selectedVoice, speed }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
          <span className="text-sm text-[var(--text3)]">Voice Settings</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <a href="/app" className="text-xs text-[var(--muted)] hover:text-[var(--steel)] transition-colors">Back to app</a>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-xl font-semibold text-[var(--text)]">Voice Settings</h1>
        <p className="text-sm text-[var(--muted2)] mt-1">Pick how Rex sounds during your day-to-day coding. Hit play to hear the real voice.</p>

        {/* Speed */}
        <div className="mt-8">
          <label className="text-xs font-medium text-[var(--text3)] uppercase tracking-wider">Speaking speed</label>
          <div className="flex gap-2 mt-3">
            {SPEED_OPTIONS.map((s) => (
              <button
                key={s.value}
                onClick={() => setSpeed(s.value)}
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

        {/* Voice selection */}
        <div className="mt-8">
          <label className="text-xs font-medium text-[var(--text3)] uppercase tracking-wider">Voice</label>
          <div className="mt-3 flex flex-col gap-3">
            {VOICE_OPTIONS.map((voice) => {
              const isSelected = selectedVoice === voice.id;
              const isPlaying = previewing === voice.id;
              return (
                <div
                  key={voice.id}
                  onClick={() => setSelectedVoice(voice.id)}
                  className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected ? "border-[var(--steel)] bg-[#3B59981A]" : "border-[var(--border2)] bg-[var(--surface)] hover:border-[var(--muted)]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Preview button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handlePreview(voice.id); }}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                        isPlaying
                          ? "bg-[var(--steel)] text-white"
                          : "bg-[var(--border)] border border-[var(--border2)] text-[var(--muted2)] hover:text-[var(--steel)] hover:border-[var(--steel)]"
                      }`}
                      title={`Preview ${voice.name}`}
                    >
                      {isPlaying ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4" /></svg>
                      )}
                    </button>
                    <div>
                      <div className="text-sm font-medium text-[var(--text2)]">
                        {voice.name} <span className="text-[var(--muted)] font-normal">· {voice.accent} {voice.gender}</span>
                      </div>
                      <div className="text-xs text-[var(--muted)] mt-0.5">{voice.vibe}</div>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="flex items-center gap-1 text-[11px] text-[var(--steel)] flex-shrink-0">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
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
            className="px-6 py-2.5 bg-[var(--midnight)] text-white text-sm font-medium rounded-lg hover:bg-[var(--steel)] transition-all"
          >
            Save Settings
          </button>
          {saved && <span className="text-xs text-[#4ade80]">Saved! Rex will use this voice.</span>}
        </div>
      </div>
    </div>
  );
}
