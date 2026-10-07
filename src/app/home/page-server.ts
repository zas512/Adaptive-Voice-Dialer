import { getCurrentUser } from "@/lib/auth-server";
import React from "react";
export default async function HomePageServer() {
  const user = await getCurrentUser();
  return <div>User: {user?.name ?? "Guest"}</div>;
}
