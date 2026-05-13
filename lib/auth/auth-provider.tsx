"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  refreshAccessToken,
  startLogin,
  startRpInitiatedLogout,
  tokenResponseToSession,
} from "@/lib/auth/oidc";
// refreshAccessToken used by token refresh timer; startRpInitiatedLogout drives RP-initiated logout.
import { clearSession, loadSession, saveSession, setReturnTo } from "@/lib/auth/storage";
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

const REFRESH_BUFFER_MS = 60_000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session, status, hydrate, setSession, setStatus } = useAuthStore();
  const refreshTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRefresh = React.useCallback((current: AuthSession | null) => {
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
    if (!current?.refreshToken) return;
    const msUntilRefresh = current.expiresAt - Date.now() - REFRESH_BUFFER_MS;
    const delay = Math.max(msUntilRefresh, 5_000);
    refreshTimer.current = setTimeout(() => {
      void doRefresh(current.refreshToken!, current);
    }, delay);
  }, []);

  const doRefresh = React.useCallback(
    async (refreshToken: string, previous: AuthSession | null) => {
      try {
        const token = await refreshAccessToken(refreshToken);
        const next = tokenResponseToSession(token, previous);
        saveSession(next);
        setSession(next);
        scheduleRefresh(next);
      } catch {
        clearSession();
        setSession(null);
        router.push("/login?reason=session-expired");
      }
    },
    [router, setSession, scheduleRefresh],
  );

  React.useEffect(() => {
    const persisted = loadSession();
    hydrate(persisted);
    if (persisted?.refreshToken) scheduleRefresh(persisted);
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [hydrate, scheduleRefresh]);

  const loginWithRedirect = React.useCallback(async (returnTo?: string) => {
    useAuthStore.getState().setError(null);
    if (returnTo) setReturnTo(returnTo);
    setStatus("loading");
    const url = await startLogin();
    window.location.assign(url);
  }, [setStatus]);

  const logout = React.useCallback(async () => {
    const idToken = session?.idToken;
    clearSession();
    setSession(null);
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    if (appConfig.oidc.authority) {
      startRpInitiatedLogout(idToken);
      return;
    }
    router.push("/login");
  }, [session, setSession, router]);

  const refresh = React.useCallback(async () => {
    if (!session?.refreshToken) return;
    await doRefresh(session.refreshToken, session);
  }, [session, doRefresh]);

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
