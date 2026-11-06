import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { createAuthToken } from "@/lib/auth-token";
import User from "@/models/User";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    if (
      !isRecord(body) ||
      typeof body.email !== "string" ||
      typeof body.password !== "string" ||
      !body.email.trim() ||
      !body.password
    ) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 },
      );
    }

    await connectDB();
    const user = await User.findOne({
      email: body.email.trim().toLowerCase(),
    }).select("+password");
    if (!user || !(await bcrypt.compare(body.password, user.password))) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    const userId = (user._id as mongoose.Types.ObjectId).toString();
    const token = createAuthToken(userId);

    return NextResponse.json({
      token,
      user: {
        id: userId,
        email: user.email,
        name: user.name ?? "",
        role: user.role,
        number: user.number,
        extensionId: user.extensionId,
        host: user.host,
        port: user.port,
      },
    });
  } catch (error) {
    console.error("[auth] Sign-in failed.", error);
    return NextResponse.json(
      { error: "Could not sign in right now. Please try again." },
      { status: 500 },
    );
  }
}
