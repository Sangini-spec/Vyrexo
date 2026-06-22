"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Plays MP3 audio that the backend streams over the WebSocket as binary frames.
 *
 * To minimize perceived latency, we don't wait for the full utterance to arrive
 * before playing — we buffer chunks as they come in and start playback as soon
 * as one utterance is complete. Multiple utterances are queued and played
 * back-to-back so Rex's lines never overlap.
 *
 * Flow per utterance:
 *   1. voice.output.start[ed]    -> beginUtterance()
 *   2. (binary frames)            -> pushChunk(arrayBuffer)
 *   3. voice.output.end/completed -> endUtterance() (queues for playback)
 */
export function useAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const currentChunksRef = useRef<Uint8Array[]>([]);
  const queueRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);
  // Hard mute: while true, NOTHING plays — incoming chunks are dropped, queued
  // utterances are ignored, and the current audio is stopped. This is the
  // bulletproof part of "stop": even late/in-flight audio can't sneak through.
  const mutedRef = useRef(false);

  const playNextFromQueue = useCallback(() => {
    if (mutedRef.current) { setIsPlaying(false); return; }
    if (isPlayingRef.current) return;
    const blob = queueRef.current.shift();
    if (!blob) {
      setIsPlaying(false);
      return;
    }

    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    // Lower latency: preload aggressively, don't wait on full buffer
    audio.preload = "auto";
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

    // canplay fires very early in MP3 decoding; start as soon as it does
    audio.oncanplay = () => {
      audio.play().catch(() => cleanup());
    };

    // Some browsers won't fire canplay until play() is called
    audio.play().catch(() => {
      // If autoplay was blocked or some other immediate failure, retry once
      // shortly. After that, give up and move on so we don't deadlock the queue.
      setTimeout(() => {
        audio.play().catch(() => cleanup());
      }, 30);
    });
  }, []);

  /** Call when the backend signals voice.output.started (new utterance begins). */
  const beginUtterance = useCallback(() => {
    currentChunksRef.current = [];
  }, []);

  /** Call for each binary audio frame received from the backend. */
  const pushChunk = useCallback((data: ArrayBuffer) => {
    if (mutedRef.current) return; // dropped while muted (post-interrupt)
    if (!data || data.byteLength === 0) return;
    currentChunksRef.current.push(new Uint8Array(data));
  }, []);

  /** Call when the backend signals voice.output.completed. */
  const endUtterance = useCallback(() => {
    const chunks = currentChunksRef.current;
    currentChunksRef.current = [];
    if (mutedRef.current || chunks.length === 0) return;

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

  /** Stop playback immediately and clear the queue (used on barge-in). */
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
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
    };
  }, []);

  return { isPlaying, beginUtterance, pushChunk, endUtterance, stop, mute, unmute };
}
