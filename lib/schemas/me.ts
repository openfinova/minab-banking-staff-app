import { z } from "zod";

import { bankPasswordStringSchema } from "@/lib/schemas/password-policy";

export const changeOwnPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: bankPasswordStringSchema,
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export type ChangeOwnPasswordInput = z.infer<typeof changeOwnPasswordSchema>;

export const mfaVerifySchema = z.object({
  code: z
    .string()
    .length(6, "Enter the 6-digit code from your authenticator app")
    .regex(/^\d+$/, "Code must be numeric"),
});

export type MfaVerifyInput = z.infer<typeof mfaVerifySchema>;

export const mfaDisableSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
});

export type MfaDisableInput = z.infer<typeof mfaDisableSchema>;
