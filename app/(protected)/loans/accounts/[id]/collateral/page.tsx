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
import { loanCollateralApi, type CollateralType, type CollateralStatus } from "@/lib/api/modules/loans";
import { Permissions } from "@/lib/rbac/permissions";
import { collateralRegisterSchema } from "@/lib/schemas/loans";

const CTYPES: CollateralType[] = [
  "REAL_ESTATE",
  "VEHICLE",
  "GOLD",
  "SECURITIES",
  "FIXED_DEPOSIT",
  "EQUIPMENT",
  "INVENTORY",
  "ACCOUNTS_RECEIVABLE",
  "OTHER",
];

export default function CollateralPage() {
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
    queryKey: ["loans", "coll", id],
    queryFn: () => loanCollateralApi.list(id),
    enabled: Boolean(id),
  });
  const ac = useQuery({
    queryKey: ["loans", "coll", id, "count"],
    queryFn: () => loanCollateralApi.activeCount(id),
    enabled: Boolean(id),
  });

  const [ctype, setCtype] = React.useState<CollateralType>("REAL_ESTATE");
  const [desc, setDesc] = React.useState("");
  const [valAmt, setValAmt] = React.useState("10000");
  const [ccy, setCcy] = React.useState("EUR");
  const [valDate, setValDate] = React.useState("");
  const [loc, setLoc] = React.useState("");

  const reg = useMutation({
    mutationFn: () =>
      loanCollateralApi.register(id, {
        loanAccountId: id,
        collateralType: ctype,
        description: desc,
        valuationAmount: Number(valAmt),
        currency: ccy,
        valuationDate: valDate,
        location: loc || undefined,
      }),
    onSuccess: () => {
      toast({ title: "Registered" });
      qc.invalidateQueries({ queryKey: ["loans", "coll", id] });
    },
    onError: (e) => toast({ variant: "destructive", description: describeApiError(e) }),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Collateral" description={`Active count: ${ac.data ?? "…"}`} />
      <LoanServicingLinks loanAccountId={id} />

      <Card>
        <CardHeader>
          <CardTitle>Register</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 max-w-xl">
          <select className="border rounded p-2 text-sm" value={ctype} onChange={(e) => setCtype(e.target.value as CollateralType)}>
            {CTYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <Textarea placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <div className="flex gap-2">
            <Input type="number" value={valAmt} onChange={(e) => setValAmt(e.target.value)} />
            <Input className="w-24" value={ccy} onChange={(e) => setCcy(e.target.value.toUpperCase())} maxLength={3} />
            <Input type="date" value={valDate} onChange={(e) => setValDate(e.target.value)} />
          </div>
          <Input placeholder="Location" value={loc} onChange={(e) => setLoc(e.target.value)} />
          <Button
            disabled={reg.isPending}
            onClick={() => {
              const p = collateralRegisterSchema.safeParse({
                collateralType: ctype,
                description: desc,
                valuationAmount: Number(valAmt),
                currency: ccy,
                valuationDate: valDate,
                location: loc,
              });
              if (!p.success) {
                toast({ variant: "destructive", description: p.error.errors[0]?.message });
                return;
              }
              reg.mutate();
            }}
          >
            Register
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(list.data ?? []).map((c) => (
            <CollateralRow key={c.id} loanId={id} c={c} onChange={() => qc.invalidateQueries({ queryKey: ["loans", "coll", id] })} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function CollateralRow({
  loanId,
  c,
  onChange,
}: {
  loanId: string;
  c: { id: string; collateralType?: string; status?: string; valuationAmount?: number };
  onChange: () => void;
}) {
  const { toast } = useToast();
  const [vAmt, setVAmt] = React.useState(String(c.valuationAmount ?? ""));
  const [vDt, setVDt] = React.useState("");
  const [nSt, setNSt] = React.useState<CollateralStatus>("ACTIVE");
  const [liq, setLiq] = React.useState("0");
  return (
    <div className="border rounded-md p-3 text-sm space-y-2">
      <div className="flex flex-wrap gap-2 items-center">
        <span className="font-mono text-[10px]">{c.id}</span>
        {c.collateralType} {c.status ? <StatusBadge status={c.status} /> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Input className="h-8 w-28" value={vAmt} onChange={(e) => setVAmt(e.target.value)} />
        <Input type="date" className="h-8 w-36" value={vDt} onChange={(e) => setVDt(e.target.value)} />
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            loanCollateralApi
              .updateValuation(loanId, c.id, { valuationAmount: Number(vAmt), valuationDate: vDt })
              .then(() => {
                toast({ title: "Valuation updated" });
                onChange();
              })
              .catch((e) => toast({ variant: "destructive", description: describeApiError(e) }))
          }
        >
          Valuation
        </Button>
        <select className="h-8 border rounded text-xs" value={nSt} onChange={(e) => setNSt(e.target.value as CollateralStatus)}>
          {(["ACTIVE", "RELEASED", "LIQUIDATED", "UNDER_VALUATION"] as const).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          onClick={() =>
            loanCollateralApi
              .updateStatus(loanId, c.id, { newStatus: nSt })
              .then(() => {
                toast({ title: "Status" });
                onChange();
              })
              .catch((e) => toast({ variant: "destructive", description: describeApiError(e) }))
          }
        >
          Set status
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            loanCollateralApi
              .release(loanId, c.id)
              .then(() => {
                toast({ title: "Released" });
                onChange();
              })
              .catch((e) => toast({ variant: "destructive", description: describeApiError(e) }))
          }
        >
          Release
        </Button>
        <Input className="h-8 w-24" value={liq} onChange={(e) => setLiq(e.target.value)} />
        <Button
          size="sm"
          variant="destructive"
          onClick={() =>
            loanCollateralApi
              .liquidate(loanId, c.id, { liquidationAmount: Number(liq) })
              .then(() => {
                toast({ title: "Liquidated" });
                onChange();
              })
              .catch((e) => toast({ variant: "destructive", description: describeApiError(e) }))
          }
        >
          Liquidate
        </Button>
      </div>
    </div>
  );
}
