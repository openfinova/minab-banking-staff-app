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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoanServicingLinks } from "@/components/loans/loan-servicing-links";
import { InstallmentStatusBadge } from "@/components/loans/loan-badges";
import { describeApiError } from "@/lib/api/errors";
import { useToast } from "@/components/ui/use-toast";
import { loanSchedulesApi, type ScheduleStatus } from "@/lib/api/modules/loans";
import { Permissions } from "@/lib/rbac/permissions";

export default function LoanSchedulesPage() {
  return (
    <RouteGuard permissions={[Permissions.LoanRead]}>
      <SchedContent />
    </RouteGuard>
  );
}

function SchedContent() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [view, setView] = React.useState<"all" | "pending" | "overdue" | "status">("all");
  const [st, setSt] = React.useState<ScheduleStatus>("PENDING");
  const [eff, setEff] = React.useState("");
  const [dueStart, setDueStart] = React.useState("");
  const [dueEnd, setDueEnd] = React.useState("");

  const all = useQuery({
    queryKey: ["loans", "sched", id, "all"],
    queryFn: () => loanSchedulesApi.list(id, 0, 100),
    enabled: Boolean(id) && view === "all",
  });
  const pending = useQuery({
    queryKey: ["loans", "sched", id, "pending"],
    queryFn: () => loanSchedulesApi.listPending(id),
    enabled: Boolean(id) && view === "pending",
  });
  const overdue = useQuery({
    queryKey: ["loans", "sched", id, "overdue"],
    queryFn: () => loanSchedulesApi.listOverdue(id),
    enabled: Boolean(id) && view === "overdue",
  });
  const bySt = useQuery({
    queryKey: ["loans", "sched", id, "st", st],
    queryFn: () => loanSchedulesApi.listByStatus(id, st),
    enabled: Boolean(id) && view === "status",
  });
  const dueBet = useQuery({
    queryKey: ["loans", "sched", id, "due", dueStart, dueEnd],
    queryFn: () => loanSchedulesApi.listDueBetween(id, dueStart, dueEnd, 0, 100),
    enabled: Boolean(id) && Boolean(dueStart) && Boolean(dueEnd),
  });

  const pc = useQuery({
    queryKey: ["loans", "sched", id, "pc"],
    queryFn: () => loanSchedulesApi.pendingCount(id),
    enabled: Boolean(id),
  });
  const oc = useQuery({
    queryKey: ["loans", "sched", id, "oc"],
    queryFn: () => loanSchedulesApi.overdueCount(id),
    enabled: Boolean(id),
  });

  const gen = useMutation({
    mutationFn: () => loanSchedulesApi.generate(id),
    onSuccess: () => {
      toast({ title: "Schedule generated" });
      qc.invalidateQueries({ queryKey: ["loans", "sched", id] });
    },
    onError: (e) => toast({ variant: "destructive", description: describeApiError(e) }),
  });

  const regen = useMutation({
    mutationFn: () => loanSchedulesApi.regenerate(id, { effectiveDate: eff }),
    onSuccess: () => {
      toast({ title: "Regenerated" });
      qc.invalidateQueries({ queryKey: ["loans", "sched", id] });
    },
    onError: (e) => toast({ variant: "destructive", description: describeApiError(e) }),
  });

  const [rangeLoaded, setRangeLoaded] = React.useState(false);

  const rows =
    rangeLoaded && dueStart && dueEnd
      ? (dueBet.data?.content ?? [])
      : view === "all"
      ? all.data?.content ?? []
      : view === "pending"
        ? pending.data ?? []
        : view === "overdue"
          ? overdue.data ?? []
          : view === "status"
            ? bySt.data ?? []
            : dueBet.data?.content ?? [];

  const [paidDate, setPaidDate] = React.useState("");
  const [pp, setPp] = React.useState("0");
  const [ip, setIp] = React.useState("0");
  const [fp, setFp] = React.useState("0");
  const [penp, setPenp] = React.useState("0");
  const [ovd, setOvd] = React.useState(false);
  const [dpd, setDpd] = React.useState("0");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Amortization schedule"
        description={`Pending ${pc.data ?? "…"} · Overdue ${oc.data ?? "…"}`}
      />
      <LoanServicingLinks loanAccountId={id} />

      <div className="flex flex-wrap gap-2">
        {(["all", "pending", "overdue", "status"] as const).map((v) => (
          <Button
            key={v}
            size="sm"
            variant={view === v ? "secondary" : "outline"}
            onClick={() => {
              setRangeLoaded(false);
              setView(v);
            }}
          >
            {v}
          </Button>
        ))}
      </div>

      {view === "status" ? (
        <div className="flex gap-2 items-center">
          <Label>Status</Label>
          <select
            className="border rounded-md px-2 py-1 text-sm"
            value={st}
            onChange={(e) => setSt(e.target.value as ScheduleStatus)}
          >
            {(["PENDING", "PARTIALLY_PAID", "PAID", "OVERDUE", "WAIVED"] as const).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Due between (paged)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 items-end">
          <Input type="date" value={dueStart} onChange={(e) => setDueStart(e.target.value)} />
          <Input type="date" value={dueEnd} onChange={(e) => setDueEnd(e.target.value)} />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setRangeLoaded(true);
              void dueBet.refetch();
            }}
          >
            Load range
          </Button>
        </CardContent>
      </Card>

      <Can permissions={[Permissions.LoanWrite]}>
        <Card>
          <CardHeader>
            <CardTitle>Generate / regenerate</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button disabled={gen.isPending} onClick={() => gen.mutate()}>
              Generate
            </Button>
            <Input type="date" value={eff} onChange={(e) => setEff(e.target.value)} className="w-auto" />
            <Button disabled={regen.isPending || !eff} onClick={() => regen.mutate()}>
              Regenerate
            </Button>
          </CardContent>
        </Card>
      </Can>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due amt</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.installmentNumber}</TableCell>
                <TableCell>{r.dueDate}</TableCell>
                <TableCell>
                  {r.status ? <InstallmentStatusBadge status={r.status} /> : "—"}
                </TableCell>
                <TableCell>{r.totalDue}</TableCell>
                <TableCell className="space-y-1 min-w-[200px]">
                  <Can permissions={[Permissions.LoanCollect]}>
                    <div className="flex gap-1 flex-wrap">
                      <Input type="date" className="h-8 w-32" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} />
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          if (!paidDate) return;
                          loanSchedulesApi
                            .markPaid(id, r.id, { paidDate })
                            .then(() => {
                              toast({ title: "Marked paid" });
                              qc.invalidateQueries({ queryKey: ["loans", "sched", id] });
                            })
                            .catch((e) => toast({ variant: "destructive", description: describeApiError(e) }));
                        }}
                      >
                        Paid
                      </Button>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      <Input className="h-8 w-14" placeholder="p" value={pp} onChange={(e) => setPp(e.target.value)} />
                      <Input className="h-8 w-14" placeholder="i" value={ip} onChange={(e) => setIp(e.target.value)} />
                      <Input className="h-8 w-14" placeholder="f" value={fp} onChange={(e) => setFp(e.target.value)} />
                      <Input className="h-8 w-14" placeholder="pen" value={penp} onChange={(e) => setPenp(e.target.value)} />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          loanSchedulesApi
                            .updatePayment(id, r.id, {
                              principalPaid: Number(pp),
                              interestPaid: Number(ip),
                              feesPaid: Number(fp),
                              penaltiesPaid: Number(penp),
                            })
                            .then(() => {
                              toast({ title: "Payment updated" });
                              qc.invalidateQueries({ queryKey: ["loans", "sched", id] });
                            })
                            .catch((e) => toast({ variant: "destructive", description: describeApiError(e) }))
                        }
                      >
                        Upd pay
                      </Button>
                    </div>
                  </Can>
                  <div className="flex gap-1 items-center">
                    <label className="text-xs flex items-center gap-1">
                      <input type="checkbox" checked={ovd} onChange={(e) => setOvd(e.target.checked)} />
                      overdue
                    </label>
                    <Input className="h-8 w-16" value={dpd} onChange={(e) => setDpd(e.target.value)} />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        loanSchedulesApi
                          .updateOverdue(id, r.id, { isOverdue: ovd, daysPastDue: Number(dpd) })
                          .then(() => {
                            toast({ title: "Overdue updated" });
                            qc.invalidateQueries({ queryKey: ["loans", "sched", id] });
                          })
                          .catch((e) => toast({ variant: "destructive", description: describeApiError(e) }))
                      }
                    >
                      Save ovd
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
