"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RouteGuard } from "@/components/rbac/route-guard";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LoanServicingLinks } from "@/components/loans/loan-servicing-links";
import { StatusBadge } from "@/components/data/status-badge";
import { describeApiError } from "@/lib/api/errors";
import { useToast } from "@/components/ui/use-toast";
import { loanGuarantorsApi, type GuarantorType, type GuarantorStatus } from "@/lib/api/modules/loans";
import { Permissions } from "@/lib/rbac/permissions";
import { guarantorAddSchema } from "@/lib/schemas/loans";

const GTYPES: GuarantorType[] = ["INDIVIDUAL", "CORPORATE", "GOVERNMENT", "BANK_GUARANTEE"];

export default function GuarantorsPage() {
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
    queryKey: ["loans", "guar", id],
    queryFn: () => loanGuarantorsApi.list(id),
    enabled: Boolean(id),
  });
  const cnt = useQuery({
    queryKey: ["loans", "guar", id, "c"],
    queryFn: () => loanGuarantorsApi.activeCount(id),
    enabled: Boolean(id),
  });

  const [cid, setCid] = React.useState("");
  const [gt, setGt] = React.useState<GuarantorType>("INDIVIDUAL");
  const [gamt, setGamt] = React.useState("5000");
  const [grm, setGrm] = React.useState("");

  const add = useMutation({
    mutationFn: () =>
      loanGuarantorsApi.add(id, {
        loanAccountId: id,
        customerId: cid,
        guarantorType: gt,
        guaranteedAmount: Number(gamt),
        remarks: grm || undefined,
      }),
    onSuccess: () => {
      toast({ title: "Added" });
      qc.invalidateQueries({ queryKey: ["loans", "guar", id] });
    },
    onError: (e) => toast({ variant: "destructive", description: describeApiError(e) }),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Guarantors" description={`Active: ${cnt.data ?? "…"}`} />
      <LoanServicingLinks loanAccountId={id} />

      <Card>
        <CardHeader>
          <CardTitle>Add guarantor</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 max-w-lg">
          <Input placeholder="Customer UUID" value={cid} onChange={(e) => setCid(e.target.value)} className="font-mono text-xs" />
          <select className="border rounded p-2 text-sm" value={gt} onChange={(e) => setGt(e.target.value as GuarantorType)}>
            {GTYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <Input type="number" value={gamt} onChange={(e) => setGamt(e.target.value)} />
          <Textarea placeholder="Remarks" value={grm} onChange={(e) => setGrm(e.target.value)} />
          <Button
            disabled={add.isPending}
            onClick={() => {
              const p = guarantorAddSchema.safeParse({
                customerId: cid,
                guarantorType: gt,
                guaranteedAmount: Number(gamt),
                remarks: grm,
              });
              if (!p.success) {
                toast({ variant: "destructive", description: p.error.errors[0]?.message });
                return;
              }
              add.mutate();
            }}
          >
            Add
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>List</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(list.data ?? []).map((g) => (
            <GuarantorRow key={g.id} loanId={id} g={g} onChange={() => qc.invalidateQueries({ queryKey: ["loans", "guar", id] })} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function GuarantorRow({
  loanId,
  g,
  onChange,
}: {
  loanId: string;
  g: { id: string; customerId?: string; status?: string; guaranteedAmount?: number };
  onChange: () => void;
}) {
  const { toast } = useToast();
  const [nst, setNst] = React.useState<GuarantorStatus>("ACTIVE");
  const [updBy, setUpdBy] = React.useState("staff");
  const [relBy, setRelBy] = React.useState("staff");
  const [remReas, setRemReas] = React.useState("");
  const [remBy, setRemBy] = React.useState("staff");
  return (
    <div className="border rounded p-3 text-sm space-y-2">
      <div className="font-mono text-[10px]">{g.id}</div>
      <div>
        customer {g.customerId} amt {g.guaranteedAmount}{" "}
        {g.status ? <StatusBadge status={g.status} /> : null}
      </div>
      <div className="flex flex-wrap gap-1">
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            loanGuarantorsApi
              .verify(loanId, g.id, {})
              .then(() => {
                toast({ title: "Verified" });
                onChange();
              })
              .catch((e) => toast({ variant: "destructive", description: describeApiError(e) }))
          }
        >
          Verify
        </Button>
        <select className="h-8 border rounded text-xs" value={nst} onChange={(e) => setNst(e.target.value as GuarantorStatus)}>
          {(["PENDING", "ACTIVE", "RELEASED", "INVOKED", "REMOVED"] as const).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <Input className="h-8 w-24" value={updBy} onChange={(e) => setUpdBy(e.target.value)} />
        <Button
          size="sm"
          onClick={() =>
            loanGuarantorsApi
              .updateStatus(loanId, g.id, { newStatus: nst, updatedBy: updBy })
              .then(() => {
                toast({ title: "Status" });
                onChange();
              })
              .catch((e) => toast({ variant: "destructive", description: describeApiError(e) }))
          }
        >
          Status
        </Button>
        <Input className="h-8 w-24" value={relBy} onChange={(e) => setRelBy(e.target.value)} />
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            loanGuarantorsApi
              .release(loanId, g.id, { releasedBy: relBy })
              .then(() => {
                toast({ title: "Released" });
                onChange();
              })
              .catch((e) => toast({ variant: "destructive", description: describeApiError(e) }))
          }
        >
          Release
        </Button>
        <Input placeholder="Removal" className="h-8 max-w-[8rem]" value={remReas} onChange={(e) => setRemReas(e.target.value)} />
        <Input className="h-8 w-20" value={remBy} onChange={(e) => setRemBy(e.target.value)} />
        <Button
          size="sm"
          variant="destructive"
          onClick={() =>
            loanGuarantorsApi
              .remove(loanId, g.id, { removalReason: remReas || "Removed", removedBy: remBy })
              .then(() => {
                toast({ title: "Removed" });
                onChange();
              })
              .catch((e) => toast({ variant: "destructive", description: describeApiError(e) }))
          }
        >
          Remove
        </Button>
      </div>
    </div>
  );
}
