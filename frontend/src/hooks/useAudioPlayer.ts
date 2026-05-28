"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Plays MP3 audio that the backend streams over the WebSocket as binary frames.
 *
 * Flow per utterance:
 *   1. Backend publishes voice.output.started      -> beginUtterance()
 *   2. Backend sends binary frames (MP3 chunks)    -> pushChunk(arrayBuffer)
 *   3. Backend publishes voice.output.completed    -> endUtterance() (queues for playback)
 *
 * Multiple utterances queue up and play sequentially so Rex's lines don't overlap.
 */
export function useAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const currentChunksRef = useRef<Uint8Array[]>([]);
  const queueRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);

  const playNextFromQueue = useCallback(() => {
    if (isPlayingRef.current) return;
    const blob = queueRef.current.shift();
    if (!blob) {
      setIsPlaying(false);
      return;
    }

    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audioElementRef.current = audio;
    isPlayingRef.current = true;
    setIsPlaying(true);

    const cleanup = () => {
      URL.revokeObjectURL(url);
      isPlayingRef.current = false;
      audioElementRef.current = null;
      // Play the next queued utterance, if any
      playNextFromQueue();
    };

    audio.onended = cleanup;
    audio.onerror = cleanup;

    audio.play().catch(() => {
      // Autoplay might be blocked; surface as not-playing
      cleanup();
    });
  }, []);

  /** Call when the backend signals voice.output.started (new utterance begins). */
  const beginUtterance = useCallback(() => {
    currentChunksRef.current = [];
  }, []);

  /** Call for each binary audio frame received from the backend. */
  const pushChunk = useCallback((data: ArrayBuffer) => {
    if (!data || data.byteLength === 0) return;
    currentChunksRef.current.push(new Uint8Array(data));
  }, []);

  /** Call when the backend signals voice.output.completed. */
  const endUtterance = useCallback(() => {
    const chunks = currentChunksRef.current;
    currentChunksRef.current = [];
    if (chunks.length === 0) return;

    const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const c of chunks) {
      combined.set(c, offset);
      offset += c.length;
    }
    const blob = new Blob([combined], { type: "audio/mpeg" });
    queueRef.current.push(blob);
    playNextFromQueue();
  }, [playNextFromQueue]);

  /** Stop playback immediately and clear the queue (used on interrupt). */
  const stop = useCallback(() => {
    queueRef.current = [];
    currentChunksRef.current = [];
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
      audioElementRef.current = null;
    }
    isPlayingRef.current = false;
    setIsPlaying(false);
  }, []);

  // Best-effort cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
    };
  }, []);

  return { isPlaying, beginUtterance, pushChunk, endUtterance, stop };
}
