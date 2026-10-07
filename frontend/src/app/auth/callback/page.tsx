"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      router.replace("/app");
      return;
    }

    // Supabase JS with detectSessionInUrl: true handles both hash fragments (#access_token=...)
    // and code query parameters (?code=...). We check getSession to verify session recovery.
    let mounted = true;

    async function handleAuthCallback() {
      try {
        // Handle PKCE auth code exchange if present in URL
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.warn("exchangeCodeForSession notice:", exchangeError.message);
          }
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) {
          throw error;
        }

        if (data.session) {
          router.replace("/app");
        } else {
          // If session is not immediately available, listen to auth state changes for a few seconds
          const { data: authListener } = supabase.auth.onAuthStateChange(
            (event, session) => {
              if (session && mounted) {
                authListener.subscription.unsubscribe();
                router.replace("/app");
              }
            }
          );

          // Fallback timeout in case no session is extracted
          setTimeout(() => {
            if (mounted) {
              authListener.subscription.unsubscribe();
              router.replace("/app");
            }
          }, 3000);
        }
      } catch (err: any) {
        if (mounted) {
          setErrorMsg(err?.message || "Failed to complete authentication.");
        }
      }
    }

    handleAuthCallback();

    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg)] px-6 text-[var(--text)]">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--border2)] bg-[var(--surface)] p-8 text-center shadow-xl">
        {errorMsg ? (
          <div>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400">
              <span className="text-xl font-bold">!</span>
            </div>
            <h2 className="text-lg font-semibold tracking-tight text-[var(--text)]">Authentication Notice</h2>
            <p className="mt-2 text-sm text-[var(--muted2)] leading-relaxed">{errorMsg}</p>
            <div className="mt-6">
              <Link
                href="/auth"
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--midnight)] px-4 py-2.5 text-xs font-semibold text-white transition-all hover:bg-[var(--steel)]"
              >
                <ArrowLeft size={14} /> Back to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-4">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--steel)]" />
            <p className="mt-4 text-sm font-medium text-[var(--text)]">Completing sign-in…</p>
            <p className="mt-1 text-xs text-[var(--muted2)]">Connecting your session to Vyrexo</p>
          </div>
        )}
      </div>
    </div>
  );
}
