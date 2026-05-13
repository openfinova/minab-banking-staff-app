import { appConfig } from "@/lib/config";
import { createPkcePair } from "@/lib/auth/pkce";
import { decodeJwt, claimsToUser } from "@/lib/auth/jwt";
import {
  clearPkceState,
  loadPkceState,
  savePkceState,
  type PkceState,
} from "@/lib/auth/storage";
import type { AuthSession } from "@/lib/auth/types";

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

const PROMPT_LOGIN_NEXT_KEY = "minab.auth.oidc.prompt-login-next";

/** Call after token endpoint denied issuing tokens (e.g. 403) so the next authorize uses `prompt=login`. */
export function flagNextAuthorizeForceLogin(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PROMPT_LOGIN_NEXT_KEY, "1");
}

function consumeAuthorizeForceLogin(): boolean {
  if (typeof window === "undefined") return false;
  const v = sessionStorage.getItem(PROMPT_LOGIN_NEXT_KEY);
  if (v) sessionStorage.removeItem(PROMPT_LOGIN_NEXT_KEY);
  return v === "1";
}

export function buildAuthorizeUrl(pkce: PkceState, codeChallenge: string): string {
  const url = new URL("/oauth2/authorize", appConfig.oidc.authority);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", appConfig.oidc.clientId);
  url.searchParams.set("redirect_uri", pkce.redirectUri);
  url.searchParams.set("scope", appConfig.oidc.scopes);
  url.searchParams.set("state", pkce.state);
  url.searchParams.set("nonce", pkce.nonce);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  if (consumeAuthorizeForceLogin()) {
    url.searchParams.set("prompt", "login");
  }
  return url.toString();
}

export async function startLogin(): Promise<string> {
  const { codeVerifier, codeChallenge, state, nonce } = await createPkcePair();
  const pkce: PkceState = {
    codeVerifier,
    state,
    nonce,
    redirectUri: appConfig.oidc.redirectUri,
  };
  savePkceState(pkce);
  return buildAuthorizeUrl(pkce, codeChallenge);
}

export async function exchangeCodeForTokens(code: string, returnedState: string): Promise<TokenResponse> {
  const pkce = loadPkceState();
  if (!pkce) throw new Error("Missing PKCE state. Please retry login.");
  if (pkce.state !== returnedState) {
    clearPkceState();
    throw new Error("State mismatch during OAuth callback.");
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: appConfig.oidc.clientId,
    code,
    redirect_uri: pkce.redirectUri,
    code_verifier: pkce.codeVerifier,
  });

  try {
    const response = await fetch(`${appConfig.oidc.authority}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.status} ${text}`);
    }
    return JSON.parse(text) as TokenResponse;
  } finally {
    clearPkceState();
  }
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: appConfig.oidc.clientId,
    refresh_token: refreshToken,
  });

  const response = await fetch(`${appConfig.oidc.authority}/oauth2/token`, {
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

export function tokenResponseToSession(token: TokenResponse, previous?: AuthSession | null): AuthSession {
  const claims = decodeJwt(token.access_token);
  const user = claimsToUser(claims);
  const expiresAt = Date.now() + token.expires_in * 1000;
  return {
    accessToken: token.access_token,
    idToken: token.id_token ?? previous?.idToken,
    refreshToken: token.refresh_token ?? previous?.refreshToken,
    expiresAt,
    user,
  };
}

/**
 * Spring Authorization Server OIDC end-session (see metadata `end_session_endpoint`).
 * Not `/oauth2/logout` — that path is not registered and returns 404.
 *
 * Uses POST with a form body so `id_token_hint` is not limited by Tomcat's default ~8KB request-line
 * cap (long JWTs with many permission claims exceed it and the server returns 400).
 */
export function startRpInitiatedLogout(idToken?: string): void {
  if (typeof document === "undefined") return;
  const base = appConfig.oidc.authority.replace(/\/$/, "");
  const hint = idToken?.trim();
  /**
   * Spring Authorization Server requires a non-empty id_token_hint for /connect/logout
   * (see OidcLogoutAuthenticationConverter). After a failed code→token exchange there is no
   * id_token; a full navigation to the IdP's form-login /logout clears the browser session.
   */
  if (!hint) {
    window.location.assign(`${base}/logout`);
    return;
  }
  const form = document.createElement("form");
  form.method = "POST";
  form.action = `${base}/connect/logout`;
  const field = (name: string, value: string) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  };
  field("client_id", appConfig.oidc.clientId);
  field("id_token_hint", hint);
  field("post_logout_redirect_uri", appConfig.oidc.postLogoutRedirectUri);
  document.body.appendChild(form);
  form.submit();
}
