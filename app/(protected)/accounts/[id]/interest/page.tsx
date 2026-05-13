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
import { DateInput } from "@/components/ui/date-input";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";
import { accountsApi, type InterestRateType } from "@/lib/api/modules/accounts";
import { useAuthStore } from "@/lib/auth/auth-store";
import { Permissions } from "@/lib/rbac/permissions";

function formatMoney(v: string | number | undefined, currency: string): string {
  if (v === undefined || v === null) return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(n)) return String(v);
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);
}

function defaultFromDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function defaultToDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AccountInterestPage() {
  return (
    <RouteGuard permissions={[Permissions.AccountRead]}>
      <AccountInterestContent />
    </RouteGuard>
  );
}

function AccountInterestContent() {
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

  const [rateType, setRateType] = React.useState<InterestRateType>("CREDIT");
  const current = useQuery({
    queryKey: ["accounts", id, "interest-current", rateType],
    queryFn: () => accountsApi.getCurrentRate(id, rateType),
    enabled: Boolean(id),
    retry: false,
  });

  const [newRate, setNewRate] = React.useState("");
  const [effectiveFromDate, setEffectiveFromDate] = React.useState(defaultToDate());
  const [effectiveFromTime, setEffectiveFromTime] = React.useState("00:00");
  const [setRateTypeDraft, setSetRateTypeDraft] = React.useState<InterestRateType>("CREDIT");

  const save = useMutation({
    mutationFn: () =>
      accountsApi.setInterestRate(id, {
        rateType: setRateTypeDraft,
        annualPercentageRate: Number(newRate),
        effectiveFrom: `${effectiveFromDate}T${effectiveFromTime}:00`,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts", id, "interest-current"] });
      toast({ title: "Rate set" });
      setNewRate("");
    },
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "Could not set rate",
        description: describeApiError(e),
      }),
  });

  const [calcFrom, setCalcFrom] = React.useState(defaultFromDate());
  const [calcTo, setCalcTo] = React.useState(defaultToDate());

  const calculate = useMutation({
    mutationFn: () => accountsApi.calculateAccruedInterest(id, calcFrom, calcTo),
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "Calculation failed",
        description: describeApiError(e),
      }),
  });

  const [postAmount, setPostAmount] = React.useState("");
  const [postDate, setPostDate] = React.useState(defaultToDate());
  const [postedBy, setPostedBy] = React.useState(username);
  React.useEffect(() => {
    setPostedBy(username);
  }, [username]);

  const post = useMutation({
    mutationFn: () =>
      accountsApi.postAccruedInterest(id, Number(postAmount), postDate, postedBy.trim() || username),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts", id, "transactions"] });
      qc.invalidateQueries({ queryKey: ["accounts", "detail", id] });
      qc.invalidateQueries({ queryKey: ["accounts", id, "balance"] });
      toast({ title: "Interest posted" });
      setPostAmount("");
    },
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "Posting failed",
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
        title="Interest"
        description={`Configure rates, calculate accrual, and post interest — /api/v1/accounts/${id}/interest`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Current rate</CardTitle>
          <CardDescription>GET /interest/rates/current?rateType=…</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1.5">
            <Label>Rate type</Label>
            <Select value={rateType} onValueChange={(v) => setRateType(v as InterestRateType)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CREDIT">CREDIT (paid to customer)</SelectItem>
                <SelectItem value="DEBIT">DEBIT (charged on overdraft)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {current.isLoading ? (
            <span className="text-sm text-muted-foreground">Loading…</span>
          ) : current.isError ? (
            <span className="text-sm text-muted-foreground">No active rate configured.</span>
          ) : current.data ? (
            <div className="text-sm">
              <p>
                APR <strong>{Number(current.data.annualPercentageRate).toFixed(4)}%</strong> ({current.data.rateType})
              </p>
              <p className="text-xs text-muted-foreground">
                Effective from {current.data.effectiveFrom}
                {current.data.effectiveUntil ? ` until ${current.data.effectiveUntil}` : ""}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Can permissions={[Permissions.AccountWrite]}>
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Set rate</CardTitle>
            <CardDescription>POST /interest/rates — supersedes any earlier rate.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Rate type</Label>
              <Select
                value={setRateTypeDraft}
                onValueChange={(v) => setSetRateTypeDraft(v as InterestRateType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CREDIT">CREDIT</SelectItem>
                  <SelectItem value="DEBIT">DEBIT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ir-apr">Annual percentage (e.g. 5.25)</Label>
              <Input
                id="ir-apr"
                inputMode="decimal"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ir-date">Effective date</Label>
              <DateInput
                id="ir-date"
                value={effectiveFromDate}
                onChange={setEffectiveFromDate}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ir-time">Effective time</Label>
              <Input
                id="ir-time"
                type="time"
                value={effectiveFromTime}
                onChange={(e) => setEffectiveFromTime(e.target.value)}
              />
            </div>
            <div className="flex items-end sm:col-span-2">
              <Button
                type="button"
                disabled={
                  save.isPending ||
                  newRate.trim() === "" ||
                  Number.isNaN(Number(newRate)) ||
                  !effectiveFromDate
                }
                onClick={() => save.mutate()}
              >
                {save.isPending ? "Saving…" : "Set rate"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </Can>

      <Card>
        <CardHeader>
          <CardTitle>Calculate accrued interest</CardTitle>
          <CardDescription>GET /interest/calculate?fromDate=&toDate=</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="cc-from">From</Label>
            <DateInput id="cc-from" value={calcFrom} onChange={setCalcFrom} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cc-to">To</Label>
            <DateInput id="cc-to" value={calcTo} onChange={setCalcTo} />
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={calculate.isPending || !calcFrom || !calcTo}
            onClick={() => calculate.mutate()}
          >
            {calculate.isPending ? "Calculating…" : "Calculate"}
          </Button>
          {calculate.data ? (
            <p className="text-sm">
              Accrued: <strong>{formatMoney(calculate.data.accruedInterest, ccy)}</strong>
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Can permissions={[Permissions.AccountWrite]}>
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Post interest</CardTitle>
            <CardDescription>
              POST /interest/post — books an interest movement onto the account.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="pi-amt">Amount</Label>
              <Input
                id="pi-amt"
                inputMode="decimal"
                value={postAmount}
                onChange={(e) => setPostAmount(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pi-date">Posting date</Label>
              <DateInput id="pi-date" value={postDate} onChange={setPostDate} />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="pi-by">Posted by</Label>
              <Input id="pi-by" value={postedBy} onChange={(e) => setPostedBy(e.target.value)} />
            </div>
            <div className="flex items-end sm:col-span-2">
              <Button
                type="button"
                disabled={
                  post.isPending ||
                  postAmount.trim() === "" ||
                  Number.isNaN(Number(postAmount)) ||
                  !postDate
                }
                onClick={() => post.mutate()}
              >
                {post.isPending ? "Posting…" : "Post interest"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </Can>
    </div>
  );
}
