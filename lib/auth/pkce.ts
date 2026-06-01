// Lightweight PKCE helper. We use the Web Crypto API in the browser; this
// module is imported only by client components, so it does not run server-side.

function base64UrlEncode(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function generateRandomString(byteLength = 32): string {
  const array = new Uint8Array(byteLength);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(digest);
}

export interface PkcePair {
  codeVerifier: string;
  codeChallenge: string;
  state: string;
  nonce: string;
}

export async function createPkcePair(): Promise<PkcePair> {
  const codeVerifier = generateRandomString(48);
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  return {
    codeVerifier,
    codeChallenge,
    state: generateRandomString(16),
    nonce: generateRandomString(16),
  };
}
