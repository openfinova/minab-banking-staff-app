import type { AuthSession } from "@/lib/auth/types";

const SESSION_KEY = "minab.auth.session";
const PKCE_KEY = "minab.auth.pkce";
const RETURN_KEY = "minab.auth.return-to";

export interface PkceState {
  codeVerifier: string;
  state: string;
  nonce: string;
  redirectUri: string;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function saveSession(session: AuthSession): void {
  if (!isBrowser()) return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function loadSession(): AuthSession | null {
  if (!isBrowser()) return null;
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function clearSession(): void {
  if (!isBrowser()) return;
  sessionStorage.removeItem(SESSION_KEY);
}

export function savePkceState(state: PkceState): void {
  if (!isBrowser()) return;
  sessionStorage.setItem(PKCE_KEY, JSON.stringify(state));
}

export function loadPkceState(): PkceState | null {
  if (!isBrowser()) return null;
  const raw = sessionStorage.getItem(PKCE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PkceState;
  } catch {
    sessionStorage.removeItem(PKCE_KEY);
    return null;
  }
}

export function clearPkceState(): void {
  if (!isBrowser()) return;
  sessionStorage.removeItem(PKCE_KEY);
}

export function setReturnTo(path: string): void {
  if (!isBrowser()) return;
  sessionStorage.setItem(RETURN_KEY, path);
}

export function takeReturnTo(): string | null {
  if (!isBrowser()) return null;
  const value = sessionStorage.getItem(RETURN_KEY);
  if (value) sessionStorage.removeItem(RETURN_KEY);
  return value;
}
