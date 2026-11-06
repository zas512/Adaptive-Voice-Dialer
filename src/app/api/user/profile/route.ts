import mongoose from "mongoose";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getCurrentUser, getUserFromDB } from "@/lib/auth-server";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function serializeProfile(user: NonNullable<Awaited<ReturnType<typeof getUserFromDB>>>) {
  return {
    id: user._id.toString(),
    name: user.name ?? "",
    email: user.email,
    role: user.role,
    number: user.number ?? "",
    extensionId: user.extensionId ?? "",
    host: user.host ?? "",
    port: user.port ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.id || !mongoose.isValidObjectId(user.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const fullUser = await getUserFromDB(user.id);
    if (!fullUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user: serializeProfile(fullUser) });
  } catch (error: unknown) {
    console.error("Profile error:", error);
    return NextResponse.json(
      { error: "Could not load profile." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id || !mongoose.isValidObjectId(user.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    if (!isRecord(body)) {
      return NextResponse.json({ error: "Invalid profile data." }, { status: 400 });
    }

    const updates: { name?: string; number?: string } = {};
    if ("name" in body) {
      if (typeof body.name !== "string" || body.name.trim().length > 100) {
        return NextResponse.json(
          { error: "Name must be 100 characters or fewer." },
          { status: 400 },
        );
      }
      updates.name = body.name.trim();
    }
    if ("number" in body) {
      if (typeof body.number !== "string" || body.number.trim().length > 40) {
        return NextResponse.json(
          { error: "Direct number must be 40 characters or fewer." },
          { status: 400 },
        );
      }
      updates.number = body.number.trim();
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "Provide a name or direct number to update." },
        { status: 400 },
      );
    }
    if (updates.name !== undefined && !updates.name) {
      return NextResponse.json(
        { error: "Name cannot be empty." },
        { status: 400 },
      );
    }

    const fullUser = await getUserFromDB(user.id);
    if (!fullUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    fullUser.set(updates);
    await fullUser.save();

    return NextResponse.json({ user: serializeProfile(fullUser) });
  } catch (error: unknown) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Could not save profile changes." },
      { status: 500 },
    );
  }
}
