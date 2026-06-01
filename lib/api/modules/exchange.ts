import { api, request } from "@/lib/api/client";

const BASE = "/api/v1/exchange";

export type RateType = "SPOT" | "EOD" | "AVG_MONTH" | "OFFICIAL" | string;

export interface CurrencyConversionRequestBody {
  amount: number;
  fromCurrency: string;
  toCurrency: string;
  conversionDate?: string;
}

export interface CurrencyConversionResponse {
  originalAmount: number;
  fromCurrency: string;
  convertedAmount: number;
  toCurrency: string;
  exchangeRate: number;
  conversionDate: string;
}

export interface ExchangeRateSimpleResponse {
  sourceCurrency: string;
  targetCurrency: string;
  rate: number;
  rateType: RateType;
}

export interface ExchangeRateHistoricalSimpleResponse extends ExchangeRateSimpleResponse {
  date: string;
}

export interface ExchangeRateResponse {
  id: string;
  sourceCurrency: string;
  targetCurrency: string;
  rate: number;
  bidRate?: number | null;
  askRate?: number | null;
  rateDate: string;
  rateType: RateType;
  createdAt?: string;
  createdBy?: string | null;
  updatedAt?: string;
  updatedBy?: string | null;
  version: number;
}

export interface ExchangeRateRequestBody {
  sourceCurrency: string;
  targetCurrency: string;
  rate: number;
  bidRate?: number;
  askRate?: number;
  rateDate: string;
  rateType: RateType;
  createdBy?: string;
  updatedBy?: string;
}

export interface ExchangeRateSyncResult {
  rateDate: string | null;
  providerPublicationDate: string | null;
  providerId: string;
  inserted: string[];
  skippedAlreadyPresent: string[];
  unsupportedByProvider: string[];
}

export interface ManagedRateRow {
  id: string | null;
  targetCurrency: string;
  rate: number | null;
  rateDate: string | null;
  stale: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  lastChangedAt: string | null;
}

export interface ManagedRatesView {
  baseCurrency: string;
  today: string;
  rows: ManagedRateRow[];
}

export const exchangeApi = {
  convert: (body: CurrencyConversionRequestBody) =>
    api.post<CurrencyConversionResponse>(`${BASE}/convert`, body),

  getRate: (params: {
    sourceCurrency: string;
    targetCurrency: string;
    rateType?: RateType;
  }) =>
    api.get<ExchangeRateSimpleResponse>(`${BASE}/rate`, {
      query: {
        sourceCurrency: params.sourceCurrency,
        targetCurrency: params.targetCurrency,
        rateType: params.rateType ?? "SPOT",
      },
    }),

  getRateDetails: (params: {
    sourceCurrency: string;
    targetCurrency: string;
    rateType?: RateType;
  }) =>
    api.get<ExchangeRateResponse>(`${BASE}/rate/details`, {
      query: {
        sourceCurrency: params.sourceCurrency,
        targetCurrency: params.targetCurrency,
        rateType: params.rateType ?? "SPOT",
      },
    }),

  getHistoricalRate: (params: {
    sourceCurrency: string;
    targetCurrency: string;
    date: string;
    rateType?: RateType;
  }) =>
    api.get<ExchangeRateHistoricalSimpleResponse>(`${BASE}/rate/historical`, {
      query: {
        sourceCurrency: params.sourceCurrency,
        targetCurrency: params.targetCurrency,
        date: params.date,
        rateType: params.rateType ?? "SPOT",
      },
    }),

  getCurrencies: () => api.get<string[]>(`${BASE}/currencies`),

  isCurrencySupported: (currencyCode: string) =>
    api.get<{ currencyCode: string; supported: boolean }>(
      `${BASE}/currencies/${encodeURIComponent(currencyCode)}/supported`,
    ),

  createRate: (body: ExchangeRateRequestBody) =>
    api.post<ExchangeRateResponse>(`${BASE}/rates`, body),

  updateRate: (id: string, body: ExchangeRateRequestBody) =>
    api.put<ExchangeRateResponse>(`${BASE}/rates/${encodeURIComponent(id)}`, body),

  deleteRate: (id: string) =>
    request<void>(`${BASE}/rates/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  getRatesHistory: (params: {
    sourceCurrency: string;
    targetCurrency: string;
    startDate: string;
    endDate: string;
    rateType?: RateType;
  }) =>
    api.get<ExchangeRateResponse[]>(`${BASE}/rates/history`, {
      query: {
        sourceCurrency: params.sourceCurrency,
        targetCurrency: params.targetCurrency,
        startDate: params.startDate,
        endDate: params.endDate,
        rateType: params.rateType ?? "SPOT",
      },
    }),

  rateExists: (params: {
    sourceCurrency: string;
    targetCurrency: string;
    date: string;
    rateType?: RateType;
  }) =>
    api.get<{ exists: boolean }>(`${BASE}/rates/exists`, {
      query: {
        sourceCurrency: params.sourceCurrency,
        targetCurrency: params.targetCurrency,
        date: params.date,
        rateType: params.rateType ?? "SPOT",
      },
    }),

  syncNow: () => api.post<ExchangeRateSyncResult>(`${BASE}/sync`),

  getManagedRates: () => api.get<ManagedRatesView>(`${BASE}/managed-rates`),
};
