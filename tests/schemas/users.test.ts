import { describe, it, expect } from "vitest";
import {
  createUserSchema,
  lockUserSchema,
  suspendUserSchema,
  rejectProvisioningSchema,
} from "@/lib/schemas/users";

describe("createUserSchema", () => {
  it("requires email when user type is STAFF", () => {
    const result = createUserSchema.safeParse({
      username: "ops01",
      password: "Password1!",
      userType: "STAFF",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("email"))).toBe(true);
    }
  });

  it("accepts a valid STAFF payload", () => {
    const result = createUserSchema.safeParse({
      username: "ops01",
      password: "Password1!",
      email: "ops01@bank.local",
      userType: "STAFF",
      branchCode: "HQ01",
      provisioningEligibilityNotes: "Approved",
    });
    expect(result.success).toBe(true);
  });

  it("enforces username max length", () => {
    const result = createUserSchema.safeParse({
      username: "a".repeat(81),
      password: "Password1!",
      email: "x@y.z",
      userType: "STAFF",
    });
    expect(result.success).toBe(false);
  });
});

describe("operational reason schemas", () => {
  it("requires lock reason", () => {
    expect(lockUserSchema.safeParse({ reason: "" }).success).toBe(false);
    expect(lockUserSchema.safeParse({ reason: "compliance" }).success).toBe(true);
  });

  it("limits suspend reason length", () => {
    expect(suspendUserSchema.safeParse({ reason: "a".repeat(501) }).success).toBe(false);
  });

  it("requires reject provisioning reason", () => {
    expect(rejectProvisioningSchema.safeParse({ reason: "" }).success).toBe(false);
    expect(rejectProvisioningSchema.safeParse({ reason: "Missing docs" }).success).toBe(true);
  });
});
