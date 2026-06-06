import "server-only";

import { serverAuthConfig } from "@/lib/auth/server/config";

/**
 * Browser-facing origin for redirects (never the Docker internal hostname).
 * Set {@code APP_PUBLIC_URL} in Compose (e.g. http://localhost:3000).
 */
export function resolvePublicOrigin(headers: Headers): string {
  const configured = process.env.APP_PUBLIC_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  const proto = headers.get("x-forwarded-proto") ?? "http";
  if (host) {
    const hostname = host.split(",")[0]?.trim();
    if (hostname && !isDockerInternalHost(hostname)) {
      return `${proto}://${hostname}`;
    }
  }
  return serverAuthConfig.publicAppUrl;
}

function isDockerInternalHost(host: string): boolean {
  const name = host.split(":")[0] ?? host;
  return /^[a-f0-9]{12}$/i.test(name);
}
