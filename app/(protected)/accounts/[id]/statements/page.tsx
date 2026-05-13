"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { RouteGuard } from "@/components/rbac/route-guard";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";
import { accountsApi, type AccountStatement } from "@/lib/api/modules/accounts";
import { Permissions } from "@/lib/rbac/permissions";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatMoney(v: string | number | undefined, currency: string): string {
  if (v === undefined || v === null) return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(n)) return String(v);
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);
}

function defaultFromDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function defaultToDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function extractTx(item: AccountStatement["transactions"][number]) {
  if (item && typeof item === "object") {
    const o = item as Record<string, unknown>;
    return {
      date: typeof o.transactionDate === "string" ? o.transactionDate : "",
      type: typeof o.transactionType === "string" ? o.transactionType : "",
      amount: o.amount as string | number | undefined,
      currency: typeof o.currency === "string" ? o.currency : undefined,
      description: typeof o.description === "string" ? o.description : "",
      reference: typeof o.referenceId === "string" ? o.referenceId : "",
    };
  }
  return null;
}

export default function AccountStatementsPage() {
  return (
    <RouteGuard permissions={[Permissions.AccountRead]}>
      <AccountStatementsContent />
    </RouteGuard>
  );
}

function AccountStatementsContent() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const { toast } = useToast();

  const detail = useQuery({
    queryKey: ["accounts", "detail", id],
    queryFn: () => accountsApi.get(id),
    enabled: Boolean(id),
  });

  const periods = useQuery({
    queryKey: ["accounts", id, "statement-periods"],
    queryFn: () => accountsApi.listStatementPeriods(id),
    enabled: Boolean(id),
  });

  const now = new Date();
  const [year, setYear] = React.useState(String(now.getFullYear()));
  const [month, setMonth] = React.useState(String(now.getMonth() + 1));

  const [fromDate, setFromDate] = React.useState(defaultFromDate());
  const [toDate, setToDate] = React.useState(defaultToDate());

  const [statement, setStatement] = React.useState<AccountStatement | null>(null);

  const customRange = useMutation({
    mutationFn: () => accountsApi.generateStatement(id, fromDate, toDate),
    onSuccess: (data) => setStatement(data),
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "Generation failed",
        description: describeApiError(e),
      }),
  });

  const monthly = useMutation({
    mutationFn: () =>
      accountsApi.generateMonthlyStatement(id, Number(year), Number(month)),
    onSuccess: (data) => setStatement(data),
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "Generation failed",
        description: describeApiError(e),
      }),
  });

  if (!id) {
    return <EmptyState title="Missing account id" />;
  }

  const ccy = detail.data?.currency ?? "USD";

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/accounts/${id}`}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Account
        </Link>
      </Button>

      <PageHeader
        title="Statements"
        description={`Generate statements over arbitrary ranges or pick an available month — /api/v1/accounts/${id}/statements`}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Custom range</CardTitle>
            <CardDescription>GET /statements?fromDate=&toDate=</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-1.5">
              <Label htmlFor="st-from">From</Label>
              <DateInput id="st-from" value={fromDate} onChange={setFromDate} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="st-to">To</Label>
              <DateInput id="st-to" value={toDate} onChange={setToDate} />
            </div>
            <Button
              type="button"
              disabled={customRange.isPending || !fromDate || !toDate}
              onClick={() => customRange.mutate()}
            >
              {customRange.isPending ? "Generating…" : "Generate"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly statement</CardTitle>
            <CardDescription>GET /statements/monthly?year=&month=</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-1.5">
              <Label htmlFor="st-year">Year</Label>
              <Input
                id="st-year"
                inputMode="numeric"
                value={year}
                onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Month</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={m} value={String(i + 1)}>
                      {m} ({i + 1})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={monthly.isPending || !year || Number.isNaN(Number(year))}
              onClick={() => monthly.mutate()}
            >
              {monthly.isPending ? "Generating…" : "Generate"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available periods</CardTitle>
          <CardDescription>GET /statements/periods — pick a row to generate.</CardDescription>
        </CardHeader>
        <CardContent>
          {periods.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : periods.isError ? (
            <EmptyState title="Could not load periods" description={describeApiError(periods.error)} />
          ) : (periods.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No periods reported.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(periods.data ?? []).map((p, i) => (
                  <TableRow key={`${p.year ?? "—"}-${p.month ?? i}`}>
                    <TableCell>{p.year ?? "—"}</TableCell>
                    <TableCell>{p.month ?? "—"}</TableCell>
                    <TableCell className="text-xs">{p.fromDate}</TableCell>
                    <TableCell className="text-xs">{p.toDate}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={customRange.isPending}
                        onClick={() => {
                          setFromDate(p.fromDate);
                          setToDate(p.toDate);
                          customRange.mutate();
                        }}
                      >
                        Generate
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {statement ? (
        <Card>
          <CardHeader>
            <CardTitle>
              Statement {statement.fromDate} → {statement.toDate}
            </CardTitle>
            <CardDescription>
              {statement.accountNumber ? `Account ${statement.accountNumber}` : null}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {statement.summary ? (
              <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <p>Opening: {formatMoney(statement.summary.openingBalance, ccy)}</p>
                <p>Closing: {formatMoney(statement.summary.closingBalance, ccy)}</p>
                <p>Total credits: {formatMoney(statement.summary.totalCredits, ccy)}</p>
                <p>Total debits: {formatMoney(statement.summary.totalDebits, ccy)}</p>
              </div>
            ) : null}

            {statement.transactions?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statement.transactions.map((raw, i) => {
                    const t = extractTx(raw);
                    if (!t) return null;
                    return (
                      <TableRow key={i}>
                        <TableCell className="text-xs">
                          {t.date ? t.date.replace("T", " ").slice(0, 19) : "—"}
                        </TableCell>
                        <TableCell>{t.type}</TableCell>
                        <TableCell className="text-right">
                          {formatMoney(t.amount, t.currency ?? ccy)}
                        </TableCell>
                        <TableCell className="max-w-[14rem] truncate text-xs">{t.description}</TableCell>
                        <TableCell className="font-mono text-xs">{t.reference}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No movements in this period.</p>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
