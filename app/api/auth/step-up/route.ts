import { NextResponse } from "next/server";
import { getBffSessionForResponse } from "@/lib/auth/server/session";
import { createPkceAuthorizeUrl } from "@/lib/auth/server/oidc-server";

/** Starts a step-up OIDC flow (prompt=login + gold acr). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = url.searchParams.get("returnTo") ?? "/dashboard";
  const pkce = await createPkceAuthorizeUrl({
    returnTo,
    prompt: "login",
    acrValues: "urn:mace:incommon:iap:gold",
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
