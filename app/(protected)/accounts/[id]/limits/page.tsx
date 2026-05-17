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
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";
import { accountsApi, type LimitPeriod, type LimitType } from "@/lib/api/modules/accounts";
import { Permissions } from "@/lib/rbac/permissions";

const LIMIT_TYPES: LimitType[] = [
  "DAILY_TRANSACTION",
  "WEEKLY_TRANSACTION",
  "MONTHLY_TRANSACTION",
  "ANNUAL_TRANSACTION",
  "MAXIMUM_BALANCE",
  "MINIMUM_BALANCE",
  "OVERDRAFT_LIMIT",
  "WITHDRAWAL_LIMIT",
  "TRANSFER_LIMIT",
  "VELOCITY_LIMIT",
];

const LIMIT_PERIODS: LimitPeriod[] = ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "ANNUAL", "LIFETIME"];

function formatMoney(v: string | number | undefined, currency: string): string {
  if (v === undefined || v === null) return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(n)) return String(v);
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);
}

export default function AccountLimitsPage() {
  return (
    <RouteGuard permissions={[Permissions.AccountRead]}>
      <AccountLimitsContent />
    </RouteGuard>
  );
}

function AccountLimitsContent() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const qc = useQueryClient();
  const { toast } = useToast();

  const detail = useQuery({
    queryKey: ["accounts", "detail", id],
    queryFn: () => accountsApi.get(id),
    enabled: Boolean(id),
  });

  const list = useQuery({
    queryKey: ["accounts", id, "limits"],
    queryFn: () => accountsApi.listLimits(id),
    enabled: Boolean(id),
  });

  const [limitType, setLimitType] = React.useState<LimitType>("DAILY_TRANSACTION");
  const [limitPeriod, setLimitPeriod] = React.useState<LimitPeriod>("DAILY");
  const [maxAmount, setMaxAmount] = React.useState("");
  const [maxCount, setMaxCount] = React.useState("");

  const [checkType, setCheckType] = React.useState<LimitType>("DAILY_TRANSACTION");
  const [checkAmount, setCheckAmount] = React.useState("");

  const add = useMutation({
    mutationFn: () =>
      accountsApi.addLimit(id, {
        limitType,
        limitPeriod,
        maxAmount: maxAmount.trim() ? Number(maxAmount) : undefined,
        maxCount: maxCount.trim() ? Number(maxCount) : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts", id, "limits"] });
      toast({ title: "Limit added" });
      setMaxAmount("");
      setMaxCount("");
    },
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "Add failed",
        description: describeApiError(e),
      }),
  });

  const remove = useMutation({
    mutationFn: (p: { limitId: string }) => accountsApi.removeLimit(p.limitId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts", id, "limits"] });
      toast({ title: "Limit removed" });
    },
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "Remove failed",
        description: describeApiError(e),
      }),
  });

  const check = useMutation({
    mutationFn: () => accountsApi.checkLimit(id, checkType, Number(checkAmount)),
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "Check failed",
        description: describeApiError(e),
      }),
  });

  if (!id) {
    return <EmptyState title="Missing account id" />;
  }

  if (list.isLoading || detail.isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (list.isError) {
    return <EmptyState title="Could not load limits" description={describeApiError(list.error)} />;
  }

  const ccy = detail.data?.currency ?? "EUR";
  const rows = list.data ?? [];

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/accounts/${id}`}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Account
        </Link>
      </Button>

      <PageHeader
        title="Limits"
        description="Cash-flow and velocity guardrails — test debits before they post and tune caps for this account."
      />

      <Card>
        <CardHeader>
          <CardTitle>Check limit</CardTitle>
          <CardDescription>Simulate a debit and see whether configured limits would block it.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1.5">
            <Label>Type</Label>
            <Select value={checkType} onValueChange={(v) => setCheckType(v as LimitType)}>
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LIMIT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid min-w-[8rem] gap-1.5">
            <Label htmlFor="chk-amt">Amount</Label>
            <Input
              id="chk-amt"
              inputMode="decimal"
              value={checkAmount}
              onChange={(e) => setCheckAmount(e.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={check.isPending || checkAmount.trim() === "" || Number.isNaN(Number(checkAmount))}
            onClick={() => check.mutate()}
          >
            {check.isPending ? "Checking…" : "Run check"}
          </Button>
          {check.data ? (
            <p className={`text-sm ${check.data.valid ? "text-emerald-600" : "text-destructive"}`}>
              {check.data.valid ? "Within limit" : "Violates limit"}
              {check.data.message ? ` — ${check.data.message}` : ""}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Can permissions={[Permissions.AccountWrite]}>
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Add limit</CardTitle>
            <CardDescription>Add or adjust limit rows (type, period, amount, currency).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-1.5">
              <Label>Limit type</Label>
              <Select value={limitType} onValueChange={(v) => setLimitType(v as LimitType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LIMIT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Period</Label>
              <Select value={limitPeriod} onValueChange={(v) => setLimitPeriod(v as LimitPeriod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LIMIT_PERIODS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lmx-amt">Max amount (optional)</Label>
              <Input
                id="lmx-amt"
                inputMode="decimal"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lmx-ct">Max count (optional)</Label>
              <Input
                id="lmx-ct"
                inputMode="numeric"
                value={maxCount}
                onChange={(e) => setMaxCount(e.target.value)}
              />
            </div>
            <Button
              type="button"
              disabled={add.isPending}
              onClick={() => add.mutate()}
            >
              {add.isPending ? "Adding…" : "Add limit"}
            </Button>
          </CardContent>
        </Card>
      </Can>

      <Card>
        <CardHeader>
          <CardTitle>Configured limits</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No limits.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Max amount</TableHead>
                  <TableHead className="text-right">Max count</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.limitType}</TableCell>
                    <TableCell>{r.limitPeriod}</TableCell>
                    <TableCell className="text-right">{formatMoney(r.maxAmount, ccy)}</TableCell>
                    <TableCell className="text-right">{r.maxCount ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Can permissions={[Permissions.AccountWrite]}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          disabled={remove.isPending}
                          onClick={() =>
                            remove.mutate({ limitId: r.id })
                          }
                        >
                          Remove
                        </Button>
                      </Can>
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
