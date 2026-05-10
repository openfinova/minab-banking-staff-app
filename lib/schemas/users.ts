import { z } from "zod";

export const userTypes = ["STAFF", "CUSTOMER"] as const;
export type UserTypeSchema = (typeof userTypes)[number];

export const branchCodeRegex = /^[A-Z0-9-]{2,16}$/;

export const createUserSchema = z
  .object({
    username: z.string().min(1, "Username is required").max(80, "Username too long"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(100, "Password too long"),
    email: z
      .string()
      .max(150, "Email too long")
      .email("Enter a valid email")
      .optional()
      .or(z.literal("")),
    userType: z.enum(userTypes),
    branchCode: z
      .string()
      .regex(branchCodeRegex, "Branch code must be 2-16 chars (A-Z, 0-9, -)")
      .optional()
      .or(z.literal("")),
    employeeId: z.string().max(60).optional().or(z.literal("")),
    glApprovalRole: z.string().max(60).optional().or(z.literal("")),
    customerPartyId: z.string().uuid("Must be a UUID").optional().or(z.literal("")),
    roleNames: z.array(z.string()).optional(),
    accountExpiresAt: z.string().optional().or(z.literal("")),
    provisioningEligibilityNotes: z
      .string()
      .max(2000, "Notes too long")
      .optional()
      .or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.userType === "STAFF" && (!data.email || data.email.trim().length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["email"],
        message: "Email is required for staff users",
      });
    }
  });

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserAccessSchema = z.object({
  email: z.string().max(150).email().optional().or(z.literal("")),
  branchCode: z
    .string()
    .regex(branchCodeRegex, "Branch code must be 2-16 chars (A-Z, 0-9, -)")
    .optional()
    .or(z.literal("")),
  employeeId: z.string().max(60).optional().or(z.literal("")),
  glApprovalRole: z.string().max(60).optional().or(z.literal("")),
  customerPartyId: z.string().uuid().optional().or(z.literal("")),
  accountExpiresAt: z.string().optional().or(z.literal("")),
});

export type UpdateUserAccessInput = z.infer<typeof updateUserAccessSchema>;

export const lockUserSchema = z.object({
  reason: z.string().min(1, "Reason is required").max(500, "Reason too long"),
});

export type LockUserInput = z.infer<typeof lockUserSchema>;

export const suspendUserSchema = z.object({
  reason: z.string().min(1, "Reason is required").max(500, "Reason too long"),
  suspensionUntil: z.string().optional().or(z.literal("")),
});

export type SuspendUserInput = z.infer<typeof suspendUserSchema>;

export const rejectProvisioningSchema = z.object({
  reason: z.string().min(1, "Reason is required").max(500, "Reason too long"),
});

export type RejectProvisioningInput = z.infer<typeof rejectProvisioningSchema>;

export const deprovisionUserSchema = z.object({
  reason: z.string().max(500, "Reason too long").optional().or(z.literal("")),
});

export type DeprovisionUserInput = z.infer<typeof deprovisionUserSchema>;

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password too long"),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
