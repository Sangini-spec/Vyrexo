/**
 * Gemini Live API WebSocket Transport & Dual-Model Execution Service
 * 
 * Transport: Real-time bidirectional streaming (PCM 16kHz in -> 24kHz audio out)
 * Interruption: Instant audio buffer flushing on serverContent.interrupted
 * Dual-Model: Flash Live for instant vocal interaction, Pro for heavy code generation
 */

export interface GeminiLiveConfig {
  sessionId: string;
  projectPath?: string;
  onAudioChunk?: (pcm24k: ArrayBuffer) => void;
  onTranscript?: (text: string, isUser: boolean) => void;
  onInterrupted?: () => void;
  onToolCall?: (call: { name: string; args: Record<string, unknown>; id: string }) => Promise<unknown>;
  onStatusChange?: (status: "connecting" | "connected" | "disconnected" | "speaking" | "listening") => void;
}

export class GeminiLiveService {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private scheduledAudioSources: AudioBufferSourceNode[] = [];
  private nextPlaybackTime = 0;
  private isMuted = false;
  private isAiSpeaking = false;
  private config: GeminiLiveConfig;

  constructor(config: GeminiLiveConfig) {
    this.config = config;
  }

  public async connect(): Promise<boolean> {
    this.config.onStatusChange?.("connecting");
    try {
      const protocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = typeof window !== "undefined" ? window.location.host : "localhost:3000";
      const wsUrl = `${protocol}//${host}/ws/${this.config.sessionId}`;

      this.ws = new WebSocket(wsUrl);
      this.ws.binaryType = "arraybuffer";

      this.ws.onopen = () => {
        this.config.onStatusChange?.("connected");
        this.sendSessionInit();
      };

      this.ws.onmessage = async (event) => {
        if (event.data instanceof ArrayBuffer) {
          if (!this.isMuted) {
            this.playAudioChunk(event.data);
            this.config.onAudioChunk?.(event.data);
          }
        } else {
          try {
            const data = JSON.parse(event.data);
            this.handleServerMessage(data);
          } catch (e) {
            console.debug("[GeminiLive] Non-JSON payload:", event.data);
          }
        }
      };

      this.ws.onclose = () => {
        this.config.onStatusChange?.("disconnected");
      };

      this.ws.onerror = (err) => {
        console.warn("[GeminiLive] WebSocket error:", err);
      };

      return true;
    } catch (err) {
      console.error("[GeminiLive] Connection error:", err);
      return false;
    }
  }

  private sendSessionInit() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(
      JSON.stringify({
        type: "session.init",
        payload: {
          model: "gemini-3.8-live",
          voice: "Puck",
          generation_config: {
            response_modalities: ["AUDIO", "TEXT"],
            speech_config: {
              voice_config: {
                prebuilt_voice_config: {
                  voice_name: "Puck",
                },
              },
            },
          },
          system_instruction: {
            parts: [
              {
                text: `You are Rex, the voice-first AI software engineering partner powering Vyrexo.
You are an intelligent, warm teammate sitting right beside the user while working, not a robotic disclaimer bot.
Understand the social intent of the conversation. When the user jokes, banters, or asks casual questions, reply naturally with personality, warmth, and wit (without falsely claiming to be human).
When the user is excited or frustrated, match their emotion empathetically.
When asked to build, write, refactor, or test software, make sensible engineering decisions and execute immediately using multi-agent workflows.`,
              },
            ],
          },
          tools: [
            {
              function_declarations: [
                {
                  name: "plan_architecture",
                  description: "Decompose a programming or refactoring task into atomic engineering steps",
                  parameters: {
                    type: "OBJECT",
                    properties: {
                      title: { type: "STRING", description: "Task title" },
                      steps: {
                        type: "ARRAY",
                        items: { type: "STRING" },
                        description: "Ordered execution plan steps",
                      },
                    },
                    required: ["title", "steps"],
                  },
                },
                {
                  name: "write_code_files",
                  description: "Asynchronously generate or edit code files with Gemini Pro",
                  parameters: {
                    type: "OBJECT",
                    properties: {
                      path: { type: "STRING", description: "Target file path" },
                      prompt: { type: "STRING", description: "Detailed implementation prompt" },
                    },
                    required: ["path", "prompt"],
                  },
                },
                {
                  name: "connect_project",
                  description: "Bind a local workspace folder or project to the session",
                  parameters: {
                    type: "OBJECT",
                    properties: {
                      path: { type: "STRING", description: "Folder path to connect" },
                    },
                    required: ["path"],
                  },
                },
              ],
            },
          ],
        },
      })
    );
  }

  private async handleServerMessage(msg: Record<string, unknown>) {
    // 1. Server Barge-In / Interrupted signal
    if (msg.type === "serverContent.interrupted" || msg.type === "voice.interrupted" || msg.type === "execution.interrupt") {
      this.interruptAndFlushAudio();
      this.config.onInterrupted?.();
      return;
    }

    // 2. Transcripts
    if (msg.type === "transcript" || msg.type === "agent.narration") {
      const text = (msg.text as string) || (msg.payload as any)?.text || "";
      if (text) this.config.onTranscript?.(text, false);
    }

    // 3. Tool Calls (Dual-model delegation to Pro)
    if (msg.type === "tool_call" || msg.tool_call) {
      const call = (msg.tool_call || msg.payload) as { name: string; args: Record<string, unknown>; id: string };
      if (call && this.config.onToolCall) {
        const result = await this.config.onToolCall(call);
        this.sendToolResponse(call.id, result);
      }
    }
  }

  public sendToolResponse(callId: string, output: unknown) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(
      JSON.stringify({
        type: "tool_response",
        payload: {
          id: callId,
          response: output,
        },
      })
    );
  }

  /**
   * Start 16kHz PCM audio streaming from microphone
   */
  public async startMicrophone(): Promise<boolean> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx({ sampleRate: 16000 });

      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.processorNode = this.audioContext.createScriptProcessor(2048, 1, 1);

      this.processorNode.onaudioprocess = (e) => {
        // Acoustic feedback suppression: don't stream microphone if AI is speaking loudly
        if (this.isAiSpeaking && this.isMuted) return;

        const inputData = e.inputBuffer.getChannelData(0);
        // Convert Float32 to 16-bit PCM Linear
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(pcm16.buffer);
        }
      };

      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);
      this.config.onStatusChange?.("listening");
      return true;
    } catch (err) {
      console.warn("[GeminiLive] Mic access error:", err);
      return false;
    }
  }

  /**
   * Play streaming 24kHz PCM audio chunk seamlessly
   */
  public playAudioChunk(data: ArrayBuffer) {
    try {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioCtx({ sampleRate: 24000 });
      }

      if (this.audioContext.state === "suspended") {
        this.audioContext.resume();
      }

      // Convert 16-bit PCM to Float32 AudioBuffer
      const int16 = new Int16Array(data);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
      }

      const audioBuffer = this.audioContext.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);

      const currentTime = this.audioContext.currentTime;
      const startTime = Math.max(currentTime, this.nextPlaybackTime);
      source.start(startTime);
      this.nextPlaybackTime = startTime + audioBuffer.duration;

      this.scheduledAudioSources.push(source);
      this.isAiSpeaking = true;

      source.onended = () => {
        const idx = this.scheduledAudioSources.indexOf(source);
        if (idx > -1) this.scheduledAudioSources.splice(idx, 1);
        if (this.scheduledAudioSources.length === 0) {
          this.isAiSpeaking = false;
        }
      };
    } catch (e) {
      console.warn("[GeminiLive] Error playing audio chunk:", e);
    }
  }

  /**
   * Instantly drop and flush all audio playback queues (Barge-In)
   */
  public interruptAndFlushAudio() {
    for (const src of this.scheduledAudioSources) {
      try {
        src.stop();
        src.disconnect();
      } catch {}
    }
    this.scheduledAudioSources = [];
    if (this.audioContext) {
      this.nextPlaybackTime = this.audioContext.currentTime;
    }
    this.isAiSpeaking = false;
  }

  public disconnect() {
    this.interruptAndFlushAudio();
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.config.onStatusChange?.("disconnected");
  }
}
