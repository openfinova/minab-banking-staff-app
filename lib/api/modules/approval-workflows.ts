import { api } from "@/lib/api/client";

export type WorkflowStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "IN_PROGRESS"
  | string;

export interface WorkflowStep {
  stepNumber: number;
  requiredRole: string;
  status: WorkflowStatus;
  actorUserId?: string;
  comment?: string;
  decidedAt?: string;
}

export interface ApprovalWorkflow {
  id: string;
  resourceType: string;
  resourceId: string;
  status: WorkflowStatus;
  requiredGlRolesInOrder: string[];
  steps: WorkflowStep[];
  createdAt?: string;
  completedAt?: string;
}

export interface CreateApprovalWorkflowRequest {
  resourceType: string;
  resourceId: string;
  requiredGlRolesInOrder: string[];
}

export interface WorkflowActionRequest {
  comment?: string;
}

export const approvalWorkflowsApi = {
  create: (body: CreateApprovalWorkflowRequest) =>
    api.post<ApprovalWorkflow>("/api/v1/identity/approval-workflows", body),
  get: (id: string) =>
    api.get<ApprovalWorkflow>(`/api/v1/identity/approval-workflows/${id}`),
  listByResource: (resourceType: string) =>
    api.get<ApprovalWorkflow[]>("/api/v1/identity/approval-workflows", {
      query: { resourceType },
    }),
  approve: (id: string, body?: WorkflowActionRequest) =>
    api.post<ApprovalWorkflow>(
      `/api/v1/identity/approval-workflows/${id}/approve`,
      body,
    ),
  reject: (id: string, body?: WorkflowActionRequest) =>
    api.post<ApprovalWorkflow>(
      `/api/v1/identity/approval-workflows/${id}/reject`,
      body,
    ),
  cancel: (id: string, body?: WorkflowActionRequest) =>
    api.post<ApprovalWorkflow>(
      `/api/v1/identity/approval-workflows/${id}/cancel`,
      body,
    ),
};
