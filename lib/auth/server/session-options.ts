import type { SessionOptions } from "iron-session";
import type { AuthUser } from "@/lib/auth/types";

export interface BffSessionData {
  /** Opaque id; OAuth tokens live in {@link ./token-store}. */
  sid?: string;
  expiresAt?: number;
  lastActivityAt?: number;
  sessionStartedAt?: number;
  user?: AuthUser;
  pkce?: {
    codeVerifier: string;
    state: string;
    nonce: string;
  };
  returnTo?: string;
}

/** Cookie-only check (middleware-safe; tokens are server-side). */
export function hasBffSessionAuth(session: BffSessionData): boolean {
  return Boolean(session.sid && session.user && session.expiresAt);
}

export const SESSION_COOKIE = "minab_staff_session";

function resolveSessionCookieSecure(): boolean {
  const explicit = process.env.SESSION_COOKIE_SECURE?.trim();
  if (explicit === "true") return true;
  if (explicit === "false") return false;
  const redirect = process.env.OIDC_REDIRECT_URI?.trim() ?? "";
  if (redirect.startsWith("http://")) return false;
  if (redirect.startsWith("https://")) return true;
  const publicUrl = process.env.APP_PUBLIC_URL?.trim() ?? "";
  if (publicUrl.startsWith("https://")) return true;
  if (publicUrl.startsWith("http://")) return false;
  return false;
}

/** Resolved at request time so Docker runtime env is applied. */
export function getSessionOptions(): SessionOptions {
  return {
    password: process.env.SESSION_SECRET ?? "local-dev-session-secret-change-me-32chars",
    cookieName: SESSION_COOKIE,
    cookieOptions: {
      secure: resolveSessionCookieSecure(),
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    },
  };
}
