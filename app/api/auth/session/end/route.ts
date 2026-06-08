import { NextResponse } from "next/server";
import { resolvePublicOrigin } from "@/lib/auth/server/public-origin";
import { getBffSessionForResponse, unbindTokens } from "@/lib/auth/server/session";

/**
 * Ends the BFF session after idle timeout without RP-initiated IdP logout.
 *
 * Staff policy requires a hard idle logout of the BFF session. A full {@code /api/auth/logout}
 * (IdP {@code /connect/logout}) can race with a new login attempt and drop the OAuth
 * {@code RequestCache}, leaving the user on the IdP "signed out" page after MFA. Interactive
 * sign-out from the menu still uses {@code /api/auth/logout} for end-to-end IdP logout.
 */
export async function GET(request: Request) {
  const publicOrigin = resolvePublicOrigin(request.headers);
  const response = NextResponse.redirect(new URL("/login?reason=session-expired", publicOrigin));
  const session = await getBffSessionForResponse(request, response);
  unbindTokens(session.sid);
  await session.destroy();
  return response;
}
