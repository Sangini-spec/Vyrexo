const WebSocket = require("ws");
const crypto = require("crypto");
const { Readable } = require("stream");

const OUTPUT_FORMAT = {
  AUDIO_24KHZ_48KBITRATE_MONO_MP3: "audio-24khz-48kbitrate-mono-mp3",
};

class MsEdgeTTS {
  static TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
  static WSS_URL = "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1";
  static JSON_XML_DELIM = "\r\n\r\n";
  static AUDIO_DELIM = "Path:audio\r\n";
  static VOICE_LANG_REGEX = /\w{2}-\w{2}/;

  constructor() {
    this._ws = null;
    this._voice = null;
    this._outputFormat = null;
    this._voiceLocale = "en-US";
    this._streams = {};
  }

  static generateUUID() {
    return crypto.randomUUID().replace(/-/g, "");
  }

  static generateSecMsGec(trustedClientToken) {
    const ticks = Math.floor(Date.now() / 1000) + 11644473600;
    const rounded = ticks - (ticks % 300);
    const windowsTicks = rounded * 10000000;
    return crypto
      .createHash("sha256")
      .update(`${windowsTicks}${trustedClientToken}`)
      .digest("hex")
      .toUpperCase();
  }

  static getSynthUrl() {
    const reqId = MsEdgeTTS.generateUUID();
    const secMsGec = MsEdgeTTS.generateSecMsGec(MsEdgeTTS.TRUSTED_CLIENT_TOKEN);
    return `${MsEdgeTTS.WSS_URL}?TrustedClientToken=${MsEdgeTTS.TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${secMsGec}&Sec-MS-GEC-Version=1-143.0.3650.96&ConnectionId=${reqId}`;
  }

  async setMetadata(voiceName, outputFormat) {
    this._voice = voiceName;
    const match = MsEdgeTTS.VOICE_LANG_REGEX.exec(voiceName);
    this._voiceLocale = match ? match[0] : "en-US";
    this._outputFormat = outputFormat;
    await this._initClient();
  }

  _initClient() {
    const synthUrl = MsEdgeTTS.getSynthUrl();
    const ws = (this._ws = new WebSocket(synthUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0",
        Origin: "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
      },
    }));
    ws.binaryType = "arraybuffer";

    return new Promise((resolve, reject) => {
      ws.on("open", () => {
        const configMsg =
          `Content-Type:application/json; charset=utf-8\r\nPath:speech.config${MsEdgeTTS.JSON_XML_DELIM}` +
          JSON.stringify({
            context: {
              synthesis: {
                audio: {
                  metadataoptions: {
                    sentenceBoundaryEnabled: "false",
                    wordBoundaryEnabled: "false",
                  },
                  outputFormat: this._outputFormat,
                },
              },
            },
          });
        ws.send(configMsg, (err) => (err ? reject(err) : resolve()));
      });

      ws.on("message", (data, isBinary) => {
        const buffer = Buffer.from(data);
        const message = buffer.toString();
        const match = /X-RequestId:(.*?)\r\n/gm.exec(message);
        const requestId = match ? match[1] : null;
        if (!requestId || !this._streams[requestId]) return;

        if (message.includes("Path:turn.end")) {
          this._streams[requestId].turnEnded = true;
          this._streams[requestId].audio.push(null);
          try {
            ws.close();
          } catch {}
        } else if (message.includes("Path:audio") && isBinary) {
          const idx = buffer.indexOf(MsEdgeTTS.AUDIO_DELIM);
          if (idx !== -1) {
            const audioData = buffer.subarray(idx + MsEdgeTTS.AUDIO_DELIM.length);
            this._streams[requestId].audio.push(audioData);
          }
        }
      });

      ws.on("close", () => {
        for (const reqId of Object.keys(this._streams)) {
          const s = this._streams[reqId];
          if (s.turnEnded) {
            s.audio.push(null);
          } else {
            s.audio.destroy(new Error("WebSocket closed before turn.end"));
          }
        }
      });

      ws.on("error", (err) => reject(err));
    });
  }

  toStream(input, options = {}) {
    const pitch = options.pitch || "+0Hz";
    const rate = options.rate || "+0%";
    const volume = options.volume || 100.0;
    const escaped = input
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${this._voiceLocale}"><voice name="${this._voice}"><prosody pitch="${pitch}" rate="${rate}" volume="${volume}">${escaped}</prosody></voice></speak>`;
    const requestId = crypto.randomBytes(16).toString("hex");
    const request =
      `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml${MsEdgeTTS.JSON_XML_DELIM}` +
      ssml;

    const audioStream = new Readable({
      read() {},
    });
    this._streams[requestId] = { audio: audioStream, turnEnded: false };
    this._ws.send(request, (err) => {
      if (err) audioStream.destroy(err);
    });
    return { audioStream };
  }
}

const VOICE_MAP = {
  adam: "en-US-GuyNeural",
  brian: "en-US-BrianNeural",
  george: "en-US-RogerNeural",
  rachel: "en-US-JennyNeural",
  charlotte: "en-GB-SoniaNeural",
  nicole: "en-US-MichelleNeural",
  ryan: "en-GB-RyanNeural",
  ava: "en-US-AvaNeural",
  sonia: "en-GB-SoniaNeural",
};

async function main() {
  const chunks = [];
  process.stdin.on("data", (chunk) => chunks.push(chunk));
  process.stdin.on("end", async () => {
    try {
      const raw = Buffer.concat(chunks).toString("utf-8");
      if (!raw.trim()) {
        process.exit(1);
      }
      const data = JSON.parse(raw);
      const text = (data.text || "").trim();
      if (!text) {
        process.exit(1);
      }

      const voiceKey = (data.voice || "adam").toLowerCase().trim();
      let edgeVoice = VOICE_MAP.adam;
      for (const [key, val] of Object.entries(VOICE_MAP)) {
        if (voiceKey.includes(key)) {
          edgeVoice = val;
          break;
        }
      }

      let rateOffset = 0;
      if (data.speed === "slow") rateOffset -= 15;
      if (data.speed === "fast") rateOffset += 15;

      let pitchOffset = 0;
      const emotion = (data.emotion || "warm").toLowerCase();
      if (emotion === "empathetic") {
        rateOffset -= 8;
        pitchOffset -= 2;
      } else if (emotion === "upbeat") {
        rateOffset += 8;
        pitchOffset += 3;
      } else if (emotion === "calm") {
        rateOffset -= 5;
        pitchOffset -= 1;
      }

      const rateStr = rateOffset >= 0 ? `+${rateOffset}%` : `${rateOffset}%`;
      const pitchStr = pitchOffset >= 0 ? `+${pitchOffset}Hz` : `${pitchOffset}Hz`;

      const tts = new MsEdgeTTS();
      await tts.setMetadata(edgeVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      const { audioStream } = tts.toStream(text, { rate: rateStr, pitch: pitchStr });

      const audioChunks = [];
      audioStream.on("data", (chunk) => audioChunks.push(chunk));
      audioStream.on("end", () => {
        const audioBuffer = Buffer.concat(audioChunks);
        if (audioBuffer.length > 100) {
          process.stdout.write(audioBuffer);
          process.exit(0);
        } else {
          process.exit(2);
        }
      });
      audioStream.on("error", (err) => {
        process.stderr.write(`EdgeTTS stream error: ${err?.message || err}\n`);
        process.exit(3);
      });
    } catch (err) {
      process.stderr.write(`EdgeTTS worker error: ${err?.message || err}\n`);
      process.exit(4);
    }
  });
}

main();
