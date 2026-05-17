"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Can } from "@/components/rbac/can";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { LoanServicingLinks } from "@/components/loans/loan-servicing-links";
import { StatusBadge } from "@/components/data/status-badge";
import { describeApiError } from "@/lib/api/errors";
import { useToast } from "@/components/ui/use-toast";
import { loanDisbursementsApi, type DisbursementMethod, type DisbursementStatus } from "@/lib/api/modules/loans";
import { Permissions } from "@/lib/rbac/permissions";

const METHODS: DisbursementMethod[] = [
  "BANK_TRANSFER",
  "CHEQUE",
  "CASH",
  "DIRECT_TO_VENDOR",
  "MOBILE_MONEY",
];

export default function LoanDisbursementsPage() {
  return (
    <RouteGuard permissions={[Permissions.LoanRead]}>
      <Content />
    </RouteGuard>
  );
}

function Content() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { toast } = useToast();

  const list = useQuery({
    queryKey: ["loans", "disb", id],
    queryFn: () => loanDisbursementsApi.list(id),
    enabled: Boolean(id),
  });

  const pending = useQuery({
    queryKey: ["loans", "disb", id, "pending-count"],
    queryFn: () => loanDisbursementsApi.pendingCount(id),
    enabled: Boolean(id),
  });

  const [amount, setAmount] = React.useState("1000");
  const [disbDate, setDisbDate] = React.useState("");
  const [method, setMethod] = React.useState<DisbursementMethod>("BANK_TRANSFER");
  const [dest, setDest] = React.useState("");

  const create = useMutation({
    mutationFn: () =>
      loanDisbursementsApi.create(id, {
        loanAccountId: id,
        disbursementAmount: Number(amount),
        disbursementDate: disbDate,
        disbursementMethod: method,
        destinationAccountNumber: dest,
      }),
    onSuccess: () => {
      toast({ title: "Disbursement created" });
      qc.invalidateQueries({ queryKey: ["loans", "disb", id] });
      pending.refetch();
    },
    onError: (e) => toast({ variant: "destructive", description: describeApiError(e) }),
  });

  const [filterStatus, setFilterStatus] = React.useState<DisbursementStatus | "">("");
  const [dStart, setDStart] = React.useState("");
  const [dEnd, setDEnd] = React.useState("");

  const byStatus = useQuery({
    queryKey: ["loans", "disb", id, "status", filterStatus],
    queryFn: () => loanDisbursementsApi.listByStatus(id, filterStatus as DisbursementStatus, 0, 50),
    enabled: Boolean(id) && Boolean(filterStatus),
  });

  const byRange = useQuery({
    queryKey: ["loans", "disb", id, "range", dStart, dEnd],
    queryFn: () => loanDisbursementsApi.listByDateRange(id, dStart, dEnd, 0, 50),
    enabled: Boolean(id) && Boolean(dStart) && Boolean(dEnd),
  });

  const rows = filterStatus
    ? (byStatus.data?.content ?? [])
    : dStart && dEnd
      ? (byRange.data?.content ?? [])
      : (list.data ?? []);

  const [procBy, setProcBy] = React.useState("staff");
  const [compBy, setCompBy] = React.useState("staff");
  const [failReason, setFailReason] = React.useState("");
  const [failBy, setFailBy] = React.useState("staff");
  const [cancelReason, setCancelReason] = React.useState("");
  const [cancelBy, setCancelBy] = React.useState("staff");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Disbursements"
        description={`Pending: ${pending.data ?? "…"} — record funding tranches and track disbursement status.`}
      />
      <LoanServicingLinks loanAccountId={id} />

      <Can permissions={[Permissions.LoanDisburse]}>
        <Card>
          <CardHeader>
            <CardTitle>Create</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="grid gap-1.5">
              <Label>Amount</Label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Date</Label>
              <Input type="date" value={disbDate} onChange={(e) => setDisbDate(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as DisbursementMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Destination account #</Label>
              <Input value={dest} onChange={(e) => setDest(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button disabled={create.isPending} onClick={() => create.mutate()}>
                Create
              </Button>
            </div>
          </CardContent>
        </Card>
      </Can>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="grid gap-1.5">
            <Label>Status page</Label>
            <Select
              value={filterStatus || "__all__"}
              onValueChange={(v) => setFilterStatus(v === "__all__" ? "" : (v as DisbursementStatus))}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All (list)</SelectItem>
                {(["PENDING", "APPROVED", "PROCESSING", "COMPLETED", "FAILED", "REVERSED"] as const).map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 items-end">
            <div className="grid gap-1.5">
              <Label>From</Label>
              <Input type="date" value={dStart} onChange={(e) => setDStart(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>To</Label>
              <Input type="date" value={dEnd} onChange={(e) => setDEnd(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {list.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : list.isError ? (
        <p className="text-destructive">{describeApiError(list.error)}</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-mono text-[10px]">{d.id}</TableCell>
                  <TableCell>{d.disbursementAmount}</TableCell>
                  <TableCell>
                    {d.status ? <StatusBadge status={d.status} /> : "—"}
                  </TableCell>
                  <TableCell className="space-x-1">
                    <Can permissions={[Permissions.LoanDisburseApprove]}>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          loanDisbursementsApi
                            .process(id, d.id, { processedBy: procBy })
                            .then(() => {
                              toast({ title: "Processed" });
                              qc.invalidateQueries({ queryKey: ["loans", "disb", id] });
                            })
                            .catch((e) => toast({ variant: "destructive", description: describeApiError(e) }))
                        }
                      >
                        Process
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          loanDisbursementsApi
                            .complete(id, d.id, { completedBy: compBy })
                            .then(() => {
                              toast({ title: "Completed" });
                              qc.invalidateQueries({ queryKey: ["loans", "disb", id] });
                            })
                            .catch((e) => toast({ variant: "destructive", description: describeApiError(e) }))
                        }
                      >
                        Complete
                      </Button>
                    </Can>
                    <Can permissions={[Permissions.LoanDisburse]}>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          loanDisbursementsApi
                            .fail(id, d.id, { failureReason: failReason || "Failed", failedBy: failBy })
                            .then(() => {
                              toast({ title: "Marked failed" });
                              qc.invalidateQueries({ queryKey: ["loans", "disb", id] });
                            })
                            .catch((e) => toast({ variant: "destructive", description: describeApiError(e) }))
                        }
                      >
                        Fail
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          loanDisbursementsApi
                            .cancel(id, d.id, {
                              cancellationReason: cancelReason || "Cancelled",
                              cancelledBy: cancelBy,
                            })
                            .then(() => {
                              toast({ title: "Cancelled" });
                              qc.invalidateQueries({ queryKey: ["loans", "disb", id] });
                            })
                            .catch((e) => toast({ variant: "destructive", description: describeApiError(e) }))
                        }
                      >
                        Cancel
                      </Button>
                    </Can>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Card>
        <CardContent className="pt-6 text-xs text-muted-foreground space-y-2">
          <p>Process/complete by: <Input className="inline-flex h-8 w-32" value={procBy} onChange={(e) => setProcBy(e.target.value)} /> / <Input className="inline-flex h-8 w-32" value={compBy} onChange={(e) => setCompBy(e.target.value)} /></p>
          <p>Fail: reason <Input className="inline-flex h-8 w-40" value={failReason} onChange={(e) => setFailReason(e.target.value)} /> by <Input className="inline-flex h-8 w-28" value={failBy} onChange={(e) => setFailBy(e.target.value)} /></p>
          <p>Cancel: reason <Input className="inline-flex h-8 w-40" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} /> by <Input className="inline-flex h-8 w-28" value={cancelBy} onChange={(e) => setCancelBy(e.target.value)} /></p>
        </CardContent>
      </Card>
    </div>
  );
}
