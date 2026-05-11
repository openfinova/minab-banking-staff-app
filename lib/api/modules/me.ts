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

const isPlaceholderToken = (item: string): boolean => {
  const normalized = item.trim().toLowerCase();
  return !normalized || normalized === "java.util.arraylist";
};

const normalizeRecoveryCodes = (value: unknown): string[] => {
  let candidates: unknown[] = [];

  if (Array.isArray(value)) {
    if (
      value.length === 2 &&
      typeof value[0] === "string" &&
      value[0] === "java.util.ArrayList" &&
      Array.isArray(value[1])
    ) {
      candidates = value[1] as unknown[];
    } else {
      candidates = value;
    }
  } else if (value && typeof value === "object") {
    candidates = Object.values(value as Record<string, unknown>);
  }

  const codes = candidates
    .map((entry) => {
      if (typeof entry === "string") return entry.trim();
      if (typeof entry === "number") return String(entry);
      return "";
    })
    .filter((entry) => entry && !isPlaceholderToken(entry));

  if (codes.length === 0 && value !== undefined && value !== null) {
    if (typeof console !== "undefined") {
      console.warn("[mfa] Unexpected recoveryCodes shape:", value);
    }
  }

  return codes;
};

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
  mfaSetup: async (): Promise<MfaSetupResponse> => {
    const response = await api.post<Record<string, unknown>>("/api/v1/identity/me/mfa/setup");
    return {
      secret: typeof response.secret === "string" ? response.secret : "",
      qrUri:
        typeof response.qrUri === "string"
          ? response.qrUri
          : typeof response.authenticatorUri === "string"
            ? response.authenticatorUri
            : "",
      recoveryCodes: normalizeRecoveryCodes(response.recoveryCodes),
    };
  },
  mfaVerify: (body: { code: string }) =>
    api.post<void>("/api/v1/identity/me/mfa/verify", body),
  mfaDisable: (body: { currentPassword: string }) =>
    request<void>("/api/v1/identity/me/mfa", { method: "DELETE", body }),
  auditEvents: (page?: PageRequest) =>
    api.get<PageResponse<OwnAuditEvent>>("/api/v1/identity/me/audit-events", {
      query: { page: page?.page, size: page?.size, sort: page?.sort },
    }),
};
