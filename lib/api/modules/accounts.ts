import { api, request } from "@/lib/api/client";
import { withPaging, type PageResponse } from "@/lib/api/query";

const accountPath = (id: string) => `/api/v1/accounts/${encodeURIComponent(id)}`;

export type AccountProductType =
  | "CHECKING"
  | "SAVINGS"
  | "MONEY_MARKET"
  | "CERTIFICATE_OF_DEPOSIT"
  | "CREDIT_LINE"
  | "INVESTMENT"
  | string;

export type AccountStatus = "ACTIVE" | "SUSPENDED" | "FROZEN" | "CLOSED" | "DORMANT" | string;

export type RelationshipType =
  | "PRIMARY_HOLDER"
  | "SECONDARY_HOLDER"
  | "AUTHORIZED_USER"
  | "BENEFICIARY"
  | "GUARDIAN"
  | string;

export type AccountPermission = "VIEW" | "TRANSACT" | "MANAGE" | "ADMIN" | string;

export type HoldStatus = "ACTIVE" | "RELEASED" | "EXPIRED" | "SETTLED" | string;

export type LimitType =
  | "DAILY_TRANSACTION"
  | "WEEKLY_TRANSACTION"
  | "MONTHLY_TRANSACTION"
  | "ANNUAL_TRANSACTION"
  | "MAXIMUM_BALANCE"
  | "MINIMUM_BALANCE"
  | "OVERDRAFT_LIMIT"
  | "WITHDRAWAL_LIMIT"
  | "TRANSFER_LIMIT"
  | "VELOCITY_LIMIT"
  | string;

export type LimitPeriod =
  | "DAILY"
  | "WEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "ANNUAL"
  | "LIFETIME"
  | string;

export type AccountTransactionType =
  | "DEPOSIT"
  | "WITHDRAWAL"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "FEE"
  | "INTEREST_CREDIT"
  | "INTEREST_CHARGE"
  | "ADJUSTMENT"
  | string;

export type InterestRateType = "CREDIT" | "DEBIT" | string;

export interface AccountResponse {
  id: string;
  accountNumber: string;
  iban?: string;
  primaryUserProfileId: string;
  productType: AccountProductType;
  status: AccountStatus;
  displayName?: string;
  description?: string;
  currency: string;
  ledgerBalance?: string | number;
  availableBalance?: string | number;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  closedAt?: string;
  closureReason?: string;
}

export interface CreateAccountBody {
  primaryUserProfileId: string;
  productType: AccountProductType;
  currency: string;
  /** Domestic account number — must match the server's account.number.regex (default ^[A-Z0-9]{8,20}$). */
  accountNumber: string;
  createdBy: string;
}

/** Default regex enforced by the backend ValidAccountNumber when account.number.regex is not overridden. */
export const ACCOUNT_NUMBER_REGEX = /^[A-Z0-9]{8,20}$/;

export interface UpdateAccountStatusBody {
  newStatus: AccountStatus;
  reason: string;
  changedBy: string;
}

export interface ValidationResult {
  valid?: boolean;
  errors?: string[];
  warnings?: string[];
  availableBalance?: string | number;
  accountStatus?: string;
  applicableLimits?: string[];
  message?: string;
}

export interface GLComponentBalance {
  glAccountId?: string;
  mappingType?: string;
  balance?: string | number;
  weight?: number;
}

export interface AccountBalanceView {
  accountId: string;
  accountNumber?: string;
  currentBalance?: string | number;
  availableBalance?: string | number;
  pendingCredits?: string | number;
  pendingDebits?: string | number;
  reservedAmount?: string | number;
  currency?: string;
  lastUpdated?: string;
  glAccountCount?: number;
  components?: GLComponentBalance[];
}

export interface BalanceHistoryEntry {
  date: string;
  balance?: string | number;
  change?: string | number;
  changeReason?: string;
}

export interface BalanceTrendAnalysis {
  averageBalance?: string | number;
  minimumBalance?: string | number;
  maximumBalance?: string | number;
  totalChange?: string | number;
  averageDailyChange?: string | number;
  trend?: string;
}

export interface BalanceHistoryResponse {
  customerAccountId?: string;
  startDate?: string;
  endDate?: string;
  balanceHistory?: BalanceHistoryEntry[];
  trendAnalysis?: BalanceTrendAnalysis;
}

export interface AccountRelationshipResponse {
  id: string;
  accountId: string;
  userProfileId: string;
  relationshipType: RelationshipType;
  permissions?: AccountPermission[];
  percentageOwnership?: string | number;
  /** JSON may use `beneficiary` or `isBeneficiary` depending on serde config */
  beneficiary?: boolean;
  isBeneficiary?: boolean;
  beneficiaryPercentage?: string | number;
  active?: boolean;
  isActive?: boolean;
  createdAt?: string;
  createdBy?: string;
}

export interface AddRelationshipBody {
  userProfileId: string;
  relationshipType: RelationshipType;
  createdBy: string;
}

export interface AddBeneficiaryBody {
  userProfileId: string;
  /** Allocation percentage 0.01 — 100.00 */
  percentage: number;
  relationshipDescription?: string;
  birthDate?: string;
  effectiveFrom?: string;
  effectiveUntil?: string;
  createdBy: string;
}

export interface AccountHoldResponse {
  id: string;
  accountId: string;
  amount: string | number;
  currency: string;
  status: HoldStatus;
  reason?: string;
  expiresAt?: string;
  createdAt?: string;
  releasedAt?: string;
}

export interface PlaceHoldBody {
  amount: number;
  currency: string;
  reason: string;
  expiresAt?: string | null;
}

export interface AccountLimitResponse {
  id: string;
  accountId: string;
  limitType: LimitType;
  limitPeriod: LimitPeriod;
  maxAmount?: string | number;
  maxCount?: number;
  createdAt?: string;
  createdBy?: string;
}

export interface AddLimitBody {
  limitType: LimitType;
  limitPeriod: LimitPeriod;
  maxAmount?: number;
  maxCount?: number;
  createdBy: string;
}

export interface AccountTransactionResponse {
  id: string;
  accountId: string;
  transactionType: AccountTransactionType;
  amount: string | number;
  currency: string;
  transactionDate: string;
  description?: string;
  referenceId?: string;
  glTransactionId?: string;
}

export interface StatementPeriod {
  year?: number;
  month?: number;
  fromDate: string;
  toDate: string;
}

export interface StatementSummary {
  openingBalance?: string | number;
  closingBalance?: string | number;
  totalCredits?: string | number;
  totalDebits?: string | number;
}

export interface AccountStatement {
  accountId: string;
  accountNumber?: string;
  fromDate: string;
  toDate: string;
  transactions: Array<AccountTransactionResponse | Record<string, unknown>>;
  summary?: StatementSummary;
}

export interface InterestRateResponse {
  id: string;
  accountId: string;
  rateType: InterestRateType;
  annualPercentageRate: string | number;
  effectiveFrom: string;
  effectiveUntil?: string;
}

export interface SetInterestRateBody {
  rateType: InterestRateType;
  /** Annual percentage rate (e.g. 5 for 5%). */
  annualPercentageRate: number;
  /** ISO date-time when the rate becomes effective. */
  effectiveFrom: string;
}

export interface BatchStatusUpdateBody {
  accountIds: string[];
  newStatus: AccountStatus;
  reason: string;
  changedBy: string;
}

export interface BatchCloseBody {
  accountIds: string[];
  reason: string;
  closedBy: string;
}

export type BatchResult = Record<string, string>;

export const accountsApi = {
  search: (params: {
    productType?: AccountProductType;
    status?: AccountStatus;
    primaryUserProfileId?: string;
    page?: number;
    size?: number;
  }) =>
    api.get<PageResponse<AccountResponse>>("/api/v1/accounts", {
      query: withPaging(
        {
          ...(params.productType ? { productType: params.productType } : {}),
          ...(params.status ? { status: params.status } : {}),
          ...(params.primaryUserProfileId?.trim()
            ? { primaryUserProfileId: params.primaryUserProfileId.trim() }
            : {}),
        },
        { page: params.page ?? 0, size: params.size ?? 20, sort: "createdAt,desc" },
      ),
    }),

  get: (id: string) => api.get<AccountResponse>(accountPath(id)),

  getByNumber: (accountNumber: string) =>
    api.get<AccountResponse>(`/api/v1/accounts/number/${encodeURIComponent(accountNumber.trim())}`),

  getByIban: (iban: string) =>
    api.get<AccountResponse>(
      `/api/v1/accounts/iban/${encodeURIComponent(iban.replace(/\s+/g, "").toUpperCase())}`,
    ),

  listByType: (productType: AccountProductType) =>
    api.get<AccountResponse[]>(`/api/v1/accounts/type/${encodeURIComponent(productType)}`),

  listByStatus: (status: AccountStatus) =>
    api.get<AccountResponse[]>(`/api/v1/accounts/status/${encodeURIComponent(status)}`),

  create: (body: CreateAccountBody) => api.post<AccountResponse>("/api/v1/accounts", body),

  updateStatus: (id: string, body: UpdateAccountStatusBody) =>
    api.patch<AccountResponse>(`${accountPath(id)}/status`, body),

  close: (id: string, reason: string) =>
    request<void>(accountPath(id), { method: "DELETE", query: { reason } }),

  validateForTransaction: (id: string, amount: number) =>
    api.post<ValidationResult>(`${accountPath(id)}/validate`, undefined, {
      query: { amount },
    }),

  /** Batch / lifecycle operations */
  batchUpdateStatus: (body: BatchStatusUpdateBody) =>
    api.post<BatchResult>("/api/v1/accounts/batch/status", body),

  batchClose: (body: BatchCloseBody) =>
    api.post<BatchResult>("/api/v1/accounts/batch/close", body),

  processDormancy: (inactivityMonths: number) =>
    api.post<{ accountsMarkedDormant: number }>(
      "/api/v1/accounts/dormancy/process",
      undefined,
      { query: { inactivityMonths } },
    ),

  /** Relationships */
  listRelationships: (accountId: string) =>
    api.get<AccountRelationshipResponse[]>(`${accountPath(accountId)}/relationships`),

  addRelationship: (accountId: string, body: AddRelationshipBody) =>
    api.post<AccountRelationshipResponse>(`${accountPath(accountId)}/relationships`, body),

  removeRelationship: (accountId: string, userProfileId: string) =>
    request<void>(`${accountPath(accountId)}/relationships/${encodeURIComponent(userProfileId)}`, {
      method: "DELETE",
    }),

  updateRelationshipPermissions: (relationshipId: string, permissions: AccountPermission[]) =>
    api.patch<void>(
      `/api/v1/accounts/relationships/${encodeURIComponent(relationshipId)}/permissions`,
      { permissions },
    ),

  addBeneficiary: (accountId: string, body: AddBeneficiaryBody) =>
    api.post<AccountRelationshipResponse>(`${accountPath(accountId)}/beneficiaries`, body),

  removeBeneficiary: (accountId: string, userProfileId: string) =>
    request<void>(
      `${accountPath(accountId)}/beneficiaries/${encodeURIComponent(userProfileId)}`,
      { method: "DELETE" },
    ),

  checkPermission: (accountId: string, userProfileId: string, permission: AccountPermission) =>
    api.post<ValidationResult>(`${accountPath(accountId)}/permissions/check`, undefined, {
      query: { userProfileId, permission },
    }),

  /** Balance */
  getBalance: (accountId: string) =>
    api.get<AccountBalanceView>(`${accountPath(accountId)}/balance`),

  getDetailedBalance: (accountId: string) =>
    api.get<AccountBalanceView>(`${accountPath(accountId)}/balance/detailed`),

  getAvailableBalance: (accountId: string) =>
    api.get<{ availableBalance: number }>(`${accountPath(accountId)}/balance/available`),

  getBalanceHistory: (accountId: string, startDate: string, endDate: string) =>
    api.get<BalanceHistoryResponse>(`${accountPath(accountId)}/balance/history`, {
      query: { startDate, endDate },
    }),

  getBalanceTrends: (accountId: string, days: number) =>
    api.get<BalanceHistoryResponse>(`${accountPath(accountId)}/balance/trends`, {
      query: { days },
    }),

  getBalanceAsOf: (accountId: string, asOfDate: string) =>
    api.get<AccountBalanceView>(`${accountPath(accountId)}/balance/as-of`, {
      query: { asOfDate },
    }),

  refreshBalance: (accountId: string) =>
    request<void>(`${accountPath(accountId)}/balance/refresh`, { method: "POST" }),

  validateBalanceConsistency: (accountId: string) =>
    api.post<{ isConsistent: boolean }>(`${accountPath(accountId)}/balance/validate`, undefined),

  /** Holds */
  listHolds: (accountId: string) =>
    api.get<AccountHoldResponse[]>(`${accountPath(accountId)}/holds`),

  getTotalHoldAmount: (accountId: string) =>
    api.get<{ totalHoldAmount: number }>(`${accountPath(accountId)}/holds/total`),

  placeHold: (accountId: string, body: PlaceHoldBody) =>
    api.post<AccountHoldResponse>(`${accountPath(accountId)}/holds`, {
      ...body,
      expiresAt: body.expiresAt ?? undefined,
    }),

  releaseHold: (holdId: string) =>
    request<void>(`/api/v1/accounts/holds/${encodeURIComponent(holdId)}/release`, {
      method: "POST",
    }),

  settleHold: (holdId: string) =>
    request<void>(`/api/v1/accounts/holds/${encodeURIComponent(holdId)}/settle`, {
      method: "POST",
    }),

  processExpiredHolds: () =>
    api.post<{ holdsExpired: number }>(`/api/v1/accounts/holds/process-expired`, undefined),

  /** Limits */
  listLimits: (accountId: string) =>
    api.get<AccountLimitResponse[]>(`${accountPath(accountId)}/limits`),

  addLimit: (accountId: string, body: AddLimitBody) =>
    api.post<AccountLimitResponse>(`${accountPath(accountId)}/limits`, body),

  removeLimit: (limitId: string, removedBy: string) =>
    request<void>(`/api/v1/accounts/limits/${encodeURIComponent(limitId)}`, {
      method: "DELETE",
      query: { removedBy },
    }),

  checkLimit: (accountId: string, limitType: LimitType, amount: number) =>
    api.post<ValidationResult>(`${accountPath(accountId)}/limits/check`, undefined, {
      query: { limitType, amount },
    }),

  /** Transactions */
  listTransactions: (
    accountId: string,
    params: { fromDate: string; toDate: string; page?: number; size?: number; sort?: string },
  ) =>
    api.get<PageResponse<AccountTransactionResponse>>(`${accountPath(accountId)}/transactions`, {
      query: withPaging(
        { fromDate: params.fromDate, toDate: params.toDate },
        {
          page: params.page ?? 0,
          size: params.size ?? 50,
          sort: params.sort ?? "transactionDate,desc",
        },
      ),
    }),

  getTransaction: (transactionId: string) =>
    api.get<AccountTransactionResponse>(
      `/api/v1/accounts/transactions/${encodeURIComponent(transactionId)}`,
    ),

  /** Statements */
  generateStatement: (accountId: string, fromDate: string, toDate: string) =>
    api.get<AccountStatement>(`${accountPath(accountId)}/statements`, {
      query: { fromDate, toDate },
    }),

  generateMonthlyStatement: (accountId: string, year: number, month: number) =>
    api.get<AccountStatement>(`${accountPath(accountId)}/statements/monthly`, {
      query: { year, month },
    }),

  listStatementPeriods: (accountId: string) =>
    api.get<StatementPeriod[]>(`${accountPath(accountId)}/statements/periods`),

  /** Interest */
  getCurrentRate: (accountId: string, rateType: InterestRateType) =>
    api.get<InterestRateResponse>(`${accountPath(accountId)}/interest/rates/current`, {
      query: { rateType },
    }),

  setInterestRate: (accountId: string, body: SetInterestRateBody) =>
    api.post<InterestRateResponse>(`${accountPath(accountId)}/interest/rates`, body),

  calculateAccruedInterest: (accountId: string, fromDate: string, toDate: string) =>
    api.get<{ accruedInterest: number }>(`${accountPath(accountId)}/interest/calculate`, {
      query: { fromDate, toDate },
    }),

  postAccruedInterest: (
    accountId: string,
    interestAmount: number,
    postingDate: string,
    postedBy: string,
  ) =>
    api.post<void>(`${accountPath(accountId)}/interest/post`, undefined, {
      query: { interestAmount, postingDate, postedBy },
    }),

  processInterestAccrual: (accrualDate: string) =>
    api.post<{ accountsProcessed: number }>(
      `/api/v1/accounts/interest/process-accrual`,
      undefined,
      { query: { accrualDate } },
    ),
};
