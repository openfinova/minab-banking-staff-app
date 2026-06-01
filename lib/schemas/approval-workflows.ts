import { z } from "zod";

export const createApprovalWorkflowSchema = z.object({
  resourceType: z.string().min(1, "Resource type is required"),
  resourceId: z.string().min(1, "Resource ID is required"),
  requiredGlRolesInOrder: z
    .array(z.string().min(1))
    .min(1, "Provide at least one required role"),
});

export type CreateApprovalWorkflowInput = z.infer<typeof createApprovalWorkflowSchema>;

export const workflowActionSchema = z.object({
  comment: z.string().max(500, "Comment too long").optional().or(z.literal("")),
});

export type WorkflowActionInput = z.infer<typeof workflowActionSchema>;
