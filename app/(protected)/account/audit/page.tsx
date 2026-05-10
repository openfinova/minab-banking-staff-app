"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Permissions } from "@/lib/rbac/permissions";
import { meApi } from "@/lib/api/modules/me";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/data/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

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

  const { data, isLoading } = useQuery({
    queryKey: ["me", "audit", page, size],
    queryFn: () => meApi.auditEvents({ page, size, sort: "timestamp,desc" }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="My audit events"
        description="Audit trail entries that reference your account."
      />
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
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>IP address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.content.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-mono text-xs">
                        {formatDateTime(event.timestamp)}
                      </TableCell>
                      <TableCell>{event.eventType}</TableCell>
                      <TableCell>
                        <Badge
                          variant={event.result === "FAILURE" ? "destructive" : "muted"}
                        >
                          {event.result ?? "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {event.ipAddress ?? "-"}
                      </TableCell>
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
