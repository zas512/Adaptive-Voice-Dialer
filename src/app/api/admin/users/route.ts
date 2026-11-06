import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getCurrentUser } from "@/lib/auth-server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

async function assertAdmin(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

function sanitizeUser(user: typeof User.prototype) {
  return {
    id: (user._id as mongoose.Types.ObjectId).toString(),
    name: user.name ?? "",
    email: user.email,
    role: user.role,
    number: user.number ?? "",
    extensionId: user.extensionId ?? "",
    host: user.host ?? "",
    port: user.port ?? null,
    secret: user.secret ?? "",
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function GET(request: NextRequest) {
  const authError = await assertAdmin(request);
  if (authError) return authError;

  await connectDB();

  const users = await User.find().sort({ createdAt: -1 }).lean();

  return NextResponse.json(users.map((user) => sanitizeUser(user as any)));
}

export async function POST(request: NextRequest) {
  const authError = await assertAdmin(request);
  if (authError) return authError;

  const body = await request.json();
  const {
    email,
    password,
    name,
    role,
    number,
    extensionId,
    host,
    port,
    secret,
  } = body;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  await connectDB();

  const existing = await User.findOne({ email });
  if (existing) {
    return NextResponse.json(
      { error: "User with this email already exists" },
      { status: 400 }
    );
  }

  const user = await User.create({
    email,
    password,
    name,
    role: role ?? "user",
    number,
    extensionId,
    host,
    port,
    secret,
  });

  return NextResponse.json(sanitizeUser(user));
}

export async function PUT(request: NextRequest) {
  const authError = await assertAdmin(request);
  if (authError) return authError;

  const body = await request.json();
  const {
    id,
    email,
    password,
    name,
    role,
    number,
    extensionId,
    host,
    port,
    secret,
  } = body;

  if (!id) {
    return NextResponse.json({ error: "User id is required" }, { status: 400 });
  }

  await connectDB();

  const user = await User.findById(id).select("+password");

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (email) {
    const duplicate = await User.findOne({ email, _id: { $ne: id } });
    if (duplicate) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 400 }
      );
    }
    user.email = email;
  }

  if (name !== undefined) user.name = name;
  if (role) user.role = role;
  if (number !== undefined) user.number = number;
  if (extensionId !== undefined) user.extensionId = extensionId;
  if (host !== undefined) user.host = host;
  if (port !== undefined) user.port = port;
  if (secret !== undefined) user.secret = secret;

  if (password) {
    user.password = password;
  }

  await user.save();

  return NextResponse.json(sanitizeUser(user));
}
