"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DateTimeRangeFilter } from "@/components/ui/datetime-range-filter";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CopyableUuid } from "@/components/data/copyable-uuid";
import { Pagination } from "@/components/data/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Permissions } from "@/lib/rbac/permissions";
import { auditApi, type AuditQuery } from "@/lib/api/modules/audit";
import { formatDateTime } from "@/lib/utils";
import { StaffUserField } from "@/components/identity/staff-user-field";

const USER_FILTER_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function userFilterToQuery(userFilter: string): Pick<AuditQuery, "userId" | "username"> {
  const t = userFilter.trim();
  if (!t) return {};
  if (USER_FILTER_UUID_RE.test(t)) return { userId: t };
  return { username: t };
}

export default function AuditPage() {
  return (
    <RouteGuard permissions={[Permissions.AuditRead]}>
      <AuditContent />
    </RouteGuard>
  );
}

function AuditContent() {
  const [query, setQuery] = React.useState<AuditQuery>({});
  const [draft, setDraft] = React.useState<AuditQuery>({});
  const [userFilter, setUserFilter] = React.useState("");
  const [page, setPage] = React.useState(0);
  const size = 25;

  const eventTypesQuery = useQuery({
    queryKey: ["audit", "event-types"],
    queryFn: auditApi.eventTypes,
  });

  const search = useQuery({
    queryKey: ["audit", query, page, size],
    queryFn: () => auditApi.search(query, { page, size, sort: "createdAt,desc" }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security audit events"
        description="Search system-wide security audit entries. Pick a user from suggestions (UUID filter) or enter a username for an exact match, plus event type, IP, and time window."
      />
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid items-end gap-3 md:grid-cols-2 lg:grid-cols-4">
            <StaffUserField
              id="audit-user-filter"
              label="User"
              suggestionSource="audit"
              className="md:col-span-2"
              labelClassName="text-xs uppercase tracking-wide text-muted-foreground"
              inputClassName="font-mono text-xs"
              value={userFilter}
              onChange={setUserFilter}
            />
            <Field label="Event type">
              <Select
                value={draft.eventType ?? "__ANY__"}
                onValueChange={(v) =>
                  setDraft({ ...draft, eventType: v === "__ANY__" ? undefined : v })
                }
                disabled={eventTypesQuery.isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any event type" />
                </SelectTrigger>
                <SelectContent className="max-h-[min(24rem,70vh)]">
                  <SelectItem value="__ANY__">Any</SelectItem>
                  {(eventTypesQuery.data ?? []).map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="IP address">
              <Input
                className="font-mono text-xs"
                value={draft.ipAddress ?? ""}
                onChange={(e) => setDraft({ ...draft, ipAddress: e.target.value })}
              />
            </Field>
          </div>
          <DateTimeRangeFilter
            from={draft.from ?? ""}
            to={draft.to ?? ""}
            onChange={({ from, to }) => setDraft({ ...draft, from, to })}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                const u = userFilterToQuery(userFilter);
                setQuery({ ...draft, ...u });
                setPage(0);
              }}
            >
              <Search className="h-4 w-4" /> Apply filters
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setUserFilter("");
                setDraft({});
                setQuery({});
                setPage(0);
              }}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          {search.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : search.data?.content?.length ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Changed by</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {search.data.content.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-mono text-xs">
                        {formatDateTime(event.timestamp)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="muted">{event.eventType}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {event.username ?? "-"}
                        {event.userId ? (
                          <CopyableUuid
                            value={event.userId}
                            href={`/identity/users/${event.userId}`}
                          />
                        ) : null}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {event.changedByUsername ?? event.changedByUserId ?? "-"}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate text-xs" title={event.details}>
                        {event.details ?? "-"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{event.ipAddress ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination
                page={search.data.number ?? page}
                totalPages={search.data.totalPages ?? 1}
                onPageChange={setPage}
                totalElements={search.data.totalElements}
              />
            </>
          ) : (
            <EmptyState
              title="No audit events found"
              description="Adjust filters or expand the time window to see events."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
