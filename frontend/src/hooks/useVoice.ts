"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeSpokenTranscript } from "@/lib/speech-normalizer";
import {
  extractUserInterruptFromBuffer,
  isBareSilenceCommand,
  isBuildTerminationCommand,
} from "@/lib/project-spec";

const WAKE_PATTERNS = [
  /\b(hello|hey|hi|ok|okay|oh|yo|sup|dear)\s+(?:rex|rick'?s?|riks|lex|wrecks|rax|racks|regs|brex|dex|tex|alex|next|text|red|max|ex)\b/i,
  /\bhello\s+rex\b/i,
  /\bhey\s+rex\b/i,
  /\bhi\s+rex\b/i,
  /\bok\s+rex\b/i,
  /\boh\s+rex\b/i,
  /\brex\b/i,
  /^(?:rick|riks|rick's|lex|wrecks|rax|racks|regs|brex|dex|tex|alex)$/i,
];

const INTERRUPT_PATTERNS = [
  /\bstop\b/i,
  /\bstop\s+rex\b/i,
  /\brex\s+stop\b/i,
  /\bplease\s+stop\b/i,
  /\bpause\b/i,
  /\bpause\s+rex\b/i,
  /\brex\s+pause\b/i,
  /\bplease\s+pause\b/i,
  /\bwait\b/i,
  /\bwait\s+rex\b/i,
  /\binterrupt\b/i,
  /\bhold\s+on\b/i,
  /\bhang\s+on\b/i,
  /\bshut\s+up\b/i,
  /\bbe\s+quiet\b/i,
  /\bhush\b/i,
  /\bcancel\b/i,
  /\bwithdraw\b/i,
  /\babort\b/i,
  /\bterminate\b/i,
  /\bstop\s+talking\b/i,
  /\bstop\s+speaking\b/i,
  /\bstop\s+building\b/i,
  /\bstop\s+working\b/i,
  /\bdon'?t\s+build\b/i,
  /\bdon'?t\s+want\s+to\s+work\b/i,
  /\bquiet\b/i,
  /\benough\b/i,
  /\bshush\b/i,
  /\bsilence\b/i,
  /\bnever\s*mind\b/i,
];

const EXPLICIT_MULTIWORD_INTERRUPT_PATTERNS = [
  /^(?:(?:hey\s+rex|hi\s+rex|hello\s+rex|rex|ok|okay|no|please|yo)\s*,?\s*)*(stop|pause|please\s+stop|please\s+pause|wait|hold\s+on|hang\s+on|cancel|never\s*mind|nevermind|terminate|don'?t\s+build|do\s+not\s+build|i\s+don'?t\s+want\s+to\s+(?:work\s+on|build)|stop\s+working|withdraw|abort|listen\s+to\s+me|hear\s+me\s+out|shut\s+up|be\s+quiet)\b/i,
  /\b(stop\s+rex|pause\s+rex|rex\s+stop|rex\s+pause|please\s+stop|please\s+pause|can\s+you\s+(?:please\s+)?(?:stop|pause)|could\s+you\s+(?:please\s+)?(?:stop|pause)|stop\s+(building|coding|making|working|talking|speaking|it|that)|terminate\s+(the\s+)?(build|building|project|application)|don'?t\s+(build|make|create|work\s+on)\s+(it|that|this|the)|do\s+not\s+(build|make|create|work\s+on)|i\s+don'?t\s+want\s+to\s+work\s+on\s+this|cancel\s+(that|the|this|my)\s*(request|build|project|app|application)?|withdraw\s+(that|the|this|my)\s*(request|build|project)?|i\s+have\s+(something|more|another\s+thing)\s+(else\s+)?to\s+(add|say|mention)|let\s+me\s+(add|finish|speak|interrupt)|wait\s+a\s+(second|minute|moment)|hold\s+on\s+a\s+(second|minute|moment)|but\s+i\s+(think|want|feel|need|would|don'?t|mean|meant)|but\s+(what\s+about|what\s+if|can\s+you|could\s+you|let'?s|actually|wait|instead|rex)|actually\s+(i\s+think|i\s+want|let'?s|wait|stop|rex)|instead\s+(of\s+that|let'?s|i\s+want)|on\s+second\s+thought|change\s+of\s+plans)\b/i,
];

export type VoiceMode = "waiting_for_wake" | "active_conversation" | "idle";
export type MicPermissionStatus = "prompt" | "granted" | "denied" | "unsupported";

interface UseVoiceOptions {
  onTranscript: (text: string, isFinal: boolean) => void;
  onActivated: () => void;
  onDeactivated: () => void;
  onInterrupt?: () => void;
  onBackchannel?: (reason: "barge_in" | "listening_hum") => void;
  isSelfEcho?: (text: string) => boolean;
  isAiSpeaking?: boolean;
}

/**
 * Enterprise voice hook with:
 * 1. Web Speech API (webkitSpeechRecognition) primary streaming engine
 * 2. MediaRecorder + Gemini Flash (/api/voice/transcribe) automatic fallback
 * 3. Real-time audio level analyzer (0-100) for instant visual feedback
 * 4. Transparent permission tracking and friendly recovery
 * 5. Wake-word ("Hello Rex", "Hey Rex", "Rex"), phrase-independent barge-in, and acoustic echo isolation
 */
export function useVoice({
  onTranscript,
  onActivated,
  onDeactivated,
  onInterrupt,
  onBackchannel,
  isSelfEcho,
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
  const pendingWakeTriggerRef = useRef<boolean>(false);
  const activatedThisUtteranceRef = useRef<boolean>(false);
  const lastActivityRef = useRef<number>(0);
  const restartRef = useRef<(fresh?: boolean) => void>(() => {});
  const isAiSpeakingRef = useRef(isAiSpeaking);
  const lastAiSpeechEndTimeRef = useRef<number>(0);
  const wasAiSpeakingRef = useRef<boolean>(isAiSpeaking);
  const lastInterruptTimeRef = useRef<number>(0);
  const lastBackchannelHumTimeRef = useRef<number>(0);
  const onTranscriptRef = useRef(onTranscript);
  const onActivatedRef = useRef(onActivated);
  const onDeactivatedRef = useRef(onDeactivated);
  const onInterruptRef = useRef(onInterrupt);
  const onBackchannelRef = useRef(onBackchannel);
  const isSelfEchoRef = useRef(isSelfEcho);
  const bleedPrefixLengthRef = useRef<Record<number, number>>({});
  const resultInterruptedRef = useRef<Record<number, boolean>>({});
  const lastSeenResultLengthRef = useRef<Record<number, number>>({});

  const consumeCurrentRecognitionBuffer = useCallback(() => {
    for (const k of Object.keys(lastSeenResultLengthRef.current)) {
      const idx = Number(k);
      bleedPrefixLengthRef.current[idx] = lastSeenResultLengthRef.current[idx] || 0;
    }
    resultInterruptedRef.current = {};
    accumulatedTurnRef.current = "";
    pendingInterimRef.current = "";
    lastEmittedFinalRef.current = "";
    pendingWakeTriggerRef.current = false;
  }, []);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    onActivatedRef.current = onActivated;
  }, [onActivated]);

  useEffect(() => {
    onDeactivatedRef.current = onDeactivated;
  }, [onDeactivated]);

  useEffect(() => {
    onInterruptRef.current = onInterrupt;
  }, [onInterrupt]);

  useEffect(() => {
    onBackchannelRef.current = onBackchannel;
  }, [onBackchannel]);

  useEffect(() => {
    isSelfEchoRef.current = isSelfEcho;
  }, [isSelfEcho]);

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

  const ECHO_COOLDOWN_MS = 1400;

  useEffect(() => {
    // Only ignore a stale isAiSpeaking=true within 500ms of an interrupt while muteAudio flushes.
    // Once Rex genuinely starts speaking a new response (or after a turn completes), isAiSpeakingRef
    // MUST become true so the user can barge in again and again on every subsequent turn!
    const timeSinceInterrupt = Date.now() - lastInterruptTimeRef.current;
    const justInterrupted = timeSinceInterrupt < 500;
    if (justInterrupted && isAiSpeaking) {
      isAiSpeakingRef.current = false;
      wasAiSpeakingRef.current = false;
      lastAiSpeechEndTimeRef.current = 0;
      return;
    }
    if (isAiSpeaking) {
      lastInterruptTimeRef.current = 0;
      consumeCurrentRecognitionBuffer();
      if (turnSilenceTimerRef.current) {
        clearTimeout(turnSilenceTimerRef.current);
        turnSilenceTimerRef.current = null;
      }
    } else if (wasAiSpeakingRef.current && !isAiSpeaking) {
      lastAiSpeechEndTimeRef.current = Date.now();
      // Only clear recognition buffer if Rex finished speaking naturally (NOT when user just barged in!)
      if (timeSinceInterrupt > 4000) {
        consumeCurrentRecognitionBuffer();
        if (turnSilenceTimerRef.current) {
          clearTimeout(turnSilenceTimerRef.current);
          turnSilenceTimerRef.current = null;
        }
      }
      resetActiveInactivityTimerRef.current();
    }
    wasAiSpeakingRef.current = isAiSpeaking;
    isAiSpeakingRef.current = isAiSpeaking;
  }, [isAiSpeaking, consumeCurrentRecognitionBuffer]);

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
    if (isBareSilenceCommand(text)) return false;
    return WAKE_PATTERNS.some((p) => p.test(text));
  };

  const matchInterrupt = (text: string): boolean => {
    const trimmed = text.trim();
    if (!trimmed) return false;
    if (isBareSilenceCommand(trimmed) || isBuildTerminationCommand(trimmed, true)) {
      return true;
    }
    const extracted = extractUserInterruptFromBuffer(trimmed);
    if (extracted.matched) {
      return true;
    }
    const wordCount = trimmed.split(/\s+/).length;
    if (wordCount <= 8 && INTERRUPT_PATTERNS.some((p) => p.test(trimmed))) {
      return true;
    }
    if (EXPLICIT_MULTIWORD_INTERRUPT_PATTERNS.some((p) => p.test(trimmed))) {
      return true;
    }
    return false;
  };

  const isBareStopCommand = (text: string): boolean => {
    return isBareSilenceCommand(text);
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
          const rawTranscript = (data.text || "").trim();
          const transcript = normalizeSpokenTranscript(rawTranscript, { isInterim: false });

          if (transcript) {
            if (modeRef.current === "waiting_for_wake") {
              if (matchWakeWord(transcript)) {
                setMode("active_conversation");
                modeRef.current = "active_conversation";
                onActivatedRef.current();
                const cmd = stripWake(transcript);
                if (cmd) {
                  onTranscriptRef.current(normalizeSpokenTranscript(cmd, { isInterim: false }), true);
                } else {
                  onTranscriptRef.current("Hey Rex", true);
                }
              }
            } else if (modeRef.current === "active_conversation") {
              const cmd = stripWake(transcript);
              if (!cmd && matchWakeWord(transcript)) {
                onTranscriptRef.current("Hey Rex", true);
              } else {
                onTranscriptRef.current(transcript, true);
              }
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
  }, []);

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
    recognition.maxAlternatives = 5;

    recognition.onstart = () => {
      lastActivityRef.current = Date.now();
      bleedPrefixLengthRef.current = {};
      resultInterruptedRef.current = {};
      lastSeenResultLengthRef.current = {};
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
      const now = Date.now();
      // Only suppress speaking flag for 350ms right after an interrupt while audio player mutes;
      // as soon as Rex speaks a new response, speaking=true so consecutive barge-ins always work!
      const inActiveBargeIn = now - lastInterruptTimeRef.current < 350;
      const speaking = !inActiveBargeIn && isAiSpeakingRef.current;
      const inEchoCooldown =
        !inActiveBargeIn && now - lastAiSpeechEndTimeRef.current < ECHO_COOLDOWN_MS;
      const isEchoWindow = speaking || inEchoCooldown;

      let finalText = "";
      let interimText = "";
      let detectedBargeInThisEvent = false;

      for (let k = 0; k < event.results.length; k++) {
        lastSeenResultLengthRef.current[k] = (event.results[k]?.[0]?.transcript || "").length;
      }

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const resultItem = event.results[i];
        let rawTranscript: string = resultItem?.[0]?.transcript || "";
        const isFinalResult: boolean = Boolean(resultItem?.isFinal);
        const alreadyInterruptedInResult = Boolean(resultInterruptedRef.current[i]);
        const rawPrevBleedLen = bleedPrefixLengthRef.current[i] || 0;
        const prevBleedLen = rawPrevBleedLen <= rawTranscript.length ? rawPrevBleedLen : 0;

        // Inspect secondary ASR hypotheses (alternatives 1..4) for soft-spoken wake words or stop/pause commands
        const altCount = resultItem?.length || 1;
        if (altCount > 1) {
          const primarySlice = rawTranscript.slice(prevBleedLen).trim();
          const primaryNorm = normalizeSpokenTranscript(primarySlice, { isInterim: !isFinalResult });
          const primaryHasStop =
            isBareStopCommand(primaryNorm) ||
            matchInterrupt(primaryNorm) ||
            extractUserInterruptFromBuffer(rawTranscript).matched;
          const primaryHasWake = matchWakeWord(primaryNorm);

          if (!primaryHasStop && !primaryHasWake) {
            for (let a = 1; a < altCount; a++) {
              const altText: string = (resultItem[a]?.transcript || "").trim();
              if (!altText) continue;
              const altNorm = normalizeSpokenTranscript(altText, { isInterim: !isFinalResult });
              // If Rex is speaking (or in active conversation) and an alternative is an explicit stop/pause command:
              if (
                isBareStopCommand(altNorm) ||
                (isEchoWindow &&
                  (extractUserInterruptFromBuffer(altNorm).matched ||
                    /\b(stop\s+rex|rex\s+stop|pause\s+rex|rex\s+pause|please\s+stop|please\s+pause)\b/i.test(
                      altNorm
                    )))
              ) {
                rawTranscript = altText;
                break;
              }
              // If waiting for wake word and an alternative clearly contains "Rex" / "Hey Rex":
              if (modeRef.current === "waiting_for_wake" && !isEchoWindow && matchWakeWord(altNorm)) {
                rawTranscript = altText;
                break;
              }
            }
          }
        }

        if (isEchoWindow && !alreadyInterruptedInResult) {
          // Check newly added delta after any speaker bleed, slice from prevBleedLen, AND full rawTranscript
          // (checking full rawTranscript ensures Chrome's interim revisions never slice off "stop" or "please")
          const deltaSlice = rawTranscript.slice(prevBleedLen).trim();
          const extractedFromSlice = extractUserInterruptFromBuffer(rawTranscript.slice(prevBleedLen));
          const extractedFromFullRaw = extractUserInterruptFromBuffer(rawTranscript);
          const extractedFromFull = extractedFromSlice.matched
            ? extractedFromSlice
            : extractedFromFullRaw;
          const extractedFromDelta = extractUserInterruptFromBuffer(deltaSlice);
          const isDeltaSelfEcho = isSelfEchoRef.current ? isSelfEchoRef.current(deltaSlice) : false;
          const deltaWords = deltaSlice
            .replace(/[^\w\s']/g, " ")
            .trim()
            .split(/\s+/)
            .filter((w) => w.length > 1);
          const startsWithExplicitUserBargeLead =
            /^(no\b|nope\b|nah\b|wait\b|hold\b|stop\b|pause\b|please\s+stop\b|please\s+pause\b|listen\b|hey\s+rex\b|hi\s+rex\b|hello\s+rex\b|rex\b|actually\s+i\b|can\s+you\b|could\s+you\b|would\s+you\b|what\s+if\b|what\s+about\b|tell\s+me\b|let\s+me\b|i\s+want\b|i\s+need\b|i\s+don'?t\b|never\s*mind\b)/i.test(
              deltaSlice
            );

          if (extractedFromDelta.matched || matchInterrupt(deltaSlice)) {
            resultInterruptedRef.current[i] = true;
            detectedBargeInThisEvent = true;
            const userPortion = extractedFromDelta.matched ? extractedFromDelta.extractedText : deltaSlice;
            const matchIdx = rawTranscript.toLowerCase().lastIndexOf(userPortion.toLowerCase());
            if (matchIdx >= 0) {
              bleedPrefixLengthRef.current[i] = matchIdx;
            } else {
              bleedPrefixLengthRef.current[i] = prevBleedLen;
            }
            const cleanChunk = rawTranscript.slice(bleedPrefixLengthRef.current[i] ?? prevBleedLen);
            if (isFinalResult) finalText += cleanChunk;
            else interimText += cleanChunk;
          } else if (extractedFromFull.matched) {
            resultInterruptedRef.current[i] = true;
            detectedBargeInThisEvent = true;
            const matchIdx = rawTranscript.toLowerCase().lastIndexOf(extractedFromFull.extractedText.toLowerCase());
            bleedPrefixLengthRef.current[i] = matchIdx >= 0 ? matchIdx : prevBleedLen;
            const cleanChunk = rawTranscript.slice(bleedPrefixLengthRef.current[i]);
            if (isFinalResult) finalText += cleanChunk;
            else interimText += cleanChunk;
          } else if (/\b(hey|hello|hi|ok|okay)\s+rex\b/i.test(deltaSlice) || /^rex$/i.test(deltaSlice)) {
            resultInterruptedRef.current[i] = true;
            detectedBargeInThisEvent = true;
            bleedPrefixLengthRef.current[i] = prevBleedLen;
            if (isFinalResult) finalText += deltaSlice;
            else interimText += deltaSlice;
          } else if (
            !isDeltaSelfEcho &&
            (deltaWords.length >= 5 || (deltaWords.length >= 2 && startsWithExplicitUserBargeLead))
          ) {
            // Phrase-Independent Barge-In:
            // Requires either 2+ words starting with an explicit user barge-in lead ("no...", "wait...", "can you...", "hey rex...")
            // or 5+ non-echo words so 1-4 word speaker echoes ("Looking", "Absolutely", "Typing into today") NEVER trigger a false barge-in!
            resultInterruptedRef.current[i] = true;
            detectedBargeInThisEvent = true;
            bleedPrefixLengthRef.current[i] = prevBleedLen;
            const cleanChunk = rawTranscript.slice(prevBleedLen);
            if (isFinalResult) finalText += cleanChunk;
            else interimText += cleanChunk;
          } else if (isDeltaSelfEcho) {
            // Verified speaker bleed matching Rex's own voice output -> advance bleed offset
            bleedPrefixLengthRef.current[i] = rawTranscript.length;
          }
        } else {
          // Either Rex is not speaking, or the user already barged in during this result index:
          // strip any recorded speaker bleed / prior-turn prefix from index `i` so only current turn words remain!
          const cleanChunk = prevBleedLen > 0 ? rawTranscript.slice(prevBleedLen) : rawTranscript;
          if (isFinalResult) {
            finalText += cleanChunk;
          } else {
            interimText += cleanChunk;
          }
        }
      }

      if (finalText) {
        finalText = normalizeSpokenTranscript(finalText, { isInterim: false });
      }
      if (interimText) {
        interimText = normalizeSpokenTranscript(interimText, { isInterim: true });
      }

      const currentMode = modeRef.current;
      const spokenInterim = interimText.toLowerCase();
      const spokenFinal = finalText.toLowerCase();

      // Check if the utterance (or extracted interrupt) is a bare stop/pause command ("stop Rex", "please stop", "please pause", "pause")
      const candidateUtterance = (finalText || interimText).trim();
      const extractedCandidate = extractUserInterruptFromBuffer(candidateUtterance);
      const effectiveCandidate = extractedCandidate.matched
        ? extractedCandidate.extractedText
        : candidateUtterance;
      const isImmediateBareStop =
        Boolean(effectiveCandidate) && isBareStopCommand(effectiveCandidate);

      // Immediate fast-path for bare stop/pause commands:
      // Stop Rex's audio and transition straight to paused/wake-word mode on the very first attempt!
      if (isImmediateBareStop && (isEchoWindow || currentMode === "active_conversation")) {
        if (turnSilenceTimerRef.current) {
          clearTimeout(turnSilenceTimerRef.current);
          turnSilenceTimerRef.current = null;
        }
        lastInterruptTimeRef.current = Date.now();
        lastAiSpeechEndTimeRef.current = 0;
        isAiSpeakingRef.current = false;
        wasAiSpeakingRef.current = false;
        consumeCurrentRecognitionBuffer();
        setMode("waiting_for_wake");
        modeRef.current = "waiting_for_wake";
        activatedThisUtteranceRef.current = false;
        onInterruptRef.current?.();
        onTranscriptRef.current(effectiveCandidate, true);
        return;
      }

      // If Rex was speaking and no barge-in was detected in the delta/buffer, ignore the speaker bleed
      if (isEchoWindow && !detectedBargeInThisEvent) {
        const isInterruptFallback = matchInterrupt(spokenFinal) || matchInterrupt(spokenInterim);
        if (!isInterruptFallback) {
          return;
        }
        detectedBargeInThisEvent = true;
      }

      if (detectedBargeInThisEvent) {
        lastInterruptTimeRef.current = Date.now();
        lastAiSpeechEndTimeRef.current = 0;
        isAiSpeakingRef.current = false;
        wasAiSpeakingRef.current = false;
        // Transition to active_conversation (LISTENING) BEFORE calling onInterrupt so the UI
        // immediately enters LISTENING mode and never drops into READY (idle) mode!
        setMode("active_conversation");
        modeRef.current = "active_conversation";
        activatedThisUtteranceRef.current = true;
        onInterruptRef.current?.();
        onActivatedRef.current();
        resetActiveInactivityTimerRef.current();
      }

      if (currentMode === "waiting_for_wake" && !detectedBargeInThisEvent) {
        const hasWake = matchWakeWord(spokenInterim) || matchWakeWord(spokenFinal);
        const triggerSource = finalText || interimText;

        if (hasWake) {
          setMode("active_conversation");
          modeRef.current = "active_conversation";
          activatedThisUtteranceRef.current = true;
          onActivatedRef.current();
          resetActiveInactivityTimerRef.current();

          const command = stripWake(triggerSource);
          accumulatedTurnRef.current = command;
          pendingWakeTriggerRef.current = !command;
          const liveDisplay = command || triggerSource;
          if (liveDisplay) {
            onTranscriptRef.current(normalizeSpokenTranscript(liveDisplay, { isInterim: true }), false);
          }

          if (turnSilenceTimerRef.current) {
            clearTimeout(turnSilenceTimerRef.current);
          }
          const wakePauseMs = spokenFinal ? 550 : 900;
          turnSilenceTimerRef.current = setTimeout(() => {
            if (modeRef.current !== "active_conversation" || isAiSpeakingRef.current) return;
            const fullText = accumulatedTurnRef.current.trim();
            lastInterruptTimeRef.current = 0;
            consumeCurrentRecognitionBuffer();
            if (fullText && fullText.length > 1) {
              onTranscriptRef.current(normalizeSpokenTranscript(fullText, { isInterim: false }), true);
            } else {
              onTranscriptRef.current("Hey Rex", true);
            }
          }, wakePauseMs);
        }
        return;
      }

      if (modeRef.current === "active_conversation") {
        resetActiveInactivityTimerRef.current();

        // 1. Check deactivation phrases
        const deactivate =
          spokenFinal.includes("goodbye rex") ||
          spokenFinal.includes("bye rex") ||
          spokenFinal.includes("stop listening") ||
          spokenFinal.includes("pause listening") ||
          spokenInterim.includes("goodbye rex") ||
          spokenInterim.includes("stop listening") ||
          spokenInterim.includes("pause listening");

        if (deactivate) {
          if (turnSilenceTimerRef.current) {
            clearTimeout(turnSilenceTimerRef.current);
            turnSilenceTimerRef.current = null;
          }
          lastInterruptTimeRef.current = 0;
          consumeCurrentRecognitionBuffer();
          setMode("waiting_for_wake");
          modeRef.current = "waiting_for_wake";
          activatedThisUtteranceRef.current = false;
          onDeactivatedRef.current();
          return;
        }

        // 2. Check instant stop or continuation/withdrawal/redirect phrases ONLY if AI is currently speaking
        const isImmediateStop = matchInterrupt(spokenFinal) || matchInterrupt(spokenInterim);
        if (isImmediateStop && isAiSpeakingRef.current && !detectedBargeInThisEvent) {
          if (Date.now() - lastInterruptTimeRef.current > 600) {
            lastInterruptTimeRef.current = Date.now();
            isAiSpeakingRef.current = false;
            onInterruptRef.current?.();
          }
        }

        // 3. Accumulate spoken text across comma pauses (so multi-sentence riddles, stories, or thoughts
        // are captured in full without being cut off at the first pause!)
        if (finalText) {
          const trimmedFinal = (isBareStopCommand(finalText) ? finalText : stripWake(finalText)).trim();
          if (trimmedFinal) {
            pendingWakeTriggerRef.current = false;
            const acc = accumulatedTurnRef.current.trim();
            const normAcc = acc.toLowerCase().replace(/[.!?,]/g, "").trim();
            const normTrimmed = trimmedFinal.toLowerCase().replace(/[.!?,]/g, "").trim();
            if (!acc) {
              accumulatedTurnRef.current = trimmedFinal;
            } else if (normTrimmed.startsWith(normAcc)) {
              accumulatedTurnRef.current = trimmedFinal;
            } else if (normAcc.endsWith(normTrimmed)) {
              // already included in accumulator
            } else {
              accumulatedTurnRef.current = `${acc} ${trimmedFinal}`.trim();
            }
          }
        }

        const cleanInterim = (isBareStopCommand(interimText) ? interimText : stripWake(interimText)).trim();
        const combinedLiveRaw = (
          accumulatedTurnRef.current + (cleanInterim ? " " + cleanInterim : "")
        ).trim();
        const combinedLive = normalizeSpokenTranscript(combinedLiveRaw, { isInterim: true });
        const hasStandaloneWakeWord =
          !combinedLive &&
          (matchWakeWord(spokenFinal) ||
            matchWakeWord(spokenInterim) ||
            pendingWakeTriggerRef.current);

        if (combinedLive) {
          onTranscriptRef.current(combinedLive, false);
        } else if (hasStandaloneWakeWord) {
          pendingWakeTriggerRef.current = true;
          const rawWakeDisplay = (finalText || interimText).trim();
          if (rawWakeDisplay) {
            onTranscriptRef.current(normalizeSpokenTranscript(rawWakeDisplay, { isInterim: true }), false);
          }
        }

        // 4. Adaptive Conversational Turn Detection (gives natural breathing room for multi-sentence thoughts)
        // Only clear turnSilenceTimerRef when we have either combinedLive or hasStandaloneWakeWord to reschedule it
        if (combinedLive.length > 0 || hasStandaloneWakeWord) {
          if (turnSilenceTimerRef.current) {
            clearTimeout(turnSilenceTimerRef.current);
            turnSilenceTimerRef.current = null;
          }
        }

        const lowerLive = combinedLive.toLowerCase().replace(/[.!?,]/g, "").trim();
        const wordCount = lowerLive.split(/\s+/).filter(Boolean).length;

        const endsWithFillerOrConnector =
          /\b(um|uh|ah|er|erm|hmm|like|and|or|so|with|for|to|but|because|that|selling|buying|only|also|then|as well as|in|on|at|of|think|want|need|feel|believe|mean|know|say|said|ask|wonder|hope|guess|suppose|suggest|recommend|prefer|if|whether|when|where|why|how|what|which|who|about|from|into|by|as|let\s+us\s+see|let's\s+see|there\s+is|there\s+are|one\s+has|another\s+has|third\s+one)\s*$/i.test(
            lowerLive
          ) ||
          /^(um|uh|ah|er|hmm|like|and|or|so|no|yes|yeah|well|actually|wait|hold on|hey|ok|okay)\b$/i.test(
            lowerLive
          );

        const isShortGreetingOrReply =
          wordCount <= 6 &&
          !endsWithFillerOrConnector &&
          /^(hi|hey|hello|yo|howdy|what's up|whats up|sup|wassup|how are you|how's it going|what are you doing|good morning|good afternoon|good evening|i'm good|i am good|doing good|doing great|pretty good|not much|nothing much|thanks|thank you|yes|yeah|yep|sure|okay|ok|go ahead|tell me a joke|sing a song|say a poem|tell me a story)(\s+rex)?$/i.test(
            lowerLive
          );

        const isCompleteBareStop = isBareStopCommand(lowerLive);
        const hasFinalizedClause = Boolean(finalText) && !cleanInterim;

        let pauseDurationMs = 1850;
        if (isCompleteBareStop && hasFinalizedClause) {
          pauseDurationMs = 350;
        } else if (isCompleteBareStop) {
          pauseDurationMs = 450;
        } else if (isShortGreetingOrReply && hasFinalizedClause) {
          pauseDurationMs = 700;
        } else if (isShortGreetingOrReply) {
          pauseDurationMs = 950;
        } else if (hasFinalizedClause && !endsWithFillerOrConnector && wordCount >= 4) {
          // Give 1.85s of natural breathing room between sentences so multi-sentence questions/riddles are never cut off early!
          pauseDurationMs = 1850;
        } else if (hasFinalizedClause && !endsWithFillerOrConnector) {
          // Short 1-3 word clause — give extra breathing room so the user can finish their sentence
          pauseDurationMs = 2200;
        } else {
          pauseDurationMs = 2500;
        }

        if (combinedLive.length > 0) {
          turnSilenceTimerRef.current = setTimeout(() => {
            const recentlyInterrupted = Date.now() - lastInterruptTimeRef.current < 8000;
            if (
              modeRef.current !== "active_conversation" ||
              (!recentlyInterrupted && isAiSpeakingRef.current)
            ) {
              return;
            }
            const fullText = accumulatedTurnRef.current.trim() || combinedLive.trim();

            const cleanText = normalizeSpokenTranscript(
              fullText
                .replace(/\b(um|uh|ah|er|erm|hmm)\b/gi, "")
                .replace(/\s+/g, " ")
                .trim(),
              { isInterim: false }
            );

            lastInterruptTimeRef.current = 0;
            consumeCurrentRecognitionBuffer();

            if (cleanText.length > 1 && !/^(or|and|so|but|um|uh|ah|er|hmm)[.!?]?$/i.test(cleanText)) {
              onTranscriptRef.current(cleanText, true);
            }
          }, pauseDurationMs);
        } else if (hasStandaloneWakeWord) {
          // User spoke "Rex" / "Hey Rex" (either finalizing the wake word that just transitioned
          // from waiting_for_wake -> active_conversation, or calling "Rex" while in active_conversation).
          const wakeDelayMs = spokenFinal ? 450 : 800;
          turnSilenceTimerRef.current = setTimeout(() => {
            const recentlyInterrupted = Date.now() - lastInterruptTimeRef.current < 8000;
            if (
              modeRef.current !== "active_conversation" ||
              (!recentlyInterrupted && isAiSpeakingRef.current)
            ) {
              return;
            }
            const fullText = accumulatedTurnRef.current.trim();
            lastInterruptTimeRef.current = 0;
            consumeCurrentRecognitionBuffer();
            if (fullText && fullText.length > 1) {
              onTranscriptRef.current(normalizeSpokenTranscript(fullText, { isInterim: false }), true);
            } else {
              onTranscriptRef.current("Hey Rex", true);
            }
          }, wakeDelayMs);
        }
      }
    };

    recognition.onerror = (event: any) => {
      const err = event?.error || "";
      if (err === "no-speech" || err === "aborted") {
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

      if (err === "network") {
        console.warn("[voice] speech recognition network issue, enabling fallback recorder alongside retry");
        useServerFallbackRef.current = true;
        return;
      }

      console.debug("[voice] recognition error:", err);
      setLastError(err);
    };

    recognition.onend = () => {
      if (modeRef.current !== "idle") {
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        restartTimerRef.current = setTimeout(() => restartRef.current(false), 80);
      }
    };

    return recognition;
  }, [consumeCurrentRecognitionBuffer]);

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
          onDeactivatedRef.current();
        }
      }, 45000);
    }
  }, []);

  // Start listening immediately and hands-free
  const startListening = useCallback(
    (forceActive = false): boolean => {
      const targetMode: VoiceMode = forceActive ? "active_conversation" : "waiting_for_wake";
      setMode(targetMode);
      modeRef.current = targetMode;
      lastActivityRef.current = Date.now();

      if (forceActive) {
        onActivatedRef.current();
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
    [ensureMediaStream, resetActiveInactivityTimer, startRecognition]
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

    onDeactivatedRef.current();
  }, []);

  // Pause active conversation back into wake-word ("waiting_for_wake") / Ready mode
  // (used when user says "Stop Rex", "Pause", "Pause Rex", etc.)
  const pauseToWakeWord = useCallback(() => {
    if (activeInactivityTimerRef.current) {
      clearTimeout(activeInactivityTimerRef.current);
      activeInactivityTimerRef.current = null;
    }
    if (turnSilenceTimerRef.current) {
      clearTimeout(turnSilenceTimerRef.current);
      turnSilenceTimerRef.current = null;
    }
    lastInterruptTimeRef.current = 0;
    consumeCurrentRecognitionBuffer();
    activatedThisUtteranceRef.current = false;
    setMode("waiting_for_wake");
    modeRef.current = "waiting_for_wake";
  }, [consumeCurrentRecognitionBuffer]);

  // Toggle push-to-talk or switch between wake & active
  const forceActivate = useCallback(() => {
    if (modeRef.current === "idle") {
      startListening(true);
    } else if (modeRef.current === "waiting_for_wake") {
      setMode("active_conversation");
      modeRef.current = "active_conversation";
      onActivatedRef.current();
      resetActiveInactivityTimer();
    } else {
      pauseToWakeWord();
      onDeactivatedRef.current();
    }
  }, [startListening, resetActiveInactivityTimer, pauseToWakeWord]);

  // Toggle full microphone on/off
  const toggleMic = useCallback(async () => {
    if (modeRef.current === "idle") {
      await startListening(true);
    } else {
      stopListening();
    }
  }, [startListening, stopListening]);

  // Periodic heartbeat watchdog (never abort/restart while Rex is actively speaking)
  useEffect(() => {
    const id = setInterval(() => {
      if (modeRef.current === "idle") return;
      if (isAiSpeakingRef.current) {
        lastActivityRef.current = Date.now();
        return;
      }
      if (Date.now() - (lastActivityRef.current || 0) > 25000) {
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
    pauseToWakeWord,
    forceActivate,
    toggleMic,
  };
}
