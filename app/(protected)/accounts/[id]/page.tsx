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
import { StatusBadge } from "@/components/data/status-badge";
import { ConfirmAction } from "@/components/data/confirm-action";
import { AccountServicingLinks } from "@/components/accounts/account-servicing-links";
import { CustomerPartySummaryBlock } from "@/components/customers/customer-party-link";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";
import { accountsApi, type AccountStatus } from "@/lib/api/modules/accounts";
import { useAuthStore } from "@/lib/auth/auth-store";
import { Permissions } from "@/lib/rbac/permissions";

const STATUSES: AccountStatus[] = ["ACTIVE", "SUSPENDED", "FROZEN", "DORMANT", "CLOSED"];

function formatMoney(v: string | number | undefined, currency: string): string {
  if (v === undefined || v === null) return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(n)) return String(v);
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);
}

export default function AccountDetailPage() {
  return (
    <RouteGuard permissions={[Permissions.AccountRead]}>
      <AccountDetailContent />
    </RouteGuard>
  );
}

function AccountDetailContent() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const qc = useQueryClient();
  const { toast } = useToast();
  const username = useAuthStore((s) => s.session?.user.username ?? "operator");

  const detail = useQuery({
    queryKey: ["accounts", "detail", id],
    queryFn: () => accountsApi.get(id),
    enabled: Boolean(id),
  });

  const [statusDraft, setStatusDraft] = React.useState<AccountStatus>("ACTIVE");
  const [statusReason, setStatusReason] = React.useState("");
  const [changedBy, setChangedBy] = React.useState(username);
  const [closeOpen, setCloseOpen] = React.useState(false);
  const [txnAmount, setTxnAmount] = React.useState("");

  React.useEffect(() => {
    setChangedBy(username);
  }, [username]);

  React.useEffect(() => {
    const a = detail.data;
    if (!a) return;
    setStatusDraft(a.status);
  }, [detail.data]);

  const saveStatus = useMutation({
    mutationFn: () =>
      accountsApi.updateStatus(id, {
        newStatus: statusDraft,
        reason: statusReason.trim() || "Status update",
        changedBy: changedBy.trim() || username,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts", "detail", id] });
      qc.invalidateQueries({ queryKey: ["accounts", "search"] });
      toast({ title: "Status updated" });
      setStatusReason("");
    },
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "Update failed",
        description: describeApiError(e),
      }),
  });

  const closeAccount = useMutation({
    mutationFn: (reason: string) => accountsApi.close(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts", "detail", id] });
      qc.invalidateQueries({ queryKey: ["accounts", "search"] });
      toast({ title: "Account closed" });
    },
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "Close failed",
        description: describeApiError(e),
      }),
  });

  const validateTxn = useMutation({
    mutationFn: () => accountsApi.validateForTransaction(id, Number(txnAmount)),
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "Validation failed",
        description: describeApiError(e),
      }),
  });

  if (!id) {
    return <EmptyState title="Missing account id" description="Open an account from the directory." />;
  }

  if (detail.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (detail.isError || !detail.data) {
    return (
      <EmptyState
        title="Could not load account"
        description={detail.isError ? describeApiError(detail.error) : "Unknown error."}
      />
    );
  }

  const a = detail.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/accounts/directory">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Directory
          </Link>
        </Button>
      </div>

      <PageHeader
        title={a.displayName ?? a.accountNumber}
        description={`${a.productType} · ${a.currency} — backend id ${a.id}`}
      />

      <AccountServicingLinks accountId={id} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>Core fields from GET /api/v1/accounts/{"{"}id{"}"}.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Number</span>{" "}
              <span className="font-mono">{a.accountNumber}</span>
            </p>
            {a.iban ? (
              <p>
                <span className="text-muted-foreground">IBAN</span>{" "}
                <span className="font-mono text-xs">{a.iban}</span>
              </p>
            ) : null}
            <div className="space-y-2">
              <p className="text-muted-foreground">Primary holder</p>
              <CustomerPartySummaryBlock profileUserId={a.primaryUserProfileId} />
              <p className="text-xs text-muted-foreground">
                Joint holders and other parties:{" "}
                <Link className="text-primary underline" href={`/accounts/${id}/relationships`}>
                  Relationships
                </Link>
              </p>
            </div>
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">Status</span>
              <StatusBadge status={a.status} />
            </p>
            <p>
              <span className="text-muted-foreground">Ledger</span>{" "}
              {formatMoney(a.ledgerBalance, a.currency)}
            </p>
            <p>
              <span className="text-muted-foreground">Available</span>{" "}
              {formatMoney(a.availableBalance, a.currency)}
            </p>
          </CardContent>
        </Card>

        <Can permissions={[Permissions.AccountWrite]}>
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
              <CardDescription>PATCH /api/v1/accounts/{"{"}id{"}"}/status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-1.5">
                <Label>New status</Label>
                <Select value={statusDraft} onValueChange={(v) => setStatusDraft(v as AccountStatus)}>
                  <SelectTrigger>
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
              <div className="grid gap-1.5">
                <Label htmlFor="st-reason">Reason</Label>
                <Input
                  id="st-reason"
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="Regulatory hold, customer request…"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="st-by">Changed by</Label>
                <Input id="st-by" value={changedBy} onChange={(e) => setChangedBy(e.target.value)} />
              </div>
              <Button
                type="button"
                disabled={saveStatus.isPending}
                onClick={() => saveStatus.mutate()}
              >
                {saveStatus.isPending ? "Saving…" : "Apply status"}
              </Button>
              <div className="pt-2">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={a.status === "CLOSED"}
                  onClick={() => setCloseOpen(true)}
                >
                  Close account
                </Button>
              </div>
            </CardContent>
          </Card>
        </Can>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction validation</CardTitle>
          <CardDescription>POST /api/v1/accounts/{"{"}id{"}"}/validate?amount=…</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="grid min-w-[8rem] gap-1.5">
            <Label htmlFor="tv-amt">Amount</Label>
            <Input
              id="tv-amt"
              inputMode="decimal"
              value={txnAmount}
              onChange={(e) => setTxnAmount(e.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={validateTxn.isPending || txnAmount.trim() === "" || Number.isNaN(Number(txnAmount))}
            onClick={() => validateTxn.mutate()}
          >
            {validateTxn.isPending ? "Checking…" : "Run check"}
          </Button>
          {validateTxn.data ? (
            <div className="w-full text-sm">
              <p className={validateTxn.data.valid ? "text-emerald-600" : "text-destructive"}>
                {validateTxn.data.valid ? "Eligible" : "Not eligible"}
              </p>
              {validateTxn.data.message ? (
                <p className="text-muted-foreground">{validateTxn.data.message}</p>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <ConfirmAction
        open={closeOpen}
        onOpenChange={setCloseOpen}
        title="Close this account?"
        description="This invokes DELETE /api/v1/accounts/{id} with a required reason. Ensure back-office policy allows closure from the portal."
        confirmLabel="Close account"
        destructive
        reasonRequired
        reasonLabel="Closure reason"
        onConfirm={async (reason) => {
          await closeAccount.mutateAsync(reason.trim());
        }}
      />
    </div>
  );
}
