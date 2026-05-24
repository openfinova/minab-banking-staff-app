"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/auth-provider";
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
import { CopyableUuid } from "@/components/data/copyable-uuid";
import { StatusBadge } from "@/components/data/status-badge";
import { describeApiError } from "@/lib/api/errors";
import { glSuspenseApi } from "@/lib/api/modules/operations";
import { amlTransactionAlertsApi } from "@/lib/api/modules/compliance";
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
    <RouteGuard permissions={[Permissions.GlRead, Permissions.ComplianceAlertRead]} mode="any">
      <AmlReviewContent />
    </RouteGuard>
  );
}

function AmlReviewContent() {
  const { can } = useAuth();
  const showTxAlerts = can([Permissions.ComplianceAlertRead]);

  const qSuspense = useQuery({
    queryKey: ["gl-suspense", "aml-review"],
    queryFn: glSuspenseApi.amlReview,
    refetchInterval: 60_000,
  });

  const qAlerts = useQuery({
    enabled: showTxAlerts,
    queryKey: ["aml-alerts", "tx-monitoring"],
    queryFn: () => amlTransactionAlertsApi.list({ page: 0, size: 25, sort: "createdAt,desc" }),
    refetchInterval: 60_000,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="AML review queue"
        description="GL suspense items and post-settlement transaction monitoring alerts raised by the compliance module."
      />

      <Card>
        <CardHeader>
          <CardTitle>Transaction monitoring alerts</CardTitle>
          <CardDescription>
            Rule hits evaluated after transactions post. High-severity flows also raise internal inbox messages and
            may place an investigative account hold when policy requires it.
            {!showTxAlerts ? " You need the compliance alert read permission to load this panel." : null}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showTxAlerts ? (
            <p className="text-sm text-muted-foreground">This section requires compliance alert access.</p>
          ) : qAlerts.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : qAlerts.isError ? (
            <EmptyState title="Could not load AML alerts" description={describeApiError(qAlerts.error)} />
          ) : !qAlerts.data?.content?.length ? (
            <p className="text-sm text-muted-foreground">No transaction monitoring alerts in the recent window.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>UUID</TableHead>
                  <TableHead>Rule</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Hold</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {qAlerts.data.content.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <CopyableUuid value={row.id} />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.ruleCode ?? "—"}</TableCell>
                    <TableCell>
                      <StatusBadge status={String(row.severity ?? "")} />
                    </TableCell>
                    <TableCell>{formatMoney(row.amount, row.currency)}</TableCell>
                    <TableCell className="text-xs">
                      <CopyableUuid
                        value={row.accountId}
                        href={row.accountId ? `/accounts/${encodeURIComponent(row.accountId)}` : undefined}
                      />
                    </TableCell>
                    <TableCell className="text-xs">{row.investigationHoldPlaced ? "Yes" : "—"}</TableCell>
                    <TableCell className="text-xs">{row.createdAt ? String(row.createdAt) : "—"}</TableCell>
                    <TableCell className="max-w-[14rem] truncate text-xs" title={row.detail}>
                      {row.detail ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>GL suspense queue</CardTitle>
          <CardDescription>
            Source: GL suspense rail — items marked for AML / CFT follow-up. Open a GL transaction from the
            suspense workspace for full context.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {qSuspense.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : qSuspense.isError ? (
            <EmptyState title="Could not load queue" description={describeApiError(qSuspense.error)} />
          ) : !qSuspense.data?.length ? (
            <p className="text-sm text-muted-foreground">No items require AML review right now.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>UUID</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Posted</TableHead>
                  <TableHead>GL txn</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {qSuspense.data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <CopyableUuid value={row.id} />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.transactionReference ?? "—"}</TableCell>
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
