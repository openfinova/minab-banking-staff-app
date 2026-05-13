import { api } from "@/lib/api/client";

import type { UserSummary } from "@/lib/api/modules/users";

export type DelegationStatus = "ACTIVE" | "REVOKED" | string;

export interface Delegation {
  id: string;
  delegatedFromUserId: string;
  delegatedFromUsername?: string;
  delegatedToUserId: string;
  delegatedToUsername?: string;
  approvalLimit?: string | number;
  currency?: string;
  transactionType?: string;
  validFrom?: string;
  validUntil?: string;
  status: DelegationStatus;
  actingGlApprovalRole?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateDelegationRequest {
  delegatedFromUserId: string;
  delegatedToUserId: string;
  transactionType: string;
  validFrom: string;
  validUntil?: string;
  currency?: string;
  approvalLimit?: number;
  actingGlApprovalRole?: string;
}

export const delegationsApi = {
  create: (body: CreateDelegationRequest) =>
    api.post<Delegation>("/api/v1/identity/delegations", {
      ...body,
      validUntil: body.validUntil?.trim() ? body.validUntil : undefined,
    }),
  get: (id: string) => api.get<Delegation>(`/api/v1/identity/delegations/${id}`),
  revoke: (id: string) => api.post<Delegation>(`/api/v1/identity/delegations/${id}/revoke`),
  outgoing: (userId: string) =>
    api.get<Delegation[]>(
      `/api/v1/identity/delegations/outgoing/${encodeURIComponent(userId.trim())}`,
    ),
  incoming: (userId: string) =>
    api.get<Delegation[]>(
      `/api/v1/identity/delegations/incoming/${encodeURIComponent(userId.trim())}`,
    ),
  active: (delegateeUserId: string, transactionType: string) =>
    api.get<Delegation[]>("/api/v1/identity/delegations/active", {
      query: { delegateeUserId, transactionType },
    }),
  staffSuggestions: (q: string, limit = 15) =>
    api.get<UserSummary[]>("/api/v1/identity/delegations/suggestions/staff", {
      query: { q: q.trim(), limit },
    }),
};
