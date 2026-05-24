"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Permissions } from "@/lib/rbac/permissions";
import { meApi, type OwnAuditQuery } from "@/lib/api/modules/me";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CopyableUuid } from "@/components/data/copyable-uuid";
import { Pagination } from "@/components/data/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DateTimeRangeFilter } from "@/components/ui/datetime-range-filter";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function MyAuditPage() {
  return (
    <RouteGuard permissions={[Permissions.AuditReadOwn]}>
      <MyAuditContent />
    </RouteGuard>
  );
}

function MyAuditContent() {
  const [page, setPage] = React.useState(0);
  const size = 20;
  const [filters, setFilters] = React.useState<OwnAuditQuery>({});
  const [draft, setDraft] = React.useState<OwnAuditQuery>({});

  const { data, isLoading } = useQuery({
    queryKey: ["me", "audit", page, size, filters],
    queryFn: () =>
      meApi.auditEvents({ page, size, sort: "createdAt,desc" }, filters),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="My audit events"
        description="Security audit entries recorded for your user (same model as the admin audit API, scoped to you)."
      />
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Event type">
              <Input
                value={draft.eventType ?? ""}
                onChange={(e) => setDraft({ ...draft, eventType: e.target.value })}
                placeholder="LOGIN_SUCCESS"
              />
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
              type="button"
              size="sm"
              onClick={() => {
                setFilters(draft);
                setPage(0);
              }}
            >
              <Search className="h-4 w-4" /> Apply filters
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setDraft({});
                setFilters({});
                setPage(0);
              }}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : data?.content?.length ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>UUID</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>IP address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.content.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <CopyableUuid value={event.id} />
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {formatDateTime(event.timestamp)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="muted">{event.eventType}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[240px] truncate text-xs" title={event.details}>
                        {event.details ?? "-"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{event.ipAddress ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination
                page={data.number ?? page}
                totalPages={data.totalPages ?? 1}
                onPageChange={setPage}
              />
            </>
          ) : (
            <EmptyState
              title="No events yet"
              description="As you sign in and perform actions, they will appear here."
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
