import "server-only";

import type { AuthSession } from "@/lib/auth/types";
import {
  bindTokens,
  clearBffSession,
  getBffSession,
  getBoundTokens,
  hasAuthenticatedSession,
  isAccessTokenExpired,
  isSessionAbsoluteExpired,
  isSessionIdleExpired,
  touchSessionActivity,
} from "@/lib/auth/server/session";
import {
  createPkceAuthorizeUrl,
  refreshTokens,
  tokenResponseToBffFields,
} from "@/lib/auth/server/oidc-server";
import { serverAuthConfig } from "@/lib/auth/server/config";

export function toPublicSession(session: {
  expiresAt?: number;
  user?: AuthSession["user"];
}): Pick<AuthSession, "expiresAt" | "user"> | null {
  if (!session.user || !session.expiresAt) return null;
  return { expiresAt: session.expiresAt, user: session.user };
}

function applyTokenFields(
  session: Awaited<ReturnType<typeof getBffSession>>,
  fields: ReturnType<typeof tokenResponseToBffFields>,
): void {
  if (!session.sid) return;
  bindTokens(session.sid, {
    accessToken: fields.accessToken,
    refreshToken: fields.refreshToken,
    idToken: fields.idToken,
  });
  session.expiresAt = fields.expiresAt;
  session.user = fields.user;
}

export async function loadValidServerSession(): Promise<Pick<AuthSession, "expiresAt" | "user"> | null> {
  const session = await getBffSession();
  if (!hasAuthenticatedSession(session)) {
    return null;
  }
  if (isSessionIdleExpired(session) || isSessionAbsoluteExpired(session)) {
    await clearBffSession();
    return null;
  }

  if (isAccessTokenExpired(session)) {
    const stored = getBoundTokens(session.sid);
    if (serverAuthConfig.session.allowRefresh && stored?.refreshToken) {
      try {
        const token = await refreshTokens(stored.refreshToken);
        applyTokenFields(session, tokenResponseToBffFields(token));
        session.lastActivityAt = Date.now();
        await session.save();
      } catch {
        await clearBffSession();
        return null;
      }
    } else {
      return null;
    }
  }

  return toPublicSession(session);
}

export async function requireAccessToken(): Promise<string | null> {
  const session = await getBffSession();
  if (!hasAuthenticatedSession(session)) {
    return null;
  }
  if (isSessionIdleExpired(session) || isSessionAbsoluteExpired(session)) {
    await clearBffSession();
    return null;
  }

  if (isAccessTokenExpired(session)) {
    const stored = getBoundTokens(session.sid);
    if (serverAuthConfig.session.allowRefresh && stored?.refreshToken) {
      try {
        const token = await refreshTokens(stored.refreshToken);
        applyTokenFields(session, tokenResponseToBffFields(token));
        session.lastActivityAt = Date.now();
        await session.save();
        return getBoundTokens(session.sid)?.accessToken ?? null;
      } catch {
        await clearBffSession();
        return null;
      }
    }
    return null;
  }

  await touchSessionActivity();
  return getBoundTokens(session.sid)?.accessToken ?? null;
}

export async function startReauthRedirect(returnTo: string, prompt: "login" | "none" = "login") {
  const { url, codeVerifier, state, nonce } = await createPkceAuthorizeUrl({ prompt });
  const session = await getBffSession();
  session.pkce = { codeVerifier, state, nonce };
  session.returnTo = returnTo;
  await session.save();
  return url;
}
