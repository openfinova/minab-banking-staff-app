"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { RouteGuard } from "@/components/rbac/route-guard";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { EmptyState } from "@/components/ui/empty-state";
import { CopyableUuid } from "@/components/data/copyable-uuid";
import { StatusBadge } from "@/components/data/status-badge";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";
import {
  accountsApi,
  type AccountProductType,
  type AccountResponse,
  type AccountStatus,
} from "@/lib/api/modules/accounts";
import { Permissions } from "@/lib/rbac/permissions";

const PRODUCT_TYPES: AccountProductType[] = [
  "CHECKING",
  "SAVINGS",
  "MONEY_MARKET",
  "CERTIFICATE_OF_DEPOSIT",
  "CREDIT_LINE",
  "INVESTMENT",
];

const STATUSES: AccountStatus[] = ["ACTIVE", "SUSPENDED", "FROZEN", "DORMANT", "CLOSED"];

function formatMoney(v: string | number | undefined, currency: string): string {
  if (v === undefined || v === null) return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(n)) return String(v);
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);
}

function totalLedger(rows: AccountResponse[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const r of rows) {
    const v = r.ledgerBalance == null ? 0 : Number(r.ledgerBalance);
    if (Number.isNaN(v)) continue;
    totals[r.currency] = (totals[r.currency] ?? 0) + v;
  }
  return totals;
}

export default function AccountsReportsPage() {
  return (
    <RouteGuard permissions={[Permissions.AccountRead]}>
      <AccountsReportsContent />
    </RouteGuard>
  );
}

function AccountsReportsContent() {
  const { toast } = useToast();

  const [productType, setProductType] = React.useState<AccountProductType>("CHECKING");
  const [status, setStatus] = React.useState<AccountStatus>("ACTIVE");

  const byType = useMutation({
    mutationFn: () => accountsApi.listByType(productType),
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "Report failed",
        description: describeApiError(e),
      }),
  });

  const byStatus = useMutation({
    mutationFn: () => accountsApi.listByStatus(status),
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "Report failed",
        description: describeApiError(e),
      }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Portfolio reports"
        description="Snapshot lists of accounts by product type or by status. Useful for downstream exports and reconciliations."
      />

      <Card>
        <CardHeader>
          <CardTitle>By product type</CardTitle>
          <CardDescription>
            Browse every open account for the selected product category (read-only portfolio view).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1.5">
              <Label>Product type</Label>
              <Select value={productType} onValueChange={(v) => setProductType(v as AccountProductType)}>
                <SelectTrigger className="w-[260px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="button" disabled={byType.isPending} onClick={() => byType.mutate()}>
              {byType.isPending ? "Loading…" : "Run"}
            </Button>
          </div>
          <ReportTable rows={byType.data ?? []} loading={byType.isPending} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>By status</CardTitle>
          <CardDescription>
            Browse accounts sharing the same servicing status — useful for operational clean-up.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as AccountStatus)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="button" disabled={byStatus.isPending} onClick={() => byStatus.mutate()}>
              {byStatus.isPending ? "Loading…" : "Run"}
            </Button>
          </div>
          <ReportTable rows={byStatus.data ?? []} loading={byStatus.isPending} />
        </CardContent>
      </Card>
    </div>
  );
}

function ReportTable({ rows, loading }: { rows: AccountResponse[]; loading: boolean }) {
  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No accounts"
        description="Run a report to populate this view."
      />
    );
  }
  const totals = totalLedger(rows);
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {rows.length} account(s).{" "}
        {Object.entries(totals)
          .map(([c, sum]) => `${formatMoney(sum, c)} (${c})`)
          .join(" · ")}
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>UUID</TableHead>
            <TableHead>Number</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Currency</TableHead>
            <TableHead className="text-right">Ledger</TableHead>
            <TableHead className="text-right">Available</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((a) => (
            <TableRow key={a.id}>
              <TableCell>
                <CopyableUuid value={a.id} href={`/accounts/${a.id}`} />
              </TableCell>
              <TableCell className="font-mono text-xs">{a.accountNumber}</TableCell>
              <TableCell>{a.productType}</TableCell>
              <TableCell>
                <StatusBadge status={a.status} />
              </TableCell>
              <TableCell>{a.currency}</TableCell>
              <TableCell className="text-right text-sm">
                {formatMoney(a.ledgerBalance, a.currency)}
              </TableCell>
              <TableCell className="text-right text-sm">
                {formatMoney(a.availableBalance, a.currency)}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="link" className="h-auto p-0" asChild>
                  <Link href={`/accounts/${a.id}`}>Open</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
