import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import connectDB from "@/lib/mongodb";
import CallLog, { type CallState, type CallType } from "@/models/CallLog";

const CALL_TYPES = ["inbound", "outbound"] as const;
const CALL_STATES = ["completed", "missed", "cancelled", "failed"] as const;
const HANGUP_ORIGINATORS = ["local", "remote", "system"] as const;

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

    const { sipSessionId, amdStatus, amdCause } = body;
    if (
      typeof sipSessionId !== "string" ||
      !sipSessionId.trim() ||
      sipSessionId.length > 200 ||
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

    await connectDB();
    const callLog = await CallLog.findOneAndUpdate(
      { userId: user.id, sipSessionId: sipSessionId.trim() },
      { $set: { amdStatus: amdStatus.trim(), amdCause: amdCause.trim() } },
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
      },
    });
  } catch (error: unknown) {
    console.error("Call logs AMD PATCH error:", error);
    return NextResponse.json(
      { error: "Could not update call log with AMD result" },
      { status: 500 },
    );
  }
}
