"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const VOICE_OPTIONS = [
  { id: "american_male", label: "American Male", accent: "American", gender: "Male", preview: "Hi, I'm your coding assistant. Let's build something great." },
  { id: "american_female", label: "American Female", accent: "American", gender: "Female", preview: "Hi, I'm your coding assistant. Let's build something great." },
  { id: "british_male", label: "British Male", accent: "British", gender: "Male", preview: "Hello, I'm your coding assistant. Shall we begin?" },
  { id: "british_female", label: "British Female", accent: "British", gender: "Female", preview: "Hello, I'm your coding assistant. Shall we begin?" },
  { id: "indian_male", label: "Indian Male", accent: "Indian", gender: "Male", preview: "Hi, I'm your coding assistant. Let's get started." },
  { id: "indian_female", label: "Indian Female", accent: "Indian", gender: "Female", preview: "Hi, I'm your coding assistant. Let's get started." },
  { id: "australian_male", label: "Australian Male", accent: "Australian", gender: "Male", preview: "G'day, I'm your coding assistant. Ready when you are." },
  { id: "australian_female", label: "Australian Female", accent: "Australian", gender: "Female", preview: "G'day, I'm your coding assistant. Ready when you are." },
];

const SPEED_OPTIONS = [
  { value: "slow", label: "Slow", rate: 0.8 },
  { value: "normal", label: "Normal", rate: 1.0 },
  { value: "fast", label: "Fast", rate: 1.2 },
];

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [selectedVoice, setSelectedVoice] = useState("american_male");
  const [speed, setSpeed] = useState("normal");
  const [accentFilter, setAccentFilter] = useState("All");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [user, loading, router]);

  // Load saved settings
  useEffect(() => {
    const saved = localStorage.getItem("vyrexo_voice");
    if (saved) {
      const parsed = JSON.parse(saved);
      setSelectedVoice(parsed.voice || "american_male");
      setSpeed(parsed.speed || "normal");
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem("vyrexo_voice", JSON.stringify({ voice: selectedVoice, speed }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handlePreview = (voiceId: string) => {
    const voice = VOICE_OPTIONS.find((v) => v.id === voiceId);
    if (!voice) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(voice.preview);
    utterance.rate = SPEED_OPTIONS.find((s) => s.value === speed)?.rate || 1.0;

    // Try to match browser voice to selected accent
    const voices = window.speechSynthesis.getVoices();
    const lang = voice.accent === "British" ? "en-GB" : voice.accent === "Indian" ? "en-IN" : voice.accent === "Australian" ? "en-AU" : "en-US";
    const matchedVoice = voices.find((v) => v.lang.startsWith(lang));
    if (matchedVoice) utterance.voice = matchedVoice;

    window.speechSynthesis.speak(utterance);
  };

  const accents = ["All", ...new Set(VOICE_OPTIONS.map((v) => v.accent))];
  const filteredVoices = accentFilter === "All" ? VOICE_OPTIONS : VOICE_OPTIONS.filter((v) => v.accent === accentFilter);

  if (loading || !user) return null;

  return (
    <div className="min-h-screen" style={{ background: "radial-gradient(ellipse at center, #0a0e1a 0%, #07070a 65%)" }}>
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
        <a href="/" className="text-xs text-[var(--muted)] hover:text-[var(--steel)] transition-colors">
          Back to app
        </a>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-xl font-semibold text-[var(--text)]">Voice Settings</h1>
        <p className="text-sm text-[var(--muted2)] mt-1">Choose how Rex sounds when talking to you</p>

        {/* Speed */}
        <div className="mt-8">
          <label className="text-xs font-medium text-[var(--text3)] uppercase tracking-wider">Speed</label>
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

        {/* Accent filter */}
        <div className="mt-8">
          <label className="text-xs font-medium text-[var(--text3)] uppercase tracking-wider">Accent</label>
          <div className="flex gap-2 mt-3">
            {accents.map((a) => (
              <button
                key={a}
                onClick={() => setAccentFilter(a)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  accentFilter === a
                    ? "bg-[var(--midnight)] text-white"
                    : "bg-[var(--surface)] border border-[var(--border2)] text-[var(--muted2)] hover:border-[var(--muted)]"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Voice selection */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          {filteredVoices.map((voice) => (
            <div
              key={voice.id}
              onClick={() => setSelectedVoice(voice.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedVoice === voice.id
                  ? "border-[var(--steel)] bg-[#3B59981A]"
                  : "border-[var(--border2)] bg-[var(--surface)] hover:border-[var(--muted)]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-[var(--text2)]">{voice.label}</div>
                  <div className="text-xs text-[var(--muted)] mt-0.5">{voice.accent} &middot; {voice.gender}</div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handlePreview(voice.id); }}
                  className="w-8 h-8 rounded-full bg-[var(--border)] border border-[var(--border2)] flex items-center justify-center text-[var(--muted2)] hover:text-[var(--steel)] hover:border-[var(--steel)] transition-all"
                  title="Preview voice"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </button>
              </div>
              {selectedVoice === voice.id && (
                <div className="mt-2 flex items-center gap-1 text-[10px] text-[var(--steel)]">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  Selected
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Save */}
        <div className="mt-8 flex items-center gap-3">
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-[var(--midnight)] text-white text-sm font-medium rounded-lg hover:bg-[var(--steel)] transition-all"
          >
            Save Settings
          </button>
          {saved && <span className="text-xs text-[#4ade80]">Saved!</span>}
        </div>
      </div>
    </div>
  );
}
