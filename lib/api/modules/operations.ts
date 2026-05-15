import { api } from "@/lib/api/client";
import { withPaging, type PageRequest, type PageResponse } from "@/lib/api/query";

export type {
  CompensationStatus,
  CompensationWorkflow,
  CompensationWorkflowReport,
  CompensationStepRow,
} from "./transaction-processing";
export { compensationApi } from "./transaction-processing";

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

export type FiscalPeriodStatus =
  | "OPEN"
  | "ADJUSTING"
  | "CLOSED"
  | "LOCKED"
  /** Legacy / mistake — server uses CLOSED then OPEN again after reopen */
  | "REOPENED"
  | string;

export interface FiscalPeriodCloseResult {
  message: string;
  periodId: string;
}

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
  /** Query params required by server: closedBy, reason */
  close: (id: string, query: { closedBy: string; reason: string }) =>
    api.post<FiscalPeriodCloseResult>(
      `/api/v1/gl/fiscal-periods/${encodeURIComponent(id)}/close`,
      undefined,
      { query: { closedBy: query.closedBy, reason: query.reason } },
    ),
  /** Query params required: reopenedBy; reason must be ≥ 10 chars (server-enforced). */
  reopen: (id: string, query: { reopenedBy: string; reason: string }) =>
    api.post<FiscalPeriod>(
      `/api/v1/gl/fiscal-periods/${encodeURIComponent(id)}/reopen`,
      undefined,
      { query: { reopenedBy: query.reopenedBy, reason: query.reason } },
    ),
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

/** Bootstrap & standard chart (uses StandardBankTemplateDefinition on server). */
export const glSetupApi = {
  initializeChartOfAccounts: (currency: string, createdBy: string) =>
    api.post<{ currency: string; glAccountsCreated: number }>(
      "/api/v1/gl/setup/chart-of-accounts",
      undefined,
      { query: { currency, createdBy } },
    ),
  initializeOperationalAccounts: (createdBy: string) =>
    api.post<{ operationalAccountsWired: number }>(
      "/api/v1/gl/setup/operational-accounts",
      undefined,
      { query: { createdBy } },
    ),
  initializeFiscalPeriods: (fiscalYear: number, createdBy: string) =>
    api.post<{
      fiscalYear: number;
      fiscalPeriodsCreated: number;
      fiscalPeriodsAlreadyExisted: number;
    }>("/api/v1/gl/setup/fiscal-periods", undefined, {
      query: { fiscalYear, createdBy },
    }),
  initializeAll: (body: { currency: string; fiscalYear: number; createdBy: string }) =>
    api.post<Record<string, unknown>>("/api/v1/gl/setup/initialize", body),
};

export interface GlAccount {
  id: string;
  code: string;
  name: string;
  type?: string;
  currency?: string;
  status?: string;
  parentCode?: string;
  normalBalance?: string;
  description?: string;
}

export const glAccountsApi = {
  list: (
    params: PageRequest & {
      type?: string;
      status?: string;
      currency?: string;
      search?: string;
    } = {},
  ) =>
    api.get<PageResponse<GlAccount>>("/api/v1/gl/accounts", {
      query: withPaging(
        {
          type: params.type,
          status: params.status,
          currency: params.currency,
          search: params.search,
        },
        {
          page: params.page ?? 0,
          size: params.size ?? 20,
          sort: params.sort ?? "code,asc",
        },
      ),
    }),
};

export interface GlAccountBalanceRow {
  accountId?: string;
  accountCode?: string;
  accountName?: string;
  currentBalance?: number | string;
  totalDebits?: number | string;
  totalCredits?: number | string;
}

export interface TrialBalanceReport {
  asOfDate?: string;
  accountBalances?: GlAccountBalanceRow[];
  totalDebits?: number | string;
  totalCredits?: number | string;
  balanced?: boolean;
  isBalanced?: boolean;
}

export const glBalancesApi = {
  trialBalance: (asOfDate: string) =>
    api.get<TrialBalanceReport>("/api/v1/gl/balances/trial-balance", {
      query: { asOfDate },
    }),
};

export interface OperationalGlConfig {
  id: string;
  type?: string;
  glAccountId?: string;
  glAccountCode?: string;
  glAccountName?: string;
  active?: boolean;
  createdBy?: string;
}

export const glOperationalAccountsApi = {
  listActive: () => api.get<OperationalGlConfig[]>("/api/v1/gl/operational-accounts"),
  validate: () =>
    api.get<{ valid: boolean; missingTypes?: string[] }>(
      "/api/v1/gl/operational-accounts/validate",
    ),
  wireStandardMappings: (createdBy: string) =>
    api.post<{ message?: string; count?: number }>(
      "/api/v1/gl/operational-accounts/standard",
      undefined,
      { query: { createdBy } },
    ),
};

export interface GlJournalEntryRow {
  id?: string;
  accountId?: string;
  debitAmount?: number | string;
  creditAmount?: number | string;
  description?: string;
  postingDate?: string;
}

export const glJournalApi = {
  byAccountId: (accountId: string) =>
    api.get<GlJournalEntryRow[]>(`/api/v1/gl/journal-entries/account/${accountId}`),
};

export interface GlTransaction {
  id: string;
  referenceId?: string;
  transactionDate?: string;
  description?: string;
  status?: string;
  currency?: string;
  createdBy?: string;
}

export const glTransactionsApi = {
  byId: (id: string) => api.get<GlTransaction>(`/api/v1/gl/transactions/${id}`),
  byReference: (referenceId: string) =>
    api.get<GlTransaction>(`/api/v1/gl/transactions/reference/${encodeURIComponent(referenceId)}`),
  validateBalance: (id: string) =>
    api.get<{ transactionId?: string; balanced?: boolean }>(
      `/api/v1/gl/transactions/${id}/validate`,
    ),
};

export interface SuspenseItemRow {
  id: string;
  transactionReference?: string;
  amount?: number | string;
  currency?: string;
  status?: string;
  reasonCode?: string;
  postingDate?: string;
}

export const glSuspenseApi = {
  search: (opts: { page?: number; size?: number; sort?: string } = {}) =>
    api.get<PageResponse<SuspenseItemRow>>("/api/v1/gl/suspense", {
      query: withPaging(
        {},
        { page: opts.page ?? 0, size: opts.size ?? 25, sort: opts.sort },
      ),
    }),
};

export interface GlRevaluationRun {
  id: string;
  revaluationDate?: string;
  executedBy?: string;
  executedAt?: string;
  baseCurrency?: string;
  accountsProcessed?: number;
  accountsRevalued?: number;
  accountsFailed?: number;
  totalAdjustment?: number | string;
}

export const glRevaluationApi = {
  listRuns: (from?: string, to?: string) =>
    api.get<GlRevaluationRun[]>("/api/v1/gl/revaluation/runs", {
      query: { from: from ?? undefined, to: to ?? undefined },
    }),
  trigger: (asOfDate: string, executedBy: string) =>
    api.post<Record<string, unknown>>("/api/v1/gl/revaluation", undefined, {
      query: { asOfDate, executedBy },
    }),
};

export interface GlAuditTrailDto {
  id?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  performedBy?: string;
  performedAt?: string;
  reason?: string;
  transactionAmount?: number | string;
}

export const glAuditApi = {
  recent: (date: string) =>
    api.get<GlAuditTrailDto[]>("/api/v1/gl/audit/recent", { query: { date } }),
  reversals: (startDate: string, endDate: string) =>
    api.get<GlAuditTrailDto[]>("/api/v1/gl/audit/reversals", {
      query: { startDate, endDate },
    }),
  highRisk: (startDate: string, endDate: string) =>
    api.get<GlAuditTrailDto[]>("/api/v1/gl/audit/high-risk", {
      query: { startDate, endDate },
    }),
};
