import { describe, it, expect } from "vitest";
import { feeRuleSchema, holidaySchema, velocityLimitSchema } from "@/lib/schemas/config";
import { createFiscalPeriodSchema } from "@/lib/schemas/operations";

describe("holidaySchema", () => {
  it("requires ISO date and 2-char country", () => {
    const ok = holidaySchema.safeParse({
      date: "2026-12-25",
      countryCode: "US",
      name: "Christmas",
      type: "NATIONAL",
    });
    expect(ok.success).toBe(true);
    const bad = holidaySchema.safeParse({
      date: "2026/12/25",
      countryCode: "USA",
      name: "Christmas",
      type: "NATIONAL",
    });
    expect(bad.success).toBe(false);
  });
});

describe("feeRuleSchema", () => {
  it("requires fixed amount when type is FIXED", () => {
    const result = feeRuleSchema.safeParse({
      transactionType: "TRANSFER",
      feeType: "FIXED",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a percentage rule", () => {
    const result = feeRuleSchema.safeParse({
      transactionType: "TRANSFER",
      feeType: "PERCENTAGE",
      percentageRate: 1.25,
      minFee: 1,
      maxFee: 25,
    });
    expect(result.success).toBe(true);
  });

  it("rejects min greater than max", () => {
    const result = feeRuleSchema.safeParse({
      transactionType: "TRANSFER",
      feeType: "FIXED",
      fixedAmount: 5,
      minFee: 10,
      maxFee: 5,
    });
    expect(result.success).toBe(false);
  });
});

describe("velocityLimitSchema", () => {
  it("requires positive max amount", () => {
    expect(
      velocityLimitSchema.safeParse({
        transactionType: "TRANSFER",
        period: "DAILY",
        maxAmount: 0,
      }).success,
    ).toBe(false);
  });
});

describe("createFiscalPeriodSchema", () => {
  it("rejects end before start", () => {
    const result = createFiscalPeriodSchema.safeParse({
      name: "Feb 2026",
      startDate: "2026-02-28",
      endDate: "2026-02-01",
      fiscalYear: 2026,
      periodNumber: 2,
    });
    expect(result.success).toBe(false);
  });

  it("limits period number to 1..13", () => {
    const result = createFiscalPeriodSchema.safeParse({
      name: "Bad",
      startDate: "2026-01-01",
      endDate: "2026-01-31",
      fiscalYear: 2026,
      periodNumber: 14,
    });
    expect(result.success).toBe(false);
  });
});
