"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Can } from "@/components/rbac/can";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DateInput } from "@/components/ui/date-input";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";
import { accountsApi } from "@/lib/api/modules/accounts";
import { Permissions } from "@/lib/rbac/permissions";

function defaultFromDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function defaultToDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(v: string | number | undefined, currency: string): string {
  if (v === undefined || v === null) return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(n)) return String(v);
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);
}

export default function AccountBalancePage() {
  return (
    <RouteGuard permissions={[Permissions.AccountRead]}>
      <AccountBalanceContent />
    </RouteGuard>
  );
}

function AccountBalanceContent() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const qc = useQueryClient();
  const { toast } = useToast();

  const balance = useQuery({
    queryKey: ["accounts", id, "balance"],
    queryFn: () => accountsApi.getBalance(id),
    enabled: Boolean(id),
  });

  const available = useQuery({
    queryKey: ["accounts", id, "balance-available"],
    queryFn: () => accountsApi.getAvailableBalance(id),
    enabled: Boolean(id),
  });

  const refresh = useMutation({
    mutationFn: () => accountsApi.refreshBalance(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts", id, "balance"] });
      qc.invalidateQueries({ queryKey: ["accounts", id, "balance-available"] });
      qc.invalidateQueries({ queryKey: ["accounts", "detail", id] });
      toast({ title: "Balance refresh requested" });
    },
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "Refresh failed",
        description: describeApiError(e),
      }),
  });

  const consistency = useMutation({
    mutationFn: () => accountsApi.validateBalanceConsistency(id),
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "Validation failed",
        description: describeApiError(e),
      }),
  });

  const [historyFrom, setHistoryFrom] = React.useState(defaultFromDate());
  const [historyTo, setHistoryTo] = React.useState(defaultToDate());

  const history = useMutation({
    mutationFn: () => accountsApi.getBalanceHistory(id, historyFrom, historyTo),
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "History failed",
        description: describeApiError(e),
      }),
  });

  const [trendDays, setTrendDays] = React.useState("30");
  const trends = useMutation({
    mutationFn: () => accountsApi.getBalanceTrends(id, Number(trendDays)),
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "Trends failed",
        description: describeApiError(e),
      }),
  });

  const [asOfDate, setAsOfDate] = React.useState(defaultToDate());
  const asOf = useMutation({
    mutationFn: () => accountsApi.getBalanceAsOf(id, asOfDate),
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "Lookup failed",
        description: describeApiError(e),
      }),
  });

  if (!id) {
    return <EmptyState title="Missing account id" />;
  }

  if (balance.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (balance.isError || !balance.data) {
    return (
      <EmptyState
        title="Could not load balance"
        description={balance.isError ? describeApiError(balance.error) : ""}
      />
    );
  }

  const b = balance.data;
  const ccy = b.currency ?? "USD";
  const availRaw = available.data?.availableBalance;
  const availNum = typeof availRaw === "string" ? Number(availRaw) : availRaw;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/accounts/${id}`}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Account
        </Link>
      </Button>

      <PageHeader
        title="Balance"
        description={`Understand ledger versus available balances, projections, history, and GL consistency for this account.`}
      />

      <div className="flex flex-wrap gap-2">
        <Can permissions={[Permissions.AccountWrite]}>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={refresh.isPending}
            onClick={() => refresh.mutate()}
          >
            {refresh.isPending ? "Refreshing…" : "Refresh from GL"}
          </Button>
        </Can>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={consistency.isPending}
          onClick={() => consistency.mutate()}
        >
          {consistency.isPending ? "Checking…" : "Validate GL vs account"}
        </Button>
      </div>

      {consistency.data ? (
        <p className="text-sm">
          Consistency:{" "}
          <span className={consistency.data.isConsistent ? "text-emerald-600" : "text-destructive"}>
            {consistency.data.isConsistent ? "Consistent" : "Inconsistent"}
          </span>
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>As returned by the balance projection.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Current {formatMoney(b.currentBalance, ccy)}</p>
            <p>Available {formatMoney(b.availableBalance, ccy)}</p>
            <p>Pending credits {formatMoney(b.pendingCredits, ccy)}</p>
            <p>Pending debits {formatMoney(b.pendingDebits, ccy)}</p>
            <p>Reserved (holds) {formatMoney(b.reservedAmount, ccy)}</p>
            {b.glAccountCount != null ? <p>GL components {b.glAccountCount}</p> : null}
            {b.lastUpdated ? (
              <p className="text-xs text-muted-foreground">Updated {b.lastUpdated}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Available balance</CardTitle>
            <CardDescription>Fast view of funds available after holds and reservations.</CardDescription>
          </CardHeader>
          <CardContent>
            {available.isLoading ? (
              <Skeleton className="h-6 w-32" />
            ) : available.isError ? (
              <p className="text-sm text-destructive">{describeApiError(available.error)}</p>
            ) : (
              <p className="text-lg font-medium">{formatMoney(availNum, ccy)}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {b.components && b.components.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>GL components</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>GL account</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Weight</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {b.components.map((row, i) => (
                  <TableRow key={row.glAccountId ?? i}>
                    <TableCell className="font-mono text-xs">{row.glAccountId ?? "—"}</TableCell>
                    <TableCell>{row.mappingType ?? "—"}</TableCell>
                    <TableCell className="text-right">{formatMoney(row.balance, ccy)}</TableCell>
                    <TableCell className="text-right">{row.weight ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Balance as of date</CardTitle>
          <CardDescription>Point-in-time balance as of any business date you choose.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="bal-aod">Date</Label>
            <DateInput id="bal-aod" value={asOfDate} onChange={setAsOfDate} />
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={asOf.isPending || !asOfDate}
            onClick={() => asOf.mutate()}
          >
            {asOf.isPending ? "Loading…" : "Get balance"}
          </Button>
          {asOf.data ? (
            <div className="text-sm">
              <p>Current {formatMoney(asOf.data.currentBalance, asOf.data.currency ?? ccy)}</p>
              <p>Available {formatMoney(asOf.data.availableBalance, asOf.data.currency ?? ccy)}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Balance history</CardTitle>
          <CardDescription>Daily postings between two dates.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="bh-from">From</Label>
              <DateInput id="bh-from" value={historyFrom} onChange={setHistoryFrom} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="bh-to">To</Label>
              <DateInput id="bh-to" value={historyTo} onChange={setHistoryTo} />
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={history.isPending || !historyFrom || !historyTo}
              onClick={() => history.mutate()}
            >
              {history.isPending ? "Loading…" : "Load history"}
            </Button>
          </div>

          {history.data?.balanceHistory?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.data.balanceHistory.map((e, i) => (
                  <TableRow key={`${e.date}-${i}`}>
                    <TableCell className="text-xs">{e.date}</TableCell>
                    <TableCell className="text-right">{formatMoney(e.balance, ccy)}</TableCell>
                    <TableCell className="text-right">{formatMoney(e.change, ccy)}</TableCell>
                    <TableCell className="text-xs">{e.changeReason ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : history.isSuccess ? (
            <p className="text-sm text-muted-foreground">No entries in range.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trend analysis</CardTitle>
          <CardDescription>
            Rolling averages, volatility, highs, and lows for quick monitoring.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="bt-days">Days</Label>
              <Input
                id="bt-days"
                inputMode="numeric"
                className="w-24"
                value={trendDays}
                onChange={(e) => setTrendDays(e.target.value.replace(/\D/g, "").slice(0, 4))}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={trends.isPending || !trendDays || Number(trendDays) <= 0}
              onClick={() => trends.mutate()}
            >
              {trends.isPending ? "Calculating…" : "Calculate trend"}
            </Button>
          </div>

          {trends.data?.trendAnalysis ? (
            <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <p>Average: {formatMoney(trends.data.trendAnalysis.averageBalance, ccy)}</p>
              <p>Min: {formatMoney(trends.data.trendAnalysis.minimumBalance, ccy)}</p>
              <p>Max: {formatMoney(trends.data.trendAnalysis.maximumBalance, ccy)}</p>
              <p>Total change: {formatMoney(trends.data.trendAnalysis.totalChange, ccy)}</p>
              <p>
                Avg daily change: {formatMoney(trends.data.trendAnalysis.averageDailyChange, ccy)}
              </p>
              <p>Trend: {trends.data.trendAnalysis.trend ?? "—"}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
