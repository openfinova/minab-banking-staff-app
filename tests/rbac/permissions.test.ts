import { describe, it, expect } from "vitest";
import { hasPermission, Permissions } from "@/lib/rbac/permissions";

describe("hasPermission", () => {
  it("returns true when no permissions are required", () => {
    expect(hasPermission([], [])).toBe(true);
    expect(hasPermission(["admin:users:read"], [])).toBe(true);
  });

  it("returns false when granted is empty but required is not", () => {
    expect(hasPermission([], [Permissions.AdminUsersRead])).toBe(false);
    expect(hasPermission(undefined, [Permissions.AdminUsersRead])).toBe(false);
  });

  it("requires all when mode is 'all'", () => {
    expect(
      hasPermission(["admin:users:read"], [Permissions.AdminUsersRead, Permissions.AdminUsersWrite]),
    ).toBe(false);
    expect(
      hasPermission(
        ["admin:users:read", "admin:users:write"],
        [Permissions.AdminUsersRead, Permissions.AdminUsersWrite],
      ),
    ).toBe(true);
  });

  it("requires only one when mode is 'any'", () => {
    expect(
      hasPermission(
        ["admin:users:read"],
        [Permissions.AdminUsersWrite, Permissions.AdminUsersRead],
        "any",
      ),
    ).toBe(true);
    expect(
      hasPermission(["audit:read"], [Permissions.AdminUsersWrite, Permissions.AdminUsersRead], "any"),
    ).toBe(false);
  });
});
