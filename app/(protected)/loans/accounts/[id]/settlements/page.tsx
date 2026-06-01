"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RouteGuard } from "@/components/rbac/route-guard";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoanServicingLinks } from "@/components/loans/loan-servicing-links";
import { describeApiError } from "@/lib/api/errors";
import { useToast } from "@/components/ui/use-toast";
import { earlySettlementsApi, type SettlementCalculationMethod } from "@/lib/api/modules/loans";
import { Permissions } from "@/lib/rbac/permissions";
import { earlySettlementQuoteSchema } from "@/lib/schemas/loans";

export default function EarlySettlementsPage() {
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
    queryKey: ["loans", "sett", id],
    queryFn: () => earlySettlementsApi.list(id),
    enabled: Boolean(id),
  });
  const pend = useQuery({
    queryKey: ["loans", "sett", id, "pc"],
    queryFn: () => earlySettlementsApi.pendingCount(id),
    enabled: Boolean(id),
  });

  const [setDate, setSetDate] = React.useState("");
  const [meth, setMeth] = React.useState<SettlementCalculationMethod>("FULL_OUTSTANDING");

  const quote = useMutation({
    mutationFn: () =>
      earlySettlementsApi.quote(id, {
        loanAccountId: id,
        settlementDate: setDate,
        calculationMethod: meth,
      }),
    onSuccess: () => {
      toast({ title: "Quote created" });
      qc.invalidateQueries({ queryKey: ["loans", "sett", id] });
    },
    onError: (e) => toast({ variant: "destructive", description: describeApiError(e) }),
  });

  const [apprBy, setApprBy] = React.useState("approver");
  const [rejR, setRejR] = React.useState("");
  const [rejBy, setRejBy] = React.useState("approver");
  const [canR, setCanR] = React.useState("");
  const [canBy, setCanBy] = React.useState("staff");
  const [payDate, setPayDate] = React.useState("");
  const [procBy, setProcBy] = React.useState("processor");

  return (
    <div className="space-y-6">
      <PageHeader title="Early settlement" description={`Pending quotes: ${pend.data ?? "…"}`} />
      <LoanServicingLinks loanAccountId={id} />

      <Card>
        <CardHeader>
          <CardTitle>Quote</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 items-end">
          <DateInput value={setDate} onChange={setSetDate} />
          <select className="border rounded-md p-2 text-sm" value={meth} onChange={(e) => setMeth(e.target.value as SettlementCalculationMethod)}>
            <option value="FULL_OUTSTANDING">FULL_OUTSTANDING</option>
            <option value="DISCOUNTED">DISCOUNTED</option>
          </select>
          <Button
            disabled={quote.isPending}
            onClick={() => {
              const p = earlySettlementQuoteSchema.safeParse({ settlementDate: setDate, calculationMethod: meth });
              if (!p.success) {
                toast({ variant: "destructive", description: p.error.errors[0]?.message });
                return;
              }
              quote.mutate();
            }}
          >
            Get payoff quote
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Settlements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(list.data ?? []).map((s) => (
            <div key={s.id} className="border rounded-md p-3 text-sm space-y-2">
              <pre className="text-xs bg-muted/30 p-2 rounded overflow-auto">{JSON.stringify(s, null, 2)}</pre>
              <div className="flex flex-wrap gap-2 items-center">
                <Label className="text-xs">Approved by</Label>
                <Input className="h-8 w-28" value={apprBy} onChange={(e) => setApprBy(e.target.value)} />
                <Button
                  size="sm"
                  onClick={() =>
                    earlySettlementsApi
                      .approve(id, s.id, { approvedBy: apprBy })
                      .then(() => {
                        toast({ title: "Approved" });
                        qc.invalidateQueries({ queryKey: ["loans", "sett", id] });
                      })
                      .catch((e) => toast({ variant: "destructive", description: describeApiError(e) }))
                  }
                >
                  Approve
                </Button>
                <Input placeholder="Reject" className="h-8 max-w-[10rem]" value={rejR} onChange={(e) => setRejR(e.target.value)} />
                <Input className="h-8 w-24" value={rejBy} onChange={(e) => setRejBy(e.target.value)} placeholder="Rejected by" />
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() =>
                    earlySettlementsApi
                      .reject(id, s.id, { rejectionReason: rejR || "No", rejectedBy: rejBy })
                      .then(() => {
                        toast({ title: "Rejected" });
                        qc.invalidateQueries({ queryKey: ["loans", "sett", id] });
                      })
                      .catch((e) => toast({ variant: "destructive", description: describeApiError(e) }))
                  }
                >
                  Reject
                </Button>
                <Input placeholder="Cancel reason" className="h-8 max-w-[10rem]" value={canR} onChange={(e) => setCanR(e.target.value)} />
                <Input className="h-8 w-24" value={canBy} onChange={(e) => setCanBy(e.target.value)} placeholder="Cancelled by" />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    earlySettlementsApi
                      .cancel(id, s.id, { cancellationReason: canR || "Cancel", cancelledBy: canBy })
                      .then(() => {
                        toast({ title: "Cancelled" });
                        qc.invalidateQueries({ queryKey: ["loans", "sett", id] });
                      })
                      .catch((e) => toast({ variant: "destructive", description: describeApiError(e) }))
                  }
                >
                  Cancel
                </Button>
                <DateInput className="h-8 w-36" value={payDate} onChange={setPayDate} />
                <Input className="h-8 w-28" value={procBy} onChange={(e) => setProcBy(e.target.value)} />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    earlySettlementsApi
                      .process(id, s.id, { paymentDate: payDate, processedBy: procBy })
                      .then(() => {
                        toast({ title: "Processed" });
                        qc.invalidateQueries({ queryKey: ["loans", "sett", id] });
                      })
                      .catch((e) => toast({ variant: "destructive", description: describeApiError(e) }))
                  }
                >
                  Process
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
