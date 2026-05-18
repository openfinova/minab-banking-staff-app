import { api } from "@/lib/api/client";
import type { PageRequest, PageResponse } from "@/lib/api/query";

const base = "/api/v1/aml/alerts";

export type AmlSeverity = "INFO" | "WARNING" | "HIGH" | "CRITICAL" | string;
export type AmlAlertStatus = "OPEN" | "ACKNOWLEDGED" | "CLOSED" | string;

export interface AmlAlertRow {
  id: string;
  transactionId?: string;
  accountId?: string;
  customerId?: string;
  ruleCode?: string;
  severity?: AmlSeverity;
  status?: AmlAlertStatus;
  amount?: string | number;
  currency?: string;
  detail?: string;
  investigationHoldPlaced?: boolean;
  createdAt?: string;
}

export const amlTransactionAlertsApi = {
  list(page?: PageRequest) {
    const p = page ?? {};
    return api.get<PageResponse<AmlAlertRow>>(base, {
      query: {
        page: p.page,
        size: p.size ?? 25,
        sort: p.sort ?? "createdAt,desc",
      },
    });
  },
};
