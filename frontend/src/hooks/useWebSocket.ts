"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ClientMessage, ServerMessage } from "@/lib/ws-protocol";

type ConnectionStatus = "connected" | "disconnected" | "connecting";

interface UseWebSocketOptions {
  sessionId: string;
  onMessage?: (message: ServerMessage) => void;
  onAudio?: (data: ArrayBuffer) => void;
}

export function useWebSocket({ sessionId, onMessage, onAudio }: UseWebSocketOptions) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const onMessageRef = useRef(onMessage);
  const onAudioRef = useRef(onAudio);

  // Keep callbacks fresh without reconnecting
  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);
  useEffect(() => { onAudioRef.current = onAudio; }, [onAudio]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

    setStatus("connecting");

    // Connect to backend WebSocket
    const ws = new WebSocket(`ws://127.0.0.1:8001/ws/${sessionId}`);
    ws.binaryType = "arraybuffer";

    ws.onopen = () => {
      console.log("[WS] Connected to Vyrexo backend");
      setStatus("connected");
    };

    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        onAudioRef.current?.(event.data);
      } else {
        try {
          const message: ServerMessage = JSON.parse(event.data);
          console.log("[WS] Received:", message.type, message.payload);
          onMessageRef.current?.(message);
        } catch {
          console.warn("[WS] Failed to parse:", event.data);
        }
      }
    };

    ws.onclose = (event) => {
      console.log("[WS] Disconnected:", event.code, event.reason);
      setStatus("disconnected");
      wsRef.current = null;

      // Auto-reconnect after 3s
      reconnectRef.current = setTimeout(() => {
        if (sessionId) connect();
      }, 3000);
    };

    ws.onerror = (err) => {
      console.error("[WS] Error:", err);
    };

    wsRef.current = ws;
  }, [sessionId]);

  const disconnect = useCallback(() => {
    if (reconnectRef.current) clearTimeout(reconnectRef.current);
    if (wsRef.current) {
      wsRef.current.close(1000, "Client disconnect");
      wsRef.current = null;
    }
    setStatus("disconnected");
  }, []);

  const sendMessage = useCallback((message: ClientMessage) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      console.warn("[WS] Not connected, can't send:", message.type);
      return false;
    }
    wsRef.current.send(JSON.stringify(message));
    console.log("[WS] Sent:", message.type);
    return true;
  }, []);

  const sendAudio = useCallback((data: ArrayBuffer) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return false;
    wsRef.current.send(data);
    return true;
  }, []);

  // Cleanup
  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  return { status, connect, disconnect, sendMessage, sendAudio };
}
