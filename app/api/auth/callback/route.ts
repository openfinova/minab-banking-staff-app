import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { bindTokens, getBffSessionForResponse } from "@/lib/auth/server/session";
import {
  exchangeAuthorizationCode,
  tokenResponseToBffFields,
} from "@/lib/auth/server/oidc-server";
import { resolvePublicOrigin } from "@/lib/auth/server/public-origin";

export async function GET(request: Request) {
  const publicOrigin = resolvePublicOrigin(request.headers);
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  if (error) {
    const description = url.searchParams.get("error_description") ?? error;
    return NextResponse.redirect(
      new URL(
        `/login?reason=access-denied&message=${encodeURIComponent(description)}`,
        publicOrigin,
      ),
    );
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const fail = NextResponse.redirect(new URL("/login?reason=session-expired", publicOrigin));
  const session = await getBffSessionForResponse(request, fail);
  const pkce = session.pkce;
  const returnTo = session.returnTo ?? "/dashboard";

  if (!code || !state || !pkce || pkce.state !== state) {
    await session.destroy();
    await session.save();
    return fail;
  }

  try {
    const token = await exchangeAuthorizationCode(code, pkce.codeVerifier);
    const fields = tokenResponseToBffFields(token);
    const now = Date.now();
    const target = fields.user.forcePasswordChange
      ? "/account/force-password-change"
      : returnTo;

    const response = NextResponse.redirect(new URL(target, publicOrigin));
    const writeSession = await getBffSessionForResponse(request, response);
    const sid = randomUUID();
    bindTokens(sid, {
      accessToken: fields.accessToken,
      refreshToken: fields.refreshToken,
      idToken: fields.idToken,
    });
    writeSession.sid = sid;
    writeSession.expiresAt = fields.expiresAt;
    writeSession.user = fields.user;
    writeSession.lastActivityAt = now;
    writeSession.sessionStartedAt = now;
    writeSession.pkce = undefined;
    writeSession.returnTo = undefined;
    await writeSession.save();
    return response;
  } catch (err) {
    console.error("OAuth callback failed:", err instanceof Error ? err.message : err);
    await session.destroy();
    await session.save();
    return fail;
  }
}
