import { api } from "@/lib/api/client";
import type { PageRequest, PageResponse } from "@/lib/api/query";

export type UserType = "STAFF" | "CUSTOMER" | string;
export type ProvisioningStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "REVOKED"
  | string;

export interface UserSummary {
  id: string;
  username: string;
  email?: string;
  /** Present when this login is already tied to a customer party (search/list responses). */
  customerPartyId?: string;
  userType: UserType;
  enabled: boolean;
  locked: boolean;
  suspended?: boolean;
  branchCode?: string;
  employeeId?: string;
  glApprovalRole?: string;
  provisioningStatus?: ProvisioningStatus;
  roles?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface UserDetail extends UserSummary {
  accountExpiresAt?: string;
  provisioningEligibilityNotes?: string;
  forcePasswordChange?: boolean;
  mfaEnabled?: boolean;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  email?: string;
  userType: UserType;
  branchCode?: string;
  employeeId?: string;
  glApprovalRole?: string;
  customerPartyId?: string;
  roleNames?: string[];
  accountExpiresAt?: string;
  provisioningEligibilityNotes?: string;
}

export interface UpdateUserAccessRequest {
  email?: string;
  branchCode?: string;
  employeeId?: string;
  glApprovalRole?: string;
  customerPartyId?: string;
  accountExpiresAt?: string;
}

export interface UserSearchCriteria {
  /** Free text: identity user UUID, or partial match on username / email (server-defined). */
  q?: string;
  /** Exact customer party UUID — finds the linked CUSTOMER login when present. */
  customerPartyId?: string;
  username?: string;
  email?: string;
  userType?: UserType;
  enabled?: boolean;
  locked?: boolean;
  roleName?: string;
  branchCode?: string;
  provisioningStatus?: ProvisioningStatus;
  suspended?: boolean;
}

export const usersApi = {
  list: (page?: PageRequest) =>
    api.get<PageResponse<UserSummary>>("/api/v1/identity/users", {
      query: { page: page?.page, size: page?.size, sort: page?.sort },
    }),
  search: (criteria: UserSearchCriteria, page?: PageRequest) =>
    api.get<PageResponse<UserSummary>>("/api/v1/identity/users/search", {
      query: {
        ...(criteria as Record<string, string | number | boolean | undefined>),
        page: page?.page,
        size: page?.size,
        sort: page?.sort,
      },
    }),
  get: (id: string) => api.get<UserDetail>(`/api/v1/identity/users/${id}`),
  getByCustomerPartyId: (customerPartyId: string) =>
    api.get<UserDetail>(`/api/v1/identity/users/by-customer/${customerPartyId}`),
  create: (body: CreateUserRequest) =>
    api.post<UserDetail>("/api/v1/identity/users", body),
  updateAccess: (id: string, body: UpdateUserAccessRequest) =>
    api.put<UserDetail>(`/api/v1/identity/users/${id}`, body),
  setRoles: (id: string, roleNames: string[]) =>
    api.put<UserDetail>(`/api/v1/identity/users/${id}/roles`, roleNames),
  setEnabled: (id: string, enabled: boolean) =>
    api.patch<UserDetail>(`/api/v1/identity/users/${id}/enabled`, { enabled }),
  lock: (id: string, body: { reason: string }) =>
    api.patch<UserDetail>(`/api/v1/identity/users/${id}/lock`, body),
  unlock: (id: string) =>
    api.patch<UserDetail>(`/api/v1/identity/users/${id}/unlock`),
  resetPassword: (id: string, body: { password: string }) =>
    api.patch<void>(`/api/v1/identity/users/${id}/password`, body),
  forcePasswordChange: (id: string) =>
    api.post<void>(`/api/v1/identity/users/${id}/force-password-change`),
  approveProvisioning: (id: string) =>
    api.post<UserDetail>(`/api/v1/identity/users/${id}/provisioning/approve`),
  rejectProvisioning: (id: string, body: { reason: string }) =>
    api.post<UserDetail>(`/api/v1/identity/users/${id}/provisioning/reject`, body),
  suspend: (id: string, body: { reason: string; suspensionUntil?: string }) =>
    api.patch<UserDetail>(`/api/v1/identity/users/${id}/suspend`, body),
  reactivate: (id: string) =>
    api.patch<UserDetail>(`/api/v1/identity/users/${id}/reactivate`),
  deprovision: (id: string, body: { reason?: string }) =>
    api.post<void>(`/api/v1/identity/users/${id}/deprovision`, body),
  delete: (id: string) => api.delete<void>(`/api/v1/identity/users/${id}`),
};
