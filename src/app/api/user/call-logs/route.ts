import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import connectDB from "@/lib/mongodb";
import CallLog, { type CallState, type CallType } from "@/models/CallLog";

const CALL_TYPES = ["inbound", "outbound"] as const;
const CALL_STATES = [
  "in_progress",
  "completed",
  "missed",
  "cancelled",
  "failed",
] as const;
const HANGUP_ORIGINATORS = ["local", "remote", "system"] as const;
const AI_CLASSIFICATIONS = ["ai", "human", "voicemail"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCallType(value: unknown): value is CallType {
  return CALL_TYPES.some((callType) => callType === value);
}

function isCallState(value: unknown): value is CallState {
  return CALL_STATES.some((callState) => callState === value);
}

function isHangupOriginator(
  value: unknown,
): value is (typeof HANGUP_ORIGINATORS)[number] {
  return HANGUP_ORIGINATORS.some((originator) => originator === value);
}

function isDuration(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isAIInference(value: unknown): value is {
  transcription: string;
  model: string;
  classification: {
    classification: "ai" | "human" | "voicemail";
    confidence: number;
    reasoning: string;
  };
  classificationModel: string;
  sampleRate: number;
  channels: number;
  analyzedAt: string;
} {
  if (!isRecord(value) || !isRecord(value.classification)) return false;
  const classification = value.classification;
  return (
    typeof value.transcription === "string" &&
    value.transcription.length <= 20_000 &&
    typeof value.model === "string" &&
    value.model.length <= 100 &&
    AI_CLASSIFICATIONS.some((item) => item === classification.classification) &&
    typeof classification.confidence === "number" &&
    Number.isFinite(classification.confidence) &&
    classification.confidence >= 0 &&
    classification.confidence <= 1 &&
    typeof classification.reasoning === "string" &&
    classification.reasoning.length <= 2000 &&
    typeof value.classificationModel === "string" &&
    value.classificationModel.length <= 100 &&
    value.sampleRate === 16_000 &&
    value.channels === 1 &&
    typeof value.analyzedAt === "string" &&
    !Number.isNaN(Date.parse(value.analyzedAt))
  );
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const callLogs = await CallLog.find({ userId: user.id })
      .sort({ endedAt: -1 })
      .lean();

    return NextResponse.json({
      callLogs: callLogs.map((callLog) => ({
        id: callLog._id.toString(),
        sipSessionId: callLog.sipSessionId,
        phoneNumber: callLog.phoneNumber,
        callType: callLog.callType,
        callState: callLog.callState,
        amdStatus: callLog.amdStatus ?? null,
        amdCause: callLog.amdCause ?? null,
        aiInference: callLog.aiInference ?? null,
        cancelReason: callLog.cancelReason,
        hangupBy: callLog.hangupBy,
        startedAt: callLog.startedAt,
        answeredAt: callLog.answeredAt,
        endedAt: callLog.endedAt,
        durationSeconds: callLog.durationSeconds,
      })),
    });
  } catch (error: unknown) {
    console.error("Call logs GET error:", error);
    return NextResponse.json(
      { error: "Could not load call logs" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!isRecord(body)) {
      return NextResponse.json({ error: "Invalid call log" }, { status: 400 });
    }

    const {
      sipSessionId,
      phoneNumber,
      callType,
      callState,
      amdStatus,
      amdCause,
      cancelReason,
      hangupBy,
      startedAt,
      answeredAt,
      endedAt,
      durationSeconds,
    } = body;

    const parsedStartedAt = parseDate(startedAt);
    const parsedAnsweredAt = answeredAt === null ? null : parseDate(answeredAt);
    const parsedEndedAt = parseDate(endedAt);
    const validCancelReason =
      cancelReason === null ||
      (typeof cancelReason === "string" && cancelReason.length <= 500);
    const validAMDValue = (value: unknown) =>
      value === undefined ||
      value === null ||
      (typeof value === "string" && value.length <= 100);

    if (
      typeof sipSessionId !== "string" ||
      !sipSessionId.trim() ||
      sipSessionId.length > 200 ||
      typeof phoneNumber !== "string" ||
      !phoneNumber.trim() ||
      phoneNumber.length > 100 ||
      !isCallType(callType) ||
      !isCallState(callState) ||
      !validAMDValue(amdStatus) ||
      !validAMDValue(amdCause) ||
      !validCancelReason ||
      (hangupBy !== null && !isHangupOriginator(hangupBy)) ||
      !parsedStartedAt ||
      (answeredAt !== null && !parsedAnsweredAt) ||
      !parsedEndedAt ||
      parsedEndedAt < parsedStartedAt ||
      (parsedAnsweredAt !== null &&
        (parsedAnsweredAt < parsedStartedAt ||
          parsedAnsweredAt > parsedEndedAt)) ||
      !isDuration(durationSeconds)
    ) {
      return NextResponse.json(
        { error: "Call log fields are invalid" },
        { status: 400 },
      );
    }

    await connectDB();
    const callLog = await CallLog.create({
      userId: user.id,
      sipSessionId: sipSessionId.trim(),
      phoneNumber: phoneNumber.trim(),
      callType,
      callState,
      amdStatus:
        typeof amdStatus === "string" ? amdStatus.trim() || null : null,
      amdCause: typeof amdCause === "string" ? amdCause.trim() || null : null,
      aiInference: null,
      cancelReason:
        typeof cancelReason === "string" ? cancelReason.trim() || null : null,
      hangupBy: hangupBy ?? null,
      startedAt: parsedStartedAt,
      answeredAt: parsedAnsweredAt,
      endedAt: parsedEndedAt,
      durationSeconds,
    });

    return NextResponse.json(
      {
        callLog: {
          id: callLog._id.toString(),
          sipSessionId: callLog.sipSessionId,
          phoneNumber: callLog.phoneNumber,
          callType: callLog.callType,
          callState: callLog.callState,
          amdStatus: callLog.amdStatus,
          amdCause: callLog.amdCause,
          aiInference: callLog.aiInference,
          cancelReason: callLog.cancelReason,
          hangupBy: callLog.hangupBy,
          startedAt: callLog.startedAt,
          answeredAt: callLog.answeredAt,
          endedAt: callLog.endedAt,
          durationSeconds: callLog.durationSeconds,
        },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("Call logs POST error:", error);
    return NextResponse.json(
      { error: "Could not save call log" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!isRecord(body)) {
      return NextResponse.json(
        { error: "Invalid AMD call log update" },
        { status: 400 },
      );
    }

    const { sipSessionId } = body;
    if (
      typeof sipSessionId !== "string" ||
      !sipSessionId.trim() ||
      sipSessionId.length > 200
    ) {
      return NextResponse.json(
        { error: "Call log update fields are invalid" },
        { status: 400 },
      );
    }

    const updates: Record<string, unknown> = {};
    if ("amdStatus" in body || "amdCause" in body) {
      const { amdStatus, amdCause } = body;
      if (
        typeof amdStatus !== "string" ||
        !amdStatus.trim() ||
        amdStatus.length > 100 ||
        typeof amdCause !== "string" ||
        !amdCause.trim() ||
        amdCause.length > 100
      ) {
        return NextResponse.json(
          { error: "AMD call log fields are invalid" },
          { status: 400 },
        );
      }
      updates.amdStatus = amdStatus.trim();
      updates.amdCause = amdCause.trim();
    }

    if ("aiInference" in body) {
      if (!isAIInference(body.aiInference)) {
        return NextResponse.json(
          { error: "AI inference fields are invalid" },
          { status: 400 },
        );
      }
      updates.aiInference = {
        ...body.aiInference,
        analyzedAt: new Date(body.aiInference.analyzedAt),
      };
    }

    if ("callState" in body) {
      if (!isCallState(body.callState) || body.callState === "in_progress") {
        return NextResponse.json(
          { error: "Call state update is invalid" },
          { status: 400 },
        );
      }
      updates.callState = body.callState;
    }

    if ("answeredAt" in body) {
      const answeredAt =
        body.answeredAt === null ? null : parseDate(body.answeredAt);
      if (body.answeredAt !== null && !answeredAt) {
        return NextResponse.json(
          { error: "Answered time is invalid" },
          { status: 400 },
        );
      }
      updates.answeredAt = answeredAt;
    }

    if ("endedAt" in body) {
      const endedAt = parseDate(body.endedAt);
      if (!endedAt) {
        return NextResponse.json(
          { error: "Ended time is invalid" },
          { status: 400 },
        );
      }
      updates.endedAt = endedAt;
    }

    if ("durationSeconds" in body) {
      if (!isDuration(body.durationSeconds)) {
        return NextResponse.json(
          { error: "Call duration is invalid" },
          { status: 400 },
        );
      }
      updates.durationSeconds = body.durationSeconds;
    }

    if ("cancelReason" in body) {
      if (
        body.cancelReason !== null &&
        (typeof body.cancelReason !== "string" ||
          body.cancelReason.length > 500)
      ) {
        return NextResponse.json(
          { error: "Call cancellation reason is invalid" },
          { status: 400 },
        );
      }
      updates.cancelReason =
        typeof body.cancelReason === "string"
          ? body.cancelReason.trim() || null
          : null;
    }

    if ("hangupBy" in body) {
      if (body.hangupBy !== null && !isHangupOriginator(body.hangupBy)) {
        return NextResponse.json(
          { error: "Call hangup originator is invalid" },
          { status: 400 },
        );
      }
      updates.hangupBy = body.hangupBy;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No call log fields were provided for update" },
        { status: 400 },
      );
    }

    await connectDB();
    const callLog = await CallLog.findOneAndUpdate(
      { userId: user.id, sipSessionId: sipSessionId.trim() },
      { $set: updates },
      { new: true },
    ).lean();

    if (!callLog) {
      return NextResponse.json(
        { error: "Call log not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      callLog: {
        id: callLog._id.toString(),
        sipSessionId: callLog.sipSessionId,
        amdStatus: callLog.amdStatus,
        amdCause: callLog.amdCause,
        aiInference: callLog.aiInference ?? null,
        callState: callLog.callState,
        endedAt: callLog.endedAt,
        durationSeconds: callLog.durationSeconds,
      },
    });
  } catch (error: unknown) {
    console.error("Call logs PATCH error:", error);
    return NextResponse.json(
      { error: "Could not update call log" },
      { status: 500 },
    );
  }
}
