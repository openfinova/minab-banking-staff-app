"use client";

import { create } from "zustand";
import type { AuthSession, AuthStatus } from "@/lib/auth/types";

interface AuthState {
  status: AuthStatus;
  session: AuthSession | null;
  error: string | null;
  setStatus: (status: AuthStatus) => void;
  setSession: (session: AuthSession | null) => void;
  setError: (error: string | null) => void;
  hydrate: (session: AuthSession | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: "loading",
  session: null,
  error: null,
  setStatus: (status) => set({ status }),
  setSession: (session) =>
    set({
      session,
      status: !session
        ? "unauthenticated"
        : session.user.forcePasswordChange
          ? "force-password-change"
          : "authenticated",
    }),
  setError: (error) => set({ error, status: error ? "error" : "unauthenticated" }),
  hydrate: (session) =>
    set({
      session,
      status: !session
        ? "unauthenticated"
        : session.user.forcePasswordChange
          ? "force-password-change"
          : "authenticated",
    }),
}));

export function getAccessToken(): string | null {
  const session = useAuthStore.getState().session;
  if (!session) return null;
  if (session.expiresAt <= Date.now()) return null;
  return session.accessToken;
}
