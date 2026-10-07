"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Lock, Eye, EyeOff } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import Link from "next/link";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setCheckingSession(false);
      return;
    }

    // Check if recovery session is active or event is PASSWORD_RECOVERY
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCheckingSession(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          setError("");
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!isSupabaseConfigured) {
      setError("Supabase is not configured yet.");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => {
        router.push("/app");
      }, 2500);
    } catch (err: any) {
      setError(err?.message || "Failed to reset password. Please request a new link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-screen flex-col bg-[var(--bg)] text-[var(--text)]">
      <div className="flex items-center justify-between px-6 py-5 sm:px-10 border-b border-[var(--border2)]">
        <Link
          href="/auth"
          className="flex items-center gap-1.5 text-sm text-[var(--muted2)] transition-colors hover:text-[var(--text)]"
        >
          <ArrowLeft size={16} /> Back to Sign In
        </Link>
        <ThemeToggle />
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px] rounded-2xl border border-[var(--border2)] bg-[var(--surface)] p-8 shadow-2xl backdrop-blur-md">
          {success ? (
            <div className="text-center py-4">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-[var(--text)]">Password Reset Complete</h2>
              <p className="mt-3 text-sm text-[var(--muted2)] leading-relaxed">
                Your password has been successfully updated. Redirecting you to the Vyrexo workspace…
              </p>
              <div className="mt-6">
                <Link
                  href="/app"
                  className="inline-flex w-full items-center justify-center rounded-lg bg-[var(--midnight)] py-3 text-sm font-semibold text-white transition-all hover:bg-[var(--steel)]"
                >
                  Enter Workspace
                </Link>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: "linear-gradient(135deg, #3B5998, #7B93B0)" }}
                >
                  <Lock size={20} className="text-white" />
                </span>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">Set New Password</h1>
                  <p className="text-xs text-[var(--muted2)]">Enter your new secure password below</p>
                </div>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted2)] mb-1.5 font-mono">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      required
                      minLength={6}
                      className="w-full rounded-lg border border-[var(--border2)] bg-[var(--input)] py-3 pl-9 pr-10 text-sm text-[var(--text)] placeholder:text-[var(--muted)] outline-none transition-colors focus:border-[var(--steel)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted2)] mb-1.5 font-mono">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-type new password"
                      required
                      minLength={6}
                      className="w-full rounded-lg border border-[var(--border2)] bg-[var(--input)] py-3 pl-9 pr-10 text-sm text-[var(--text)] placeholder:text-[var(--muted)] outline-none transition-colors focus:border-[var(--steel)]"
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg border border-red-400/20 bg-red-400/10 px-3.5 py-2.5 text-xs text-red-400 leading-relaxed">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-[var(--midnight)] py-3 text-sm font-semibold text-white transition-all hover:bg-[var(--steel)] disabled:opacity-50 cursor-pointer shadow-md mt-2"
                >
                  {loading ? "Updating Password…" : "Save New Password"}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  href="/auth"
                  className="text-xs font-medium text-[var(--steel)] hover:text-[var(--ice)] hover:underline"
                >
                  Remembered your password? Sign in
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
