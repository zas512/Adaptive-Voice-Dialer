export type UserRole = "user" | "agent" | "admin";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  number?: string;
  extensionId?: string;
  host?: string;
  port?: number;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

export function isAuthUser(value: unknown): value is AuthUser {
  if (typeof value !== "object" || value === null) return false;

  const user = value as Record<string, unknown>;
  return (
    typeof user.id === "string" &&
    typeof user.email === "string" &&
    typeof user.name === "string" &&
    (user.role === "user" || user.role === "agent" || user.role === "admin")
  );
}
