import { api } from "@/lib/api/client";

export type CompensationStatus =
  | "ACTIVE"
  | "PAUSED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | string;

export interface CompensationStep {
  stepId: string;
  name: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  attempt?: number;
  errorMessage?: string;
}

export interface CompensationWorkflow {
  workflowId: string;
  transactionType: string;
  status: CompensationStatus;
  startedAt?: string;
  completedAt?: string;
  initiatorId?: string;
  failureReason?: string;
  steps?: CompensationStep[];
}

export interface CompensationReport {
  totalActive: number;
  totalCompleted: number;
  totalFailed: number;
  averageDurationMs?: number;
}

export const compensationApi = {
  active: () =>
    api.get<CompensationWorkflow[]>("/api/v1/compensation/workflows/active"),
  failed: () =>
    api.get<CompensationWorkflow[]>("/api/v1/compensation/workflows/failed"),
  byStatus: (status: string) =>
    api.get<CompensationWorkflow[]>(`/api/v1/compensation/workflows/status/${status}`),
  get: (workflowId: string) =>
    api.get<CompensationWorkflow>(`/api/v1/compensation/workflows/${workflowId}`),
  status: (workflowId: string) =>
    api.get<{ status: CompensationStatus }>(
      `/api/v1/compensation/workflows/${workflowId}/status`,
    ),
  steps: (workflowId: string) =>
    api.get<CompensationStep[]>(`/api/v1/compensation/workflows/${workflowId}/steps`),
  pause: (workflowId: string) =>
    api.post<void>(`/api/v1/compensation/workflows/${workflowId}/pause`),
  resume: (workflowId: string) =>
    api.post<void>(`/api/v1/compensation/workflows/${workflowId}/resume`),
  forceComplete: (workflowId: string) =>
    api.post<void>(`/api/v1/compensation/workflows/${workflowId}/force-complete`),
  retryStep: (workflowId: string, stepId: string) =>
    api.post<void>(
      `/api/v1/compensation/workflows/${workflowId}/steps/${stepId}/retry`,
    ),
  skipStep: (workflowId: string, stepId: string) =>
    api.post<void>(
      `/api/v1/compensation/workflows/${workflowId}/steps/${stepId}/skip`,
    ),
  report: () => api.get<CompensationReport>("/api/v1/compensation/workflows/report"),
};

export interface GlApprovalQueueItem {
  transactionId: string;
  transactionRef?: string;
  amount?: number;
  currency?: string;
  initiatedBy?: string;
  initiatedAt?: string;
  requiredRole?: string;
  status?: string;
}

export interface GlApprovalLimits {
  approvalRole?: string;
  maxAmount?: number;
  remainingDailyAmount?: number;
}

export const glApprovalsApi = {
  myQueue: () => api.get<GlApprovalQueueItem[]>("/api/v1/gl/approvals/my-queue"),
  myActivity: () => api.get<GlApprovalQueueItem[]>("/api/v1/gl/approvals/my-activity"),
  myLimits: () => api.get<GlApprovalLimits>("/api/v1/gl/approvals/my-limits"),
  canApprove: (transactionId: string) =>
    api.get<{ canApprove: boolean; reason?: string }>(
      `/api/v1/gl/approvals/${transactionId}/can-approve`,
    ),
};

export type FiscalPeriodStatus = "OPEN" | "CLOSED" | "REOPENED" | string;

export interface FiscalPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  fiscalYear: number;
  periodNumber: number;
  status: FiscalPeriodStatus;
  postingAllowed?: boolean;
}

export interface CreateFiscalPeriodRequest {
  name: string;
  startDate: string;
  endDate: string;
  fiscalYear: number;
  periodNumber: number;
}

export const fiscalPeriodsApi = {
  list: () => api.get<FiscalPeriod[]>("/api/v1/gl/fiscal-periods"),
  byStatus: (status: string) =>
    api.get<FiscalPeriod[]>(`/api/v1/gl/fiscal-periods/status/${status}`),
  byYear: (year: number) =>
    api.get<FiscalPeriod[]>(`/api/v1/gl/fiscal-periods/year/${year}`),
  byPeriod: (year: number, periodNumber: number) =>
    api.get<FiscalPeriod>(`/api/v1/gl/fiscal-periods/year/${year}/period/${periodNumber}`),
  active: () => api.get<FiscalPeriod[]>("/api/v1/gl/fiscal-periods/active"),
  forDate: (date: string) =>
    api.get<FiscalPeriod>("/api/v1/gl/fiscal-periods/for-date", { query: { date } }),
  postingAllowed: (date?: string) =>
    api.get<{ allowed: boolean }>("/api/v1/gl/fiscal-periods/posting-allowed", {
      query: { date },
    }),
  create: (body: CreateFiscalPeriodRequest) =>
    api.post<FiscalPeriod>("/api/v1/gl/fiscal-periods", body),
  close: (id: string) => api.post<FiscalPeriod>(`/api/v1/gl/fiscal-periods/${id}/close`),
  reopen: (id: string) =>
    api.post<FiscalPeriod>(`/api/v1/gl/fiscal-periods/${id}/reopen`),
};

export interface FinancialStatementResponse {
  asOfDate?: string;
  startDate?: string;
  endDate?: string;
  currency?: string;
  totals?: Record<string, number>;
  lineItems?: Array<{
    accountCode?: string;
    accountName?: string;
    amount?: number;
    children?: Array<{ accountCode?: string; accountName?: string; amount?: number }>;
  }>;
}

export const glReportsApi = {
  incomeStatement: (params: { startDate: string; endDate: string }) =>
    api.get<FinancialStatementResponse>("/api/v1/gl/reports/income-statement", {
      query: params,
    }),
  balanceSheet: (params: { asOfDate: string }) =>
    api.get<FinancialStatementResponse>("/api/v1/gl/reports/balance-sheet", {
      query: params,
    }),
  cashFlow: (params: { startDate: string; endDate: string }) =>
    api.get<FinancialStatementResponse>("/api/v1/gl/reports/cash-flow", {
      query: params,
    }),
};
