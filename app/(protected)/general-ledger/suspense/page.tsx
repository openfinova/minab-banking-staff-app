"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RouteGuard } from "@/components/rbac/route-guard";
import { describeApiError } from "@/lib/api/errors";
import { glSuspenseApi } from "@/lib/api/modules/operations";
import { Permissions } from "@/lib/rbac/permissions";
import { CopyableUuid } from "@/components/data/copyable-uuid";
import { StatusBadge } from "@/components/data/status-badge";
import { formatCurrency } from "@/lib/utils";

export default function SuspenseItemsPage() {
  return (
    <RouteGuard permissions={[Permissions.GlRead]}>
      <SuspenseContent />
    </RouteGuard>
  );
}

function SuspenseContent() {
  const [page, setPage] = React.useState(0);

  const q = useQuery({
    queryKey: ["gl-suspense", page],
    queryFn: () => glSuspenseApi.search({ page, size: 25 }),
  });

  const rows = q.data?.content ?? [];
  const totalPages = q.data?.totalPages ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Suspense workspace" description="Searchable queue of items parked in suspense (read-only)." />
      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
          <CardDescription>Clearing workflows remain on API clients with gl:approve where applicable.</CardDescription>
        </CardHeader>
        <CardContent>
          {q.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : q.isError ? (
            <EmptyState title="Failed to load suspense" description={describeApiError(q.error)} />
          ) : !rows.length ? (
            <EmptyState title="No suspense items on this page" />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>UUID</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Posted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <CopyableUuid value={r.id} />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{r.transactionReference ?? "—"}</TableCell>
                      <TableCell className="text-xs">{r.postingDate ?? "—"}</TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} />
                      </TableCell>
                      <TableCell className="text-xs">{r.reasonCode ?? "—"}</TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {formatCurrency(Number(r.amount ?? 0), r.currency ?? "EUR")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalPages > 1 ? (
                <div className="mt-4 flex justify-end gap-2">
                  <Button size="sm" variant="outline" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
