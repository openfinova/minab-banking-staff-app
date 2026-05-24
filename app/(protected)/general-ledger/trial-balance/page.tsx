"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
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
import { glBalancesApi } from "@/lib/api/modules/operations";
import { Permissions } from "@/lib/rbac/permissions";
import { formatCurrency } from "@/lib/utils";
import { StatusBadge } from "@/components/data/status-badge";

function toNum(v: number | string | undefined): number {
  if (v === undefined || v === null) return 0;
  return typeof v === "number" ? v : Number(v);
}

export default function TrialBalancePage() {
  return (
    <RouteGuard permissions={[Permissions.GlRead]}>
      <TrialBalanceContent />
    </RouteGuard>
  );
}

function TrialBalanceContent() {
  const today = React.useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [asOfDate, setAsOfDate] = React.useState(today);
  const [submitted, setSubmitted] = React.useState(today);

  const q = useQuery({
    queryKey: ["trial-balance", submitted],
    queryFn: () => glBalancesApi.trialBalance(submitted),
    enabled: Boolean(submitted),
  });

  const balanced = q.data?.balanced ?? q.data?.isBalanced;

  return (
    <div className="space-y-6">
      <PageHeader title="Trial balance" description="Period-end debits, credits, and net by GL account." />
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Report date</CardTitle>
            <CardDescription>Non-zero balance lines with debit/credit rollups.</CardDescription>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase text-muted-foreground">As of</Label>
              <DateInput value={asOfDate} onChange={setAsOfDate} />
            </div>
            <Button type="button" onClick={() => setSubmitted(asOfDate)}>
              Run
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {q.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : q.isError ? (
            <EmptyState title="Report failed" description={describeApiError(q.error)} />
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
                <span className="text-muted-foreground">As of {q.data?.asOfDate ?? submitted}</span>
                <StatusBadge
                  status={balanced ? "BALANCED" : "OUT OF BALANCE"}
                  variantOverride={balanced ? "success" : "destructive"}
                />
                <span>
                  Totals debit {formatCurrency(toNum(q.data?.totalDebits))} · credit{" "}
                  {formatCurrency(toNum(q.data?.totalCredits))}
                </span>
              </div>
              {!q.data?.accountBalances?.length ? (
                <EmptyState title="No balance lines" description="Likely zero activity for this date." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-right">Debits</TableHead>
                      <TableHead className="text-right">Credits</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                  {q.data.accountBalances.map((row) => (
                    <TableRow key={`${row.accountCode ?? "?"}-${row.accountName ?? ""}`}>
                        <TableCell className="font-mono text-xs">{row.accountCode}</TableCell>
                        <TableCell>{row.accountName}</TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {formatCurrency(toNum(row.currentBalance))}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {formatCurrency(toNum(row.totalDebits))}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {formatCurrency(toNum(row.totalCredits))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
