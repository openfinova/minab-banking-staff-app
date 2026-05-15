import { api } from "@/lib/api/client";
import { withPaging, type PageRequest, type PageResponse } from "@/lib/api/query";

/** Spring Data Page JSON */
export type SpringPage<T> = PageResponse<T> & {
  number?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
};

export interface TransactionResponse {
  id?: string;
  idempotencyKey?: string;
  type?: string;
  amount?: number | string;
  currency?: string;
  status?: string;
  sourceAccountId?: string;
  destinationAccountId?: string;
  description?: string;
  feeAmount?: number | string;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
}

export interface TransactionEvent {
  id?: string;
  eventType?: string;
  eventSequence?: number;
  previousStatus?: string;
  newStatus?: string;
  eventData?: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
  createdAt?: string;
  createdBy?: string;
}

export interface InitiateTransactionRequest {
  idempotencyKey: string;
  transactionType: string;
  amount: number;
  currency: string;
  createdBy: string;
  sourceAccountId?: string;
  destinationAccountId?: string;
  requestedTransactionDate?: string;
  requestedValueDate?: string;
  requestedReservationTimeout?: number;
  description?: string;
  metadata?: Record<string, unknown>;
  clientReference?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface TransactionListFilters extends PageRequest {
  accountId?: string;
  status?: string;
  transactionType?: string;
  fromDate?: string;
  toDate?: string;
  currency?: string;
  minAmount?: number;
  maxAmount?: number;
  reference?: string;
}

export const transactionsApi = {
  list: (filters: TransactionListFilters) =>
    api.get<SpringPage<TransactionResponse>>("/api/v1/transactions", {
      query: withPaging(
        {
          accountId: filters.accountId,
          status: filters.status,
          transactionType: filters.transactionType,
          fromDate: filters.fromDate,
          toDate: filters.toDate,
          currency: filters.currency,
          minAmount: filters.minAmount,
          maxAmount: filters.maxAmount,
          reference: filters.reference,
        },
        { page: filters.page, size: filters.size ?? 20, sort: filters.sort ?? "createdAt,desc" },
      ),
    }),
  get: (id: string) => api.get<TransactionResponse>(`/api/v1/transactions/${id}`),
  status: (id: string) => api.get<{ status: string }>(`/api/v1/transactions/${id}/status`),
  history: (id: string) => api.get<TransactionEvent[]>(`/api/v1/transactions/${id}/history`),
  refunds: (id: string) => api.get<TransactionResponse[]>(`/api/v1/transactions/${id}/refunds`),
  refundableAmount: (id: string) =>
    api.get<Record<string, unknown>>(`/api/v1/transactions/${id}/refundable-amount`),
  initiate: (body: InitiateTransactionRequest) =>
    api.post<TransactionResponse>("/api/v1/transactions", body),
  fullRefund: (id: string, body: { originalTransactionId: string; reason: string; initiatedBy?: string }) =>
    api.post<TransactionResponse>(`/api/v1/transactions/${id}/refund/full`, body),
  partialRefund: (
    id: string,
    body: { originalTransactionId: string; reason: string; refundAmount: number; initiatedBy?: string },
  ) => api.post<TransactionResponse>(`/api/v1/transactions/${id}/refund/partial`, body),
};

export interface FeeRuleResponse {
  id?: string;
  transactionType?: string;
  customerTier?: string;
  feeType?: string;
  fixedAmount?: number | string;
  percentageRate?: number | string;
  minFee?: number | string;
  maxFee?: number | string;
  isActive?: boolean;
}

export interface CreateFeeRuleRequest {
  transactionType: string;
  customerTier: string;
  feeType: string;
  fixedAmount?: number;
  percentageRate?: number;
  minFee?: number;
  maxFee?: number;
}

export interface UpdateFeeRuleRequest {
  transactionType?: string;
  customerTier?: string;
  feeType?: string;
  fixedAmount?: number;
  percentageRate?: number;
  minFee?: number;
  maxFee?: number;
  isActive?: boolean;
}

export interface CreateFeeWaiverRequest {
  customerId: string;
  waiverName?: string;
  description?: string;
  /** Legacy: used as name when waiverName is omitted */
  reason?: string;
  transactionType?: string;
  customerTier?: string;
  campaignCode?: string;
  isActive?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
  maxUsageCount?: number;
  isGlobal?: boolean;
  conditions?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface FeeWaiverResponse {
  id?: string;
  customerId?: string;
  reason?: string;
  waiverName?: string;
  description?: string;
  transactionType?: string;
  customerTier?: string;
  campaignCode?: string;
  isActive?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
  maxUsageCount?: number;
  isGlobal?: boolean;
  conditions?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export const feesApi = {
  rules: () => api.get<FeeRuleResponse[]>("/api/v1/fees/rules"),
  rulesByType: (type: string) => api.get<FeeRuleResponse[]>(`/api/v1/fees/rules/type/${type}`),
  createRule: (body: CreateFeeRuleRequest) =>
    api.post<FeeRuleResponse>("/api/v1/fees/rules", body),
  updateRule: (ruleId: string, body: UpdateFeeRuleRequest) =>
    api.put<FeeRuleResponse>(`/api/v1/fees/rules/${ruleId}`, body),
  deleteRule: (ruleId: string) => api.delete<void>(`/api/v1/fees/rules/${ruleId}`),
  createWaiver: (body: CreateFeeWaiverRequest) =>
    api.post<FeeWaiverResponse>("/api/v1/fees/waivers", body),
  waiversByCustomer: (customerId: string) =>
    api.get<FeeWaiverResponse[]>(`/api/v1/fees/waivers/customer/${customerId}`),
};

export interface VelocityLimitResponse {
  id?: string;
  accountId?: string;
  transactionType?: string;
  period?: string;
  maxAmount?: number | string;
  maxCount?: number;
}

export interface CreateVelocityLimitRequest {
  accountId: string;
  transactionType: string;
  period: string;
  maxAmount?: number;
  maxCount?: number;
}

export interface UpdateVelocityLimitRequest {
  maxAmount?: number;
  maxCount?: number;
}

export const velocityLimitsApi = {
  byAccount: (accountId: string) =>
    api.get<VelocityLimitResponse[]>(`/api/v1/velocity-limits/account/${accountId}`),
  byType: (type: string) => api.get<VelocityLimitResponse[]>(`/api/v1/velocity-limits/type/${type}`),
  create: (body: CreateVelocityLimitRequest) =>
    api.post<VelocityLimitResponse>("/api/v1/velocity-limits", body),
  update: (id: string, body: UpdateVelocityLimitRequest) =>
    api.put<VelocityLimitResponse>(`/api/v1/velocity-limits/${id}`, body),
  delete: (id: string) => api.delete<void>(`/api/v1/velocity-limits/${id}`),
  remaining: (accountId: string, type: string) =>
    api.get<VelocityLimitResponse[]>(`/api/v1/velocity-limits/account/${accountId}/remaining`, {
      query: { type },
    }),
  limitStatus: (accountId: string, type: string) =>
    api.get<Record<string, unknown>>(`/api/v1/velocity-limits/account/${accountId}/status`, {
      query: { type },
    }),
  remainingAmount: (accountId: string, type: string, period: string) =>
    api.get<Record<string, unknown>>(
      `/api/v1/velocity-limits/account/${accountId}/remaining/${period}`,
      { query: { type } },
    ),
  remainingCount: (accountId: string, type: string, period: string) =>
    api.get<Record<string, unknown>>(
      `/api/v1/velocity-limits/account/${accountId}/remaining-count/${period}`,
      { query: { type } },
    ),
  breaches: (accountId: string, startDate: string, endDate: string) =>
    api.get<Record<string, unknown>[]>(`/api/v1/velocity-limits/account/${accountId}/breaches`, {
      query: { startDate, endDate },
    }),
  nextReset: (accountId: string, type: string, period: string) =>
    api.get<Record<string, unknown>>(
      `/api/v1/velocity-limits/account/${accountId}/next-reset/${period}`,
      { query: { type } },
    ),
};

export type CompensationStatus =
  | "ACTIVE"
  | "PAUSED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | string;

/** Matches CompensationWorkflowResponse from API */
export interface CompensationWorkflow {
  id?: string;
  transactionId?: string;
  status?: CompensationStatus;
  totalSteps?: number;
  completedSteps?: number;
  failedSteps?: number;
  createdAt?: string;
  completedAt?: string;
}

export interface CompensationStepRow {
  stepId?: string;
  stepType?: string;
  description?: string;
  order?: number;
  status?: string;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  retryCount?: number;
}

export interface CompensationWorkflowReport {
  reportStartDate?: string;
  reportEndDate?: string;
  totalWorkflows?: number;
  activeWorkflows?: number;
  completedWorkflows?: number;
  failedWorkflows?: number;
  successRate?: number;
}

export const compensationApi = {
  active: () => api.get<CompensationWorkflow[]>("/api/v1/compensation/workflows/active"),
  failed: () => api.get<CompensationWorkflow[]>("/api/v1/compensation/workflows/failed"),
  byStatus: (status: string) =>
    api.get<CompensationWorkflow[]>(`/api/v1/compensation/workflows/status/${status}`),
  get: (workflowId: string) =>
    api.get<CompensationWorkflow>(`/api/v1/compensation/workflows/${workflowId}`),
  workflowStatus: (workflowId: string) =>
    api.get<{ status: CompensationStatus }>(`/api/v1/compensation/workflows/${workflowId}/status`),
  steps: (workflowId: string) =>
    api.get<CompensationStepRow[]>(`/api/v1/compensation/workflows/${workflowId}/steps`),
  pause: (workflowId: string, reason: string) =>
    api.post<void>(`/api/v1/compensation/workflows/${workflowId}/pause`, undefined, {
      query: { reason },
    }),
  resume: (workflowId: string, resumedBy: string) =>
    api.post<void>(`/api/v1/compensation/workflows/${workflowId}/resume`, undefined, {
      query: { resumedBy },
    }),
  forceComplete: (workflowId: string, reason: string, completedBy: string) =>
    api.post<void>(`/api/v1/compensation/workflows/${workflowId}/force-complete`, undefined, {
      query: { reason, completedBy },
    }),
  retryStep: (workflowId: string, stepId: string, retriedBy: string) =>
    api.post<void>(
      `/api/v1/compensation/workflows/${workflowId}/steps/${stepId}/retry`,
      undefined,
      { query: { retriedBy } },
    ),
  skipStep: (workflowId: string, stepId: string, reason: string, skippedBy: string) =>
    api.post<void>(
      `/api/v1/compensation/workflows/${workflowId}/steps/${stepId}/skip`,
      undefined,
      { query: { reason, skippedBy } },
    ),
  report: (startDate: string, endDate: string) =>
    api.get<CompensationWorkflowReport>("/api/v1/compensation/workflows/report", {
      query: { startDate, endDate },
    }),
  averageTime: (transactionType: string) =>
    api.get<Record<string, unknown>>(
      `/api/v1/compensation/workflows/average-time/${transactionType}`,
    ),
  createCustom: (transactionId: string, steps: unknown[]) =>
    api.post<CompensationWorkflow>("/api/v1/compensation/workflows/custom", steps, {
      query: { transactionId },
    }),
};

export interface AccountTransactionResponse {
  id?: string;
  accountId?: string;
  transactionType?: string;
  amount?: number | string;
  currency?: string;
  transactionDate?: string;
  description?: string;
  referenceId?: string;
  glTransactionId?: string;
}

export const accountTransactionsApi = {
  list: (accountId: string, fromDate: string, toDate: string, page: PageRequest) =>
    api.get<SpringPage<AccountTransactionResponse>>(
      `/api/v1/accounts/${accountId}/transactions`,
      {
        query: withPaging({ fromDate, toDate }, page),
      },
    ),
  get: (transactionId: string) =>
    api.get<AccountTransactionResponse>(`/api/v1/accounts/transactions/${transactionId}`),
  updateGlLink: (transactionId: string, glTransactionId: string) =>
    api.patch<void>(`/api/v1/accounts/transactions/${transactionId}/gl-link`, undefined, {
      query: { glTransactionId },
    }),
  record: (
    accountId: string,
    body: {
      transactionType: string;
      amount: number;
      currency: string;
      transactionDate: string;
      description?: string;
      referenceId?: string;
    },
  ) => api.post<AccountTransactionResponse>(`/api/v1/accounts/${accountId}/transactions`, body),
  recordWithGl: (
    accountId: string,
    body: {
      transactionType: string;
      amount: number;
      currency: string;
      transactionDate: string;
      description?: string;
      referenceId?: string;
      glTransactionId: string;
    },
  ) =>
    api.post<AccountTransactionResponse>(
      `/api/v1/accounts/${accountId}/transactions/with-gl`,
      body,
    ),
};
