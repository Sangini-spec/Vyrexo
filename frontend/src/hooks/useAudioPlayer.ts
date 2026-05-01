"use client";

import { useCallback, useRef, useState } from "react";

export function useAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioChunksRef = useRef<Uint8Array[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const playAudioChunk = useCallback((data: ArrayBuffer) => {
    audioChunksRef.current.push(new Uint8Array(data));
  }, []);

  const playAccumulatedAudio = useCallback(() => {
    if (audioChunksRef.current.length === 0) return;

    // Combine all chunks into one blob
    const totalLength = audioChunksRef.current.reduce((acc, chunk) => acc + chunk.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of audioChunksRef.current) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    audioChunksRef.current = [];

    const blob = new Blob([combined], { type: "audio/mpeg" });
    const url = URL.createObjectURL(blob);

    if (audioElementRef.current) {
      audioElementRef.current.pause();
      URL.revokeObjectURL(audioElementRef.current.src);
    }

    const audio = new Audio(url);
    audioElementRef.current = audio;
    setIsPlaying(true);

    audio.onended = () => {
      setIsPlaying(false);
      URL.revokeObjectURL(url);
    };

    audio.play().catch(() => setIsPlaying(false));
  }, []);

  const stop = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
    }
    audioChunksRef.current = [];
    setIsPlaying(false);
  }, []);

  return { isPlaying, playAudioChunk, playAccumulatedAudio, stop };
}
