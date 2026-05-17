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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/data/status-badge";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";
import { accountsApi } from "@/lib/api/modules/accounts";
import { Permissions } from "@/lib/rbac/permissions";

function formatMoney(v: string | number | undefined, currency: string): string {
  if (v === undefined || v === null) return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(n)) return String(v);
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);
}

export default function AccountHoldsPage() {
  return (
    <RouteGuard permissions={[Permissions.AccountRead]}>
      <AccountHoldsContent />
    </RouteGuard>
  );
}

function AccountHoldsContent() {
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
    queryKey: ["accounts", id, "holds"],
    queryFn: () => accountsApi.listHolds(id),
    enabled: Boolean(id),
  });

  const total = useQuery({
    queryKey: ["accounts", id, "holds-total"],
    queryFn: () => accountsApi.getTotalHoldAmount(id),
    enabled: Boolean(id),
  });

  const [amount, setAmount] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [expiresAt, setExpiresAt] = React.useState("");

  const invalidateHolds = () => {
    qc.invalidateQueries({ queryKey: ["accounts", id, "holds"] });
    qc.invalidateQueries({ queryKey: ["accounts", id, "holds-total"] });
    qc.invalidateQueries({ queryKey: ["accounts", "detail", id] });
    qc.invalidateQueries({ queryKey: ["accounts", id, "balance"] });
  };

  const place = useMutation({
    mutationFn: () =>
      accountsApi.placeHold(id, {
        amount: Number(amount),
        currency: (detail.data?.currency ?? "USD").toUpperCase(),
        reason: reason.trim(),
        expiresAt: expiresAt.trim() || undefined,
      }),
    onSuccess: () => {
      invalidateHolds();
      toast({ title: "Hold placed" });
      setAmount("");
      setReason("");
      setExpiresAt("");
    },
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "Could not place hold",
        description: describeApiError(e),
      }),
  });

  const release = useMutation({
    mutationFn: (holdId: string) => accountsApi.releaseHold(holdId),
    onSuccess: () => {
      invalidateHolds();
      toast({ title: "Hold released" });
    },
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "Release failed",
        description: describeApiError(e),
      }),
  });

  const settle = useMutation({
    mutationFn: (holdId: string) => accountsApi.settleHold(holdId),
    onSuccess: () => {
      invalidateHolds();
      toast({ title: "Hold settled" });
    },
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "Settle failed",
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
    return <EmptyState title="Could not load holds" description={describeApiError(list.error)} />;
  }

  const ccy = detail.data?.currency ?? "USD";
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
        title="Holds"
        description={`Place, release, or settle administrative holds on posted funds for this account.`}
      />

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Total amount held</CardTitle>
          <CardDescription>See the rolled-up amount still under hold right now.</CardDescription>
        </CardHeader>
        <CardContent>
          {total.isLoading ? (
            <span className="text-sm text-muted-foreground">Loading…</span>
          ) : total.isError ? (
            <span className="text-sm text-destructive">{describeApiError(total.error)}</span>
          ) : (
            <p className="text-2xl font-semibold">
              {formatMoney(total.data?.totalHoldAmount, ccy)}
            </p>
          )}
        </CardContent>
      </Card>

      <Can permissions={[Permissions.AccountWrite]}>
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Place hold</CardTitle>
            <CardDescription>Block funds with amount, currency, narrative, optional auto-expiry.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-1.5">
              <Label htmlFor="hold-amt">Amount</Label>
              <Input
                id="hold-amt"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="hold-reason">Reason</Label>
              <Input id="hold-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="hold-exp">Expires (optional, datetime local)</Label>
              <Input
                id="hold-exp"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
            <Button
              type="button"
              disabled={
                place.isPending ||
                reason.trim() === "" ||
                amount.trim() === "" ||
                Number.isNaN(Number(amount))
              }
              onClick={() => place.mutate()}
            >
              {place.isPending ? "Placing…" : "Place hold"}
            </Button>
          </CardContent>
        </Card>
      </Can>

      <Card>
        <CardHeader>
          <CardTitle>Active and recent holds</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No holds.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>
                      <StatusBadge status={h.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {formatMoney(h.amount, h.currency ?? ccy)}
                    </TableCell>
                    <TableCell className="max-w-[12rem] truncate text-xs">{h.reason}</TableCell>
                    <TableCell className="text-xs">{h.expiresAt ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {h.status === "ACTIVE" ? (
                        <Can permissions={[Permissions.AccountWrite]}>
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={release.isPending}
                              onClick={() => release.mutate(h.id)}
                            >
                              Release
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={settle.isPending}
                              onClick={() => settle.mutate(h.id)}
                              title="Mark hold as settled (consumed by transaction)"
                            >
                              Settle
                            </Button>
                          </div>
                        </Can>
                      ) : null}
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
