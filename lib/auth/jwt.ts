import type { AuthTokenClaims, AuthUser } from "@/lib/auth/types";

function base64UrlDecode(input: string): string {
  let normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4;
  if (pad === 2) normalized += "==";
  else if (pad === 3) normalized += "=";
  else if (pad !== 0) throw new Error("Malformed JWT segment");
  if (typeof atob === "function") {
    const decoded = atob(normalized);
    try {
      return decodeURIComponent(
        decoded
          .split("")
          .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
          .join(""),
      );
    } catch {
      return decoded;
    }
  }
  // Server-side fallback
  return Buffer.from(normalized, "base64").toString("utf-8");
}

export function decodeJwt(token: string): AuthTokenClaims {
  if (!token) throw new Error("Missing token");
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT structure");
  const payload = JSON.parse(base64UrlDecode(parts[1])) as AuthTokenClaims;
  return payload;
}

function asArray(value: string[] | string | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return value
    .split(/[\s,]+/g)
    .map((v) => v.trim())
    .filter(Boolean);
}

export function claimsToUser(claims: AuthTokenClaims): AuthUser {
  const permissions = [
    ...asArray(claims.permissions),
    ...asArray(claims.authorities),
  ];
  const username =
    claims.preferred_username ?? claims.username ?? claims.name ?? claims.sub ?? "";
  return {
    subject: claims.sub ?? "",
    username,
    displayName: claims.name ?? username,
    email: claims.email,
    permissions: Array.from(new Set(permissions)),
    roles: claims.roles ?? [],
    forcePasswordChange: Boolean(claims.force_password_change),
    mfaRequired: Boolean(claims.mfa_required),
    mfaVerified: Boolean(claims.mfa_verified),
    branchCode: claims.branch_code,
    employeeId: claims.employee_id,
    userType: claims.user_type,
    acr: typeof claims.acr === "string" ? claims.acr : undefined,
  };
}
