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
import { describeApiError } from "@/lib/api/errors";
import { useToast } from "@/components/ui/use-toast";
import { loanRestructuringsApi, type RestructuringType } from "@/lib/api/modules/loans";
import { Permissions } from "@/lib/rbac/permissions";
import { loanRestructuringRequestSchema } from "@/lib/schemas/loans";

const TYPES: RestructuringType[] = [
  "TERM_EXTENSION",
  "RATE_REDUCTION",
  "PAYMENT_HOLIDAY",
  "PRINCIPAL_MORATORIUM",
  "FULL_RESTRUCTURE",
];

export default function LoanRestructuringsPage() {
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
    queryKey: ["loans", "restr", id],
    queryFn: () => loanRestructuringsApi.list(id),
    enabled: Boolean(id),
  });

  const [rtype, setRtype] = React.useState<RestructuringType>("TERM_EXTENSION");
  const [nt, setNt] = React.useState("");
  const [nr, setNr] = React.useState("");
  const [rsn, setRsn] = React.useState("");

  const create = useMutation({
    mutationFn: () =>
      loanRestructuringsApi.create(id, {
        loanAccountId: id,
        restructuringType: rtype,
        newTenorMonths: nt ? Number(nt) : undefined,
        newInterestRate: nr ? Number(nr) : undefined,
        reason: rsn,
      }),
    onSuccess: () => {
      toast({ title: "Request created" });
      qc.invalidateQueries({ queryKey: ["loans", "restr", id] });
    },
    onError: (e) => toast({ variant: "destructive", description: describeApiError(e) }),
  });

  const [apprBy, setApprBy] = React.useState("approver");
  const [rejReason, setRejReason] = React.useState("");
  const [rejBy, setRejBy] = React.useState("approver");
  const [procBy, setProcBy] = React.useState("processor");

  return (
    <div className="space-y-6">
      <PageHeader title="Restructuring" description="/api/v1/loan-accounts/{id}/restructurings" />
      <LoanServicingLinks loanAccountId={id} />

      <Can permissions={[Permissions.LoanRestructure]}>
        <Card>
          <CardHeader>
            <CardTitle>New request</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 max-w-xl">
            <select className="border rounded-md p-2 text-sm" value={rtype} onChange={(e) => setRtype(e.target.value as RestructuringType)}>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <Input placeholder="New tenor (optional)" value={nt} onChange={(e) => setNt(e.target.value)} />
            <Input placeholder="New rate (optional)" value={nr} onChange={(e) => setNr(e.target.value)} />
            <Textarea placeholder="Reason" value={rsn} onChange={(e) => setRsn(e.target.value)} />
            <Button
              disabled={create.isPending}
              onClick={() => {
                const p = loanRestructuringRequestSchema.safeParse({
                  restructuringType: rtype,
                  newTenorMonths: nt ? Number(nt) : undefined,
                  newInterestRate: nr ? Number(nr) : undefined,
                  reason: rsn,
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
          <CardTitle>Requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(list.data ?? []).map((r) => (
            <div key={r.id} className="rounded-md border p-3 text-sm space-y-2">
              <pre className="text-xs overflow-auto bg-muted/30 p-2 rounded">{JSON.stringify(r, null, 2)}</pre>
              <div className="flex flex-wrap gap-2 items-center">
                <Label className="text-xs">Approved by</Label>
                <Input className="h-8 w-32" value={apprBy} onChange={(e) => setApprBy(e.target.value)} />
                <Can permissions={[Permissions.LoanRestructureApprove]}>
                  <Button
                    size="sm"
                    onClick={() =>
                      loanRestructuringsApi
                        .approve(id, r.id, { approvedBy: apprBy })
                        .then(() => {
                          toast({ title: "Approved" });
                          qc.invalidateQueries({ queryKey: ["loans", "restr", id] });
                        })
                        .catch((e) => toast({ variant: "destructive", description: describeApiError(e) }))
                    }
                  >
                    Approve
                  </Button>
                  <Input placeholder="Reject reason" className="h-8 max-w-xs" value={rejReason} onChange={(e) => setRejReason(e.target.value)} />
                  <Input className="h-8 w-24" value={rejBy} onChange={(e) => setRejBy(e.target.value)} />
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() =>
                      loanRestructuringsApi
                        .reject(id, r.id, { rejectionReason: rejReason || "Rejected", rejectedBy: rejBy })
                        .then(() => {
                          toast({ title: "Rejected" });
                          qc.invalidateQueries({ queryKey: ["loans", "restr", id] });
                        })
                        .catch((e) => toast({ variant: "destructive", description: describeApiError(e) }))
                    }
                  >
                    Reject
                  </Button>
                </Can>
                <Can permissions={[Permissions.LoanRestructure]}>
                  <Input className="h-8 w-28" value={procBy} onChange={(e) => setProcBy(e.target.value)} />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      loanRestructuringsApi
                        .process(id, r.id, { processedBy: procBy })
                        .then(() => {
                          toast({ title: "Processed" });
                          qc.invalidateQueries({ queryKey: ["loans", "restr", id] });
                        })
                        .catch((e) => toast({ variant: "destructive", description: describeApiError(e) }))
                    }
                  >
                    Process
                  </Button>
                </Can>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
