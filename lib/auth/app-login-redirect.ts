/**
 * Sends the browser to the portal login page (same origin as the BFF).
 *
 * OAuth must start from the app origin so PKCE state is stored in the BFF session cookie
 * before redirecting to Keycloak. Navigating directly to {@code /api/auth/login} after idle
 * timeout or API 401 can leave the user on Keycloak without a valid callback chain.
 */
export function redirectToAppLogin(options?: { returnTo?: string; reason?: string }): void {
  const url = new URL("/login", window.location.origin);
  if (options?.returnTo) {
    url.searchParams.set("returnTo", options.returnTo);
  }
  if (options?.reason) {
    url.searchParams.set("reason", options.reason);
  }
  window.location.assign(url.toString());
}
