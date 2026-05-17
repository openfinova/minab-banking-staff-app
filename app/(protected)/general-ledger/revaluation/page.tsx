"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Can } from "@/components/rbac/can";
import { RouteGuard } from "@/components/rbac/route-guard";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";
import { glRevaluationApi } from "@/lib/api/modules/operations";
import { useAuthStore } from "@/lib/auth/auth-store";
import { Permissions } from "@/lib/rbac/permissions";
import { formatCurrency } from "@/lib/utils";

export default function RevaluationPage() {
  return (
    <RouteGuard permissions={[Permissions.GlRead]}>
      <RevaluationContent />
    </RouteGuard>
  );
}

function RevaluationContent() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const username = useAuthStore((s) => s.session?.user.username ?? "operator");
  const today = React.useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [asOf, setAsOf] = React.useState(today);

  const runs = useQuery({
    queryKey: ["gl-revaluation-runs"],
    queryFn: () => glRevaluationApi.listRuns(),
  });

  const trigger = useMutation({
    mutationFn: () => glRevaluationApi.trigger(asOf, username),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gl-revaluation-runs"] });
      toast({ title: "Revaluation run posted", description: "See latest row in history." });
    },
    onError: (e) =>
      toast({ variant: "destructive", title: "Revaluation failed", description: describeApiError(e) }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="FX revaluation"
        description="Run multi-currency remeasurement as of a date and review prior run history."
        actions={
          <Can permissions={[Permissions.GlApprove]}>
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase text-muted-foreground">As of</Label>
                <Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
              </div>
              <Button type="button" loading={trigger.isPending} onClick={() => trigger.mutate()}>
                Run revaluation
              </Button>
            </div>
          </Can>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Recent runs</CardTitle>
          <CardDescription>Ordered most-recent first from the GL service.</CardDescription>
        </CardHeader>
        <CardContent>
          {runs.isLoading ? (
            <Skeleton className="h-28 w-full" />
          ) : runs.isError ? (
            <EmptyState title="Could not load runs" description={describeApiError(runs.error)} />
          ) : !runs.data?.length ? (
            <EmptyState title="No revaluation runs" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Executed</TableHead>
                  <TableHead>As of</TableHead>
                  <TableHead>By</TableHead>
                  <TableHead className="text-right">Adjusted</TableHead>
                  <TableHead className="text-right">Processed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.data.slice(0, 40).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{r.executedAt ?? r.id.slice(0, 8)}</TableCell>
                    <TableCell className="text-xs">{r.revaluationDate}</TableCell>
                    <TableCell className="text-xs">{r.executedBy ?? "—"}</TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {formatCurrency(Number(r.totalAdjustment ?? 0), r.baseCurrency ?? "EUR")}
                    </TableCell>
                    <TableCell className="text-right text-xs">{r.accountsProcessed ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
