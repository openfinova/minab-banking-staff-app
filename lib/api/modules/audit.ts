import { api } from "@/lib/api/client";
import type { PageRequest, PageResponse } from "@/lib/api/query";

export interface AuditEvent {
  id: string;
  timestamp: string;
  eventType: string;
  result?: string;
  actorUserId?: string;
  actorUsername?: string;
  targetType?: string;
  targetId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}

export interface AuditQuery {
  eventType?: string;
  username?: string;
  result?: string;
  from?: string;
  to?: string;
}

export const auditApi = {
  search: (query: AuditQuery, page?: PageRequest) =>
    api.get<PageResponse<AuditEvent>>("/api/v1/identity/audit/events", {
      query: {
        ...(query as Record<string, string | undefined>),
        page: page?.page,
        size: page?.size,
        sort: page?.sort,
      },
    }),
};

export interface UserAccessReportEntry {
  userId: string;
  username: string;
  userType?: string;
  enabled?: boolean;
  locked?: boolean;
  roles?: string[];
  permissions?: string[];
  lastLoginAt?: string;
}

export interface PermissionChangeReportEntry {
  id: string;
  timestamp: string;
  changeType: string;
  roleName?: string;
  permission?: string;
  actorUsername?: string;
}

export interface LoginActivityReportEntry {
  id: string;
  timestamp: string;
  username: string;
  result: string;
  ipAddress?: string;
  mfaUsed?: boolean;
}

export interface SodViolationEntry {
  userId: string;
  username: string;
  conflictingPermissions: string[];
  details?: string;
}

export interface ReportDateRange {
  startDate?: string;
  endDate?: string;
  asOfDate?: string;
}

export const complianceReportsApi = {
  userAccess: (range: ReportDateRange, page?: PageRequest) =>
    api.get<PageResponse<UserAccessReportEntry>>(
      "/api/v1/identity/compliance/reports/user-access",
      {
        query: {
          ...(range as Record<string, string | undefined>),
          page: page?.page,
          size: page?.size,
          sort: page?.sort,
        },
      },
    ),
  permissionChanges: (range: ReportDateRange, page?: PageRequest) =>
    api.get<PageResponse<PermissionChangeReportEntry>>(
      "/api/v1/identity/compliance/reports/permission-changes",
      {
        query: {
          ...(range as Record<string, string | undefined>),
          page: page?.page,
          size: page?.size,
          sort: page?.sort,
        },
      },
    ),
  loginActivity: (range: ReportDateRange, page?: PageRequest) =>
    api.get<PageResponse<LoginActivityReportEntry>>(
      "/api/v1/identity/compliance/reports/login-activity",
      {
        query: {
          ...(range as Record<string, string | undefined>),
          page: page?.page,
          size: page?.size,
          sort: page?.sort,
        },
      },
    ),
  sodViolations: (range: ReportDateRange) =>
    api.get<SodViolationEntry[]>("/api/v1/identity/compliance/reports/sod-violations", {
      query: range as Record<string, string | undefined>,
    }),
};
