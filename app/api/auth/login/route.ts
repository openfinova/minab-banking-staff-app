import { NextResponse } from "next/server";
import { getBffSessionForResponse } from "@/lib/auth/server/session";
import { createPkceAuthorizeUrl } from "@/lib/auth/server/oidc-server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = url.searchParams.get("returnTo") ?? "/dashboard";
  // Always force a fresh login at the IdP:
  // - Prevents SSO bleed between staff (:3000) and customer (:3001) portals (shared AS cookie).
  // - Ensures MFA (gold ACR) is completed upfront, so every staff session starts with a gold token.
  //   This avoids mid-task step-up interruptions for identity/role writes; step-up is reserved
  //   only for GL approve/reject (irreversible financial entries).
  const promptParam = url.searchParams.get("prompt");
  const prompt = promptParam === "none" ? "none" : "login";
  // Gold ACR is the baseline for all staff sessions. Callers may override (e.g. step-up route
  // sends its own acr_values), but the login route itself never falls back to silver.
  const acrValues = url.searchParams.get("acr_values") ?? "urn:mace:incommon:iap:gold";

  const pkce = await createPkceAuthorizeUrl({
    returnTo,
    prompt,
    acrValues,
  });

  const response = NextResponse.redirect(pkce.url);
  const session = await getBffSessionForResponse(request, response);
  session.pkce = {
    codeVerifier: pkce.codeVerifier,
    state: pkce.state,
    nonce: pkce.nonce,
  };
  session.returnTo = returnTo;
  await session.save();

  return response;
}
