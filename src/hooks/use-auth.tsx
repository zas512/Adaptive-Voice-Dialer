"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  AUTH_SESSION_EVENT,
  clearAuthSession,
  getStoredAuthSession,
  saveAuthSession,
} from "@/lib/auth-client";
import { type AuthSession, type AuthUser, isAuthUser } from "@/lib/auth-types";

interface AuthContextValue {
  session: AuthSession | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const syncSession = () => setSession(getStoredAuthSession());
    window.addEventListener(AUTH_SESSION_EVENT, syncSession);
    window.addEventListener("storage", syncSession);

    const storedSession = getStoredAuthSession();
    setSession(storedSession);
    if (!storedSession) {
      setIsLoading(false);
    } else {
      void (async () => {
        try {
          const response = await fetch("/api/auth/me", {
            headers: { Authorization: `Bearer ${storedSession.token}` },
          });
          if (response.status === 401) {
            clearAuthSession();
            return;
          }
          if (!response.ok) {
            throw new Error(`Could not validate session (${response.status}).`);
          }

          const result: unknown = await response.json();
          if (
            typeof result !== "object" ||
            result === null ||
            !("user" in result) ||
            !isAuthUser(result.user)
          ) {
            throw new Error("The session validation response was invalid.");
          }

          const refreshedSession = {
            token: storedSession.token,
            user: result.user,
          };
          saveAuthSession(refreshedSession);
          if (active) setSession(refreshedSession);
        } catch (error) {
          console.error("[auth] Could not validate the stored session.", error);
        } finally {
          if (active) setIsLoading(false);
        }
      })();
    }

    return () => {
      active = false;
      window.removeEventListener(AUTH_SESSION_EVENT, syncSession);
      window.removeEventListener("storage", syncSession);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  const user: AuthUser | null = context.session?.user ?? null;
  const status = context.isLoading
    ? "loading"
    : context.session
      ? "authenticated"
      : "unauthenticated";

  return {
    user,
    isLoading: context.isLoading,
    isAuthenticated: Boolean(context.session),
    status,
  };
}

/**
 * Hook to check if user has specific role
 */
export function useRole(role: string) {
  const { user, isLoading } = useAuth();

  return {
    hasRole: user?.role === role,
    isLoading,
    user,
  };
}

/**
 * Hook to check if user has any of the specified roles
 */
export function useRoles(roles: string[]) {
  const { user, isLoading } = useAuth();

  return {
    hasAnyRole: user?.role ? roles.includes(user.role) : false,
    isLoading,
    user,
  };
}

/**
 * Hook to check if user is admin
 */
export function useIsAdmin() {
  return useRole("admin");
}

/**
 * Hook to check if user is agent
 */
export function useIsAgent() {
  return useRole("agent");
}
