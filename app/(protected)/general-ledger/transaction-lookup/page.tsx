"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { RouteGuard } from "@/components/rbac/route-guard";
import { describeApiError } from "@/lib/api/errors";
import { glTransactionsApi } from "@/lib/api/modules/operations";
import { Permissions } from "@/lib/rbac/permissions";
import { StatusBadge } from "@/components/data/status-badge";

export default function TransactionLookupPage() {
  return (
    <RouteGuard permissions={[Permissions.GlRead]}>
      <TransactionLookupContent />
    </RouteGuard>
  );
}

function TransactionLookupContent() {
  const [id, setId] = React.useState("");
  const [refId, setRefId] = React.useState("");
  const [searchId, setSearchId] = React.useState<string | null>(null);
  const [searchRef, setSearchRef] = React.useState<string | null>(null);

  const byId = useQuery({
    queryKey: ["gl-transaction", "id", searchId],
    queryFn: () => glTransactionsApi.byId(searchId!),
    enabled: Boolean(searchId),
  });

  const byRef = useQuery({
    queryKey: ["gl-transaction", "ref", searchRef],
    queryFn: () => glTransactionsApi.byReference(searchRef!),
    enabled: Boolean(searchRef && !searchId),
  });

  const active = searchId ? byId : byRef;
  const data = active.data;

  const validate = useQuery({
    queryKey: ["gl-transaction-validate", data?.id],
    queryFn: () => glTransactionsApi.validateBalance(data!.id),
    enabled: Boolean(data?.id),
  });

  const onSearchId = () => {
    setSearchRef(null);
    setSearchId(id.trim() || null);
    setRefId("");
  };

  const onSearchRef = () => {
    setSearchId(null);
    setSearchRef(refId.trim() || null);
    setId("");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="GL transaction lookup"
        description="GET /api/v1/gl/transactions/{id} · /reference/{referenceId} · debit/credit parity check."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>By transaction ID</CardTitle>
            <CardDescription>UUID returned from posting or approvals.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Input placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value={id} onChange={(e) => setId(e.target.value)} />
            <Button type="button" onClick={onSearchId}>
              Lookup
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>By external reference</CardTitle>
            <CardDescription>Business reference propagated with the maker submission.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Input placeholder="TXN-2026-..." value={refId} onChange={(e) => setRefId(e.target.value)} />
            <Button type="button" onClick={onSearchRef}>
              Lookup
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Result</CardTitle>
          <CardDescription>Balance validation fires automatically after a successful hit.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!searchId && !searchRef ? (
            <EmptyState title="Nothing to display" description="Enter an ID or reference and tap lookup." />
          ) : active.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : active.isError ? (
            <EmptyState title="Not found or error" description={describeApiError(active.error)} />
          ) : !data ? (
            <EmptyState title="Unknown" />
          ) : (
            <div className="grid gap-2 text-sm">
              <Row label="ID" value={<span className="font-mono text-xs">{data.id}</span>} />
              <Row label="Reference" value={data.referenceId ?? "—"} />
              <Row label="Status">
                <StatusBadge status={data.status ?? "?"} />
              </Row>
              <Row label="Date" value={data.transactionDate ?? "—"} />
              <Row label="Currency" value={data.currency ?? "—"} />
              <Row label="Created by" value={data.createdBy ?? "—"} />
              <Row label="Description" value={data.description ?? "—"} />
              {validate.isSuccess ? (
                <Row label="Balanced entries">
                  <StatusBadge
                    status={validate.data.balanced ? "YES" : "NO"}
                    variantOverride={validate.data.balanced ? "success" : "destructive"}
                  />
                </Row>
              ) : validate.isLoading ? (
                <Skeleton className="h-8 w-full" />
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, children }: { label: string; value?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-border/60 pb-2 sm:grid-cols-[160px_1fr]">
      <Label className="text-muted-foreground">{label}</Label>
      <div className="min-w-0">{children ?? value}</div>
    </div>
  );
}
