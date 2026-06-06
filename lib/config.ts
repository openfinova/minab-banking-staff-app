function envOrDefault(key: string, fallback: string): string {
  const value = process.env[key];
  return value && value.length > 0 ? value : fallback;
}

/** Browser-safe configuration (no secrets). API calls go through the BFF proxy. */
export const appConfig = {
  apiBaseUrl: "/api/backend",
  oidc: {
    loginPath: "/api/auth/login",
    logoutPath: "/api/auth/logout",
    sessionPath: "/api/auth/session",
    stepUpPath: "/api/auth/step-up",
  },
  session: {
    idleTimeoutMs: Number(envOrDefault("NEXT_PUBLIC_IDLE_TIMEOUT_MS", "600000")),
    idleWarningMs: Number(envOrDefault("NEXT_PUBLIC_IDLE_WARNING_MS", "120000")),
  },
} as const;

export type AppConfig = typeof appConfig;
