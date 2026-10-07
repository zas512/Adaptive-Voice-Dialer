import { getCurrentUser } from "@/lib/auth-server";

export default async function HomePageServer() {
  const user = await getCurrentUser();

  return (
    <div>
      <p>User: {user?.name ?? "Guest"}</p>
    </div>
  );
}
