const RETURN_KEY = "minab.auth.return-to";

function isBrowser(): boolean {
  return typeof window !== "undefined";
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
