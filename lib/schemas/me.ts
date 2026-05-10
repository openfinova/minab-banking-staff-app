import { z } from "zod";

export const changeOwnPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(100, "Password must be at most 100 characters"),
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
