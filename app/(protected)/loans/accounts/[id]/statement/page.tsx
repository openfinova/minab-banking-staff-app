"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { RouteGuard } from "@/components/rbac/route-guard";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoanServicingLinks } from "@/components/loans/loan-servicing-links";
import { describeApiError } from "@/lib/api/errors";
import { loanAccountsApi } from "@/lib/api/modules/loans";
import { Permissions } from "@/lib/rbac/permissions";
import { Skeleton } from "@/components/ui/skeleton";

export default function LoanStatementPage() {
  return (
    <RouteGuard permissions={[Permissions.LoanRead]}>
      <StatementContent />
    </RouteGuard>
  );
}

function StatementContent() {
  const { id } = useParams<{ id: string }>();
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");

  const stmt = useQuery({
    queryKey: ["loans", "account", id, "statement", from, to],
    queryFn: () => loanAccountsApi.statement(id, from, to),
    enabled: false,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Loan statement" description="GET /api/v1/loan-accounts/{id}/statement" />
      <LoanServicingLinks loanAccountId={id} />
      <Card>
        <CardContent className="pt-6 flex flex-wrap items-end gap-3">
          <div className="grid gap-1.5">
            <Label>From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button type="button" disabled={!from || !to} onClick={() => stmt.refetch()}>
            Generate
          </Button>
        </CardContent>
      </Card>
      {stmt.isFetching ? (
        <Skeleton className="h-40 w-full" />
      ) : stmt.isError ? (
        <p className="text-destructive text-sm">{describeApiError(stmt.error)}</p>
      ) : stmt.data ? (
        <pre className="rounded-md border bg-muted/30 p-4 text-xs overflow-auto max-h-[480px]">
          {JSON.stringify(stmt.data, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
