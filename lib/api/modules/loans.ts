import { api, request } from "@/lib/api/client";
import { withPaging, type PageResponse } from "@/lib/api/query";

/** Path segment encoder for UUIDs and codes */
const e = (s: string) => encodeURIComponent(s);

const loanProductsPath = "/api/v1/loan-products";
const loanApplicationsPath = "/api/v1/loan-applications";
const loanPaymentsPath = "/api/v1/loan-payments";

const loanAccountPath = (id: string) => `/api/v1/loan-accounts/${e(id)}`;

// —— Shared enum string unions (mirror loan-api) ——
export type LoanProductType =
  | "PERSONAL_LOAN"
  | "HOME_LOAN"
  | "AUTO_LOAN"
  | "BUSINESS_LOAN"
  | "EDUCATION_LOAN"
  | "GOLD_LOAN"
  | "OVERDRAFT"
  | "CREDIT_LINE"
  | string;

export type InterestCalculationMethod =
  | "FLAT_RATE"
  | "REDUCING_BALANCE"
  | "SIMPLE_INTEREST"
  | "COMPOUND_INTEREST"
  | "DAILY_REDUCING"
  | "RULE_OF_78"
  | string;

export type RepaymentFrequency =
  | "DAILY"
  | "WEEKLY"
  | "BIWEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "SEMI_ANNUALLY"
  | "ANNUALLY"
  | "BULLET"
  | string;

export type AmortizationType =
  | "EQUAL_INSTALLMENTS"
  | "EQUAL_PRINCIPAL"
  | "BALLOON_PAYMENT"
  | "BULLET_PAYMENT"
  | "CUSTOM"
  | string;

export type ApplicationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "PENDING_DOCUMENTS"
  | "UNDERWRITING"
  | "APPROVED"
  | "REJECTED"
  | "WITHDRAWN"
  | "EXPIRED"
  | string;

export type LoanStatus =
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "ACTIVE"
  | "SUSPENDED"
  | "CLOSED"
  | "WRITTEN_OFF"
  | "RESTRUCTURED"
  | "SETTLED"
  | string;

export type DelinquencyBucket =
  | "CURRENT"
  | "DPD_1_30"
  | "DPD_31_60"
  | "DPD_61_90"
  | "DPD_91_180"
  | "DPD_180_PLUS"
  | string;

export type DisbursementStatus =
  | "PENDING"
  | "APPROVED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "REVERSED"
  | string;

export type DisbursementMethod =
  | "BANK_TRANSFER"
  | "CHEQUE"
  | "CASH"
  | "DIRECT_TO_VENDOR"
  | "MOBILE_MONEY"
  | string;

export type ScheduleStatus =
  | "PENDING"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "WAIVED"
  | string;

export type PaymentMethod =
  | "CASH"
  | "BANK_TRANSFER"
  | "CHEQUE"
  | "DIRECT_DEBIT"
  | "CARD"
  | "MOBILE_MONEY"
  | "ONLINE"
  | string;

export type PaymentType =
  | "REGULAR_PAYMENT"
  | "PREPAYMENT"
  | "EARLY_SETTLEMENT"
  | "LATE_FEE"
  | "PENALTY"
  | "RESTRUCTURING_FEE"
  | "REVERSAL"
  | string;

export type RestructuringType =
  | "TERM_EXTENSION"
  | "RATE_REDUCTION"
  | "PAYMENT_HOLIDAY"
  | "PRINCIPAL_MORATORIUM"
  | "FULL_RESTRUCTURE"
  | string;

export type SettlementStatus =
  | "QUOTE"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED"
  | string;

export type SettlementCalculationMethod = "FULL_OUTSTANDING" | "DISCOUNTED" | string;

export type CollateralType =
  | "REAL_ESTATE"
  | "VEHICLE"
  | "GOLD"
  | "SECURITIES"
  | "FIXED_DEPOSIT"
  | "EQUIPMENT"
  | "INVENTORY"
  | "ACCOUNTS_RECEIVABLE"
  | "OTHER"
  | string;

export type CollateralStatus =
  | "ACTIVE"
  | "RELEASED"
  | "LIQUIDATED"
  | "UNDER_VALUATION"
  | string;

export type GuarantorType = "INDIVIDUAL" | "CORPORATE" | "GOVERNMENT" | "BANK_GUARANTEE" | string;

export type GuarantorStatus = "PENDING" | "ACTIVE" | "RELEASED" | "INVOKED" | "REMOVED" | string;

export type CollectionActivityType =
  | "PHONE_CALL"
  | "SMS"
  | "EMAIL"
  | "LETTER"
  | "FIELD_VISIT"
  | "LEGAL_NOTICE"
  | "PROMISE_TO_PAY"
  | "PAYMENT_ARRANGEMENT"
  | string;

export type CollectionStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "ESCALATED"
  | "CLOSED"
  | string;

// —— Response / request bodies ——
export interface LoanProductResponse {
  id: string;
  productCode: string;
  productName: string;
  productType: LoanProductType;
  description?: string;
  minAmount: number;
  maxAmount: number;
  minTenorMonths: number;
  maxTenorMonths: number;
  interestRate: number;
  interestCalculationMethod: InterestCalculationMethod;
  repaymentFrequency: RepaymentFrequency;
  amortizationType: AmortizationType;
  currency: string;
  collateralRequired?: boolean;
  guarantorRequired?: boolean;
  gracePeriodDays?: number;
  processingFeePercentage?: number;
  processingFeeFixed?: number;
  lateFeePercentage?: number;
  lateFeeFixed?: number;
  prepaymentPenaltyPercentage?: number;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type LoanProductRequestBody = {
  productCode: string;
  productName: string;
  productType: LoanProductType;
  description?: string;
  minAmount: number;
  maxAmount: number;
  minTenorMonths: number;
  maxTenorMonths: number;
  interestRate: number;
  interestCalculationMethod: InterestCalculationMethod;
  repaymentFrequency: RepaymentFrequency;
  amortizationType: AmortizationType;
  currency: string;
  collateralRequired?: boolean;
  guarantorRequired?: boolean;
  gracePeriodDays?: number;
  processingFeePercentage?: number;
  processingFeeFixed?: number;
  lateFeePercentage?: number;
  lateFeeFixed?: number;
  prepaymentPenaltyPercentage?: number;
};

export interface ProductValidationResult {
  valid: boolean;
  message?: string;
  errors?: string[];
}

export interface LoanApplicationResponse {
  id: string;
  applicationNumber: string;
  customerId: string;
  productId: string;
  requestedAmount: number;
  requestedTenorMonths: number;
  currency: string;
  status: ApplicationStatus;
  purpose?: string;
  monthlyIncome?: number;
  existingObligations?: number;
  creditScore?: number;
  riskRating?: string;
  approvedInterestRate?: number;
  approvedAmount?: number;
  approvedTenorMonths?: number;
  approvalDate?: string;
  approvedBy?: string;
  rejectionDate?: string;
  rejectionReason?: string;
  rejectedBy?: string;
  guarantorsRequired?: number;
  underwriterId?: string;
  underwriterAssignedBy?: string;
  underwriterAssignedAt?: string;
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoanApplicationRequestBody {
  customerId: string;
  productId: string;
  requestedAmount: number;
  requestedTenorMonths: number;
  currency: string;
  purpose?: string;
  monthlyIncome?: number;
  existingObligations?: number;
  remarks?: string;
}

export interface LoanAccountResponse {
  id: string;
  loanAccountNumber: string;
  applicationId?: string;
  customerId: string;
  productId: string;
  principalAmount: number;
  outstandingPrincipal?: number;
  outstandingInterest?: number;
  outstandingFees?: number;
  outstandingPenalties?: number;
  totalOutstanding?: number;
  tenorMonths?: number;
  interestRate?: number;
  interestCalculationMethod?: InterestCalculationMethod;
  repaymentFrequency?: RepaymentFrequency;
  amortizationType?: AmortizationType;
  currency: string;
  status: LoanStatus;
  disbursementDate?: string;
  maturityDate?: string;
  firstPaymentDate?: string;
  lastPaymentDate?: string;
  closedDate?: string;
  totalPaid?: number;
  daysPastDue?: number;
  delinquencyBucket?: string;
  isRestructured?: boolean;
  restructuredDate?: string;
  isTopUp?: boolean;
  originalLoanId?: string;
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoanStatementResponse {
  loanAccountId?: string;
  fromDate?: string;
  toDate?: string;
  openingBalance?: number;
  closingBalance?: number;
  transactions?: unknown[];
  [key: string]: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
  message?: string;
  availableBalance?: number;
  accountStatus?: string;
  applicableLimits?: string[];
}

export interface LoanDisbursementResponse {
  id: string;
  loanAccountId?: string;
  disbursementAmount?: number;
  disbursementDate?: string;
  disbursementMethod?: DisbursementMethod;
  destinationAccountNumber?: string;
  status?: DisbursementStatus;
  reference?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface LoanScheduleResponse {
  id: string;
  loanAccountId?: string;
  installmentNumber?: number;
  dueDate?: string;
  principalDue?: number;
  interestDue?: number;
  totalDue?: number;
  principalPaid?: number;
  interestPaid?: number;
  feesPaid?: number;
  penaltiesPaid?: number;
  outstandingBalance?: number;
  status?: ScheduleStatus;
  paidDate?: string;
  isOverdue?: boolean;
  daysPastDue?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoanPaymentResponse {
  id: string;
  loanAccountId?: string;
  paymentAmount?: number;
  paymentDate?: string;
  paymentMethod?: PaymentMethod;
  paymentType?: PaymentType;
  transactionReference?: string;
  reversed?: boolean;
  createdAt?: string;
  [key: string]: unknown;
}

export interface PaymentAllocationResponse {
  principalAllocation?: number;
  interestAllocation?: number;
  feesAllocation?: number;
  penaltiesAllocation?: number;
  remainingAmount?: number;
  [key: string]: unknown;
}

export interface LoanRestructuringResponse {
  id: string;
  loanAccountId?: string;
  restructuringDate?: string;
  restructuringType?: RestructuringType;
  oldPrincipalBalance?: number;
  newPrincipalBalance?: number;
  oldInterestRate?: number;
  newInterestRate?: number;
  oldTenorMonths?: number;
  newTenorMonths?: number;
  reason?: string;
  approvedBy?: string;
  createdAt?: string;
}

export interface EarlySettlementResponse {
  id: string;
  loanAccountId?: string;
  settlementDate?: string;
  settlementAmount?: number;
  penaltyAmount?: number;
  status?: SettlementStatus;
  createdAt?: string;
  [key: string]: unknown;
}

export interface CollateralResponse {
  id: string;
  loanAccountId?: string;
  collateralType?: CollateralType;
  description?: string;
  valuationAmount?: number;
  currency?: string;
  status?: CollateralStatus;
  [key: string]: unknown;
}

export interface GuarantorResponse {
  id: string;
  loanAccountId?: string;
  customerId?: string;
  guarantorType?: GuarantorType;
  guaranteedAmount?: number;
  status?: GuarantorStatus;
  [key: string]: unknown;
}

export interface CollectionActivityResponse {
  id: string;
  loanAccountId?: string;
  activityType?: CollectionActivityType;
  activityDate?: string;
  notes?: string;
  followUpDate?: string;
  status?: CollectionStatus;
  [key: string]: unknown;
}

export interface CollectionActivityReportResponse {
  loanAccountId?: string;
  startDate?: string;
  endDate?: string;
  totalActivities?: number;
  [key: string]: unknown;
}

// —— API: Products ——
export const loanProductsApi = {
  create: (body: LoanProductRequestBody) =>
    api.post<LoanProductResponse>(loanProductsPath, body),

  update: (id: string, body: LoanProductRequestBody) =>
    api.put<LoanProductResponse>(`${loanProductsPath}/${e(id)}`, body),

  getById: (id: string) => api.get<LoanProductResponse>(`${loanProductsPath}/${e(id)}`),

  getByCode: (productCode: string) =>
    api.get<LoanProductResponse>(`${loanProductsPath}/code/${e(productCode)}`),

  list: (params: { includeInactive?: boolean; page?: number; size?: number }) =>
    api.get<PageResponse<LoanProductResponse>>(loanProductsPath, {
      query: withPaging(
        { includeInactive: params.includeInactive ?? false },
        { page: params.page ?? 0, size: params.size ?? 20 },
      ),
    }),

  listActive: () => api.get<LoanProductResponse[]>(`${loanProductsPath}/active`),

  listByType: (productType: LoanProductType, page = 0, size = 20) =>
    api.get<PageResponse<LoanProductResponse>>(
      `${loanProductsPath}/type/${e(productType)}`,
      { query: withPaging({}, { page, size }) },
    ),

  listByCurrency: (currency: string, page = 0, size = 20) =>
    api.get<PageResponse<LoanProductResponse>>(
      `${loanProductsPath}/currency/${e(currency)}`,
      { query: withPaging({}, { page, size }) },
    ),

  findMatching: (amount: number, tenorMonths: number, currency: string) =>
    api.get<LoanProductResponse[]>(`${loanProductsPath}/search`, {
      query: { amount, tenorMonths, currency },
    }),

  activate: (id: string) => api.post<LoanProductResponse>(`${loanProductsPath}/${e(id)}/activate`),

  deactivate: (id: string) =>
    api.post<LoanProductResponse>(`${loanProductsPath}/${e(id)}/deactivate`),

  validateParameters: (id: string, amount: number, tenorMonths: number) =>
    api.get<ProductValidationResult>(`${loanProductsPath}/${e(id)}/validate`, {
      query: { amount, tenorMonths },
    }),

  processingFee: (id: string, loanAmount: number) =>
    api.get<number>(`${loanProductsPath}/${e(id)}/fees/processing`, {
      query: { loanAmount },
    }),

  lateFee: (id: string, overdueAmount: number) =>
    api.get<number>(`${loanProductsPath}/${e(id)}/fees/late`, { query: { overdueAmount } }),

  prepaymentPenalty: (id: string, prepaymentAmount: number) =>
    api.get<number>(`${loanProductsPath}/${e(id)}/fees/prepayment`, {
      query: { prepaymentAmount },
    }),

  countActive: () => api.get<number>(`${loanProductsPath}/stats/count`),

  countByType: (productType: LoanProductType) =>
    api.get<number>(`${loanProductsPath}/stats/count/${e(productType)}`),
};

// —— Applications ——
export const loanApplicationsApi = {
  create: (body: LoanApplicationRequestBody) =>
    api.post<LoanApplicationResponse>(loanApplicationsPath, body),

  getById: (id: string) => api.get<LoanApplicationResponse>(`${loanApplicationsPath}/${e(id)}`),

  getByNumber: (applicationNumber: string) =>
    api.get<LoanApplicationResponse>(`${loanApplicationsPath}/number/${e(applicationNumber)}`),

  listByCustomer: (customerId: string, page = 0, size = 20) =>
    api.get<PageResponse<LoanApplicationResponse>>(
      `${loanApplicationsPath}/customer/${e(customerId)}`,
      { query: withPaging({}, { page, size }) },
    ),

  listByStatus: (status: ApplicationStatus, page = 0, size = 20) =>
    api.get<PageResponse<LoanApplicationResponse>>(
      `${loanApplicationsPath}/status/${e(status)}`,
      { query: withPaging({}, { page, size }) },
    ),

  listPending: (page = 0, size = 20) =>
    api.get<PageResponse<LoanApplicationResponse>>(`${loanApplicationsPath}/pending`, {
      query: withPaging({}, { page, size }),
    }),

  listApproved: (page = 0, size = 20) =>
    api.get<PageResponse<LoanApplicationResponse>>(`${loanApplicationsPath}/approved`, {
      query: withPaging({}, { page, size }),
    }),

  listRejected: (page = 0, size = 20) =>
    api.get<PageResponse<LoanApplicationResponse>>(`${loanApplicationsPath}/rejected`, {
      query: withPaging({}, { page, size }),
    }),

  listApprovedBetween: (startDate: string, endDate: string, page = 0, size = 20) =>
    api.get<PageResponse<LoanApplicationResponse>>(`${loanApplicationsPath}/approved-between`, {
      query: withPaging({ startDate, endDate }, { page, size }),
    }),

  listRequiringGuarantors: (page = 0, size = 20) =>
    api.get<PageResponse<LoanApplicationResponse>>(
      `${loanApplicationsPath}/requiring-guarantors`,
      { query: withPaging({}, { page, size }) },
    ),

  submit: (id: string) =>
    api.post<LoanApplicationResponse>(`${loanApplicationsPath}/${e(id)}/submit`),

  assignUnderwriter: (id: string, body: { underwriterId: string }) =>
    api.post<LoanApplicationResponse>(
      `${loanApplicationsPath}/${e(id)}/assign-underwriter`,
      body,
    ),

  evaluateCreditScore: (id: string) =>
    api.post<LoanApplicationResponse>(`${loanApplicationsPath}/${e(id)}/evaluate-credit-score`),

  assessRisk: (id: string) =>
    api.post<LoanApplicationResponse>(`${loanApplicationsPath}/${e(id)}/assess-risk`),

  approve: (
    id: string,
    body: {
      approvedAmount: number;
      approvedTenorMonths: number;
      approvedInterestRate: number;
      guarantorsRequired: number;
    },
  ) => api.post<LoanApplicationResponse>(`${loanApplicationsPath}/${e(id)}/approve`, body),

  reject: (id: string, body: { rejectionReason: string }) =>
    api.post<LoanApplicationResponse>(`${loanApplicationsPath}/${e(id)}/reject`, body),

  requestAdditionalInfo: (id: string, body: { informationRequired: string }) =>
    api.post<LoanApplicationResponse>(
      `${loanApplicationsPath}/${e(id)}/request-additional-info`,
      body,
    ),

  guarantorsRequiredCheck: (id: string) =>
    api.get<boolean>(`${loanApplicationsPath}/${e(id)}/guarantors-required`),
};

// —— Loan accounts ——
export const loanAccountsApi = {
  getById: (id: string) => api.get<LoanAccountResponse>(loanAccountPath(id)),

  getByNumber: (loanAccountNumber: string) =>
    api.get<LoanAccountResponse>(`/api/v1/loan-accounts/number/${e(loanAccountNumber)}`),

  listByCustomer: (customerId: string, page = 0, size = 20) =>
    api.get<PageResponse<LoanAccountResponse>>(
      `/api/v1/loan-accounts/customer/${e(customerId)}`,
      { query: withPaging({}, { page, size }) },
    ),

  listActiveByCustomer: (customerId: string) =>
    api.get<LoanAccountResponse[]>(`/api/v1/loan-accounts/customer/${e(customerId)}/active`),

  listByStatus: (status: LoanStatus, page = 0, size = 20) =>
    api.get<PageResponse<LoanAccountResponse>>(
      `/api/v1/loan-accounts/status/${e(status)}`,
      { query: withPaging({}, { page, size }) },
    ),

  listDelinquent: (page = 0, size = 20) =>
    api.get<PageResponse<LoanAccountResponse>>("/api/v1/loan-accounts/delinquent", {
      query: withPaging({}, { page, size }),
    }),

  listByDelinquencyBucket: (bucket: DelinquencyBucket, page = 0, size = 20) =>
    api.get<PageResponse<LoanAccountResponse>>(
      `/api/v1/loan-accounts/delinquency-bucket/${e(bucket)}`,
      { query: withPaging({}, { page, size }) },
    ),

  listMaturingBetween: (startDate: string, endDate: string, page = 0, size = 20) =>
    api.get<PageResponse<LoanAccountResponse>>("/api/v1/loan-accounts/maturing", {
      query: withPaging({ startDate, endDate }, { page, size }),
    }),

  totalOutstanding: (id: string) =>
    api.get<number>(`${loanAccountPath(id)}/outstanding`),

  customerExposure: (customerId: string) =>
    api.get<number>(`/api/v1/loan-accounts/customer/${e(customerId)}/exposure`),

  countActiveByCustomer: (customerId: string) =>
    api.get<number>(`/api/v1/loan-accounts/customer/${e(customerId)}/count/active`),

  statement: (id: string, fromDate: string, toDate: string) =>
    api.get<LoanStatementResponse>(`${loanAccountPath(id)}/statement`, {
      query: { fromDate, toDate },
    }),

  validateClosure: (id: string) =>
    api.get<ValidationResult>(`${loanAccountPath(id)}/validate-closure`),

  create: (body: { applicationId: string }) =>
    api.post<LoanAccountResponse>("/api/v1/loan-accounts", body),

  updateStatus: (id: string, body: { newStatus: LoanStatus; reason?: string }) =>
    api.patch<LoanAccountResponse>(`${loanAccountPath(id)}/status`, body),

  disburse: (id: string, body: { disbursementDate: string }) =>
    api.post<LoanAccountResponse>(`${loanAccountPath(id)}/disburse`, body),

  close: (id: string, body: { closureDate: string }) =>
    api.post<LoanAccountResponse>(`${loanAccountPath(id)}/close`, body),

  writeOff: (id: string, body: { writeOffDate: string; reason: string }) =>
    api.post<LoanAccountResponse>(`${loanAccountPath(id)}/write-off`, body),

  topUp: (id: string, body: { topUpAmount: number }) =>
    api.post<LoanAccountResponse>(`${loanAccountPath(id)}/top-up`, body),

  batchStatusUpdate: (body: { loanAccountIds: string[]; newStatus: LoanStatus; reason?: string }) =>
    request<void>("/api/v1/loan-accounts/batch/status-update", { method: "POST", body }),

  updateBalances: (
    id: string,
    body: {
      principalDelta?: number;
      interestDelta?: number;
      feesDelta?: number;
      penaltiesDelta?: number;
    },
  ) => api.put<LoanAccountResponse>(`${loanAccountPath(id)}/balances`, body),

  markRestructured: (id: string, body: { restructuredDate: string }) =>
    api.post<LoanAccountResponse>(`${loanAccountPath(id)}/mark-restructured`, body),
};

// —— Disbursements ——
const disbBase = (loanAccountId: string) =>
  `${loanAccountPath(loanAccountId)}/disbursements`;

export const loanDisbursementsApi = {
  create: (
    loanAccountId: string,
    body: {
      loanAccountId: string;
      disbursementAmount: number;
      disbursementDate: string;
      disbursementMethod: DisbursementMethod;
      destinationAccountNumber: string;
      beneficiaryName?: string;
      remarks?: string;
      createdBy?: string;
    },
  ) => api.post<LoanDisbursementResponse>(`${disbBase(loanAccountId)}`, body),

  getById: (loanAccountId: string, id: string) =>
    api.get<LoanDisbursementResponse>(`${disbBase(loanAccountId)}/${e(id)}`),

  getByReference: (loanAccountId: string, reference: string) =>
    api.get<LoanDisbursementResponse>(
      `${disbBase(loanAccountId)}/reference/${e(reference)}`,
    ),

  list: (loanAccountId: string) =>
    api.get<LoanDisbursementResponse[]>(`${disbBase(loanAccountId)}`),

  listByStatus: (loanAccountId: string, status: DisbursementStatus, page = 0, size = 20) =>
    api.get<PageResponse<LoanDisbursementResponse>>(
      `${disbBase(loanAccountId)}/status/${e(status)}`,
      { query: withPaging({}, { page, size }) },
    ),

  listByDateRange: (
    loanAccountId: string,
    startDate: string,
    endDate: string,
    page = 0,
    size = 20,
  ) =>
    api.get<PageResponse<LoanDisbursementResponse>>(
      `${disbBase(loanAccountId)}/by-date-range`,
      { query: withPaging({ startDate, endDate }, { page, size }) },
    ),

  process: (loanAccountId: string, id: string, body: { processedBy: string }) =>
    api.post<LoanDisbursementResponse>(
      `${disbBase(loanAccountId)}/${e(id)}/process`,
      body,
    ),

  complete: (loanAccountId: string, id: string, body: { completedBy: string }) =>
    api.post<LoanDisbursementResponse>(
      `${disbBase(loanAccountId)}/${e(id)}/complete`,
      body,
    ),

  fail: (
    loanAccountId: string,
    id: string,
    body: { failureReason: string; failedBy: string },
  ) =>
    api.post<LoanDisbursementResponse>(`${disbBase(loanAccountId)}/${e(id)}/fail`, body),

  cancel: (
    loanAccountId: string,
    id: string,
    body: { cancellationReason: string; cancelledBy: string },
  ) =>
    api.post<LoanDisbursementResponse>(
      `${disbBase(loanAccountId)}/${e(id)}/cancel`,
      body,
    ),

  pendingCount: (loanAccountId: string) =>
    api.get<number>(`${disbBase(loanAccountId)}/pending/count`),
};

// —— Schedules ——
const schedBase = (loanAccountId: string) => `${loanAccountPath(loanAccountId)}/schedules`;

export const loanSchedulesApi = {
  generate: (loanAccountId: string) =>
    request<void>(`${schedBase(loanAccountId)}/generate`, { method: "POST" }),

  regenerate: (loanAccountId: string, body: { effectiveDate: string }) =>
    request<void>(`${schedBase(loanAccountId)}/regenerate`, { method: "POST", body }),

  getById: (loanAccountId: string, id: string) =>
    api.get<LoanScheduleResponse>(`${schedBase(loanAccountId)}/${e(id)}`),

  list: (loanAccountId: string, page = 0, size = 50) =>
    api.get<PageResponse<LoanScheduleResponse>>(`${schedBase(loanAccountId)}`, {
      query: withPaging({}, { page, size, sort: "installmentNumber,asc" }),
    }),

  listPending: (loanAccountId: string) =>
    api.get<LoanScheduleResponse[]>(`${schedBase(loanAccountId)}/pending`),

  listOverdue: (loanAccountId: string) =>
    api.get<LoanScheduleResponse[]>(`${schedBase(loanAccountId)}/overdue`),

  listByStatus: (loanAccountId: string, status: ScheduleStatus) =>
    api.get<LoanScheduleResponse[]>(`${schedBase(loanAccountId)}/status/${e(status)}`),

  listDueBetween: (loanAccountId: string, startDate: string, endDate: string, page = 0, size = 50) =>
    api.get<PageResponse<LoanScheduleResponse>>(`${schedBase(loanAccountId)}/due-between`, {
      query: withPaging({ startDate, endDate }, { page, size }),
    }),

  updatePayment: (
    loanAccountId: string,
    id: string,
    body: {
      principalPaid: number;
      interestPaid: number;
      feesPaid: number;
      penaltiesPaid: number;
    },
  ) =>
    api.put<LoanScheduleResponse>(
      `${schedBase(loanAccountId)}/${e(id)}/update-payment`,
      body,
    ),

  markPaid: (loanAccountId: string, id: string, body: { paidDate: string }) =>
    api.post<LoanScheduleResponse>(
      `${schedBase(loanAccountId)}/${e(id)}/mark-paid`,
      body,
    ),

  updateOverdue: (
    loanAccountId: string,
    id: string,
    body: { isOverdue: boolean; daysPastDue?: number },
  ) =>
    api.post<LoanScheduleResponse>(
      `${schedBase(loanAccountId)}/${e(id)}/update-overdue`,
      body,
    ),

  pendingCount: (loanAccountId: string) =>
    api.get<number>(`${schedBase(loanAccountId)}/pending/count`),

  overdueCount: (loanAccountId: string) =>
    api.get<number>(`${schedBase(loanAccountId)}/overdue/count`),
};

// —— Payments ——
export const loanPaymentsApi = {
  record: (body: {
    loanAccountId: string;
    paymentAmount: number;
    paymentDate: string;
    paymentMethod: PaymentMethod;
    transactionReference?: string;
    remarks?: string;
  }) => api.post<LoanPaymentResponse>(loanPaymentsPath, body),

  recordWithAllocation: (body: {
    loanAccountId: string;
    paymentAmount: number;
    principalPaid: number;
    interestPaid: number;
    feesPaid: number;
    penaltiesPaid: number;
    paymentDate: string;
    paymentType: PaymentType;
    paymentMethod: PaymentMethod;
    transactionReference?: string;
    remarks?: string;
  }) => api.post<LoanPaymentResponse>(`${loanPaymentsPath}/with-allocation`, body),

  getById: (id: string) => api.get<LoanPaymentResponse>(`${loanPaymentsPath}/${e(id)}`),

  getByReference: (paymentReference: string) =>
    api.get<LoanPaymentResponse>(`${loanPaymentsPath}/reference/${e(paymentReference)}`),

  listByLoanAccount: (loanAccountId: string, page = 0, size = 20) =>
    api.get<PageResponse<LoanPaymentResponse>>(
      `${loanPaymentsPath}/loan-account/${e(loanAccountId)}`,
      { query: withPaging({}, { page, size, sort: "paymentDate,desc" }) },
    ),

  listByDateRange: (
    loanAccountId: string,
    startDate: string,
    endDate: string,
    page = 0,
    size = 20,
  ) =>
    api.get<PageResponse<LoanPaymentResponse>>(
      `${loanPaymentsPath}/loan-account/${e(loanAccountId)}/date-range`,
      { query: withPaging({ startDate, endDate }, { page, size }) },
    ),

  listByType: (paymentType: PaymentType, page = 0, size = 20) =>
    api.get<PageResponse<LoanPaymentResponse>>(
      `${loanPaymentsPath}/type/${e(paymentType)}`,
      { query: withPaging({}, { page, size }) },
    ),

  listByMethod: (paymentMethod: PaymentMethod, page = 0, size = 20) =>
    api.get<PageResponse<LoanPaymentResponse>>(
      `${loanPaymentsPath}/method/${e(paymentMethod)}`,
      { query: withPaging({}, { page, size }) },
    ),

  listReversed: (page = 0, size = 20) =>
    api.get<PageResponse<LoanPaymentResponse>>(`${loanPaymentsPath}/reversed`, {
      query: withPaging({}, { page, size }),
    }),

  reverse: (id: string, reversalReason: string) =>
    api.post<LoanPaymentResponse>(`${loanPaymentsPath}/${e(id)}/reverse`, undefined, {
      query: { reversalReason },
    }),

  allocationPreview: (loanAccountId: string, paymentAmount: number) =>
    api.get<PaymentAllocationResponse>(
      `${loanPaymentsPath}/loan-account/${e(loanAccountId)}/allocation`,
      { query: { paymentAmount } },
    ),

  totalPayments: (loanAccountId: string) =>
    api.get<number>(`${loanPaymentsPath}/loan-account/${e(loanAccountId)}/total-payments`),

  totalPrincipalPaid: (loanAccountId: string) =>
    api.get<number>(
      `${loanPaymentsPath}/loan-account/${e(loanAccountId)}/total-principal-paid`,
    ),

  totalInterestPaid: (loanAccountId: string) =>
    api.get<number>(
      `${loanPaymentsPath}/loan-account/${e(loanAccountId)}/total-interest-paid`,
    ),

  lastPayment: (loanAccountId: string) =>
    api.get<LoanPaymentResponse>(
      `${loanPaymentsPath}/loan-account/${e(loanAccountId)}/last-payment`,
    ),

  hasPayments: (loanAccountId: string) =>
    api.get<boolean>(`${loanPaymentsPath}/loan-account/${e(loanAccountId)}/has-payments`),

  count: (loanAccountId: string) =>
    api.get<number>(`${loanPaymentsPath}/loan-account/${e(loanAccountId)}/count`),
};

// —— Restructuring ——
const restrBase = (loanAccountId: string) =>
  `${loanAccountPath(loanAccountId)}/restructurings`;

export const loanRestructuringsApi = {
  create: (
    loanAccountId: string,
    body: {
      loanAccountId: string;
      restructuringType: RestructuringType;
      newTenorMonths?: number;
      newInterestRate?: number;
      reason: string;
      requestedBy?: string;
    },
  ) => api.post<LoanRestructuringResponse>(`${restrBase(loanAccountId)}`, body),

  getById: (loanAccountId: string, id: string) =>
    api.get<LoanRestructuringResponse>(`${restrBase(loanAccountId)}/${e(id)}`),

  list: (loanAccountId: string) =>
    api.get<LoanRestructuringResponse[]>(`${restrBase(loanAccountId)}`),

  approve: (loanAccountId: string, id: string, body: { approvedBy: string }) =>
    api.post<LoanRestructuringResponse>(
      `${restrBase(loanAccountId)}/${e(id)}/approve`,
      body,
    ),

  reject: (
    loanAccountId: string,
    id: string,
    body: { rejectionReason: string; rejectedBy: string },
  ) =>
    api.post<LoanRestructuringResponse>(
      `${restrBase(loanAccountId)}/${e(id)}/reject`,
      body,
    ),

  process: (loanAccountId: string, id: string, body: { processedBy: string }) =>
    api.post<LoanRestructuringResponse>(
      `${restrBase(loanAccountId)}/${e(id)}/process`,
      body,
    ),

  pendingCount: (loanAccountId: string) =>
    api.get<number>(`${restrBase(loanAccountId)}/pending/count`),
};

// —— Early settlement ——
const settBase = (loanAccountId: string) => `${loanAccountPath(loanAccountId)}/settlements`;

export const earlySettlementsApi = {
  quote: (
    loanAccountId: string,
    body: {
      loanAccountId: string;
      settlementDate: string;
      calculationMethod: SettlementCalculationMethod;
      requestedBy?: string;
    },
  ) => api.post<EarlySettlementResponse>(`${settBase(loanAccountId)}/quote`, body),

  getById: (loanAccountId: string, id: string) =>
    api.get<EarlySettlementResponse>(`${settBase(loanAccountId)}/${e(id)}`),

  list: (loanAccountId: string) =>
    api.get<EarlySettlementResponse[]>(`${settBase(loanAccountId)}`),

  listByStatus: (loanAccountId: string, status: SettlementStatus, page = 0, size = 20) =>
    api.get<PageResponse<EarlySettlementResponse>>(
      `${settBase(loanAccountId)}/status/${e(status)}`,
      { query: withPaging({}, { page, size }) },
    ),

  approve: (loanAccountId: string, id: string, body: { approvedBy: string }) =>
    api.post<EarlySettlementResponse>(
      `${settBase(loanAccountId)}/${e(id)}/approve`,
      body,
    ),

  reject: (
    loanAccountId: string,
    id: string,
    body: { rejectionReason: string; rejectedBy: string },
  ) =>
    api.post<EarlySettlementResponse>(`${settBase(loanAccountId)}/${e(id)}/reject`, body),

  cancel: (
    loanAccountId: string,
    id: string,
    body: { cancellationReason: string; cancelledBy: string },
  ) =>
    api.post<EarlySettlementResponse>(`${settBase(loanAccountId)}/${e(id)}/cancel`, body),

  process: (
    loanAccountId: string,
    id: string,
    body: { paymentDate: string; processedBy: string },
  ) =>
    api.post<EarlySettlementResponse>(`${settBase(loanAccountId)}/${e(id)}/process`, body),

  pendingCount: (loanAccountId: string) =>
    api.get<number>(`${settBase(loanAccountId)}/pending/count`),
};

// —— Collateral ——
const collBase = (loanAccountId: string) => `${loanAccountPath(loanAccountId)}/collateral`;

export const loanCollateralApi = {
  register: (
    loanAccountId: string,
    body: {
      loanAccountId: string;
      collateralType: CollateralType;
      description: string;
      valuationAmount: number;
      currency: string;
      valuationDate: string;
      valuedBy?: string;
      location?: string;
      registrationNumber?: string;
      insuranceExpiryDate?: string;
      insurancePolicyNumber?: string;
      remarks?: string;
    },
  ) => api.post<CollateralResponse>(`${collBase(loanAccountId)}`, body),

  getById: (loanAccountId: string, id: string) =>
    api.get<CollateralResponse>(`${collBase(loanAccountId)}/${e(id)}`),

  list: (loanAccountId: string) => api.get<CollateralResponse[]>(`${collBase(loanAccountId)}`),

  listByStatus: (loanAccountId: string, status: CollateralStatus, page = 0, size = 20) =>
    api.get<PageResponse<CollateralResponse>>(
      `${collBase(loanAccountId)}/status/${e(status)}`,
      { query: withPaging({}, { page, size }) },
    ),

  updateValuation: (
    loanAccountId: string,
    id: string,
    body: { valuationAmount: number; valuationDate: string },
  ) =>
    api.put<CollateralResponse>(`${collBase(loanAccountId)}/${e(id)}/valuation`, body),

  updateStatus: (loanAccountId: string, id: string, body: { newStatus: CollateralStatus }) =>
    api.post<CollateralResponse>(`${collBase(loanAccountId)}/${e(id)}/status`, body),

  release: (loanAccountId: string, id: string) =>
    api.post<CollateralResponse>(`${collBase(loanAccountId)}/${e(id)}/release`),

  liquidate: (loanAccountId: string, id: string, body: { liquidationAmount: number }) =>
    api.post<CollateralResponse>(`${collBase(loanAccountId)}/${e(id)}/liquidate`, body),

  activeCount: (loanAccountId: string) =>
    api.get<number>(`${collBase(loanAccountId)}/active/count`),
};

// —— Guarantors ——
const guarBase = (loanAccountId: string) => `${loanAccountPath(loanAccountId)}/guarantors`;

export const loanGuarantorsApi = {
  add: (
    loanAccountId: string,
    body: {
      loanAccountId: string;
      customerId: string;
      guarantorType: GuarantorType;
      guaranteedAmount: number;
      guaranteePercentage?: number;
      relationshipToCustomer?: string;
      remarks?: string;
    },
  ) => api.post<GuarantorResponse>(`${guarBase(loanAccountId)}`, body),

  getById: (loanAccountId: string, id: string) =>
    api.get<GuarantorResponse>(`${guarBase(loanAccountId)}/${e(id)}`),

  list: (loanAccountId: string) => api.get<GuarantorResponse[]>(`${guarBase(loanAccountId)}`),

  listByStatus: (loanAccountId: string, status: GuarantorStatus, page = 0, size = 20) =>
    api.get<PageResponse<GuarantorResponse>>(
      `${guarBase(loanAccountId)}/status/${e(status)}`,
      { query: withPaging({}, { page, size }) },
    ),

  verify: (loanAccountId: string, id: string, body: Record<string, unknown> = {}) =>
    api.post<GuarantorResponse>(`${guarBase(loanAccountId)}/${e(id)}/verify`, body),

  updateStatus: (loanAccountId: string, id: string, body: { newStatus: GuarantorStatus }) =>
    api.post<GuarantorResponse>(`${guarBase(loanAccountId)}/${e(id)}/status`, body),

  release: (loanAccountId: string, id: string) =>
    api.post<GuarantorResponse>(`${guarBase(loanAccountId)}/${e(id)}/release`, {}),

  remove: (loanAccountId: string, id: string, body: { removalReason: string }) =>
    request<void>(`${guarBase(loanAccountId)}/${e(id)}/remove`, { method: "POST", body }),

  activeCount: (loanAccountId: string) =>
    api.get<number>(`${guarBase(loanAccountId)}/active/count`),
};

// —— Collections ——
const colActBase = (loanAccountId: string) => `${loanAccountPath(loanAccountId)}/collections`;

export const loanCollectionsApi = {
  create: (
    loanAccountId: string,
    body: {
      loanAccountId: string;
      activityType: CollectionActivityType;
      activityDate: string;
      notes: string;
      followUpDate?: string;
      assignedTo?: string;
    },
  ) => api.post<CollectionActivityResponse>(`${colActBase(loanAccountId)}`, body),

  getById: (loanAccountId: string, id: string) =>
    api.get<CollectionActivityResponse>(`${colActBase(loanAccountId)}/${e(id)}`),

  list: (loanAccountId: string) =>
    api.get<CollectionActivityResponse[]>(`${colActBase(loanAccountId)}`),

  listByStatus: (loanAccountId: string, status: CollectionStatus, page = 0, size = 20) =>
    api.get<PageResponse<CollectionActivityResponse>>(
      `${colActBase(loanAccountId)}/status/${e(status)}`,
      { query: withPaging({}, { page, size }) },
    ),

  listByDateRange: (
    loanAccountId: string,
    startDate: string,
    endDate: string,
    page = 0,
    size = 20,
  ) =>
    api.get<PageResponse<CollectionActivityResponse>>(
      `${colActBase(loanAccountId)}/by-date-range`,
      { query: withPaging({ startDate, endDate }, { page, size }) },
    ),

  update: (
    loanAccountId: string,
    id: string,
    body: { notes?: string; followUpDate?: string },
  ) =>
    api.put<CollectionActivityResponse>(`${colActBase(loanAccountId)}/${e(id)}`, body),

  updateStatus: (
    loanAccountId: string,
    id: string,
    body: { newStatus: CollectionStatus },
  ) =>
    api.post<CollectionActivityResponse>(
      `${colActBase(loanAccountId)}/${e(id)}/status`,
      body,
    ),

  complete: (
    loanAccountId: string,
    id: string,
    body: { outcome: string },
  ) =>
    api.post<CollectionActivityResponse>(
      `${colActBase(loanAccountId)}/${e(id)}/complete`,
      body,
    ),

  scheduleFollowUp: (
    loanAccountId: string,
    id: string,
    body: { followUpDate: string; followUpType: CollectionActivityType },
  ) =>
    api.post<CollectionActivityResponse>(
      `${colActBase(loanAccountId)}/${e(id)}/schedule-followup`,
      body,
    ),

  report: (loanAccountId: string, startDate: string, endDate: string) =>
    api.get<CollectionActivityReportResponse>(`${colActBase(loanAccountId)}/report`, {
      query: { startDate, endDate },
    }),

  pendingCount: (loanAccountId: string) =>
    api.get<number>(`${colActBase(loanAccountId)}/pending/count`),
};

/** Export arrays for `<Select>` options in UI */
export const LOAN_PRODUCT_TYPES: LoanProductType[] = [
  "PERSONAL_LOAN",
  "HOME_LOAN",
  "AUTO_LOAN",
  "BUSINESS_LOAN",
  "EDUCATION_LOAN",
  "GOLD_LOAN",
  "OVERDRAFT",
  "CREDIT_LINE",
];

export const INTEREST_METHODS: InterestCalculationMethod[] = [
  "FLAT_RATE",
  "REDUCING_BALANCE",
  "SIMPLE_INTEREST",
  "COMPOUND_INTEREST",
  "DAILY_REDUCING",
  "RULE_OF_78",
];

export const REPAYMENT_FREQUENCIES: RepaymentFrequency[] = [
  "DAILY",
  "WEEKLY",
  "BIWEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "SEMI_ANNUALLY",
  "ANNUALLY",
  "BULLET",
];

export const AMORTIZATION_TYPES: AmortizationType[] = [
  "EQUAL_INSTALLMENTS",
  "EQUAL_PRINCIPAL",
  "BALLOON_PAYMENT",
  "BULLET_PAYMENT",
  "CUSTOM",
];

export const LOAN_STATUSES: LoanStatus[] = [
  "PENDING_APPROVAL",
  "APPROVED",
  "ACTIVE",
  "SUSPENDED",
  "CLOSED",
  "WRITTEN_OFF",
  "RESTRUCTURED",
  "SETTLED",
];
