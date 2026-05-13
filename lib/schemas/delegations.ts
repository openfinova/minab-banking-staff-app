import { z } from "zod";
import { isoDateTimeString } from "@/lib/schemas/common";

export const createDelegationSchema = z
  .object({
    delegatedFromUserId: z.string().min(1).max(320),
    delegatedToUserId: z.string().min(1).max(320),
    transactionType: z.string().min(1).max(80),
    validFrom: isoDateTimeString,
    validUntil: z.union([isoDateTimeString, z.literal("")]).optional(),
    currency: z.string().max(3).optional().or(z.literal("")),
    approvalLimit: z.string().max(40).optional().or(z.literal("")),
    actingGlApprovalRole: z.string().max(30).optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.delegatedFromUserId === data.delegatedToUserId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["delegatedToUserId"],
        message: "Delegated from and to must differ",
      });
    }
    const until = data.validUntil?.trim();
    if (until) {
      if (new Date(data.validFrom).getTime() >= new Date(until).getTime()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["validUntil"],
          message: "Valid until must be after valid from",
        });
      }
    }
    const limitRaw = data.approvalLimit?.trim();
    if (limitRaw) {
      const n = Number(limitRaw);
      if (!Number.isFinite(n) || n <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["approvalLimit"],
          message: "Enter a positive number",
        });
      } else {
        const ccy = data.currency?.trim();
        if (!ccy) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["currency"],
            message: "Currency is required when an approval limit is set",
          });
        }
      }
    }
  });

export type CreateDelegationInput = z.infer<typeof createDelegationSchema>;
