import { api } from "@/lib/api/client";

export interface Delegation {
  id: string;
  delegatorUserId: string;
  delegateeUserId: string;
  resourceType?: string;
  startsAt?: string;
  endsAt?: string;
  active: boolean;
  reason?: string;
  revokedAt?: string;
  revokedReason?: string;
}

export interface CreateDelegationRequest {
  delegatorUserId: string;
  delegateeUserId: string;
  resourceType?: string;
  startsAt: string;
  endsAt: string;
  reason?: string;
}

export interface RevokeDelegationRequest {
  reason?: string;
}

export const delegationsApi = {
  create: (body: CreateDelegationRequest) =>
    api.post<Delegation>("/api/v1/identity/delegations", body),
  get: (id: string) => api.get<Delegation>(`/api/v1/identity/delegations/${id}`),
  revoke: (id: string, body?: RevokeDelegationRequest) =>
    api.post<Delegation>(`/api/v1/identity/delegations/${id}/revoke`, body),
  outgoing: (userId: string) =>
    api.get<Delegation[]>(`/api/v1/identity/delegations/outgoing/${userId}`),
  incoming: (userId: string) =>
    api.get<Delegation[]>(`/api/v1/identity/delegations/incoming/${userId}`),
  active: () => api.get<Delegation[]>("/api/v1/identity/delegations/active"),
};
