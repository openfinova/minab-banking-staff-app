import { describe, it, expect } from "vitest";
import {
  createUserSchema,
  lockUserSchema,
  suspendUserSchema,
  rejectProvisioningSchema,
} from "@/lib/schemas/users";
import { PASSWORD_MIN_LENGTH } from "@/lib/schemas/password-policy";

/** Meets dashboard min length (policy complexity is only checked server-side). */
const validPw = "a".repeat(PASSWORD_MIN_LENGTH);

describe("createUserSchema", () => {
  it("requires email when user type is STAFF", () => {
    const result = createUserSchema.safeParse({
      username: "ops01",
      password: validPw,
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
      password: validPw,
      email: "ops01@bank.local",
      userType: "STAFF",
      branchCode: "HQ01",
      provisioningEligibilityNotes: "Approved",
      customerPartyId: "",
    });
    expect(result.success).toBe(true);
  });

  it("accepts CUSTOMER without customer party (optional link)", () => {
    const result = createUserSchema.safeParse({
      username: "cust01",
      password: validPw,
      userType: "CUSTOMER",
      customerPartyId: "",
      email: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects customer party ID for STAFF users", () => {
    const result = createUserSchema.safeParse({
      username: "ops01",
      password: validPw,
      email: "ops01@bank.local",
      userType: "STAFF",
      customerPartyId: "123e4567-e89b-12d3-a456-426614174000",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid CUSTOMER payload with party", () => {
    const result = createUserSchema.safeParse({
      username: "cust01",
      password: validPw,
      userType: "CUSTOMER",
      customerPartyId: "123e4567-e89b-12d3-a456-426614174000",
      email: "",
    });
    expect(result.success).toBe(true);
  });

  it("enforces username max length", () => {
    const result = createUserSchema.safeParse({
      username: "a".repeat(81),
      password: validPw,
      email: "x@y.z",
      userType: "STAFF",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password shorter than minimum", () => {
    const result = createUserSchema.safeParse({
      username: "ops01",
      password: "a".repeat(PASSWORD_MIN_LENGTH - 1),
      email: "ops01@bank.local",
      userType: "STAFF",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("password"))).toBe(true);
    }
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
