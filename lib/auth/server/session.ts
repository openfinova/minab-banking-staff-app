import "server-only";

import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { serverAuthConfig } from "@/lib/auth/server/config";
import {
  getSessionOptions,
  type BffSessionData,
} from "@/lib/auth/server/session-options";
import { hasBffSessionAuth } from "@/lib/auth/server/session-options";
import { getBoundTokens, unbindTokens } from "@/lib/auth/server/token-store";

export type { BffSessionData } from "@/lib/auth/server/session-options";
export { getSessionOptions, SESSION_COOKIE } from "@/lib/auth/server/session-options";
export { bindTokens, getBoundTokens, unbindTokens } from "@/lib/auth/server/token-store";

export async function getBffSession() {
  return getIronSession<BffSessionData>(await cookies(), getSessionOptions());
}

export async function getBffSessionForResponse(request: Request, response: NextResponse) {
  return getIronSession<BffSessionData>(request, response, getSessionOptions());
}

export function hasAuthenticatedSession(session: BffSessionData): boolean {
  return hasBffSessionAuth(session) && Boolean(getBoundTokens(session.sid)?.accessToken);
}

export function isSessionIdleExpired(session: BffSessionData): boolean {
  if (!session.lastActivityAt) return false;
  return Date.now() - session.lastActivityAt > serverAuthConfig.session.idleMs;
}

export function isSessionAbsoluteExpired(session: BffSessionData): boolean {
  if (!session.sessionStartedAt) return false;
  return Date.now() - session.sessionStartedAt > serverAuthConfig.session.absoluteMs;
}

export function isAccessTokenExpired(session: BffSessionData, bufferMs = 30_000): boolean {
  if (!session.expiresAt) return true;
  return session.expiresAt - bufferMs <= Date.now();
}

export async function clearBffSession(): Promise<void> {
  const session = await getBffSession();
  unbindTokens(session.sid);
  session.sid = undefined;
  session.expiresAt = undefined;
  session.lastActivityAt = undefined;
  session.sessionStartedAt = undefined;
  session.user = undefined;
  session.pkce = undefined;
  session.returnTo = undefined;
  await session.save();
}

export async function touchSessionActivity(): Promise<void> {
  const session = await getBffSession();
  if (!hasAuthenticatedSession(session)) return;
  session.lastActivityAt = Date.now();
  await session.save();
}
