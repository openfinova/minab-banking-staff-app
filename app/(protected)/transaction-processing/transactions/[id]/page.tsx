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
import { StatusBadge } from "@/components/data/status-badge";
import { Can } from "@/components/rbac/can";
import { RouteGuard } from "@/components/rbac/route-guard";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";
import { transactionsApi } from "@/lib/api/modules/transaction-processing";
import { useAuthStore } from "@/lib/auth/auth-store";
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
  const username = useAuthStore((s) => s.session?.user.username ?? "operator");

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
      transactionsApi.fullRefund(id, { originalTransactionId: id, reason, initiatedBy: username }),
    onSuccess: () => {
      toast({ title: "Full refund initiated" });
      void qc.invalidateQueries({ queryKey: ["tp-transaction"] });
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
        initiatedBy: username,
      }),
    onSuccess: () => {
      toast({ title: "Partial refund initiated" });
      void qc.invalidateQueries({ queryKey: ["tp-transaction"] });
    },
    onError: (e) =>
      toast({ variant: "destructive", title: "Refund failed", description: describeApiError(e) }),
  });

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
          <CardDescription>GET /api/v1/transactions/{`{id}`}</CardDescription>
        </CardHeader>
        <CardContent>
          {detail.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : detail.data ? (
            <dl className="grid gap-2 text-sm md:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Id</dt>
                <dd className="font-mono text-xs">{detail.data.id}</dd>
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
                <dd className="font-mono text-xs">{detail.data.idempotencyKey}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Source</dt>
                <dd className="font-mono text-xs">{detail.data.sourceAccountId ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Destination</dt>
                <dd className="font-mono text-xs">{detail.data.destinationAccountId ?? "—"}</dd>
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
          <CardTitle>Refunds</CardTitle>
          <CardDescription>Full and partial refunds require transaction:write.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {refundable.data ? (
            <pre className="rounded-md bg-muted p-3 text-xs">{JSON.stringify(refundable.data, null, 2)}</pre>
          ) : refundable.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : null}
          <Can permissions={[Permissions.TransactionWrite]}>
            <div className="flex flex-wrap gap-2">
              <RefundReasonDialog
                title="Full refund"
                confirmLabel="Start full refund"
                onConfirm={(reason) => fullRefund.mutate(reason)}
              />
              <PartialRefundDialog
                onConfirm={({ reason, amount }) => partialRefund.mutate({ reason, amount })}
              />
            </div>
          </Can>
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
                    <TableCell className="font-mono text-xs">{r.id}</TableCell>
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

function RefundReasonDialog({
  title,
  confirmLabel,
  onConfirm,
}: {
  title: string;
  confirmLabel: string;
  onConfirm: (reason: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">{title}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Reason</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button
            type="button"
            disabled={!reason.trim()}
            onClick={() => {
              onConfirm(reason.trim());
              setOpen(false);
              setReason("");
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PartialRefundDialog({
  onConfirm,
}: {
  onConfirm: (v: { reason: string; amount: number }) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [amount, setAmount] = React.useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Partial refund</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Partial refund</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Amount</Label>
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Label>Reason</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button
            type="button"
            disabled={!reason.trim() || !amount.trim()}
            onClick={() => {
              onConfirm({ reason: reason.trim(), amount: Number(amount) });
              setOpen(false);
              setReason("");
              setAmount("");
            }}
          >
            Submit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
