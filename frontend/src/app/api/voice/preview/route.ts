import { NextResponse } from "next/server";

// Generates a simple synthetic sound beep/tone WAV buffer for voice preview testing
function generateWavTone(freq = 440, durationSeconds = 0.5, sampleRate = 8000): Uint8Array {
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  // Generate sine wave samples with gentle envelope
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const env = Math.sin((Math.PI * i) / numSamples); // smooth window
    const sample = Math.sin(2 * Math.PI * freq * t) * 0.4 * env;
    const intSample = Math.floor(sample * 32767);
    view.setInt16(44 + i * 2, intSample, true);
  }

  return new Uint8Array(buffer);
}

export async function GET() {
  const wavBytes = generateWavTone(520, 0.4);
  return new Response(wavBytes.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "audio/wav",
      "Content-Length": wavBytes.byteLength.toString(),
      "Cache-Control": "public, max-age=3600",
    },
  });
}
