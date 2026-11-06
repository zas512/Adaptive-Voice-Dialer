import { NextResponse } from "next/server";
import { getCurrentUser, getUserFromDB } from "@/lib/auth-server";

/**
 * GET /api/user/profile
 * Get current user profile
 * Requires authentication
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get full user data from database
    const fullUser = await getUserFromDB(user.id);

    if (!fullUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: fullUser._id.toString(),
        name: fullUser.name,
        email: fullUser.email,
        role: fullUser.role,
        number: fullUser.number,
        extensionId: fullUser.extensionId,
        host: fullUser.host,
        port: fullUser.port,
        secret: fullUser.secret,
        createdAt: fullUser.createdAt,
      },
    });
  } catch (error: unknown) {
    console.error("Profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
