"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [page, setPage] = React.useState(0);
  const size = 25;

  const search = useQuery({
    queryKey: ["audit", query, page, size],
    queryFn: () => auditApi.search(query, { page, size, sort: "timestamp,desc" }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security audit events"
        description="Search system-wide audit trail entries by actor, time window, and outcome."
      />
      <Card>
        <CardContent className="grid gap-3 pt-6 md:grid-cols-3 lg:grid-cols-5">
          <Field label="Username">
            <Input
              value={draft.username ?? ""}
              onChange={(e) => setDraft({ ...draft, username: e.target.value })}
            />
          </Field>
          <Field label="Event type">
            <Input
              value={draft.eventType ?? ""}
              onChange={(e) => setDraft({ ...draft, eventType: e.target.value })}
              placeholder="USER_LOGIN"
            />
          </Field>
          <Field label="Result">
            <Input
              value={draft.result ?? ""}
              onChange={(e) => setDraft({ ...draft, result: e.target.value })}
              placeholder="SUCCESS"
            />
          </Field>
          <Field label="From">
            <Input
              type="datetime-local"
              value={draft.from ?? ""}
              onChange={(e) => setDraft({ ...draft, from: e.target.value })}
            />
          </Field>
          <Field label="To">
            <Input
              type="datetime-local"
              value={draft.to ?? ""}
              onChange={(e) => setDraft({ ...draft, to: e.target.value })}
            />
          </Field>
          <div className="md:col-span-3 lg:col-span-5 flex flex-wrap gap-2">
            <Button
              onClick={() => {
                setQuery(draft);
                setPage(0);
              }}
            >
              <Search className="h-4 w-4" /> Apply filters
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
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
                    <TableHead>Result</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {search.data.content.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-mono text-xs">
                        {formatDateTime(event.timestamp)}
                      </TableCell>
                      <TableCell>{event.eventType}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            event.result === "SUCCESS"
                              ? "success"
                              : event.result === "FAILURE"
                                ? "destructive"
                                : "muted"
                          }
                        >
                          {event.result ?? "-"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {event.actorUsername ?? event.actorUserId ?? "-"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {event.targetType ?? "-"}{" "}
                        {event.targetId ? (
                          <span className="font-mono text-muted-foreground">{event.targetId}</span>
                        ) : null}
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
