"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CopyableUuid } from "@/components/data/copyable-uuid";
import { StatusBadge } from "@/components/data/status-badge";
import { ConfirmAction } from "@/components/data/confirm-action";
import { Can } from "@/components/rbac/can";
import { RouteGuard } from "@/components/rbac/route-guard";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";
import { transactionsApi } from "@/lib/api/modules/transaction-processing";
import { Permissions } from "@/lib/rbac/permissions";
import { formatDateTime } from "@/lib/utils";

export default function TpTransactionDetailPage() {
  return (
    <RouteGuard permissions={[Permissions.TransactionRead]}>
      <TpTransactionDetailContent />
    </RouteGuard>
  );
}

function TpTransactionDetailContent() {
  const params = useParams();
  const id = String(params.id ?? "");
  const { toast } = useToast();
  const qc = useQueryClient();

  const [fullRefundOpen, setFullRefundOpen] = React.useState(false);

  const detail = useQuery({
    queryKey: ["tp-transaction", id],
    queryFn: () => transactionsApi.get(id),
    enabled: Boolean(id),
  });
  const status = useQuery({
    queryKey: ["tp-transaction-status", id],
    queryFn: () => transactionsApi.status(id),
    enabled: Boolean(id),
  });
  const history = useQuery({
    queryKey: ["tp-transaction-history", id],
    queryFn: () => transactionsApi.history(id),
    enabled: Boolean(id),
  });
  const refunds = useQuery({
    queryKey: ["tp-transaction-refunds", id],
    queryFn: () => transactionsApi.refunds(id),
    enabled: Boolean(id),
  });
  const refundable = useQuery({
    queryKey: ["tp-transaction-refundable", id],
    queryFn: () => transactionsApi.refundableAmount(id),
    enabled: Boolean(id),
  });

  const fullRefund = useMutation({
    mutationFn: (reason: string) =>
      transactionsApi.fullRefund(id, { originalTransactionId: id, reason }),
    onSuccess: () => {
      toast({ title: "Full refund initiated" });
      void qc.invalidateQueries({ queryKey: ["tp-transaction"] });
      void qc.invalidateQueries({ queryKey: ["tp-transaction-refundable", id] });
      setFullRefundOpen(false);
    },
    onError: (e) =>
      toast({ variant: "destructive", title: "Refund failed", description: describeApiError(e) }),
  });

  const partialRefund = useMutation({
    mutationFn: ({ reason, amount }: { reason: string; amount: number }) =>
      transactionsApi.partialRefund(id, {
        originalTransactionId: id,
        reason,
        refundAmount: amount,
      }),
    onSuccess: () => {
      toast({ title: "Partial refund initiated" });
      void qc.invalidateQueries({ queryKey: ["tp-transaction"] });
      void qc.invalidateQueries({ queryKey: ["tp-transaction-refundable", id] });
    },
    onError: (e) =>
      toast({ variant: "destructive", title: "Refund failed", description: describeApiError(e) }),
  });

  const remRaw = refundable.data?.remainingRefundable ?? refundable.data?.["remainingRefundable"];
  const remaining =
    remRaw !== undefined && remRaw !== null && !Number.isNaN(Number(remRaw)) ? Number(remRaw) : NaN;
  const canRefund = refundable.data?.isRefundable === true && !Number.isNaN(remaining) && remaining > 0;

  if (!id) {
    return <p className="text-sm text-muted-foreground">Missing transaction id.</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transaction detail"
        description={
          <Link href="/transaction-processing/transactions" className="text-primary underline">
            Back to search
          </Link>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
          <CardDescription>Posting detail, narration, ledger links, and booking metadata.</CardDescription>
        </CardHeader>
        <CardContent>
          {detail.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : detail.data ? (
            <dl className="grid gap-2 text-sm md:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Id</dt>
                <dd>
                  <CopyableUuid
                    value={detail.data.id}
                    href={`/transaction-processing/transactions/${detail.data.id}`}
                    truncate={false}
                  />
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <StatusBadge status={detail.data.status ?? ""} />
                  {status.data?.status ? (
                    <span className="ml-2 text-xs text-muted-foreground">(poll: {status.data.status})</span>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Type</dt>
                <dd>{detail.data.type}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Amount</dt>
                <dd>
                  {detail.data.amount != null ? String(detail.data.amount) : "—"} {detail.data.currency}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Fee</dt>
                <dd>{detail.data.feeAmount != null ? String(detail.data.feeAmount) : "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Idempotency</dt>
                <dd>
                  <CopyableUuid value={detail.data.idempotencyKey} truncate={false} />
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Source</dt>
                <dd>
                  <CopyableUuid
                    value={detail.data.sourceAccountId}
                    href={
                      detail.data.sourceAccountId
                        ? `/accounts/${detail.data.sourceAccountId}`
                        : undefined
                    }
                  />
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Destination</dt>
                <dd>
                  <CopyableUuid
                    value={detail.data.destinationAccountId}
                    href={
                      detail.data.destinationAccountId
                        ? `/accounts/${detail.data.destinationAccountId}`
                        : undefined
                    }
                  />
                </dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-muted-foreground">Description</dt>
                <dd>{detail.data.description ?? "—"}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-destructive">{describeApiError(detail.error)}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Refunds & credits</CardTitle>
          <CardDescription>
            Credits the customer for all or part of the settled amount. Both paths are maker-controlled and need a
            substantiated reason.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {refundable.data ? (
            <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm">
              <p>
                <span className="text-muted-foreground">Remaining refundable</span>{" "}
                <span className="font-semibold">
                  {Number.isNaN(remaining) ? "—" : remaining.toString()} {detail.data?.currency ?? ""}
                </span>
              </p>
              <p className={canRefund ? "mt-1 text-muted-foreground" : "mt-1 text-destructive"}>
                {canRefund
                  ? "Use a partial credit when only part of the obligation should be unwound."
                  : "This payment is not refundable in its current lifecycle state or the balance is exhausted."}
              </p>
            </div>
          ) : refundable.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : null}
          <Can permissions={[Permissions.TransactionWrite]}>
            {detail.data ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  disabled={!canRefund || fullRefund.isPending}
                  onClick={() => setFullRefundOpen(true)}
                >
                  Full credit (full refund)
                </Button>
                <PartialRefundDialog
                  maxRefund={Number.isNaN(remaining) ? undefined : remaining}
                  currency={detail.data.currency}
                  disabled={!canRefund}
                  onConfirm={({ reason, amount }) => partialRefund.mutate({ reason, amount })}
                />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Load the summary to enable refund actions.</p>
            )}
          </Can>
          <ConfirmAction
            open={fullRefundOpen}
            onOpenChange={setFullRefundOpen}
            title="Post a full credit against this payment?"
            description="This starts the full refund rails flow. Confirm the customer is entitled to the full remaining amount and that no duplicate credit will be posted."
            confirmLabel="Start full refund"
            destructive
            reasonRequired
            reasonMinLength={12}
            reasonLabel="Remediation reason"
            onConfirm={async (reason) => {
              await fullRefund.mutateAsync(reason);
            }}
          />
          {refunds.data?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Refund id</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {refunds.data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <CopyableUuid
                        value={r.id}
                        href={`/transaction-processing/transactions/${r.id}`}
                      />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status ?? ""} />
                    </TableCell>
                    <TableCell>
                      {r.amount != null ? String(r.amount) : "—"} {r.currency}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Event history</CardTitle>
        </CardHeader>
        <CardContent>
          {history.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : history.data?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.data.map((ev) => (
                  <TableRow key={ev.id ?? `${ev.eventSequence}`}>
                    <TableCell>{ev.eventSequence}</TableCell>
                    <TableCell>{ev.eventType}</TableCell>
                    <TableCell>
                      {ev.previousStatus} → {ev.newStatus}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {ev.createdAt ? formatDateTime(ev.createdAt) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No events</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PartialRefundDialog({
  maxRefund,
  currency,
  disabled,
  onConfirm,
}: {
  maxRefund?: number;
  currency?: string;
  disabled?: boolean;
  onConfirm: (v: { reason: string; amount: number }) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const submit = () => {
    setError(null);
    const trimmed = reason.trim();
    const n = Number(amount);
    if (trimmed.length < 10) {
      setError("Reason must be at least 10 characters.");
      return;
    }
    if (!Number.isFinite(n) || n <= 0) {
      setError("Enter a positive amount.");
      return;
    }
    if (maxRefund != null && n > maxRefund + 1e-9) {
      setError(`Amount cannot exceed the remaining refundable balance (${maxRefund}).`);
      return;
    }
    onConfirm({ reason: trimmed, amount: n });
    setOpen(false);
    setReason("");
    setAmount("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          Partial credit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Partial credit</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Partial credits reduce customer exposure without unwinding the full original posting.
          </p>
          {maxRefund != null ? (
            <p className="text-sm">
              Ceiling:{" "}
              <span className="font-semibold">
                {maxRefund} {currency ?? ""}
              </span>
            </p>
          ) : null}
          <Label>Amount</Label>
          <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Label>Reason</Label>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Incident id, regulator instruction, goodwill policy…" />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="button" onClick={submit}>
            Post partial credit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
