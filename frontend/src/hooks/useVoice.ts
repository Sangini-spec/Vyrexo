"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const WAKE_WORD = "rex";

export type VoiceMode = "waiting_for_wake" | "active_conversation" | "idle";

interface UseVoiceOptions {
  onTranscript: (text: string, isFinal: boolean) => void;
  onActivated: () => void;
  onDeactivated: () => void;
}

/**
 * Voice hook with wake-word "Rex" detection and resilient continuous listening.
 *
 * Web Speech API stops by itself after silence and sometimes fails to restart
 * cleanly. This hook keeps a watchdog so recognition is restarted whenever it
 * dies, as long as the mode is not "idle". Once the user says "Rex" anywhere
 * in their speech, we switch to active conversation mode and forward
 * everything (interim AND final) to the parent. Saying "goodbye rex" or
 * "stop listening" deactivates back to wake-word mode.
 */
export function useVoice({ onTranscript, onActivated, onDeactivated }: UseVoiceOptions) {
  const [mode, setMode] = useState<VoiceMode>("idle");
  const [hasPermission, setHasPermission] = useState(false);
  const recognitionRef = useRef<any>(null);
  const modeRef = useRef<VoiceMode>("idle");
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Latch so we don't fire onTranscript twice for the same final string when
  // SpeechRecognition emits stale results on restart.
  const lastEmittedFinalRef = useRef<string>("");
  // Track when we forwarded an interim transcript that already contained the wake word
  // so we don't re-activate on every interim refinement.
  const activatedThisUtteranceRef = useRef<boolean>(false);

  // Keep ref in sync with state for use in callbacks
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const stripWake = (text: string): string => {
    const lower = text.toLowerCase();
    const idx = lower.lastIndexOf(WAKE_WORD);
    if (idx < 0) return text.trim();
    // Skip past the wake word and any common filler punctuation/spaces
    return text.slice(idx + WAKE_WORD.length).replace(/^[\s,.;:!?-]+/, "").trim();
  };

  const buildRecognition = useCallback(() => {
    const SpeechRecognition: any =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("[voice] SpeechRecognition not available in this browser");
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += t;
        } else {
          interimText += t;
        }
      }

      const currentMode = modeRef.current;
      const spokenInterim = interimText.toLowerCase();
      const spokenFinal = finalText.toLowerCase();

      if (currentMode === "waiting_for_wake") {
        // Try to catch the wake word as early as possible — interim first, then final
        const triggerSource = spokenInterim.includes(WAKE_WORD)
          ? interimText
          : spokenFinal.includes(WAKE_WORD)
          ? finalText
          : "";

        if (triggerSource) {
          setMode("active_conversation");
          modeRef.current = "active_conversation";
          activatedThisUtteranceRef.current = true;
          onActivated();

          const command = stripWake(triggerSource);
          if (command) {
            // If we got it from the final, finalize the transcript
            onTranscript(command, Boolean(spokenFinal && spokenFinal.includes(WAKE_WORD)));
          }
          // Wait for the next event for the rest of the utterance
        }
        return;
      }

      if (currentMode === "active_conversation") {
        // Deactivation phrases
        const deactivate =
          spokenFinal.includes("goodbye rex") ||
          spokenFinal.includes("bye rex") ||
          spokenFinal.includes("stop listening") ||
          spokenInterim.includes("goodbye rex");
        if (deactivate) {
          setMode("waiting_for_wake");
          modeRef.current = "waiting_for_wake";
          activatedThisUtteranceRef.current = false;
          lastEmittedFinalRef.current = "";
          onDeactivated();
          return;
        }

        if (finalText) {
          const trimmed = finalText.trim();
          if (trimmed && trimmed !== lastEmittedFinalRef.current) {
            lastEmittedFinalRef.current = trimmed;
            onTranscript(trimmed, true);
          }
          activatedThisUtteranceRef.current = false;
        } else if (interimText) {
          // Surface interim text for live transcript display only
          onTranscript(interimText.trim(), false);
        }
      }
    };

    recognition.onerror = (event: any) => {
      const err = event?.error || "";
      if (err === "not-allowed" || err === "service-not-allowed") {
        // User denied mic permission — surface and stop trying
        console.warn("[voice] microphone permission denied");
        setHasPermission(false);
        modeRef.current = "idle";
        setMode("idle");
        return;
      }
      // For all other errors (no-speech, audio-capture, aborted, network) we
      // just let onend fire and the watchdog will restart.
      console.debug("[voice] recognition error:", err);
    };

    recognition.onend = () => {
      // If we are still supposed to be listening, restart on the next tick.
      // Web Speech stops automatically after silence, and we want continuous mode.
      if (modeRef.current !== "idle") {
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        restartTimerRef.current = setTimeout(() => {
          const r = recognitionRef.current;
          if (!r || modeRef.current === "idle") return;
          try {
            r.start();
          } catch (e: any) {
            // "already started" can happen on Chrome — just ignore
            if (!String(e?.message || e).toLowerCase().includes("already started")) {
              console.debug("[voice] restart error:", e);
            }
          }
        }, 250);
      }
    };

    return recognition;
  }, [onTranscript, onActivated, onDeactivated]);

  const startListening = useCallback(async () => {
    if (recognitionRef.current && modeRef.current !== "idle") {
      // Already running
      return;
    }

    // Request mic permission first so the user sees the browser prompt
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // We don't need the stream itself — Web Speech holds its own. Just release it.
      stream.getTracks().forEach((t) => t.stop());
      setHasPermission(true);
    } catch {
      console.warn("[voice] mic permission denied");
      setHasPermission(false);
      return;
    }

    const recognition = buildRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;
    setMode("waiting_for_wake");
    modeRef.current = "waiting_for_wake";

    try {
      recognition.start();
    } catch (e) {
      console.debug("[voice] initial start error:", e);
    }
  }, [buildRecognition]);

  const stopListening = useCallback(() => {
    modeRef.current = "idle";
    setMode("idle");
    activatedThisUtteranceRef.current = false;
    lastEmittedFinalRef.current = "";
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
  }, []);

  /**
   * Manual push-to-talk: force the system into active conversation
   * (skipping wake-word detection). Useful for clicking the orb or
   * holding Space.
   */
  const forceActivate = useCallback(() => {
    if (modeRef.current === "idle") {
      startListening().then(() => {
        setMode("active_conversation");
        modeRef.current = "active_conversation";
        onActivated();
      });
    } else if (modeRef.current === "waiting_for_wake") {
      setMode("active_conversation");
      modeRef.current = "active_conversation";
      onActivated();
    } else {
      // Already active — toggle back to wake-word mode
      setMode("waiting_for_wake");
      modeRef.current = "waiting_for_wake";
      onDeactivated();
    }
  }, [startListening, onActivated, onDeactivated]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  return {
    mode,
    hasPermission,
    startListening,
    stopListening,
    forceActivate,
  };
}
