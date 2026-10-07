import { getCurrentUser } from "@/lib/auth-server";
export default async function HomePageServer() {
  const user = await getCurrentUser();
  return <div>User: {user?.name || "Guest"}</div>;
}
