import { isAuthUser, type AuthSession } from "./auth-types";

const AUTH_SESSION_KEY = "react-dialer.session";
export const AUTH_SESSION_EVENT = "react-dialer:session-change";

export function getStoredAuthSession(): AuthSession | null {
  if (typeof window === "undefined") return null;

  const stored = window.localStorage.getItem(AUTH_SESSION_KEY);
  if (!stored) return null;

  try {
    const value: unknown = JSON.parse(stored);
    if (
      typeof value === "object" &&
      value !== null &&
      "token" in value &&
      typeof value.token === "string" &&
      "user" in value &&
      isAuthUser(value.user)
    ) {
      return { token: value.token, user: value.user };
    }
  } catch (error) {
    console.warn("[auth] Stored session data could not be read.", error);
  }

  window.localStorage.removeItem(AUTH_SESSION_KEY);
  return null;
}

export function saveAuthSession(session: AuthSession): void {
  window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(AUTH_SESSION_EVENT));
}

export function clearAuthSession(): void {
  window.localStorage.removeItem(AUTH_SESSION_KEY);
  window.dispatchEvent(new Event(AUTH_SESSION_EVENT));
}
