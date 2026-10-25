"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Shared Web Audio API context & persistent Audio element unlocked on the first user gesture.
// Web Audio API (AudioContext) remains permanently unlocked across all subsequent async
// SpeechRecognition + fetch() turns once resumed during any user interaction.
let sharedAudioCtx: AudioContext | null = null;
let sharedAudioElement: HTMLAudioElement | null = null;
let unlockListenersAttached = false;

export function unlockAudioPlayback(): void {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
        sharedAudioCtx = new AudioCtx();
      }
      if (sharedAudioCtx.state === "suspended") {
        sharedAudioCtx.resume().catch(() => {});
      }
      // Play a 1-sample silent buffer to permanently unlock the Web Audio output channel
      const silentBuf = sharedAudioCtx.createBuffer(1, 1, 22050);
      const src = sharedAudioCtx.createBufferSource();
      src.buffer = silentBuf;
      src.connect(sharedAudioCtx.destination);
      src.start(0);
    }
  } catch {}

  try {
    if (!sharedAudioElement) {
      sharedAudioElement = new Audio();
      sharedAudioElement.preload = "auto";
    }
  } catch {}
}

function attachGlobalAudioUnlock(): void {
  if (typeof window === "undefined" || unlockListenersAttached) return;
  unlockListenersAttached = true;

  const onUserGesture = () => {
    unlockAudioPlayback();
  };

  window.addEventListener("pointerdown", onUserGesture, { passive: true });
  window.addEventListener("keydown", onUserGesture, { passive: true });
  window.addEventListener("touchstart", onUserGesture, { passive: true });
  window.addEventListener("click", onUserGesture, { passive: true });
}

interface QueuedAudioItem {
  bytes: Uint8Array;
  mimeType: string;
  onPlaybackFailed?: () => void;
}

/**
 * Plays MP3/WAV audio that the backend streams over WebSocket or returns via /api/voice/speak.
 *
 * Uses a dual-engine architecture:
 *  1. Web Audio API (AudioContext.decodeAudioData -> AudioBufferSourceNode) which is
 *     immune to browser HTMLAudioElement autoplay blocks on async SpeechRecognition turns.
 *  2. HTMLAudioElement fallback if decodeAudioData fails.
 *  3. Invokes onPlaybackFailed if both fail so the caller can fall back to SpeechSynthesis.
 */
export function useAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const currentChunksRef = useRef<Uint8Array[]>([]);
  const currentFailCallbackRef = useRef<(() => void) | undefined>(undefined);
  const queueRef = useRef<QueuedAudioItem[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const activeSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const isPlayingRef = useRef(false);
  const isStartingPlaybackRef = useRef(false);
  const mutedRef = useRef(false);

  useEffect(() => {
    attachGlobalAudioUnlock();
  }, []);

  const playNextFromQueue = useCallback(() => {
    if (mutedRef.current) {
      queueRef.current = [];
      isPlayingRef.current = false;
      isStartingPlaybackRef.current = false;
      setIsPlaying(false);
      return;
    }

    if (
      isStartingPlaybackRef.current ||
      activeSourceNodeRef.current ||
      (audioElementRef.current && !audioElementRef.current.paused)
    ) {
      return;
    }

    const item = queueRef.current.shift();
    if (!item || item.bytes.byteLength === 0) {
      isPlayingRef.current = false;
      isStartingPlaybackRef.current = false;
      setIsPlaying(false);
      return;
    }

    isStartingPlaybackRef.current = true;
    isPlayingRef.current = true;
    setIsPlaying(true);

    const advanceOrFinish = () => {
      isStartingPlaybackRef.current = false;
      activeSourceNodeRef.current = null;
      if (queueRef.current.length === 0) {
        isPlayingRef.current = false;
        setIsPlaying(false);
      } else {
        playNextFromQueue();
      }
    };

    const playViaHtmlAudio = () => {
      if (mutedRef.current) {
        advanceOrFinish();
        return;
      }

      const blob = new Blob([item.bytes.buffer.slice(item.bytes.byteOffset, item.bytes.byteOffset + item.bytes.byteLength) as ArrayBuffer], {
        type: item.mimeType,
      });
      const url = URL.createObjectURL(blob);
      const audio = sharedAudioElement || new Audio();
      audio.preload = "auto";
      audio.volume = 1.0;
      audio.muted = false;
      audioElementRef.current = audio;

      let cleanedUp = false;
      const cleanup = (failed = false) => {
        if (cleanedUp) return;
        cleanedUp = true;
        audio.onended = null;
        audio.onerror = null;
        audio.oncanplay = null;
        try {
          audio.pause();
          audio.removeAttribute("src");
        } catch {}
        try {
          URL.revokeObjectURL(url);
        } catch {}
        if (audioElementRef.current === audio) {
          audioElementRef.current = null;
        }
        if (failed && !mutedRef.current) {
          try {
            item.onPlaybackFailed?.();
          } catch {}
        }
        advanceOrFinish();
      };

      audio.onended = () => cleanup(false);
      audio.onerror = (ev) => {
        if (ev && typeof (ev as Event).preventDefault === "function") {
          (ev as Event).preventDefault();
        }
        cleanup(true);
      };

      audio.src = url;
      isStartingPlaybackRef.current = false;
      audio.play().catch(() => {
        if (cleanedUp || mutedRef.current) return;
        setTimeout(() => {
          if (cleanedUp || mutedRef.current) return;
          audio.play().catch(() => cleanup(true));
        }, 40);
      });
    };

    // Primary: Try Web Audio API AudioContext first (never blocked after initial page interaction)
    try {
      const AudioCtx =
        typeof window !== "undefined"
          ? window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
          : null;
      if (AudioCtx) {
        if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
          sharedAudioCtx = new AudioCtx();
        }
        const ctx = sharedAudioCtx;
        const resumePromise =
          ctx.state === "suspended" ? ctx.resume().catch(() => {}) : Promise.resolve();

        resumePromise.then(() => {
          if (mutedRef.current) {
            advanceOrFinish();
            return;
          }
          // If the browser kept AudioContext suspended (e.g. hands-free voice wake word before any click),
          // never start a BufferSourceNode on a suspended clock (it would produce no sound and never fire onended).
          if ((ctx.state as string) !== "running") {
            playViaHtmlAudio();
            return;
          }
          // Copy buffer because decodeAudioData detaches the ArrayBuffer
          const arrayBufCopy = item.bytes.buffer.slice(
            item.bytes.byteOffset,
            item.bytes.byteOffset + item.bytes.byteLength
          ) as ArrayBuffer;

          ctx
            .decodeAudioData(arrayBufCopy)
            .then((decodedBuffer) => {
              if (mutedRef.current) {
                advanceOrFinish();
                return;
              }
              if ((ctx.state as string) !== "running") {
                playViaHtmlAudio();
                return;
              }
              const source = ctx.createBufferSource();
              source.buffer = decodedBuffer;
              source.connect(ctx.destination);
              activeSourceNodeRef.current = source;
              isStartingPlaybackRef.current = false;

              let finished = false;
              const maxDurationMs = Math.max(1200, Math.ceil((decodedBuffer.duration || 3) * 1000) + 800);
              const safetyTimer = setTimeout(() => {
                if (finished) return;
                finished = true;
                if (activeSourceNodeRef.current === source) {
                  activeSourceNodeRef.current = null;
                }
                advanceOrFinish();
              }, maxDurationMs);

              source.onended = () => {
                if (finished) return;
                finished = true;
                clearTimeout(safetyTimer);
                if (activeSourceNodeRef.current === source) {
                  activeSourceNodeRef.current = null;
                }
                advanceOrFinish();
              };

              try {
                source.start(0);
              } catch {
                finished = true;
                clearTimeout(safetyTimer);
                activeSourceNodeRef.current = null;
                playViaHtmlAudio();
              }
            })
            .catch(() => {
              playViaHtmlAudio();
            });
        });
        return;
      }
    } catch {}

    playViaHtmlAudio();
  }, []);

  /** Call when the backend signals voice.output.started (new utterance begins). */
  const beginUtterance = useCallback((onPlaybackFailed?: () => void) => {
    currentChunksRef.current = [];
    currentFailCallbackRef.current = onPlaybackFailed;
  }, []);

  /** Call for each binary audio frame received from the backend. */
  const pushChunk = useCallback((data: ArrayBuffer) => {
    if (mutedRef.current) return;
    if (!data || data.byteLength === 0) return;
    currentChunksRef.current.push(new Uint8Array(data));
  }, []);

  /** Call when the backend signals voice.output.completed. */
  const endUtterance = useCallback(() => {
    const chunks = currentChunksRef.current;
    const onPlaybackFailed = currentFailCallbackRef.current;
    currentChunksRef.current = [];
    currentFailCallbackRef.current = undefined;

    if (mutedRef.current || chunks.length === 0) {
      if (
        queueRef.current.length === 0 &&
        !audioElementRef.current &&
        !activeSourceNodeRef.current &&
        !isStartingPlaybackRef.current
      ) {
        isPlayingRef.current = false;
        setIsPlaying(false);
      }
      return;
    }

    const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const c of chunks) {
      combined.set(c, offset);
      offset += c.length;
    }
    const isWav =
      combined.length >= 4 &&
      combined[0] === 0x52 &&
      combined[1] === 0x49 &&
      combined[2] === 0x46 &&
      combined[3] === 0x46;

    queueRef.current.push({
      bytes: combined,
      mimeType: isWav ? "audio/wav" : "audio/mpeg",
      onPlaybackFailed,
    });
    playNextFromQueue();
  }, [playNextFromQueue]);

  /** Stop playback immediately and clear the queue (used on barge-in). */
  const stop = useCallback(() => {
    queueRef.current = [];
    currentChunksRef.current = [];
    currentFailCallbackRef.current = undefined;
    isStartingPlaybackRef.current = false;

    if (activeSourceNodeRef.current) {
      const src = activeSourceNodeRef.current;
      activeSourceNodeRef.current = null;
      src.onended = null;
      try {
        src.stop();
        src.disconnect();
      } catch {}
    }

    if (audioElementRef.current) {
      const el = audioElementRef.current;
      audioElementRef.current = null;
      el.onended = null;
      el.onerror = null;
      el.oncanplay = null;
      try {
        el.pause();
        el.currentTime = 0;
      } catch {}
    }
    isPlayingRef.current = false;
    setIsPlaying(false);
  }, []);

  /** HARD stop for interrupts: stop now AND block all playback until unmute(). */
  const mute = useCallback(() => {
    mutedRef.current = true;
    stop();
  }, [stop]);

  /** Re-enable playback (called when the user starts a new turn). */
  const unmute = useCallback(() => {
    mutedRef.current = false;
  }, []);

  // Best-effort cleanup on unmount
  useEffect(() => {
    return () => {
      if (activeSourceNodeRef.current) {
        try {
          activeSourceNodeRef.current.stop();
        } catch {}
      }
      if (audioElementRef.current) {
        try {
          audioElementRef.current.pause();
        } catch {}
      }
    };
  }, []);

  return { isPlaying, beginUtterance, pushChunk, endUtterance, stop, mute, unmute };
}

