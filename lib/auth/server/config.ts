import "server-only";

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.length > 0 ? value : fallback;
}

/** Server-only OIDC and session configuration for the BFF. */
export const serverAuthConfig = {
  publicAppUrl: optional("APP_PUBLIC_URL", "http://localhost:3000").replace(/\/$/, ""),
  apiBaseUrl: optional("API_BASE_URL", "http://localhost:8080"),
  oidc: {
    /** Issuer URL shown to the browser (authorize / logout redirects). */
    authority: optional("OIDC_AUTHORITY", "http://localhost:8080").replace(/\/$/, ""),
    /**
     * Token endpoint base URL for server-side calls (Compose: http://banking-app:8080).
     * Defaults to {@link #authority} for local non-Docker dev.
     */
    tokenAuthority: optional("OIDC_TOKEN_AUTHORITY", optional("OIDC_AUTHORITY", "http://localhost:8080"))
        .replace(/\/$/, ""),
    clientId: optional("OIDC_CLIENT_ID", "staff-portal"),
    clientSecret: optional("OIDC_CLIENT_SECRET", "staff-portal-secret"),
    redirectUri: optional("OIDC_REDIRECT_URI", "http://localhost:3000/api/auth/callback"),
    postLogoutRedirectUri: optional(
      "OIDC_POST_LOGOUT_REDIRECT_URI",
      "http://localhost:3000/login",
    ),
    scopes: optional("OIDC_SCOPES", "openid profile email banking.staff"),
  },
  session: {
    idleMs: Number(optional("SESSION_IDLE_MS", "600000")),
    absoluteMs: Number(optional("SESSION_ABSOLUTE_MS", "28800000")),
    allowRefresh: optional("SESSION_ALLOW_REFRESH", "false") === "true",
  },
} as const;
