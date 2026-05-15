"use client";

import * as React from "react";
import Link from "next/link";
import { useQueries, useQuery } from "@tanstack/react-query";
import { RouteGuard } from "@/components/rbac/route-guard";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  loanAccountsApi,
  loanProductsApi,
  LOAN_PRODUCT_TYPES,
  LOAN_STATUSES,
  type DelinquencyBucket,
} from "@/lib/api/modules/loans";
import { Permissions } from "@/lib/rbac/permissions";

const BUCKETS: DelinquencyBucket[] = [
  "CURRENT",
  "DPD_1_30",
  "DPD_31_60",
  "DPD_61_90",
  "DPD_91_180",
  "DPD_180_PLUS",
];

type Tab = "delinquency" | "maturing" | "exposure" | "counts";

export default function LoanReportsPage() {
  return (
    <RouteGuard permissions={[Permissions.LoanRead]}>
      <Content />
    </RouteGuard>
  );
}

function Content() {
  const [tab, setTab] = React.useState<Tab>("delinquency");
  const [bucket, setBucket] = React.useState<DelinquencyBucket>("DPD_1_30");
  const [mStart, setMStart] = React.useState("");
  const [mEnd, setMEnd] = React.useState("");
  const [custId, setCustId] = React.useState("");

  const bucketQ = useQuery({
    queryKey: ["loans", "reports", "bucket", bucket],
    queryFn: () => loanAccountsApi.listByDelinquencyBucket(bucket, 0, 25),
    enabled: tab === "delinquency",
  });

  const maturingQ = useQuery({
    queryKey: ["loans", "reports", "maturing", mStart, mEnd],
    queryFn: () => loanAccountsApi.listMaturingBetween(mStart, mEnd, 0, 25),
    enabled: tab === "maturing" && Boolean(mStart && mEnd),
  });

  const exposureQ = useQuery({
    queryKey: ["loans", "reports", "exposure", custId],
    queryFn: () => loanAccountsApi.customerExposure(custId),
    enabled: tab === "exposure" && Boolean(custId.trim()),
  });

  const statusCounts = useQueries({
    queries: LOAN_STATUSES.map((status) => ({
      queryKey: ["loans", "reports", "status-count", status],
      queryFn: () => loanAccountsApi.listByStatus(status, 0, 1),
      enabled: tab === "counts",
    })),
  });

  const productCounts = useQueries({
    queries: LOAN_PRODUCT_TYPES.map((t) => ({
      queryKey: ["loans", "reports", "ptype-count", t],
      queryFn: () => loanProductsApi.countByType(t),
      enabled: tab === "counts",
    })),
  });

  const activeProducts = useQuery({
    queryKey: ["loans", "reports", "active-products"],
    queryFn: () => loanProductsApi.countActive(),
    enabled: tab === "counts",
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Loan reports" description="Delinquency, maturity, exposure, portfolio counts" />
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["delinquency", "Delinquency"],
            ["maturing", "Maturing"],
            ["exposure", "Exposure"],
            ["counts", "Counts"],
          ] as const
        ).map(([k, label]) => (
          <Button key={k} size="sm" variant={tab === k ? "secondary" : "outline"} onClick={() => setTab(k)}>
            {label}
          </Button>
        ))}
      </div>

      {tab === "delinquency" ? (
        <Card>
          <CardHeader>
            <CardTitle>By delinquency bucket</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <select className="border rounded-md p-2 text-sm" value={bucket} onChange={(e) => setBucket(e.target.value as DelinquencyBucket)}>
              {BUCKETS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <ul className="text-sm space-y-1">
              {(bucketQ.data?.content ?? []).map((row) => (
                <li key={row.id}>
                  <Link href={`/loans/accounts/${row.id}`} className="underline font-mono text-xs">
                    {row.loanAccountNumber}
                  </Link>{" "}
                  <span className="text-muted-foreground">{row.status}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {tab === "maturing" ? (
        <Card>
          <CardHeader>
            <CardTitle>Maturing in window</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Input type="date" value={mStart} onChange={(e) => setMStart(e.target.value)} />
              <Input type="date" value={mEnd} onChange={(e) => setMEnd(e.target.value)} />
            </div>
            <ul className="text-sm space-y-1">
              {(maturingQ.data?.content ?? []).map((row) => (
                <li key={row.id}>
                  <Link href={`/loans/accounts/${row.id}`} className="underline font-mono text-xs">
                    {row.loanAccountNumber}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {tab === "exposure" ? (
        <Card>
          <CardHeader>
            <CardTitle>Customer exposure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-w-md">
            <Input placeholder="Customer UUID" value={custId} onChange={(e) => setCustId(e.target.value)} className="font-mono text-xs" />
            <p className="text-sm">
              Total exposure: <strong>{exposureQ.data !== undefined ? String(exposureQ.data) : "—"}</strong>
            </p>
          </CardContent>
        </Card>
      ) : null}

      {tab === "counts" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Active loan products</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              Count: <strong>{activeProducts.data !== undefined ? activeProducts.data : "…"}</strong>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>By product type</CardTitle>
            </CardHeader>
            <CardContent className="text-xs font-mono space-y-1">
              {LOAN_PRODUCT_TYPES.map((t, i) => (
                <div key={t} className="flex justify-between gap-2">
                  <span>{t}</span>
                  <span>{productCounts[i].data !== undefined ? String(productCounts[i].data) : "…"}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Loans by status (totalElements)</CardTitle>
            </CardHeader>
            <CardContent className="text-xs font-mono space-y-1">
              {LOAN_STATUSES.map((s, i) => (
                <div key={s} className="flex justify-between gap-2">
                  <span>{s}</span>
                  <span>
                    {statusCounts[i].data?.totalElements !== undefined
                      ? String(statusCounts[i].data.totalElements)
                      : "…"}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
