import { NextResponse } from "next/server";
import { buildRpInitiatedLogoutUrl } from "@/lib/auth/server/oidc-server";
import { resolvePublicOrigin } from "@/lib/auth/server/public-origin";
import {
  getBffSession,
  getBffSessionForResponse,
  getBoundTokens,
  unbindTokens,
} from "@/lib/auth/server/session";

async function handleLogout(request: Request) {
  const publicOrigin = resolvePublicOrigin(request.headers);
  const cookieSession = await getBffSession();
  const idToken = getBoundTokens(cookieSession.sid)?.idToken;
  unbindTokens(cookieSession.sid);

  const rpLogoutUrl = idToken ? buildRpInitiatedLogoutUrl(idToken) : null;
  if (rpLogoutUrl) {
    const response = NextResponse.redirect(rpLogoutUrl);
    const session = await getBffSessionForResponse(request, response);
    await session.destroy();
    return response;
  }

  const response = NextResponse.redirect(new URL("/login?reason=logged-out", publicOrigin));
  const session = await getBffSessionForResponse(request, response);
  await session.destroy();
  return response;
}

export async function POST(request: Request) {
  return handleLogout(request);
}

export async function GET(request: Request) {
  return handleLogout(request);
}
