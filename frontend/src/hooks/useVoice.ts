"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const WAKE_PATTERNS = [
  /\b(hello|hey|hi|ok|okay|oh|yo|sup|dear)\s+rex\b/i,
  /\bhello\s+rex\b/i,
  /\bhey\s+rex\b/i,
  /\bhi\s+rex\b/i,
  /\bok\s+rex\b/i,
  /\boh\s+rex\b/i,
  /\brex\b/i,
];

const INTERRUPT_PATTERNS = [
  /\bstop\b/i,
  /\bwait\b/i,
  /\bpause\b/i,
  /\binterrupt\b/i,
  /\bhold\s+on\b/i,
  /\bshut\s+up\b/i,
  /\bhush\b/i,
  /\bcancel\b/i,
  /\bstop\s+talking\b/i,
  /\bquiet\b/i,
  /\benough\b/i,
  /\bshush\b/i,
  /\bsilence\b/i,
  /\bnever\s*mind\b/i,
];

export type VoiceMode = "waiting_for_wake" | "active_conversation" | "idle";
export type MicPermissionStatus = "prompt" | "granted" | "denied" | "unsupported";

interface UseVoiceOptions {
  onTranscript: (text: string, isFinal: boolean) => void;
  onActivated: () => void;
  onDeactivated: () => void;
  onInterrupt?: () => void;
  isAiSpeaking?: boolean;
}

/**
 * Enterprise voice hook with:
 * 1. Web Speech API (webkitSpeechRecognition) primary streaming engine
 * 2. MediaRecorder + Gemini Flash (/api/voice/transcribe) automatic fallback
 * 3. Real-time audio level analyzer (0-100) for instant visual feedback
 * 4. Transparent permission tracking and friendly recovery
 * 5. Wake-word ("Hello Rex", "Hey Rex", "Rex") and acoustic echo isolation
 */
export function useVoice({
  onTranscript,
  onActivated,
  onDeactivated,
  onInterrupt,
  isAiSpeaking = false,
}: UseVoiceOptions) {
  const [mode, setMode] = useState<VoiceMode>("idle");
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [permissionStatus, setPermissionStatus] = useState<MicPermissionStatus>("prompt");
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [lastError, setLastError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const modeRef = useRef<VoiceMode>("idle");
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEmittedFinalRef = useRef<string>("");
  const pendingInterimRef = useRef<string>("");
  const accumulatedTurnRef = useRef<string>("");
  const turnSilenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activatedThisUtteranceRef = useRef<boolean>(false);
  const lastActivityRef = useRef<number>(0);
  const restartRef = useRef<(fresh?: boolean) => void>(() => {});
  const isAiSpeakingRef = useRef(isAiSpeaking);
  const lastAiSpeechEndTimeRef = useRef<number>(0);
  const wasAiSpeakingRef = useRef<boolean>(isAiSpeaking);

  // Audio Stream & Analyser references
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Fallback MediaRecorder references
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const isTranscribingRef = useRef<boolean>(false);
  const fallbackSilenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackSpeakingDetectedRef = useRef<boolean>(false);
  const useServerFallbackRef = useRef<boolean>(false);
  const commitFallbackAudioRef = useRef<() => void>(() => {});
  const resetActiveInactivityTimerRef = useRef<() => void>(() => {});

  const ECHO_COOLDOWN_MS = 2500;

  useEffect(() => {
    if (isAiSpeaking) {
      // AI just started speaking -> instantly wipe any accumulated mic buffers
      // so speech heard from the room or speakers cannot leak into user turns
      accumulatedTurnRef.current = "";
      pendingInterimRef.current = "";
      lastEmittedFinalRef.current = "";
      if (turnSilenceTimerRef.current) {
        clearTimeout(turnSilenceTimerRef.current);
        turnSilenceTimerRef.current = null;
      }
    } else if (wasAiSpeakingRef.current && !isAiSpeaking) {
      // AI finished speaking -> start echo cooldown and wipe buffers again
      lastAiSpeechEndTimeRef.current = Date.now();
      accumulatedTurnRef.current = "";
      pendingInterimRef.current = "";
      lastEmittedFinalRef.current = "";
      if (turnSilenceTimerRef.current) {
        clearTimeout(turnSilenceTimerRef.current);
        turnSilenceTimerRef.current = null;
      }
      resetActiveInactivityTimerRef.current();
    }
    wasAiSpeakingRef.current = isAiSpeaking;
    isAiSpeakingRef.current = isAiSpeaking;
  }, [isAiSpeaking]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // Check initial browser permission state if supported
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPermissionStatus("unsupported");
      return;
    }

    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: "microphone" as any })
        .then((res) => {
          if (res.state === "granted") {
            setHasPermission(true);
            setPermissionStatus("granted");
          } else if (res.state === "denied") {
            setHasPermission(false);
            setPermissionStatus("denied");
          } else {
            setPermissionStatus("prompt");
          }
          res.onchange = () => {
            if (res.state === "granted") {
              setHasPermission(true);
              setPermissionStatus("granted");
            } else if (res.state === "denied") {
              setHasPermission(false);
              setPermissionStatus("denied");
            } else {
              setPermissionStatus("prompt");
            }
          };
        })
        .catch(() => {
          // Permissions query not supported for mic in this browser, default to prompt
          setPermissionStatus("prompt");
        });
    }
  }, []);

  const stripWake = (text: string): string => {
    let cleaned = text;
    for (const pattern of WAKE_PATTERNS) {
      cleaned = cleaned.replace(pattern, "");
    }
    cleaned = cleaned.replace(/^[\s,.;:!?-]+/, "").replace(/[\s,.;:!?-]+$/, "").trim();
    if (/^(oh|uh|um|ah|yo|so|well)$/i.test(cleaned)) {
      return "";
    }
    return cleaned;
  };

  const matchWakeWord = (text: string): boolean => {
    return WAKE_PATTERNS.some((p) => p.test(text));
  };

  const matchInterrupt = (text: string): boolean => {
    return INTERRUPT_PATTERNS.some((p) => p.test(text));
  };

  // ── Audio Level Analyzer Setup ──────────────────────────────────
  const setupAudioMeter = useCallback((stream: MediaStream) => {
    try {
      if (audioContextRef.current) {
        try { audioContextRef.current.close(); } catch {}
        audioContextRef.current = null;
      }
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));

        setAudioLevel(normalized);

        // Fallback voice activity detection
        if (useServerFallbackRef.current && modeRef.current !== "idle" && !isAiSpeakingRef.current) {
          if (normalized > 14) {
            fallbackSpeakingDetectedRef.current = true;
            if (fallbackSilenceTimerRef.current) {
              clearTimeout(fallbackSilenceTimerRef.current);
              fallbackSilenceTimerRef.current = null;
            }
          } else if (fallbackSpeakingDetectedRef.current && normalized <= 8) {
            if (!fallbackSilenceTimerRef.current) {
              fallbackSilenceTimerRef.current = setTimeout(() => {
                fallbackSpeakingDetectedRef.current = false;
                commitFallbackAudioRef.current();
              }, 1200);
            }
          }
        }

        animFrameRef.current = requestAnimationFrame(checkLevel);
      };

      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(checkLevel);
    } catch (err) {
      console.warn("[voice] audio meter setup warning:", err);
    }
  }, []);

  // ── Server-side Gemini Audio Transcription Fallback ────────────
  const commitFallbackAudio = useCallback(async () => {
    if (isTranscribingRef.current || recordedChunksRef.current.length === 0) return;
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    try {
      isTranscribingRef.current = true;
      const chunks = [...recordedChunksRef.current];
      recordedChunksRef.current = [];

      const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
      if (blob.size < 2000) {
        isTranscribingRef.current = false;
        return;
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64 = reader.result as string;
          const res = await fetch("/api/voice/transcribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audio: base64, mimeType: blob.type }),
          });
          const data = await res.json();
          const transcript = (data.text || "").trim();

          if (transcript) {
            if (modeRef.current === "waiting_for_wake") {
              if (matchWakeWord(transcript)) {
                setMode("active_conversation");
                modeRef.current = "active_conversation";
                onActivated();
                const cmd = stripWake(transcript);
                if (cmd) onTranscript(cmd, true);
              }
            } else if (modeRef.current === "active_conversation") {
              onTranscript(transcript, true);
            }
          }
        } catch (e) {
          console.debug("[voice] fallback transcribe error:", e);
        } finally {
          isTranscribingRef.current = false;
        }
      };
      reader.readAsDataURL(blob);
    } catch {
      isTranscribingRef.current = false;
    }
  }, [onTranscript, onActivated]);

  useEffect(() => {
    commitFallbackAudioRef.current = commitFallbackAudio;
  }, [commitFallbackAudio]);

  const startFallbackRecorder = useCallback((stream: MediaStream) => {
    if (typeof MediaRecorder === "undefined") return;
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      recordedChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
          // Keep a rolling buffer of latest 12 seconds
          if (recordedChunksRef.current.length > 30) {
            recordedChunksRef.current = recordedChunksRef.current.slice(-25);
          }
        }
      };

      recorder.start(400); // 400ms slices
      mediaRecorderRef.current = recorder;
    } catch (e) {
      console.warn("[voice] mediaRecorder init warning:", e);
    }
  }, []);

  // ── Web Speech API Recognition Builder ──────────────────────────
  const buildRecognition = useCallback(() => {
    const SpeechRecognition: any =
      typeof window !== "undefined"
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      console.warn("[voice] SpeechRecognition not natively available; enabling server fallback");
      useServerFallbackRef.current = true;
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      lastActivityRef.current = Date.now();
      setLastError(null);
    };
    recognition.onaudiostart = () => {
      lastActivityRef.current = Date.now();
    };
    recognition.onspeechstart = () => {
      lastActivityRef.current = Date.now();
    };

    recognition.onresult = (event: any) => {
      lastActivityRef.current = Date.now();
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
      const speaking = isAiSpeakingRef.current;
      const now = Date.now();
      const inEchoCooldown = now - lastAiSpeechEndTimeRef.current < ECHO_COOLDOWN_MS;

      // Acoustic isolation & intelligent barge-in:
      // While Rex is speaking or during the trailing echo drain window,
      // the microphone hears Rex's voice coming out of the computer speakers.
      // We MUST isolate and suppress this so the agent never talks to itself.
      if (speaking || inEchoCooldown) {
        const isInterrupt = matchInterrupt(spokenFinal) || matchInterrupt(spokenInterim);
        const hasExplicitWake = /\b(hey|hello|hi|ok|okay)\s+rex\b/i.test(spokenFinal || spokenInterim);

        if (isInterrupt) {
          onInterrupt?.();
          lastAiSpeechEndTimeRef.current = 0;
          accumulatedTurnRef.current = "";
          pendingInterimRef.current = "";
          lastEmittedFinalRef.current = "";
        } else if (hasExplicitWake) {
          onInterrupt?.();
          lastAiSpeechEndTimeRef.current = 0;
          setMode("active_conversation");
          modeRef.current = "active_conversation";
          const command = stripWake(spokenFinal || spokenInterim);
          if (command && command.trim().length > 1) {
            onTranscript(command, Boolean(spokenFinal));
          }
        }
        // Discard any acoustic spill from Rex speaking
        accumulatedTurnRef.current = "";
        pendingInterimRef.current = "";
        return;
      }

      if (currentMode === "waiting_for_wake") {
        const hasWake = matchWakeWord(spokenInterim) || matchWakeWord(spokenFinal);
        const triggerSource = spokenInterim || spokenFinal;

        if (hasWake) {
          setMode("active_conversation");
          modeRef.current = "active_conversation";
          activatedThisUtteranceRef.current = true;
          onActivated();
          resetActiveInactivityTimerRef.current();

          const command = stripWake(triggerSource);
          accumulatedTurnRef.current = command;
          if (command) {
            onTranscript(command, false);

            if (turnSilenceTimerRef.current) {
              clearTimeout(turnSilenceTimerRef.current);
            }
            turnSilenceTimerRef.current = setTimeout(() => {
              if (modeRef.current !== "active_conversation" || isAiSpeakingRef.current) return;
              const fullText = accumulatedTurnRef.current.trim();
              if (fullText && fullText.length > 1) {
                accumulatedTurnRef.current = "";
                onTranscript(fullText, true);
              }
            }, 6500);
          }
        }
        return;
      }

      if (currentMode === "active_conversation") {
        resetActiveInactivityTimerRef.current();

        // 1. Check deactivation phrases
        const deactivate =
          spokenFinal.includes("goodbye rex") ||
          spokenFinal.includes("bye rex") ||
          spokenFinal.includes("stop listening") ||
          spokenInterim.includes("goodbye rex");

        if (deactivate) {
          if (turnSilenceTimerRef.current) {
            clearTimeout(turnSilenceTimerRef.current);
            turnSilenceTimerRef.current = null;
          }
          accumulatedTurnRef.current = "";
          pendingInterimRef.current = "";
          setMode("waiting_for_wake");
          modeRef.current = "waiting_for_wake";
          activatedThisUtteranceRef.current = false;
          lastEmittedFinalRef.current = "";
          onDeactivated();
          return;
        }

        // 2. Check instant stop phrases ("stop", "wait", "hold on", "quiet", "cancel")
        const isImmediateStop = matchInterrupt(spokenFinal) || matchInterrupt(spokenInterim);
        if (isImmediateStop) {
          if (turnSilenceTimerRef.current) {
            clearTimeout(turnSilenceTimerRef.current);
            turnSilenceTimerRef.current = null;
          }
          accumulatedTurnRef.current = "";
          pendingInterimRef.current = "";
          lastEmittedFinalRef.current = "";
          onInterrupt?.();
          onTranscript("stop", true);
          return;
        }

        // 3. Accumulate spoken text across pauses (does not cut user off!)
        if (finalText) {
          const trimmedFinal = stripWake(finalText).trim();
          if (trimmedFinal) {
            const acc = accumulatedTurnRef.current.trim();
            if (!acc) {
              accumulatedTurnRef.current = trimmedFinal;
            } else if (trimmedFinal.toLowerCase().startsWith(acc.toLowerCase())) {
              accumulatedTurnRef.current = trimmedFinal;
            } else if (acc.toLowerCase().endsWith(trimmedFinal.toLowerCase())) {
              // already included in accumulator
            } else {
              accumulatedTurnRef.current = `${acc} ${trimmedFinal}`.trim();
            }
          }
        }

        const cleanInterim = stripWake(interimText).trim();
        const combinedLive = (
          accumulatedTurnRef.current + (cleanInterim ? " " + cleanInterim : "")
        ).trim();

        if (combinedLive) {
          onTranscript(combinedLive, false);
        }

        // 4. Extended Pause & Silence Management (6.5 to 7.5 seconds)
        if (turnSilenceTimerRef.current) {
          clearTimeout(turnSilenceTimerRef.current);
          turnSilenceTimerRef.current = null;
        }

        const lowerLive = combinedLive.toLowerCase();
        // Detect conversational fillers ("um", "uh", "ah", "er", "hmm", "like") or mid-sentence connectives ("or", "and", "so", "with", "only")
        const endsWithFillerOrConnector =
          /\b(um|uh|ah|er|erm|hmm|like|and|or|so|with|for|to|but|because|that|selling|buying|only|also|then|as well as|in|on|at|of)\s*$/i.test(
            lowerLive
          ) ||
          /^(um|uh|ah|er|hmm|like|and|or|so)\b/i.test(lowerLive);

        // Allow 6.5s of pause, extended to 7.5s if ending in filler or connector
        const PAUSE_DURATION_MS = endsWithFillerOrConnector ? 7500 : 6500;

        if (combinedLive.length > 0) {
          turnSilenceTimerRef.current = setTimeout(() => {
            if (modeRef.current !== "active_conversation" || isAiSpeakingRef.current) return;
            const fullText = accumulatedTurnRef.current.trim() || combinedLive.trim();

            // Filter out standalone fillers or accidental room noises
            const cleanText = fullText
              .replace(/\b(um|uh|ah|er|erm|hmm)\b/gi, "")
              .replace(/\s+/g, " ")
              .trim();

            if (cleanText.length > 1 && !/^(or|and|so|but|um|uh|ah|er|hmm)$/i.test(cleanText)) {
              accumulatedTurnRef.current = "";
              pendingInterimRef.current = "";
              lastEmittedFinalRef.current = "";
              onTranscript(cleanText, true);
            } else {
              // Only filler words detected; discard and keep listening
              accumulatedTurnRef.current = "";
              pendingInterimRef.current = "";
            }
          }, PAUSE_DURATION_MS);
        }
      }
    };

    recognition.onerror = (event: any) => {
      const err = event?.error || "";
      // Ignore normal silence events in the room
      if (err === "no-speech") {
        return;
      }

      if (err === "not-allowed" || err === "service-not-allowed") {
        console.warn("[voice] microphone permission denied in recognition");
        setHasPermission(false);
        setPermissionStatus("denied");
        setLastError("permission_denied");
        modeRef.current = "idle";
        setMode("idle");
        return;
      }

      // Network or internal recognition failure -> activate fallback recorder
      if (err === "network" || err === "aborted") {
        console.warn("[voice] speech recognition network issue, falling back to server audio");
        useServerFallbackRef.current = true;
        return;
      }

      console.debug("[voice] recognition error:", err);
      setLastError(err);
    };

    recognition.onend = () => {
      if (modeRef.current !== "idle") {
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        restartTimerRef.current = setTimeout(() => restartRef.current(false), 250);
      }
    };

    return recognition;
  }, [onTranscript, onActivated, onDeactivated, onInterrupt]);

  const startRecognition = useCallback((fresh = false) => {
    if (modeRef.current === "idle") return;

    if (fresh || !recognitionRef.current) {
      const old = recognitionRef.current;
      if (old) {
        try {
          old.onend = null;
          (old.abort || old.stop)?.call(old);
        } catch {}
      }
      recognitionRef.current = buildRecognition();
    }
    const r = recognitionRef.current;
    if (!r) return;

    try {
      r.start();
      lastActivityRef.current = Date.now();
    } catch (e: any) {
      if (String(e?.message || e).toLowerCase().includes("already started")) return;
      try {
        recognitionRef.current = buildRecognition();
        recognitionRef.current?.start();
        lastActivityRef.current = Date.now();
      } catch {}
    }
  }, [buildRecognition]);

  useEffect(() => {
    restartRef.current = startRecognition;
  }, [startRecognition]);

  // Request / ensure live microphone media stream
  const ensureMediaStream = useCallback(async (): Promise<MediaStream | null> => {
    if (mediaStreamRef.current && mediaStreamRef.current.active) {
      return mediaStreamRef.current;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;
      setHasPermission(true);
      setPermissionStatus("granted");
      setLastError(null);

      // Start audio meter
      setupAudioMeter(stream);

      // Prepare fallback recorder
      startFallbackRecorder(stream);

      return stream;
    } catch (err: any) {
      console.warn("[voice] getUserMedia error:", err);
      const isDenied =
        err?.name === "NotAllowedError" ||
        err?.name === "PermissionDeniedError" ||
        err?.name === "SecurityError";

      if (isDenied) {
        setHasPermission(false);
        setPermissionStatus("denied");
        setLastError("permission_denied");
      } else {
        setLastError(err?.message || "Failed to access microphone");
      }
      return null;
    }
  }, [setupAudioMeter, startFallbackRecorder]);

  // Explicit user-driven permission requester
  const requestPermission = useCallback(async (): Promise<boolean> => {
    const stream = await ensureMediaStream();
    if (stream) {
      setHasPermission(true);
      setPermissionStatus("granted");
      return true;
    }
    return false;
  }, [ensureMediaStream]);

  const activeInactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetActiveInactivityTimer = useCallback(() => {
    if (activeInactivityTimerRef.current) {
      clearTimeout(activeInactivityTimerRef.current);
      activeInactivityTimerRef.current = null;
    }
    if (modeRef.current === "active_conversation" && !isAiSpeakingRef.current) {
      activeInactivityTimerRef.current = setTimeout(() => {
        if (modeRef.current === "active_conversation" && !isAiSpeakingRef.current) {
          setMode("waiting_for_wake");
          modeRef.current = "waiting_for_wake";
          onDeactivated();
        }
      }, 45000);
    }
  }, [onDeactivated]);

  // Start listening immediately and hands-free
  const startListening = useCallback(
    (forceActive = false): boolean => {
      const targetMode: VoiceMode = forceActive ? "active_conversation" : "waiting_for_wake";
      setMode(targetMode);
      modeRef.current = targetMode;
      lastActivityRef.current = Date.now();

      if (forceActive) {
        onActivated();
        resetActiveInactivityTimer();
      }

      startRecognition(true);

      // Non-blocking stream acquisition for audio level meter
      if (typeof window !== "undefined" && Boolean(navigator?.mediaDevices?.getUserMedia)) {
        ensureMediaStream().catch((err) => {
          console.debug("[voice] non-blocking mediaStream init:", err);
        });
      }
      return true;
    },
    [ensureMediaStream, onActivated, resetActiveInactivityTimer, startRecognition]
  );

  useEffect(() => {
    resetActiveInactivityTimerRef.current = resetActiveInactivityTimer;
  }, [resetActiveInactivityTimer]);

  const stopListening = useCallback(() => {
    modeRef.current = "idle";
    setMode("idle");
    activatedThisUtteranceRef.current = false;
    lastEmittedFinalRef.current = "";

    if (activeInactivityTimerRef.current) {
      clearTimeout(activeInactivityTimerRef.current);
      activeInactivityTimerRef.current = null;
    }
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (silenceDebounceTimerRef.current) {
      clearTimeout(silenceDebounceTimerRef.current);
      silenceDebounceTimerRef.current = null;
    }
    if (turnSilenceTimerRef.current) {
      clearTimeout(turnSilenceTimerRef.current);
      turnSilenceTimerRef.current = null;
    }
    accumulatedTurnRef.current = "";
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    onDeactivated();
  }, [onDeactivated]);

  // Toggle push-to-talk or switch between wake & active
  const forceActivate = useCallback(() => {
    if (modeRef.current === "idle") {
      startListening(true);
    } else if (modeRef.current === "waiting_for_wake") {
      setMode("active_conversation");
      modeRef.current = "active_conversation";
      onActivated();
      resetActiveInactivityTimer();
    } else {
      if (activeInactivityTimerRef.current) {
        clearTimeout(activeInactivityTimerRef.current);
        activeInactivityTimerRef.current = null;
      }
      setMode("waiting_for_wake");
      modeRef.current = "waiting_for_wake";
      onDeactivated();
    }
  }, [startListening, onActivated, onDeactivated, resetActiveInactivityTimer]);

  // Toggle full microphone on/off
  const toggleMic = useCallback(async () => {
    if (modeRef.current === "idle") {
      await startListening(true);
    } else {
      stopListening();
    }
  }, [startListening, stopListening]);

  // Periodic heartbeat watchdog
  useEffect(() => {
    const id = setInterval(() => {
      if (modeRef.current === "idle") return;
      if (Date.now() - (lastActivityRef.current || 0) > 14000) {
        lastActivityRef.current = Date.now();
        restartRef.current(true);
      }
    }, 7000);

    const onVisible = () => {
      if (document.visibilityState === "visible" && modeRef.current !== "idle") {
        restartRef.current(false);
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (silenceDebounceTimerRef.current) clearTimeout(silenceDebounceTimerRef.current);
      if (turnSilenceTimerRef.current) clearTimeout(turnSilenceTimerRef.current);
      if (fallbackSilenceTimerRef.current) clearTimeout(fallbackSilenceTimerRef.current);

      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.stop();
        } catch {}
      }
      if (mediaStreamRef.current) {
        try {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        } catch {}
      }
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch {}
      }
    };
  }, []);

  return {
    mode,
    hasPermission,
    permissionStatus,
    audioLevel,
    lastError,
    requestPermission,
    startListening,
    stopListening,
    forceActivate,
    toggleMic,
  };
}
