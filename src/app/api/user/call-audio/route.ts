import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";

const MAX_CHUNK_BYTES = 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("audio/")) {
      return NextResponse.json(
        { error: "Content-Type must be an audio media type" },
        { status: 415 },
      );
    }

    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_CHUNK_BYTES) {
      return NextResponse.json(
        { error: "Audio chunk exceeds the 1 MiB limit" },
        { status: 413 },
      );
    }

    if (!request.body) {
      return NextResponse.json(
        { error: "Audio chunk is empty" },
        { status: 400 },
      );
    }

    const reader = request.body.getReader();
    let receivedBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      receivedBytes += value.byteLength;
      if (receivedBytes > MAX_CHUNK_BYTES) {
        await reader.cancel();
        return NextResponse.json(
          { error: "Audio chunk exceeds the 1 MiB limit" },
          { status: 413 },
        );
      }
    }

    if (receivedBytes === 0) {
      return NextResponse.json(
        { error: "Audio chunk is empty" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        accepted: true,
        receivedBytes,
        contentType,
        stored: false,
        transcription: "not-configured",
      },
      { status: 202 },
    );
  } catch (error: unknown) {
    console.error("Call audio chunk POST error:", error);
    return NextResponse.json(
      { error: "Could not receive audio chunk" },
      { status: 500 },
    );
  }
}
