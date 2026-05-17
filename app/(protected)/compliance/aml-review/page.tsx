"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { RouteGuard } from "@/components/rbac/route-guard";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/data/status-badge";
import { describeApiError } from "@/lib/api/errors";
import { glSuspenseApi } from "@/lib/api/modules/operations";
import { Permissions } from "@/lib/rbac/permissions";

function formatMoney(v: string | number | undefined, currency: string | undefined): string {
  if (v === undefined || v === null) return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(n)) return String(v);
  const ccy = currency ?? "EUR";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: ccy }).format(n);
}

export default function AmlReviewQueuePage() {
  return (
    <RouteGuard permissions={[Permissions.GlRead]}>
      <AmlReviewContent />
    </RouteGuard>
  );
}

function AmlReviewContent() {
  const q = useQuery({
    queryKey: ["gl-suspense", "aml-review"],
    queryFn: glSuspenseApi.amlReview,
    refetchInterval: 60_000,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="AML review queue"
        description="Suspense postings held for anti–money laundering review. Work items down to zero where possible; escalate open cases per policy."
      />

      <Card>
        <CardHeader>
          <CardTitle>Queue</CardTitle>
          <CardDescription>
            Source: GL suspense rail — items marked for AML / CFT follow-up. Open a GL transaction from the
            suspense workspace for full context.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {q.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : q.isError ? (
            <EmptyState title="Could not load queue" description={describeApiError(q.error)} />
          ) : !q.data?.length ? (
            <p className="text-sm text-muted-foreground">No items require AML review right now.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Posted</TableHead>
                  <TableHead>GL txn</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {q.data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.transactionReference ?? row.id}</TableCell>
                    <TableCell>{formatMoney(row.amount, row.currency)}</TableCell>
                    <TableCell>
                      <StatusBadge status={String(row.status ?? "")} />
                    </TableCell>
                    <TableCell className="max-w-[12rem] truncate text-xs">{row.reasonCode ?? "—"}</TableCell>
                    <TableCell className="text-xs">{row.postingDate ?? "—"}</TableCell>
                    <TableCell>
                      {row.glTransactionId ? (
                        <Link
                          href={`/general-ledger/transaction-lookup?id=${encodeURIComponent(row.glTransactionId)}`}
                          className="text-primary hover:underline"
                        >
                          View
                        </Link>
                      ) : (
                        "—"
                      )}
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
