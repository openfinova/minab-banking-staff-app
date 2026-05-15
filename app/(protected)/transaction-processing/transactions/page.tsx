"use client";

import * as React from "react";
import Link from "next/link";
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
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";
import {
  transactionsApi,
  type InitiateTransactionRequest,
} from "@/lib/api/modules/transaction-processing";
import { useAuthStore } from "@/lib/auth/auth-store";
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

export default function TpTransactionsPage() {
  return (
    <RouteGuard permissions={[Permissions.TransactionRead]}>
      <TpTransactionsContent />
    </RouteGuard>
  );
}

function TpTransactionsContent() {
  const username = useAuthStore((s) => s.session?.user.username ?? "operator");
  const [page, setPage] = React.useState(0);
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
    setPage(0);
  }, [accountId, status, transactionType, fromDate, toDate, currency, reference, minAmount, maxAmount]);

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
    ],
    queryFn: () =>
      transactionsApi.list({
        page,
        size: 20,
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="TP transactions"
        description="GET /api/v1/transactions — search and drill into lifecycle, history, and refunds."
        actions={
          <Can permissions={[Permissions.PaymentInitiate]}>
            <InitiateDialog
              defaultCreatedBy={username}
              onSuccess={() => {
                void list.refetch();
              }}
            />
          </Can>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Optional query parameters for the search endpoint.</CardDescription>
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
            <Label>Status</Label>
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
            <Label>Type</Label>
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
          <div className="space-y-1.5">
            <Label>From date</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>To date</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <Input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="USD" />
          </div>
          <div className="space-y-1.5">
            <Label>Reference contains</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Substring" />
          </div>
          <div className="space-y-1.5">
            <Label>Min amount</Label>
            <Input value={minAmount} onChange={(e) => setMinAmount(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Max amount</Label>
            <Input value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
          <CardDescription>
            {list.data?.totalElements != null ? `${list.data.totalElements} total` : null}
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
                    <TableHead>Id</TableHead>
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
                      <TableCell className="font-mono text-xs">
                        {row.id ? (
                          <Link
                            className="text-primary underline"
                            href={`/transaction-processing/transactions/${row.id}`}
                          >
                            {row.id.slice(0, 8)}…
                          </Link>
                        ) : (
                          "—"
                        )}
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

function InitiateDialog({
  defaultCreatedBy,
  onSuccess,
}: {
  defaultCreatedBy: string;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [idempotencyKey, setIdempotencyKey] = React.useState("");
  const [transactionType, setTxnType] = React.useState<string>("P2P");
  const [amount, setAmount] = React.useState("");
  const [currency, setCurrency] = React.useState("USD");
  const [createdBy, setCreatedBy] = React.useState(defaultCreatedBy);
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
        createdBy: createdBy.trim() || defaultCreatedBy,
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
          <div className="space-y-1.5">
            <Label>Created by</Label>
            <Input value={createdBy} onChange={(e) => setCreatedBy(e.target.value)} />
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
