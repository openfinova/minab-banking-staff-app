import { api, request } from "@/lib/api/client";

export interface BankDetails {
  name: string;
  legalName?: string;
  swiftCode?: string;
  taxId?: string;
  currency?: string;
  countryCode?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  region?: string;
  postalCode?: string;
}

export const bankApi = {
  details: () => api.get<BankDetails>("/api/v1/bank/details"),
  name: () => api.get<{ name: string }>("/api/v1/bank/name"),
  currency: () => api.get<{ currency: string }>("/api/v1/bank/currency"),
};

export type HolidayType = "NATIONAL" | "REGIONAL" | "BANK" | "OTHER" | string;

export interface HolidayDTO {
  date: string;
  year?: number;
  countryCode: string;
  regionCode?: string;
  name: string;
  description?: string;
  type: HolidayType;
  bankHoliday?: boolean;
  observedHoliday?: boolean;
}

export const holidaysApi = {
  list: (params: { countryCode?: string; year?: number } = {}) =>
    api.get<HolidayDTO[]>("/api/v1/holidays", {
      query: { countryCode: params.countryCode, year: params.year },
    }),
  check: (params: { countryCode: string; date: string }) =>
    api.get<{ holiday: boolean }>("/api/v1/holidays/check", { query: params }),
  get: (countryCode: string, date: string) =>
    api.get<HolidayDTO>(`/api/v1/holidays/${countryCode}/${date}`),
  create: (body: HolidayDTO) => api.post<HolidayDTO>("/api/v1/holidays", body),
  delete: (countryCode: string, date: string) =>
    request<void>(`/api/v1/holidays/${countryCode}/${date}`, { method: "DELETE" }),
};

export type FeeType = "FIXED" | "PERCENTAGE" | "TIERED" | string;
export type CustomerTier = "STANDARD" | "PREMIUM" | "VIP" | string;

export interface FeeRule {
  id: string;
  transactionType: string;
  customerTier?: CustomerTier;
  feeType: FeeType;
  fixedAmount?: number;
  percentageRate?: number;
  minFee?: number;
  maxFee?: number;
  active?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface CreateFeeRuleRequest {
  transactionType: string;
  customerTier?: CustomerTier;
  feeType: FeeType;
  fixedAmount?: number;
  percentageRate?: number;
  minFee?: number;
  maxFee?: number;
}

export interface FeeWaiver {
  id: string;
  customerId?: string;
  accountId?: string;
  feeType?: string;
  reason?: string;
  startsAt?: string;
  endsAt?: string;
  active?: boolean;
}

export interface CreateFeeWaiverRequest {
  customerId?: string;
  accountId?: string;
  feeType?: string;
  reason: string;
  startsAt: string;
  endsAt?: string;
}

export const feesApi = {
  rules: () => api.get<FeeRule[]>("/api/v1/fees/rules"),
  rulesByType: (type: string) =>
    api.get<FeeRule[]>(`/api/v1/fees/rules/type/${type}`),
  createRule: (body: CreateFeeRuleRequest) =>
    api.post<FeeRule>("/api/v1/fees/rules", body),
  updateRule: (ruleId: string, body: Partial<CreateFeeRuleRequest>) =>
    api.put<FeeRule>(`/api/v1/fees/rules/${ruleId}`, body),
  deleteRule: (ruleId: string) => api.delete<void>(`/api/v1/fees/rules/${ruleId}`),
  createWaiver: (body: CreateFeeWaiverRequest) =>
    api.post<FeeWaiver>("/api/v1/fees/waivers", body),
  waiversForCustomer: (customerId: string) =>
    api.get<FeeWaiver[]>(`/api/v1/fees/waivers/customer/${customerId}`),
};

export type VelocityLimitPeriod =
  | "DAILY"
  | "WEEKLY"
  | "MONTHLY"
  | "ROLLING_24H"
  | string;

export interface VelocityLimit {
  id: string;
  accountId?: string;
  transactionType: string;
  period: VelocityLimitPeriod;
  maxAmount: number;
  maxCount?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface CreateVelocityLimitRequest {
  accountId?: string;
  transactionType: string;
  period: VelocityLimitPeriod;
  maxAmount: number;
  maxCount?: number;
}

export interface VelocityLimitStatus {
  accountId: string;
  remainingAmount?: number;
  remainingCount?: number;
  nextResetAt?: string;
}

export const velocityLimitsApi = {
  byAccount: (accountId: string) =>
    api.get<VelocityLimit[]>(`/api/v1/velocity-limits/account/${accountId}`),
  byType: (type: string) =>
    api.get<VelocityLimit[]>(`/api/v1/velocity-limits/type/${type}`),
  create: (body: CreateVelocityLimitRequest) =>
    api.post<VelocityLimit>("/api/v1/velocity-limits", body),
  update: (id: string, body: Partial<CreateVelocityLimitRequest>) =>
    api.put<VelocityLimit>(`/api/v1/velocity-limits/${id}`, body),
  delete: (id: string) => api.delete<void>(`/api/v1/velocity-limits/${id}`),
  remaining: (accountId: string) =>
    api.get<VelocityLimitStatus>(`/api/v1/velocity-limits/account/${accountId}/remaining`),
  status: (accountId: string) =>
    api.get<VelocityLimitStatus>(`/api/v1/velocity-limits/account/${accountId}/status`),
};
