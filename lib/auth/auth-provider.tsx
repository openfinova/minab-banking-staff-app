"use client";

import * as React from "react";
import { useAuthStore } from "@/lib/auth/auth-store";
import type { AuthSession } from "@/lib/auth/types";
import { appConfig } from "@/lib/config";
import { hasPermission, type PermissionMode } from "@/lib/rbac/permissions";

interface AuthContextValue {
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  forcePasswordChange: boolean;
  permissions: ReadonlyArray<string>;
  loginWithRedirect: (returnTo?: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  can: (required: ReadonlyArray<string>, mode?: PermissionMode) => boolean;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

interface SessionResponse {
  authenticated: boolean;
  expiresAt?: number;
  user?: AuthSession["user"];
  forcePasswordChange?: boolean;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { session, status, hydrate, setStatus } = useAuthStore();

  const loadSession = React.useCallback(async () => {
    setStatus("loading");
    try {
      const res = await fetch(appConfig.oidc.sessionPath, { credentials: "include" });
      if (!res.ok) {
        hydrate(null);
        setStatus("unauthenticated");
        return;
      }
      const data = (await res.json()) as SessionResponse;
      if (!data.authenticated || !data.user || !data.expiresAt) {
        hydrate(null);
        setStatus("unauthenticated");
        return;
      }
      const next: AuthSession = {
        expiresAt: data.expiresAt,
        user: data.user,
      };
      hydrate(next);
      setStatus(data.forcePasswordChange ? "force-password-change" : "authenticated");
    } catch {
      hydrate(null);
      setStatus("unauthenticated");
    }
  }, [hydrate, setStatus]);

  React.useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const loginWithRedirect = React.useCallback(async (returnTo?: string) => {
    useAuthStore.getState().setError(null);
    const url = new URL(appConfig.oidc.loginPath, window.location.origin);
    if (returnTo) url.searchParams.set("returnTo", returnTo);
    window.location.assign(url.toString());
  }, []);

  const logout = React.useCallback(async () => {
    hydrate(null);
    setStatus("unauthenticated");
    window.location.assign(appConfig.oidc.logoutPath);
  }, [hydrate, setStatus]);

  const refresh = React.useCallback(async () => {
    await loadSession();
  }, [loadSession]);

  const can = React.useCallback(
    (required: ReadonlyArray<string>, mode: PermissionMode = "all") =>
      hasPermission(session?.user.permissions ?? [], required, mode),
    [session],
  );

  const value: AuthContextValue = React.useMemo(
    () => ({
      session,
      isAuthenticated: status === "authenticated" || status === "force-password-change",
      isLoading: status === "loading",
      forcePasswordChange: status === "force-password-change",
      permissions: session?.user.permissions ?? [],
      loginWithRedirect,
      logout,
      refresh,
      can,
    }),
    [session, status, loginWithRedirect, logout, refresh, can],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
