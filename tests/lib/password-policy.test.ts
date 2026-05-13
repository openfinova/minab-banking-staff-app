import { describe, it, expect } from "vitest";
import {
  bankPasswordStringSchema,
  generateBankCompliantPassword,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  passwordMeetsDefaultIdentityComplexity,
} from "@/lib/schemas/password-policy";

describe("generateBankCompliantPassword", () => {
  it("produces passwords that pass length and default complexity checks", () => {
    for (let i = 0; i < 20; i++) {
      const pw = generateBankCompliantPassword();
      expect(bankPasswordStringSchema.safeParse(pw).success).toBe(true);
      expect(passwordMeetsDefaultIdentityComplexity(pw)).toBe(true);
      expect(pw.length).toBeGreaterThanOrEqual(PASSWORD_MIN_LENGTH);
    }
  });

  it("clamps length to policy bounds", () => {
    const short = generateBankCompliantPassword(8);
    expect(short.length).toBe(PASSWORD_MIN_LENGTH);
    const long = generateBankCompliantPassword(999);
    expect(long.length).toBe(PASSWORD_MAX_LENGTH);
  });
});
