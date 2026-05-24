import { api } from "@/lib/api/client";
import type { PageRequest, PageResponse } from "@/lib/api/query";
import type { UserSummary } from "@/lib/api/modules/users";

export interface AuditEvent {
  id: string;
  timestamp: string;
  userId?: string;
  username?: string;
  eventType: string;
  ipAddress?: string;
  userAgent?: string;
  details?: string;
  detailsJson?: Record<string, unknown>;
  changedByUserId?: string;
  changedByUsername?: string;
  previousValue?: string;
  currentValue?: string;
  approvedByUserId?: string;
  approvedByUsername?: string;
  approvalDate?: string;
}

/** Mirrors `GET /api/v1/identity/audit/events` query params. */
export interface AuditQuery {
  userId?: string;
  eventType?: string;
  username?: string;
  ipAddress?: string;
  from?: string;
  to?: string;
}

export const auditApi = {
  eventTypes: () => api.get<string[]>("/api/v1/identity/audit/event-types"),
  search: (query: AuditQuery, page?: PageRequest) =>
    api.get<PageResponse<AuditEvent>>("/api/v1/identity/audit/events", {
      query: {
        ...(query as Record<string, string | undefined>),
        page: page?.page,
        size: page?.size,
        sort: page?.sort,
      },
    }),
  /** Typeahead for audit filters ({@code audit:read}); all user types. */
  suggestUsers: (q: string, limit = 15) =>
    api.get<UserSummary[]>("/api/v1/identity/audit/suggestions/users", {
      query: { q: q.trim(), limit },
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
}

/** Maps UI date range to backend `from` / `to` ISO datetimes (inclusive day bounds). */
function reportRangeQuery(range: ReportDateRange): { from?: string; to?: string } {
  const query: { from?: string; to?: string } = {};
  const start = range.startDate?.trim();
  const end = range.endDate?.trim();
  if (start) query.from = `${start}T00:00:00`;
  if (end) query.to = `${end}T23:59:59`;
  return query;
}

export const complianceReportsApi = {
  userAccess: (page?: PageRequest) =>
    api.get<PageResponse<UserAccessReportEntry>>(
      "/api/v1/identity/compliance/reports/user-access",
      {
        query: {
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
          ...reportRangeQuery(range),
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
          ...reportRangeQuery(range),
          page: page?.page,
          size: page?.size,
          sort: page?.sort,
        },
      },
    ),
  sodViolations: () =>
    api.get<SodViolationEntry[]>("/api/v1/identity/compliance/reports/sod-violations"),
};
