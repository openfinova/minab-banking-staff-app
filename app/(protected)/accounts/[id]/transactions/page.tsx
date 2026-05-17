"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { RouteGuard } from "@/components/rbac/route-guard";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DateInput } from "@/components/ui/date-input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { describeApiError } from "@/lib/api/errors";
import { accountsApi } from "@/lib/api/modules/accounts";
import { Permissions } from "@/lib/rbac/permissions";

function formatMoney(v: string | number | undefined, currency: string): string {
  if (v === undefined || v === null) return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(n)) return String(v);
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);
}

function isoStartOfDay(yyyyMmDd: string): string {
  return `${yyyyMmDd}T00:00:00`;
}

function isoEndOfDay(yyyyMmDd: string): string {
  return `${yyyyMmDd}T23:59:59`;
}

function defaultFromDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function defaultToDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AccountTransactionsPage() {
  return (
    <RouteGuard permissions={[Permissions.AccountRead]}>
      <AccountTransactionsContent />
    </RouteGuard>
  );
}

function AccountTransactionsContent() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";

  const detail = useQuery({
    queryKey: ["accounts", "detail", id],
    queryFn: () => accountsApi.get(id),
    enabled: Boolean(id),
  });

  const [fromDate, setFromDate] = React.useState(defaultFromDate());
  const [toDate, setToDate] = React.useState(defaultToDate());
  const [page, setPage] = React.useState(0);

  const list = useQuery({
    queryKey: ["accounts", id, "transactions", fromDate, toDate, page],
    queryFn: () =>
      accountsApi.listTransactions(id, {
        fromDate: isoStartOfDay(fromDate),
        toDate: isoEndOfDay(toDate),
        page,
        size: 50,
      }),
    enabled: Boolean(id) && Boolean(fromDate) && Boolean(toDate),
  });

  if (!id) {
    return <EmptyState title="Missing account id" />;
  }

  const ccy = detail.data?.currency ?? "EUR";
  const rows = list.data?.content ?? [];
  const totalPages = list.data?.totalPages ?? 0;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/accounts/${id}`}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Account
        </Link>
      </Button>

      <PageHeader
        title="Transactions"
        description="Movements posted to this account for the selected date range."
      />

      <Card>
        <CardHeader>
          <CardTitle>History window</CardTitle>
          <CardDescription>
            Inclusive day range; backend uses LocalDateTime (start-of-day to end-of-day).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="tx-from">From</Label>
            <DateInput
              id="tx-from"
              value={fromDate}
              onChange={(v) => {
                setPage(0);
                setFromDate(v);
              }}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="tx-to">To</Label>
            <DateInput
              id="tx-to"
              value={toDate}
              onChange={(v) => {
                setPage(0);
                setToDate(v);
              }}
            />
          </div>
          {list.isFetching ? (
            <span className="text-xs text-muted-foreground">Loading…</span>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Movements</CardTitle>
          <CardDescription>Sorted by transactionDate desc.</CardDescription>
        </CardHeader>
        <CardContent>
          {list.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : list.isError ? (
            <EmptyState title="Could not load transactions" description={describeApiError(list.error)} />
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions in this window.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>GL link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs">
                        {t.transactionDate ? t.transactionDate.replace("T", " ").slice(0, 19) : "—"}
                      </TableCell>
                      <TableCell>{t.transactionType}</TableCell>
                      <TableCell className="text-right">
                        {formatMoney(t.amount, t.currency ?? ccy)}
                      </TableCell>
                      <TableCell className="max-w-[14rem] truncate text-xs">{t.description ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{t.referenceId ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{t.glTransactionId ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-4 flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  Page {(list.data?.number ?? 0) + 1} of {Math.max(totalPages, 1)}
                  {list.data?.totalElements != null ? ` · ${list.data.totalElements} total` : null}
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page <= 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={totalPages > 0 && page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
