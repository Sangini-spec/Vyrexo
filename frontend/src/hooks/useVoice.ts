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
 * Voice hook with wake word "Rex" detection.
 *
 * Flow:
 * 1. User says "Rex" (or "Hey Rex", "OK Rex", etc.) → activates
 * 2. Conversation mode: all speech goes to backend until explicitly ended
 * 3. User says "goodbye Rex" or clicks orb → deactivates back to wake word mode
 */
export function useVoice({ onTranscript, onActivated, onDeactivated }: UseVoiceOptions) {
  const [mode, setMode] = useState<VoiceMode>("idle");
  const [hasPermission, setHasPermission] = useState(false);
  const recognitionRef = useRef<any>(null);
  const modeRef = useRef<VoiceMode>("idle");

  // Keep ref in sync with state for use in callbacks
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const createRecognition = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error("Speech Recognition API not available");
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    return recognition;
  }, []);

  const startListening = useCallback(async () => {
    // Request mic permission
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop()); // Release immediately, Speech API handles its own stream
      setHasPermission(true);
    } catch {
      console.error("Microphone permission denied");
      setHasPermission(false);
      return;
    }

    const recognition = createRecognition();
    if (!recognition) return;

    recognition.onresult = (event: any) => {
      let finalText = "";
      let interimText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += text;
        } else {
          interimText += text;
        }
      }

      const currentMode = modeRef.current;
      const spoken = (finalText || interimText).toLowerCase();

      if (currentMode === "waiting_for_wake") {
        // Looking for "Rex" in speech
        if (spoken.includes(WAKE_WORD)) {
          // Extract command after wake word
          const afterWake = spoken.split(WAKE_WORD).slice(1).join(" ").trim();
          setMode("active_conversation");
          modeRef.current = "active_conversation";
          onActivated();

          if (afterWake && finalText) {
            onTranscript(afterWake, true);
          } else if (afterWake) {
            onTranscript(afterWake, false);
          }
        }
      } else if (currentMode === "active_conversation") {
        // In conversation mode — forward everything
        // Check for deactivation phrases
        if (spoken.includes("goodbye rex") || spoken.includes("bye rex") || spoken.includes("stop listening")) {
          setMode("waiting_for_wake");
          modeRef.current = "waiting_for_wake";
          onDeactivated();
          return;
        }

        if (finalText) {
          onTranscript(finalText.trim(), true);
        } else if (interimText) {
          onTranscript(interimText.trim(), false);
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech error:", event.error);
      if (event.error !== "no-speech" && event.error !== "aborted") {
        // Restart on recoverable errors
        setTimeout(() => {
          try { recognition.start(); } catch {}
        }, 500);
      }
    };

    recognition.onend = () => {
      // Auto-restart to keep listening
      if (modeRef.current !== "idle") {
        setTimeout(() => {
          try { recognition.start(); } catch {}
        }, 100);
      }
    };

    recognitionRef.current = recognition;
    setMode("waiting_for_wake");
    modeRef.current = "waiting_for_wake";

    try {
      recognition.start();
    } catch {}
  }, [createRecognition, onTranscript, onActivated, onDeactivated]);

  const stopListening = useCallback(() => {
    setMode("idle");
    modeRef.current = "idle";
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
  }, []);

  // Force activate (click orb or space bar) — skip wake word
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
    } else if (modeRef.current === "active_conversation") {
      // Already active — toggle off
      setMode("waiting_for_wake");
      modeRef.current = "waiting_for_wake";
      onDeactivated();
    }
  }, [startListening, onActivated, onDeactivated]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
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
