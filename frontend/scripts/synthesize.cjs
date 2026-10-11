const { MsEdgeTTS, OUTPUT_FORMAT } = require("msedge-tts");

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
