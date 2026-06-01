function envOrDefault(key: string, fallback: string): string {
  const value = process.env[key];
  return value && value.length > 0 ? value : fallback;
}

export const appConfig = {
  apiBaseUrl: envOrDefault("NEXT_PUBLIC_API_BASE_URL", "http://localhost:8080"),
  oidc: {
    authority: envOrDefault("NEXT_PUBLIC_OIDC_AUTHORITY", "http://localhost:8080"),
    clientId: envOrDefault("NEXT_PUBLIC_OIDC_CLIENT_ID", "staff-app"),
    redirectUri: envOrDefault(
      "NEXT_PUBLIC_OIDC_REDIRECT_URI",
      "http://localhost:3000/auth/callback",
    ),
    /** Must exactly match a `post_logout_redirect_uri` registered for this client on the auth server. */
    postLogoutRedirectUri: envOrDefault(
      "NEXT_PUBLIC_OIDC_POST_LOGOUT_REDIRECT_URI",
      "http://localhost:3000/",
    ),
    scopes: envOrDefault(
      "NEXT_PUBLIC_OIDC_SCOPES",
      "openid profile email offline_access",
    ),
  },
  session: {
    idleTimeoutMs: Number(envOrDefault("NEXT_PUBLIC_IDLE_TIMEOUT_MS", "900000")),
    idleWarningMs: Number(envOrDefault("NEXT_PUBLIC_IDLE_WARNING_MS", "120000")),
  },
} as const;

export type AppConfig = typeof appConfig;
