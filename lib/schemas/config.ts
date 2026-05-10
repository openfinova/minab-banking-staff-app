import { z } from "zod";
import { isoDateString } from "@/lib/schemas/common";

export const holidayTypes = ["NATIONAL", "REGIONAL", "BANK", "OTHER"] as const;

export const holidaySchema = z.object({
  date: isoDateString,
  countryCode: z.string().length(2, "Country code must be 2 characters"),
  regionCode: z.string().max(10).optional().or(z.literal("")),
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  description: z.string().max(500).optional().or(z.literal("")),
  type: z.enum(holidayTypes),
  bankHoliday: z.boolean().optional(),
  observedHoliday: z.boolean().optional(),
});

export type HolidayInput = z.infer<typeof holidaySchema>;

export const feeTypes = ["FIXED", "PERCENTAGE", "TIERED"] as const;
export const customerTiers = ["STANDARD", "PREMIUM", "VIP"] as const;
export const transactionTypes = [
  "TRANSFER",
  "WITHDRAWAL",
  "DEPOSIT",
  "PAYMENT",
  "FX",
  "LOAN_DISBURSEMENT",
  "LOAN_REPAYMENT",
] as const;

export const feeRuleSchema = z
  .object({
    transactionType: z.string().min(1),
    customerTier: z.string().optional().or(z.literal("")),
    feeType: z.enum(feeTypes),
    fixedAmount: z.number().nonnegative().optional(),
    percentageRate: z.number().nonnegative().max(100).optional(),
    minFee: z.number().nonnegative().optional(),
    maxFee: z.number().nonnegative().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.feeType === "FIXED" && (data.fixedAmount === undefined || data.fixedAmount <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fixedAmount"],
        message: "Fixed amount must be greater than zero",
      });
    }
    if (data.feeType === "PERCENTAGE" && (data.percentageRate === undefined || data.percentageRate <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["percentageRate"],
        message: "Percentage rate must be greater than zero",
      });
    }
    if (
      data.minFee !== undefined &&
      data.maxFee !== undefined &&
      data.minFee > data.maxFee
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maxFee"],
        message: "Max fee must be greater than or equal to min fee",
      });
    }
  });

export type FeeRuleInput = z.infer<typeof feeRuleSchema>;

export const velocityPeriods = ["DAILY", "WEEKLY", "MONTHLY", "ROLLING_24H"] as const;

export const velocityLimitSchema = z.object({
  accountId: z.string().uuid().optional().or(z.literal("")),
  transactionType: z.string().min(1),
  period: z.enum(velocityPeriods),
  maxAmount: z.number().positive("Max amount must be positive"),
  maxCount: z.number().int().positive().optional(),
});

export type VelocityLimitInput = z.infer<typeof velocityLimitSchema>;
