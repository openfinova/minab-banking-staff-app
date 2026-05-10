import { api, request } from "@/lib/api/client";
import type { PageRequest, PageResponse } from "@/lib/api/query";

export interface MeProfile {
  id: string;
  username: string;
  email?: string;
  userType?: string;
  branchCode?: string;
  employeeId?: string;
  enabled?: boolean;
  locked?: boolean;
  mfaEnabled?: boolean;
  forcePasswordChange?: boolean;
  permissions?: string[];
  roles?: string[];
}

export interface MfaSetupResponse {
  secret: string;
  qrUri: string;
  recoveryCodes: string[];
}

export interface OwnAuditEvent {
  id: string;
  timestamp: string;
  eventType: string;
  result?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}

export const meApi = {
  profile: () => api.get<MeProfile>("/api/v1/identity/me"),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    api.patch<void>("/api/v1/identity/me/password", body),
  mfaSetup: () => api.post<MfaSetupResponse>("/api/v1/identity/me/mfa/setup"),
  mfaVerify: (body: { code: string }) =>
    api.post<void>("/api/v1/identity/me/mfa/verify", body),
  mfaDisable: (body: { currentPassword: string }) =>
    request<void>("/api/v1/identity/me/mfa", { method: "DELETE", body }),
  auditEvents: (page?: PageRequest) =>
    api.get<PageResponse<OwnAuditEvent>>("/api/v1/identity/me/audit-events", {
      query: { page: page?.page, size: page?.size, sort: page?.sort },
    }),
};
