import mongoose from "mongoose";
import User from "@/models/User";
import { verifyAuthToken } from "./auth-token";
import type { AuthUser } from "./auth-types";
import connectDB from "./mongodb";

export async function getCurrentUser(
  request: Request,
): Promise<AuthUser | null> {
  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;

  const userId = verifyAuthToken(token);
  if (!userId || !mongoose.isValidObjectId(userId)) return null;

  await connectDB();
  const user = await User.findById(userId).select("-password -secret").lean();
  if (!user) return null;

  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name ?? "",
    role: user.role,
    number: user.number,
    extensionId: user.extensionId,
    host: user.host,
    port: user.port,
  };
}

export async function getUserFromDB(userId: string) {
  await connectDB();
  const user = await User.findById(userId).select("-password");
  return user;
}
