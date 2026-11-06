import mongoose from "mongoose";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import connectDB from "@/lib/mongodb";
import KycRecord, { type KycStatus } from "@/models/KycRecord";

const KYC_STATUSES: readonly KycStatus[] = [
  "pending-review",
  "verified",
  "requires-action",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isKycStatus(value: unknown): value is KycStatus {
  return KYC_STATUSES.some((status) => status === value);
}

function serializeRecord(record: {
  _id: mongoose.Types.ObjectId;
  name: string;
  contact: string;
  status: KycStatus;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: record._id.toString(),
    name: record.name,
    contact: record.contact,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

async function getOwnerId(request: Request) {
  const user = await getCurrentUser(request);
  if (!user?.id || !mongoose.isValidObjectId(user.id)) return null;
  return user.id;
}

export async function GET(request: Request) {
  try {
    const ownerId = await getOwnerId(request);
    if (!ownerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const records = await KycRecord.find({ userId: ownerId })
      .sort({ updatedAt: -1 })
      .limit(200)
      .lean();

    return NextResponse.json({ clients: records.map(serializeRecord) });
  } catch (error: unknown) {
    console.error("KYC records GET error:", error);
    return NextResponse.json(
      { error: "Could not load client records." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const ownerId = await getOwnerId(request);
    if (!ownerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    if (!isRecord(body)) {
      return NextResponse.json({ error: "Invalid client data." }, { status: 400 });
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const contact = typeof body.contact === "string" ? body.contact.trim() : "";
    if (!name || name.length > 160) {
      return NextResponse.json(
        { error: "Client name is required and must be 160 characters or fewer." },
        { status: 400 },
      );
    }
    if (!contact || contact.length > 254) {
      return NextResponse.json(
        { error: "Primary contact is required and must be 254 characters or fewer." },
        { status: 400 },
      );
    }

    await connectDB();
    const record = await KycRecord.create({
      userId: ownerId,
      name,
      contact,
      status: "pending-review",
    });

    return NextResponse.json(
      { client: serializeRecord(record) },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("KYC record POST error:", error);
    return NextResponse.json(
      { error: "Could not create client record." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const ownerId = await getOwnerId(request);
    if (!ownerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    if (!isRecord(body)) {
      return NextResponse.json({ error: "Invalid review data." }, { status: 400 });
    }

    const id = typeof body.id === "string" ? body.id : "";
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid client record ID." }, { status: 400 });
    }
    if (!isKycStatus(body.status)) {
      return NextResponse.json({ error: "Choose a valid review status." }, { status: 400 });
    }

    await connectDB();
    const record = await KycRecord.findOneAndUpdate(
      { _id: id, userId: ownerId },
      { $set: { status: body.status } },
      { new: true, runValidators: true },
    ).lean();

    if (!record) {
      return NextResponse.json({ error: "Client record not found." }, { status: 404 });
    }

    return NextResponse.json({
      client: serializeRecord(record),
    });
  } catch (error: unknown) {
    console.error("KYC record PATCH error:", error);
    return NextResponse.json(
      { error: "Could not save the review status." },
      { status: 500 },
    );
  }
}
