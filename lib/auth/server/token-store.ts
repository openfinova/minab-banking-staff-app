import "server-only";

/** OAuth tokens kept out of the iron-session cookie (JWTs exceed browser cookie size limits). */
export interface ServerTokens {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
}

const tokensBySessionId = new Map<string, ServerTokens>();

export function bindTokens(sessionId: string, tokens: ServerTokens): void {
  tokensBySessionId.set(sessionId, tokens);
}

export function getBoundTokens(sessionId: string | undefined): ServerTokens | undefined {
  if (!sessionId) return undefined;
  return tokensBySessionId.get(sessionId);
}

export function unbindTokens(sessionId: string | undefined): void {
  if (sessionId) tokensBySessionId.delete(sessionId);
}
