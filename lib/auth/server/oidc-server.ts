import "server-only";

import { createPkcePair } from "@/lib/auth/pkce";
import { claimsToUser, decodeJwt } from "@/lib/auth/jwt";
import { serverAuthConfig } from "@/lib/auth/server/config";

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

export async function createPkceAuthorizeUrl(options?: {
  returnTo?: string;
  prompt?: "login" | "none" | undefined;
  acrValues?: string;
}): Promise<{ url: string; codeVerifier: string; state: string; nonce: string }> {
  const { codeVerifier, codeChallenge, state, nonce } = await createPkcePair();
  const url = new URL("/oauth2/authorize", serverAuthConfig.oidc.authority);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", serverAuthConfig.oidc.clientId);
  url.searchParams.set("redirect_uri", serverAuthConfig.oidc.redirectUri);
  url.searchParams.set("scope", serverAuthConfig.oidc.scopes);
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  if (options?.prompt) {
    url.searchParams.set("prompt", options.prompt);
  }
  if (options?.acrValues) {
    url.searchParams.set("acr_values", options.acrValues);
  }
  return { url: url.toString(), codeVerifier, state, nonce };
}

export async function exchangeAuthorizationCode(
  code: string,
  codeVerifier: string,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: serverAuthConfig.oidc.clientId,
    client_secret: serverAuthConfig.oidc.clientSecret,
    code,
    redirect_uri: serverAuthConfig.oidc.redirectUri,
    code_verifier: codeVerifier,
  });

  const response = await fetch(`${serverAuthConfig.oidc.tokenAuthority}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status} ${text}`);
  }
  return JSON.parse(text) as TokenResponse;
}

export async function refreshTokens(refreshToken: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: serverAuthConfig.oidc.clientId,
    client_secret: serverAuthConfig.oidc.clientSecret,
    refresh_token: refreshToken,
  });

  const response = await fetch(`${serverAuthConfig.oidc.tokenAuthority}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token refresh failed: ${response.status} ${text}`);
  }
  return (await response.json()) as TokenResponse;
}

export function tokenResponseToBffFields(token: TokenResponse) {
  const claims = decodeJwt(token.access_token);
  const user = claimsToUser(claims);
  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    idToken: token.id_token,
    expiresAt: Date.now() + token.expires_in * 1000,
    user,
  };
}

/** RP-initiated logout only when id_token iss matches the browser-facing authority. */
export function buildRpInitiatedLogoutUrl(idToken: string): string | null {
  try {
    const claims = decodeJwt(idToken);
    const authority = serverAuthConfig.oidc.authority.replace(/\/$/, "");
    const iss = typeof claims.iss === "string" ? claims.iss.replace(/\/$/, "") : "";
    if (!iss || iss !== authority) {
      return null;
    }
  } catch {
    return null;
  }
  const url = new URL("/connect/logout", serverAuthConfig.oidc.authority);
  url.searchParams.set("client_id", serverAuthConfig.oidc.clientId);
  url.searchParams.set("id_token_hint", idToken);
  url.searchParams.set("post_logout_redirect_uri", serverAuthConfig.oidc.postLogoutRedirectUri);
  return url.toString();
}
