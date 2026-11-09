import { pipeline } from "@xenova/transformers";
import { type NextRequest, NextResponse } from "next/server";
import { Ollama } from "ollama";
import { WaveFile } from "wavefile";
import { getCurrentUser } from "@/lib/auth-server";

export const runtime = "nodejs";

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const MODEL_ID = "Xenova/whisper-base";
const CLASSIFICATION_MODEL_ID = "qwen2.5:1.5b";
const ollama = new Ollama({
  host: process.env.OLLAMA_HOST || "http://127.0.0.1:11434",
});
const CLASSIFICATION_SCHEMA = {
  type: "object",
  properties: {
    classification: {
      type: "string",
      enum: ["ai", "human", "voicemail"],
    },
    confidence: {
      type: "number",
      description: "Confidence score from 0.0 to 1.0",
    },
    reasoning: {
      type: "string",
      description:
        "Short explanation based only on patterns in the transcription",
    },
  },
  required: ["classification", "confidence", "reasoning"],
  additionalProperties: false,
};

const CLASSIFICATION_SYSTEM_PROMPT = `Classify only the style and purpose evident in the transcription. Categories:
- "ai": synthetic text, highly promotional scripts, perfectly structured lists, or rigid introductory/educational narration. A human voice reading a prepared marketing script is still "ai" for this text-based classification.
- "human": spontaneous personal conversation, colloquial fillers, back-and-forth, or self-corrections actually present in the transcription.
- "voicemail": answering-machine messages, missed-call notifications, or requests to leave a message.
Never invent fillers, hesitation, or self-correction that are not present in the transcription. Example: "Welcome to our free online resource. In this recording, we will walk you through every aspect of the platform and explain the formats we offer." => "ai", because it is polished promotional/educational narration.
Return one category, confidence from 0 to 1, and short evidence-based reasoning.`;

function createTranscriber() {
  console.info(`[transcription] Loading ${MODEL_ID}.`);
  return pipeline("automatic-speech-recognition", MODEL_ID);
}

type Transcriber = Awaited<ReturnType<typeof createTranscriber>>;

let transcriberPromise: Promise<Transcriber> | null = null;

function getTranscriber() {
  transcriberPromise ??= createTranscriber().catch((error: unknown) => {
    transcriberPromise = null;
    throw error;
  });
  return transcriberPromise;
}

async function classifyTranscription(transcription: string) {
  const response = await ollama.chat({
    model: CLASSIFICATION_MODEL_ID,
    messages: [
      { role: "system", content: CLASSIFICATION_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Classify this speech transcription:\n"""${transcription}"""`,
      },
    ],
    format: CLASSIFICATION_SCHEMA,
    stream: false,
    options: { temperature: 0 },
  });

  const result: unknown = JSON.parse(response.message.content);
  if (
    typeof result !== "object" ||
    result === null ||
    !("classification" in result) ||
    !("confidence" in result) ||
    !("reasoning" in result) ||
    (result.classification !== "ai" &&
      result.classification !== "human" &&
      result.classification !== "voicemail") ||
    typeof result.confidence !== "number" ||
    !Number.isFinite(result.confidence) ||
    result.confidence < 0 ||
    result.confidence > 1 ||
    typeof result.reasoning !== "string"
  ) {
    throw new TypeError(
      "Ollama returned a classification with an invalid shape.",
    );
  }

  return {
    classification: result.classification,
    confidence: result.confidence,
    reasoning: result.reasoning,
  };
}

async function readRequestBody(
  request: NextRequest,
): Promise<Uint8Array | NextResponse> {
  if (!request.body) {
    return NextResponse.json({ error: "Audio file is empty" }, { status: 400 });
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    totalBytes += value.byteLength;
    if (totalBytes > MAX_AUDIO_BYTES) {
      await reader.cancel();
      return NextResponse.json(
        { error: "Audio file exceeds the 10 MiB limit" },
        { status: 413 },
      );
    }

    chunks.push(value);
  }

  if (totalBytes === 0) {
    return NextResponse.json({ error: "Audio file is empty" }, { status: 400 });
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function decodeWav(bytes: Uint8Array): Float32Array {
  const wav = new WaveFile(bytes);
  const format = wav.fmt as { numChannels?: unknown };
  const channelCount = format.numChannels;
  if (
    typeof channelCount !== "number" ||
    !Number.isInteger(channelCount) ||
    channelCount < 1
  ) {
    throw new TypeError("The WAV file has an invalid channel count.");
  }

  wav.toBitDepth("32f");
  wav.toSampleRate(16_000);
  const interleavedSamples = wav.getSamples(true);
  const frameCount = Math.floor(interleavedSamples.length / channelCount);
  if (frameCount === 0) {
    throw new TypeError("The WAV file contains no audio samples.");
  }

  const monoSamples = new Float32Array(frameCount);
  for (let frame = 0; frame < frameCount; frame += 1) {
    let mixedSample = 0;
    for (let channel = 0; channel < channelCount; channel += 1) {
      mixedSample += interleavedSamples[frame * channelCount + channel];
    }
    monoSamples[frame] = mixedSample / channelCount;
  }
  return monoSamples;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") ?? "";
    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { error: "Audio upload exceeds the 10 MiB limit" },
        { status: 413 },
      );
    }

    let audioBytes: Uint8Array;
    let fileName: string | null = null;
    if (contentType.toLowerCase().startsWith("multipart/form-data")) {
      const formData = await request.formData();
      const audioFile = formData.get("audio") ?? formData.get("file");
      if (typeof audioFile === "string" || !audioFile) {
        return NextResponse.json(
          { error: 'Attach a WAV file in the multipart field "audio".' },
          { status: 400 },
        );
      }
      if (audioFile.size === 0) {
        return NextResponse.json(
          { error: "Audio file is empty" },
          { status: 400 },
        );
      }
      if (audioFile.size > MAX_AUDIO_BYTES) {
        return NextResponse.json(
          { error: "Audio file exceeds the 10 MiB limit" },
          { status: 413 },
        );
      }

      fileName = audioFile.name || null;
      audioBytes = new Uint8Array(await audioFile.arrayBuffer());
    } else if (
      contentType.toLowerCase().startsWith("audio/") ||
      contentType.toLowerCase() === "application/octet-stream"
    ) {
      const body = await readRequestBody(request);
      if (body instanceof NextResponse) return body;
      audioBytes = body;
    } else {
      return NextResponse.json(
        {
          error:
            "Send a WAV file as multipart form data in the audio field, or as a raw audio/wav body.",
        },
        { status: 415 },
      );
    }

    let audio: Float32Array;
    try {
      audio = decodeWav(audioBytes);
    } catch (error: unknown) {
      console.warn("[transcription] Uploaded audio is not a valid WAV file.", {
        fileName,
        error,
      });
      return NextResponse.json(
        {
          error:
            "Unsupported or invalid audio. Upload a PCM WAV file; MP3/WebM conversion is not configured.",
        },
        { status: 415 },
      );
    }

    const transcriber = await getTranscriber();
    const result = await transcriber(audio, {
      chunk_length_s: 30,
      stride_length_s: 5,
    });
    const transcription = Array.isArray(result)
      ? result.map(({ text }) => text).join(" ")
      : result.text;

    let analysis: Awaited<ReturnType<typeof classifyTranscription>>;
    try {
      analysis = await classifyTranscription(transcription);
    } catch (error: unknown) {
      console.error("[classification] Ollama request failed.", error);
      return NextResponse.json(
        {
          error:
            "Transcription succeeded, but transcript classification failed",
          transcription,
          model: MODEL_ID,
          classificationModel: CLASSIFICATION_MODEL_ID,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      transcription,
      model: MODEL_ID,
      classification: analysis,
      classificationModel: CLASSIFICATION_MODEL_ID,
      sampleRate: 16_000,
      channels: 1,
      fileName,
    });
  } catch (error: unknown) {
    console.error("[transcription] Audio transcription failed.", error);
    return NextResponse.json(
      { error: "Could not transcribe audio" },
      { status: 500 },
    );
  }
}
