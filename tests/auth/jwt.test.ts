import { describe, it, expect } from "vitest";
import { decodeJwt, claimsToUser } from "@/lib/auth/jwt";

function encodeJwt(payload: Record<string, unknown>): string {
  const header = { alg: "RS256", typ: "JWT" };
  const encode = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  return `${encode(header)}.${encode(payload)}.signature`;
}

describe("decodeJwt", () => {
  it("decodes payload claims", () => {
    const token = encodeJwt({
      sub: "abc",
      preferred_username: "ops01",
      permissions: ["admin:users:read", "audit:read"],
    });
    const claims = decodeJwt(token);
    expect(claims.sub).toBe("abc");
    expect(claims.preferred_username).toBe("ops01");
    expect(claims.permissions).toEqual(["admin:users:read", "audit:read"]);
  });

  it("rejects malformed tokens", () => {
    expect(() => decodeJwt("invalid")).toThrow(/Invalid JWT/);
  });
});

describe("claimsToUser", () => {
  it("normalises permission claim variants", () => {
    const user = claimsToUser({
      sub: "abc",
      preferred_username: "ops01",
      authorities: ["admin:users:read"],
      permissions: "audit:read profile:read:own",
    });
    expect(user.permissions).toEqual(
      expect.arrayContaining([
        "admin:users:read",
        "audit:read",
        "profile:read:own",
      ]),
    );
    expect(user.username).toBe("ops01");
  });

  it("flags force_password_change when claim is true", () => {
    const user = claimsToUser({
      sub: "abc",
      force_password_change: true,
    });
    expect(user.forcePasswordChange).toBe(true);
  });
});
