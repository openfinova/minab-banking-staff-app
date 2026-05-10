import { z } from "zod";
import { isoDateString } from "@/lib/schemas/common";

export const createFiscalPeriodSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(50, "Name too long"),
    startDate: isoDateString,
    endDate: isoDateString,
    fiscalYear: z.number().int().min(1900, "Year too small").max(2200, "Year too large"),
    periodNumber: z.number().int().min(1).max(13),
  })
  .superRefine((data, ctx) => {
    if (new Date(data.startDate) > new Date(data.endDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "End date must be on or after start date",
      });
    }
  });

export type CreateFiscalPeriodInput = z.infer<typeof createFiscalPeriodSchema>;
