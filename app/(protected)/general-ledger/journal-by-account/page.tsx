"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CopyableUuid } from "@/components/data/copyable-uuid";
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
import { glJournalApi } from "@/lib/api/modules/operations";
import { Permissions } from "@/lib/rbac/permissions";
import { formatCurrency } from "@/lib/utils";

export default function JournalByAccountPage() {
  return (
    <RouteGuard permissions={[Permissions.GlRead]}>
      <JournalContent />
    </RouteGuard>
  );
}

function JournalContent() {
  const [accountId, setAccountId] = React.useState("");
  const [submitted, setSubmitted] = React.useState<string | null>(null);

  const q = useQuery({
    queryKey: ["gl-journal-by-account", submitted],
    queryFn: () => glJournalApi.byAccountId(submitted!),
    enabled: Boolean(submitted),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Journal lines by GL account" description="Drill into posted lines for any chart account." />
      <Card>
        <CardHeader>
          <CardTitle>Account ID</CardTitle>
          <CardDescription>Paste a GL account UUID from the chart explorer or supporting documents.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Account UUID"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            />
            <Button type="button" onClick={() => setSubmitted(accountId.trim() || null)}>
              Fetch lines
            </Button>
          </div>
          {!submitted ? (
            <EmptyState title="Awaiting lookup" />
          ) : q.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : q.isError ? (
            <EmptyState title="Unable to fetch journal lines" description={describeApiError(q.error)} />
          ) : !q.data?.length ? (
            <EmptyState title="No lines" description="The account exists but has no posted journal rows yet." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>UUID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {q.data.map((e) => (
                  <TableRow key={e.id ?? `${e.postingDate}-${e.description}`}>
                    <TableCell>
                      <CopyableUuid value={e.id} />
                    </TableCell>
                    <TableCell className="text-xs">{e.postingDate ?? "—"}</TableCell>
                    <TableCell className="text-xs">{e.description ?? "—"}</TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {Number(e.debitAmount) ? formatCurrency(Number(e.debitAmount)) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {Number(e.creditAmount) ? formatCurrency(Number(e.creditAmount)) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
