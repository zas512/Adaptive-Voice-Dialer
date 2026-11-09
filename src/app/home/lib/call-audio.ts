"use client";

const SAMPLE_RATE = 16_000;
const MAX_DURATION_SECONDS = 5;

export type CallAudioCapture = {
  result: Promise<Blob | null>;
  stop: () => void;
};

function encodeWav(samples: Float32Array, sourceSampleRate: number): Blob {
  const outputLength = Math.floor(
    (samples.length * SAMPLE_RATE) / sourceSampleRate,
  );
  const buffer = new ArrayBuffer(44 + outputLength * 2);
  const view = new DataView(buffer);
  const writeString = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + outputLength * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, outputLength * 2, true);

  for (let index = 0; index < outputLength; index += 1) {
    const sourceIndex = (index * sourceSampleRate) / SAMPLE_RATE;
    const lowerIndex = Math.floor(sourceIndex);
    const upperIndex = Math.min(lowerIndex + 1, samples.length - 1);
    const fraction = sourceIndex - lowerIndex;
    const sample =
      samples[lowerIndex] * (1 - fraction) + samples[upperIndex] * fraction;
    const clipped = Math.max(-1, Math.min(1, sample));
    view.setInt16(
      44 + index * 2,
      clipped < 0 ? clipped * 0x8000 : clipped * 0x7fff,
      true,
    );
  }

  return new Blob([buffer], { type: "audio/wav" });
}

export function captureFirstFiveSeconds(stream: MediaStream): CallAudioCapture {
  const context = new AudioContext();
  const sourceSampleRate = context.sampleRate;
  const source = context.createMediaStreamSource(stream);
  const processor = context.createScriptProcessor(4096, 1, 1);
  const silentOutput = context.createGain();
  silentOutput.gain.value = 0;

  const maxSamples = context.sampleRate * MAX_DURATION_SECONDS;
  const chunks: Float32Array[] = [];
  let capturedSamples = 0;
  let finished = false;
  let resolveResult: (blob: Blob | null) => void = () => {};
  const result = new Promise<Blob | null>((resolve) => {
    resolveResult = resolve;
  });

  const finish = () => {
    if (finished) return;
    finished = true;
    processor.onaudioprocess = null;
    source.disconnect();
    processor.disconnect();
    silentOutput.disconnect();
    void context.close();

    if (capturedSamples === 0) {
      resolveResult(null);
      return;
    }

    const samples = new Float32Array(capturedSamples);
    let offset = 0;
    for (const chunk of chunks) {
      samples.set(chunk, offset);
      offset += chunk.length;
    }
    resolveResult(encodeWav(samples, sourceSampleRate));
  };

  processor.onaudioprocess = (event) => {
    if (finished) return;
    const input = event.inputBuffer.getChannelData(0);
    const remaining = maxSamples - capturedSamples;
    const sampleCount = Math.min(input.length, remaining);
    if (sampleCount > 0) {
      chunks.push(input.slice(0, sampleCount));
      capturedSamples += sampleCount;
    }
    if (capturedSamples >= maxSamples) finish();
  };

  source.connect(processor);
  processor.connect(silentOutput);
  silentOutput.connect(context.destination);
  if (context.state === "suspended") {
    void context.resume().catch((error: unknown) => {
      console.warn("[call][AI] Audio context could not resume.", error);
      finish();
    });
  }

  return { result, stop: finish };
}
