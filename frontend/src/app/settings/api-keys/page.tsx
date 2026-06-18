"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

const PROVIDERS = [
  { id: "ollama", label: "Ollama (local)" },
  { id: "groq", label: "Groq" },
  { id: "gemini", label: "Google Gemini" },
  { id: "openrouter", label: "OpenRouter" },
  { id: "openai", label: "OpenAI / compatible" },
];

interface KeyStatus {
  keys: Record<string, string>;
  openai_base_url: string;
  llm_provider: string;
  chat_provider: string;
  model_heavy: string;
  model_light: string;
  chat_model: string;
}

const KEY_FIELDS: { field: string; label: string; help: string }[] = [
  { field: "groq_api_key", label: "Groq API key", help: "console.groq.com — fast hosted chat" },
  { field: "gemini_api_key", label: "Gemini API key", help: "aistudio.google.com" },
  { field: "openrouter_api_key", label: "OpenRouter API key", help: "openrouter.ai" },
  { field: "openai_api_key", label: "OpenAI / compatible key", help: "for OpenAI or any OpenAI-compatible endpoint" },
  { field: "tavily_api_key", label: "Tavily key (web search)", help: "optional — sharper live web results; Rex uses free DuckDuckGo without it" },
];

export default function ApiKeysPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [status, setStatus] = useState<KeyStatus | null>(null);
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [provider, setProvider] = useState("ollama");
  const [chatProvider, setChatProvider] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [modelHeavy, setModelHeavy] = useState("");
  const [modelLight, setModelLight] = useState("");
  const [chatModel, setChatModel] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [user, loading, router]);

  useEffect(() => {
    fetch("/api/settings/keys")
      .then((r) => r.json())
      .then((d: KeyStatus) => {
        setStatus(d);
        setProvider(d.llm_provider || "ollama");
        setChatProvider(d.chat_provider || "");
        setBaseUrl(d.openai_base_url || "");
        setModelHeavy(d.model_heavy || "");
        setModelLight(d.model_light || "");
        setChatModel(d.chat_model || "");
      })
      .catch(() => setError("Couldn't reach the backend. Is it running?"));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    const body: Record<string, string> = {
      llm_provider: provider,
      chat_provider: chatProvider,
      openai_base_url: baseUrl,
      model_heavy: modelHeavy,
      model_light: modelLight,
      chat_model: chatModel,
    };
    // Only send keys the user actually typed (leave masked ones untouched).
    for (const { field } of KEY_FIELDS) {
      if (keyInputs[field]?.trim()) body[field] = keyInputs[field].trim();
    }
    try {
      const res = await fetch("/api/settings/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok || d.ok === false) throw new Error(d.error || "Save failed");
      setStatus(d);
      setKeyInputs({});
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
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
          <span className="text-sm text-[var(--text3)]">API Keys</span>
        </div>
        <div className="flex items-center gap-3">
          <a href="/settings" className="text-xs text-[var(--muted)] hover:text-[var(--steel)] transition-colors">Voice Settings</a>
          <ThemeToggle />
          <a href="/app" className="text-xs text-[var(--muted)] hover:text-[var(--steel)] transition-colors">Back to app</a>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-xl font-semibold text-[var(--text)]">API Keys &amp; Providers</h1>
        <p className="text-sm text-[var(--muted2)] mt-1">
          Set the models Rex uses. Keys are saved to your local <code className="text-[var(--text3)]">.env</code> and applied immediately — no restart needed.
        </p>

        {/* Provider selection */}
        <div className="mt-8 grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-[var(--text3)] uppercase tracking-wider">Coding model provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="mt-2 w-full bg-[var(--input)] border border-[var(--border2)] rounded-lg px-3 py-2 text-sm text-[var(--text2)] outline-none focus:border-[var(--steel)]"
            >
              {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--text3)] uppercase tracking-wider">Chat / voice provider</label>
            <select
              value={chatProvider}
              onChange={(e) => setChatProvider(e.target.value)}
              className="mt-2 w-full bg-[var(--input)] border border-[var(--border2)] rounded-lg px-3 py-2 text-sm text-[var(--text2)] outline-none focus:border-[var(--steel)]"
            >
              <option value="">Same as coding</option>
              {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
        </div>

        {/* API keys */}
        <div className="mt-8">
          <label className="text-xs font-medium text-[var(--text3)] uppercase tracking-wider">Provider keys</label>
          <div className="mt-3 flex flex-col gap-4">
            {KEY_FIELDS.map(({ field, label, help }) => {
              const hint = status?.keys?.[field];
              return (
                <div key={field}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text2)]">{label}</span>
                    {hint ? (
                      <span className="text-[11px] text-[#4ade80]">saved · {hint}</span>
                    ) : (
                      <span className="text-[11px] text-[var(--muted)]">not set</span>
                    )}
                  </div>
                  <input
                    type="password"
                    autoComplete="off"
                    value={keyInputs[field] || ""}
                    onChange={(e) => setKeyInputs((p) => ({ ...p, [field]: e.target.value }))}
                    placeholder={hint ? "Enter a new key to replace" : "Paste your key"}
                    className="mt-1.5 w-full bg-[var(--input)] border border-[var(--border2)] rounded-lg px-3 py-2 text-sm text-[var(--text2)] outline-none focus:border-[var(--steel)] placeholder:text-[var(--muted)]"
                  />
                  <p className="text-[11px] text-[var(--muted)] mt-1">{help}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Advanced: base url + models */}
        <div className="mt-8">
          <label className="text-xs font-medium text-[var(--text3)] uppercase tracking-wider">Models &amp; endpoint</label>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <span className="text-xs text-[var(--muted2)]">OpenAI-compatible base URL (Ollama / OpenRouter / custom)</span>
              <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="http://localhost:11434/v1" className="mt-1.5 w-full bg-[var(--input)] border border-[var(--border2)] rounded-lg px-3 py-2 text-sm text-[var(--text2)] outline-none focus:border-[var(--steel)] placeholder:text-[var(--muted)]" />
            </div>
            <div>
              <span className="text-xs text-[var(--muted2)]">Heavy model</span>
              <input value={modelHeavy} onChange={(e) => setModelHeavy(e.target.value)} placeholder="qwen3:8b" className="mt-1.5 w-full bg-[var(--input)] border border-[var(--border2)] rounded-lg px-3 py-2 text-sm text-[var(--text2)] outline-none focus:border-[var(--steel)] placeholder:text-[var(--muted)]" />
            </div>
            <div>
              <span className="text-xs text-[var(--muted2)]">Light model</span>
              <input value={modelLight} onChange={(e) => setModelLight(e.target.value)} placeholder="qwen3:8b" className="mt-1.5 w-full bg-[var(--input)] border border-[var(--border2)] rounded-lg px-3 py-2 text-sm text-[var(--text2)] outline-none focus:border-[var(--steel)] placeholder:text-[var(--muted)]" />
            </div>
            <div className="col-span-2">
              <span className="text-xs text-[var(--muted2)]">Chat model (fast conversational)</span>
              <input value={chatModel} onChange={(e) => setChatModel(e.target.value)} placeholder="llama-3.3-70b-versatile" className="mt-1.5 w-full bg-[var(--input)] border border-[var(--border2)] rounded-lg px-3 py-2 text-sm text-[var(--text2)] outline-none focus:border-[var(--steel)] placeholder:text-[var(--muted)]" />
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="mt-8 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-[var(--midnight)] text-white text-sm font-medium rounded-lg hover:bg-[var(--steel)] transition-all disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Keys"}
          </button>
          {saved && <span className="text-xs text-[#4ade80]">Saved &amp; applied live.</span>}
          {error && <span className="text-xs text-[#f87171]">{error}</span>}
        </div>
      </div>
    </div>
  );
}
