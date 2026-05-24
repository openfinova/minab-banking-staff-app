"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AccountResolveField } from "@/components/accounts/account-resolve-field";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Can } from "@/components/rbac/can";
import { StatusBadge } from "@/components/data/status-badge";
import { CopyableUuid } from "@/components/data/copyable-uuid";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";
import {
  transactionsApi,
  type InitiateTransactionRequest,
} from "@/lib/api/modules/transaction-processing";
import { Permissions } from "@/lib/rbac/permissions";

const TRANSACTION_TYPES = [
  "P2P",
  "TRANSFER",
  "CASH_IN",
  "DEPOSIT",
  "CASH_OUT",
  "BILL_PAYMENT",
  "MERCHANT_PURCHASE",
  "REFUND",
] as const;

const STATUSES = [
  "INITIATED",
  "PENDING_RESERVATION",
  "AUTHORIZED",
  "POSTED",
  "FAILED",
  "REVERSED",
] as const;

const FILTER_STORAGE = "minab-tp-tx-filters-v1";

interface SavedTxFilters {
  accountId?: string;
  status?: string;
  transactionType?: string;
  fromDate?: string;
  toDate?: string;
  currency?: string;
  reference?: string;
  minAmount?: string;
  maxAmount?: string;
  pageSize?: number;
}

function loadSavedTxFilters(): SavedTxFilters | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(FILTER_STORAGE);
    if (!raw) return null;
    return JSON.parse(raw) as SavedTxFilters;
  } catch {
    return null;
  }
}

function persistTxFilters(state: SavedTxFilters) {
  try {
    window.localStorage.setItem(FILTER_STORAGE, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export default function TpTransactionsPage() {
  return (
    <RouteGuard permissions={[Permissions.TransactionRead]}>
      <TpTransactionsContent />
    </RouteGuard>
  );
}

function TpTransactionsContent() {
  const [page, setPage] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(20);
  const [accountId, setAccountId] = React.useState("");
  const [status, setStatus] = React.useState<string | undefined>();
  const [transactionType, setTransactionType] = React.useState<string | undefined>();
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");
  const [currency, setCurrency] = React.useState("");
  const [reference, setReference] = React.useState("");
  const [minAmount, setMinAmount] = React.useState("");
  const [maxAmount, setMaxAmount] = React.useState("");

  React.useEffect(() => {
    const saved = loadSavedTxFilters();
    if (!saved) return;
    if (saved.pageSize != null) setPageSize(saved.pageSize);
    if (saved.accountId != null) setAccountId(saved.accountId);
    if ("status" in saved) setStatus(saved.status);
    if ("transactionType" in saved) setTransactionType(saved.transactionType);
    if (saved.fromDate != null) setFromDate(saved.fromDate);
    if (saved.toDate != null) setToDate(saved.toDate);
    if (saved.currency != null) setCurrency(saved.currency);
    if (saved.reference != null) setReference(saved.reference);
    if (saved.minAmount != null) setMinAmount(saved.minAmount);
    if (saved.maxAmount != null) setMaxAmount(saved.maxAmount);
  }, []);

  const saveFilters = React.useCallback(() => {
    persistTxFilters({
      pageSize,
      accountId,
      status,
      transactionType,
      fromDate,
      toDate,
      currency,
      reference,
      minAmount,
      maxAmount,
    });
  }, [
    accountId,
    currency,
    fromDate,
    maxAmount,
    minAmount,
    pageSize,
    reference,
    status,
    toDate,
    transactionType,
  ]);

  React.useEffect(() => {
    setPage(0);
  }, [accountId, status, transactionType, fromDate, toDate, currency, reference, minAmount, maxAmount, pageSize]);

  const list = useQuery({
    queryKey: [
      "tp-transactions",
      page,
      accountId,
      status,
      transactionType,
      fromDate,
      toDate,
      currency,
      reference,
      minAmount,
      maxAmount,
      pageSize,
    ],
    queryFn: () =>
      transactionsApi.list({
        page,
        size: pageSize,
        sort: "createdAt,desc",
        accountId: accountId.trim() || undefined,
        status,
        transactionType,
        fromDate: fromDate.trim() || undefined,
        toDate: toDate.trim() || undefined,
        currency: currency.trim() || undefined,
        reference: reference.trim() || undefined,
        minAmount: minAmount.trim() ? Number(minAmount) : undefined,
        maxAmount: maxAmount.trim() ? Number(maxAmount) : undefined,
      }),
  });

  const pageAmountSummary = React.useMemo(() => {
    const rows = list.data?.content ?? [];
    const totals = new Map<string, number>();
    for (const r of rows) {
      const amt = r.amount != null ? Number(r.amount) : NaN;
      if (Number.isNaN(amt)) continue;
      const ccy = (r.currency ?? "—").toString().trim() || "—";
      totals.set(ccy, (totals.get(ccy) ?? 0) + amt);
    }
    if (!totals.size) return null as string | null;
    return Array.from(totals.entries())
      .map(
        ([ccy, sum]) =>
          `${ccy} ${sum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      )
      .join(" · ");
  }, [list.data?.content]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment search"
        description="Narrow down journal candidates for investigations, reversals, or customer callbacks. Saved views stay on this workstation only."
        actions={
          <Can permissions={[Permissions.PaymentInitiate]}>
            <InitiateDialog
              onSuccess={() => {
                void list.refetch();
              }}
            />
          </Can>
        }
      />

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <CardTitle>Filters</CardTitle>
            <CardDescription>
              Map filters to the story you are researching — debits in a corridor, a rail currency, or a booking
              reference fragment.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={saveFilters}>
              Save filter set
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const next = loadSavedTxFilters();
                if (!next) return;
                if (next.pageSize != null) setPageSize(next.pageSize);
                setAccountId(next.accountId ?? "");
                setStatus(next.status);
                setTransactionType(next.transactionType);
                setFromDate(next.fromDate ?? "");
                setToDate(next.toDate ?? "");
                setCurrency(next.currency ?? "");
                setReference(next.reference ?? "");
                setMinAmount(next.minAmount ?? "");
                setMaxAmount(next.maxAmount ?? "");
              }}
            >
              Reload saved
            </Button>
            <div className="grid gap-1.5">
              <Label className="text-xs">Rows / page</Label>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => setPageSize(Number(v))}
              >
                <SelectTrigger className="h-9 w-[5.5rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 50, 100].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5 md:col-span-2 lg:col-span-3">
            <AccountResolveField
              instanceId="tp-tx-filters"
              label="Account"
              value={accountId}
              onChange={(id) => setAccountId(id)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Lifecycle status</Label>
            <Select
              value={status ?? "__any__"}
              onValueChange={(v) => setStatus(v === "__any__" ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__any__">Any</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Payment type</Label>
            <Select
              value={transactionType ?? "__any__"}
              onValueChange={(v) => setTransactionType(v === "__any__" ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__any__">Any</SelectItem>
                {TRANSACTION_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <DateRangeFilter
              startDate={fromDate}
              endDate={toDate}
              startLabel="From date"
              endLabel="To date"
              onChange={({ startDate, endDate }) => {
                setFromDate(startDate);
                setToDate(endDate);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Settlement currency (ISO)</Label>
            <Input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="EUR" />
          </div>
          <div className="space-y-1.5">
            <Label>Booking reference contains</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Substring" />
          </div>
          <div className="space-y-1.5">
            <Label>Minimum amount (inclusive)</Label>
            <Input value={minAmount} onChange={(e) => setMinAmount(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Maximum amount (inclusive)</Label>
            <Input value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
          <CardDescription>
            {list.data?.totalElements != null ? (
              <span>
                {list.data.totalElements.toLocaleString()} match
                {list.data.totalElements === 1 ? "" : "es"}
                {pageAmountSummary ? (
                  <span className="block text-foreground">
                    This page total: {pageAmountSummary}
                  </span>
                ) : null}
              </span>
            ) : (
              "Adjust filters to search."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {list.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : list.data?.content?.length ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>UUID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.data.content.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <CopyableUuid
                          value={row.id}
                          href={`/transaction-processing/transactions/${row.id}`}
                        />
                      </TableCell>
                      <TableCell>{row.type}</TableCell>
                      <TableCell>
                        <StatusBadge status={row.status ?? ""} />
                      </TableCell>
                      <TableCell>{row.amount != null ? String(row.amount) : "—"}</TableCell>
                      <TableCell>{row.currency}</TableCell>
                      <TableCell className="font-mono text-xs">{row.createdAt ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={page <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {(list.data.number ?? page) + 1} of {list.data.totalPages ?? 1}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  disabled={list.data.last ?? true}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </>
          ) : (
            <EmptyState title="No transactions" description="Adjust filters or initiate a new transaction." />
          )}
          {list.isError ? (
            <p className="mt-2 text-sm text-destructive">{describeApiError(list.error)}</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function InitiateDialog({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [idempotencyKey, setIdempotencyKey] = React.useState("");
  const [transactionType, setTxnType] = React.useState<string>("P2P");
  const [amount, setAmount] = React.useState("");
  const [currency, setCurrency] = React.useState("EUR");
  const [sourceAccountId, setSource] = React.useState("");
  const [destinationAccountId, setDest] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [pending, setPending] = React.useState(false);

  const submit = async () => {
    setPending(true);
    try {
      const body: InitiateTransactionRequest = {
        idempotencyKey: idempotencyKey.trim() || `ui-${crypto.randomUUID()}`,
        transactionType,
        amount: Number(amount),
        currency: currency.trim().toUpperCase(),
        description: description.trim() || undefined,
        sourceAccountId: sourceAccountId.trim() || undefined,
        destinationAccountId: destinationAccountId.trim() || undefined,
      };
      await transactionsApi.initiate(body);
      toast({ title: "Transaction initiated" });
      setOpen(false);
      onSuccess();
      setIdempotencyKey("");
      setAmount("");
      setSource("");
      setDest("");
    } catch (e) {
      toast({ variant: "destructive", title: "Failed", description: describeApiError(e) });
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Initiate
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Initiate transaction</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label>Idempotency key</Label>
            <Input
              value={idempotencyKey}
              onChange={(e) => setIdempotencyKey(e.target.value)}
              placeholder="Auto if empty"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={transactionType} onValueChange={setTxnType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRANSACTION_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value)} />
            </div>
          </div>
          <AccountResolveField
            instanceId="tp-init-src"
            label="Source account"
            value={sourceAccountId}
            onChange={(id) => setSource(id)}
            compact
            showSuccessToast={false}
          />
          <AccountResolveField
            instanceId="tp-init-dst"
            label="Destination account"
            value={destinationAccountId}
            onChange={(id) => setDest(id)}
            compact
            showSuccessToast={false}
          />
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <Button type="button" disabled={pending || !amount} onClick={() => void submit()}>
            Submit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
