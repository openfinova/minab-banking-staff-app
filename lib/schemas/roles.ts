import { z } from "zod";

export const roleNameRegex = /^[A-Z0-9_]+$/;

export const createRoleSchema = z.object({
  name: z
    .string()
    .min(1, "Role name is required")
    .max(60, "Role name too long")
    .regex(roleNameRegex, "Use uppercase letters, digits, and underscores"),
  displayName: z.string().max(120).optional().or(z.literal("")),
  description: z.string().max(500).optional().or(z.literal("")),
  permissions: z.array(z.string()).optional(),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;

export const updateRoleSchema = z.object({
  displayName: z.string().max(120).optional().or(z.literal("")),
  description: z.string().max(500).optional().or(z.literal("")),
});

export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
