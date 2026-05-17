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
import { Textarea } from "@/components/ui/textarea";
import { LoanServicingLinks } from "@/components/loans/loan-servicing-links";
import { StatusBadge } from "@/components/data/status-badge";
import { describeApiError } from "@/lib/api/errors";
import { useToast } from "@/components/ui/use-toast";
import {
  loanCollectionsApi,
  type CollectionActivityType,
  type CollectionStatus,
} from "@/lib/api/modules/loans";
import { Permissions } from "@/lib/rbac/permissions";
import { collectionActivityCreateSchema } from "@/lib/schemas/loans";

const ACT_TYPES: CollectionActivityType[] = [
  "PHONE_CALL",
  "SMS",
  "EMAIL",
  "LETTER",
  "FIELD_VISIT",
  "LEGAL_NOTICE",
  "PROMISE_TO_PAY",
  "PAYMENT_ARRANGEMENT",
];

export default function LoanCollectionsPage() {
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
  const [view, setView] = React.useState<"all" | "status" | "range">("all");
  const [stFilter, setStFilter] = React.useState<CollectionStatus>("PENDING");
  const [rStart, setRStart] = React.useState("");
  const [rEnd, setREnd] = React.useState("");

  const pend = useQuery({
    queryKey: ["loans", "coll-act", id, "pending"],
    queryFn: () => loanCollectionsApi.pendingCount(id),
    enabled: Boolean(id),
  });

  const listAll = useQuery({
    queryKey: ["loans", "coll-act", id, "list"],
    queryFn: () => loanCollectionsApi.list(id),
    enabled: Boolean(id) && view === "all",
  });

  const listStatus = useQuery({
    queryKey: ["loans", "coll-act", id, "st", stFilter],
    queryFn: () => loanCollectionsApi.listByStatus(id, stFilter, 0, 50),
    enabled: Boolean(id) && view === "status",
  });

  const listRange = useQuery({
    queryKey: ["loans", "coll-act", id, "range", rStart, rEnd],
    queryFn: () => loanCollectionsApi.listByDateRange(id, rStart, rEnd, 0, 50),
    enabled: Boolean(id) && view === "range" && Boolean(rStart && rEnd),
  });

  const rows =
    view === "all"
      ? (listAll.data ?? [])
      : view === "status"
        ? (listStatus.data?.content ?? [])
        : (listRange.data?.content ?? []);

  const [atype, setAtype] = React.useState<CollectionActivityType>("PHONE_CALL");
  const [adate, setAdate] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [fup, setFup] = React.useState("");
  const [assign, setAssign] = React.useState("");

  const create = useMutation({
    mutationFn: () =>
      loanCollectionsApi.create(id, {
        loanAccountId: id,
        activityType: atype,
        activityDate: adate,
        notes,
        followUpDate: fup || undefined,
        assignedTo: assign || undefined,
      }),
    onSuccess: () => {
      toast({ title: "Activity created" });
      qc.invalidateQueries({ queryKey: ["loans", "coll-act", id] });
    },
    onError: (e) => toast({ variant: "destructive", description: describeApiError(e) }),
  });

  const [repStart, setRepStart] = React.useState("");
  const [repEnd, setRepEnd] = React.useState("");
  const report = useQuery({
    queryKey: ["loans", "coll-act", id, "report", repStart, repEnd],
    queryFn: () => loanCollectionsApi.report(id, repStart, repEnd),
    enabled: Boolean(id) && Boolean(repStart && repEnd),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Collections" description={`Pending activities: ${pend.data ?? "…"}`} />
      <LoanServicingLinks loanAccountId={id} />

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 items-center">
          {(["all", "status", "range"] as const).map((v) => (
            <Button key={v} size="sm" variant={view === v ? "secondary" : "outline"} onClick={() => setView(v)}>
              {v}
            </Button>
          ))}
          {view === "status" ? (
            <select
              className="border rounded-md p-2 text-sm"
              value={stFilter}
              onChange={(e) => setStFilter(e.target.value as CollectionStatus)}
            >
              {(["PENDING", "IN_PROGRESS", "COMPLETED", "ESCALATED", "CLOSED"] as const).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          ) : null}
          {view === "range" ? (
            <>
              <Input type="date" className="w-40" value={rStart} onChange={(e) => setRStart(e.target.value)} />
              <Input type="date" className="w-40" value={rEnd} onChange={(e) => setREnd(e.target.value)} />
            </>
          ) : null}
        </CardContent>
      </Card>

      <Can permissions={[Permissions.LoanCollect]}>
        <Card>
          <CardHeader>
            <CardTitle>New activity</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 max-w-xl">
            <select className="border rounded-md p-2 text-sm" value={atype} onChange={(e) => setAtype(e.target.value as CollectionActivityType)}>
              {ACT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <Input type="date" value={adate} onChange={(e) => setAdate(e.target.value)} />
            <Textarea placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <Input type="date" placeholder="Follow-up" value={fup} onChange={(e) => setFup(e.target.value)} />
            <Input placeholder="Assigned to" value={assign} onChange={(e) => setAssign(e.target.value)} />
            <Button
              disabled={create.isPending}
              onClick={() => {
                const p = collectionActivityCreateSchema.safeParse({
                  activityType: atype,
                  activityDate: adate,
                  notes,
                  followUpDate: fup,
                  assignedTo: assign,
                });
                if (!p.success) {
                  toast({ variant: "destructive", description: p.error.errors[0]?.message });
                  return;
                }
                create.mutate();
              }}
            >
              Create
            </Button>
          </CardContent>
        </Card>
      </Can>

      <Card>
        <CardHeader>
          <CardTitle>Period report</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 items-end">
          <Input type="date" value={repStart} onChange={(e) => setRepStart(e.target.value)} />
          <Input type="date" value={repEnd} onChange={(e) => setRepEnd(e.target.value)} />
          <Button size="sm" variant="outline" onClick={() => qc.invalidateQueries({ queryKey: ["loans", "coll-act", id, "report"] })}>
            Run
          </Button>
          {report.data ? (
            <pre className="text-xs bg-muted/30 p-2 rounded w-full overflow-auto">{JSON.stringify(report.data, null, 2)}</pre>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {rows.map((a) => (
            <ActivityRow
              key={(a as { id: string }).id}
              loanId={id}
              a={a as { id: string; status?: string; notes?: string }}
              onChange={() => qc.invalidateQueries({ queryKey: ["loans", "coll-act", id] })}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ActivityRow({
  loanId,
  a,
  onChange,
}: {
  loanId: string;
  a: { id: string; status?: string; notes?: string };
  onChange: () => void;
}) {
  const { toast } = useToast();
  const [upNotes, setUpNotes] = React.useState(a.notes ?? "");
  const [upFup, setUpFup] = React.useState("");
  const [nst, setNst] = React.useState<CollectionStatus>("IN_PROGRESS");
  const [outcome, setOutcome] = React.useState("Resolved");
  const [sfDate, setSfDate] = React.useState("");
  const [sfType, setSfType] = React.useState<CollectionActivityType>("PHONE_CALL");

  return (
    <div className="border rounded-md p-3 text-sm space-y-2">
      <div className="flex flex-wrap gap-2 items-center">
        <span className="font-mono text-[10px]">{a.id}</span>
        {a.status ? <StatusBadge status={a.status} /> : null}
      </div>
      <Can permissions={[Permissions.LoanCollect]}>
        <div className="flex flex-wrap gap-2">
          <Textarea className="min-h-[60px]" value={upNotes} onChange={(e) => setUpNotes(e.target.value)} />
          <Input type="date" className="w-36" value={upFup} onChange={(e) => setUpFup(e.target.value)} />
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              loanCollectionsApi
                .update(loanId, a.id, { notes: upNotes, followUpDate: upFup || undefined })
                .then(() => {
                  toast({ title: "Updated" });
                  onChange();
                })
                .catch((e) => toast({ variant: "destructive", description: describeApiError(e) }))
            }
          >
            Save
          </Button>
          <select className="h-8 border rounded text-xs" value={nst} onChange={(e) => setNst(e.target.value as CollectionStatus)}>
            {(["PENDING", "IN_PROGRESS", "COMPLETED", "ESCALATED", "CLOSED"] as const).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            onClick={() =>
              loanCollectionsApi
                .updateStatus(loanId, a.id, { newStatus: nst })
                .then(() => {
                  toast({ title: "Status" });
                  onChange();
                })
                .catch((e) => toast({ variant: "destructive", description: describeApiError(e) }))
            }
          >
            Set status
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Label className="text-xs">Follow-up</Label>
          <Input type="date" className="h-8 w-36" value={sfDate} onChange={(e) => setSfDate(e.target.value)} />
          <select className="h-8 border rounded text-xs" value={sfType} onChange={(e) => setSfType(e.target.value as CollectionActivityType)}>
            {ACT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              loanCollectionsApi
                .scheduleFollowUp(loanId, a.id, { followUpDate: sfDate, followUpType: sfType })
                .then(() => {
                  toast({ title: "Scheduled" });
                  onChange();
                })
                .catch((e) => toast({ variant: "destructive", description: describeApiError(e) }))
            }
          >
            Schedule FU
          </Button>
        </div>
      </Can>
      <Can permissions={[Permissions.LoanCollectApprove]}>
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Outcome" className="h-8 max-w-xs" value={outcome} onChange={(e) => setOutcome(e.target.value)} />
          <Button
            size="sm"
            variant="destructive"
            onClick={() =>
              loanCollectionsApi
                .complete(loanId, a.id, { outcome })
                .then(() => {
                  toast({ title: "Completed" });
                  onChange();
                })
                .catch((e) => toast({ variant: "destructive", description: describeApiError(e) }))
            }
          >
            Complete
          </Button>
        </div>
      </Can>
    </div>
  );
}
