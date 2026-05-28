/**
 * WebSocket protocol types — mirrors backend.
 */

export type ClientMessageType =
  | "voice.start"
  | "voice.stop"
  | "voice.config"
  | "text.input"
  | "execution.interrupt"
  | "mode.switch"
  | "session.heartbeat";

export interface ClientMessage {
  type: ClientMessageType;
  id?: string;
  payload?: Record<string, unknown>;
}

// Use string type for flexibility — backend can send any event type
export type ServerMessageType = string;

export interface ServerMessage {
  type: string;
  id: string;
  timestamp: string;
  session_id: string;
  payload: Record<string, unknown>;
}
