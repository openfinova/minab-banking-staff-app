import { z } from "zod";
import { isoDateTimeString } from "@/lib/schemas/common";

export const createDelegationSchema = z
  .object({
    delegatorUserId: z.string().uuid("Must be a UUID"),
    delegateeUserId: z.string().uuid("Must be a UUID"),
    resourceType: z.string().max(60).optional().or(z.literal("")),
    startsAt: isoDateTimeString,
    endsAt: isoDateTimeString,
    reason: z.string().max(500).optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (new Date(data.startsAt).getTime() >= new Date(data.endsAt).getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endsAt"],
        message: "End must be after start",
      });
    }
    if (data.delegatorUserId === data.delegateeUserId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["delegateeUserId"],
        message: "Delegator and delegatee must differ",
      });
    }
  });

export type CreateDelegationInput = z.infer<typeof createDelegationSchema>;

export const revokeDelegationSchema = z.object({
  reason: z.string().max(500).optional().or(z.literal("")),
});

export type RevokeDelegationInput = z.infer<typeof revokeDelegationSchema>;
