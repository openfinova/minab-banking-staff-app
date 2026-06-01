"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { glOperationalAccountsApi } from "@/lib/api/modules/operations";
import { Permissions } from "@/lib/rbac/permissions";
import { CopyableUuid } from "@/components/data/copyable-uuid";
import { StatusBadge } from "@/components/data/status-badge";

export default function OperationalGlAccountsPage() {
  return (
    <RouteGuard permissions={[Permissions.GlRead]}>
      <OperationalContent />
    </RouteGuard>
  );
}

function OperationalContent() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const configs = useQuery({
    queryKey: ["gl-operational-configs"],
    queryFn: glOperationalAccountsApi.listActive,
  });

  const validation = useQuery({
    queryKey: ["gl-operational-validate"],
    queryFn: glOperationalAccountsApi.validate,
  });

  const wireStandard = useMutation({
    mutationFn: () => glOperationalAccountsApi.wireStandardMappings(),
    onSuccess: (body) => {
      qc.invalidateQueries({ queryKey: ["gl-operational-configs"] });
      qc.invalidateQueries({ queryKey: ["gl-operational-validate"] });
      toast({
        title: "Standard mappings wired",
        description:
          typeof body.count === "number"
            ? `Created or ensured ${body.count} configuration${body.count === 1 ? "" : "s"}.`
            : "Refresh complete.",
      });
    },
    onError: (error) =>
      toast({ variant: "destructive", title: "Request failed", description: describeApiError(error) }),
  });

  const valid = validation.data?.valid;
  const missing = validation.data?.missingTypes ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operational GL mappings"
        description="Map operational buckets (vault cash, clearing, …) to GL accounts so postings land on the right codes."
        actions={
          <div className="flex flex-wrap gap-2">
            <Can permissions={[Permissions.GlApprove]}>
              <Button type="button" loading={wireStandard.isPending} onClick={() => wireStandard.mutate()}>
                Wire standard mappings
              </Button>
            </Can>
            <Button variant="outline" asChild>
              <Link href="/general-ledger/chart-of-accounts">Chart of accounts</Link>
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Validation snapshot</CardTitle>
          <CardDescription>
            Sanity-check mappings before high-volume posting — quick pass/fail.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {validation.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : validation.isError ? (
            <EmptyState title="Validation unavailable" description={describeApiError(validation.error)} />
          ) : (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <StatusBadge
                status={valid ? "COMPLETE" : "INCOMPLETE"}
                variantOverride={valid ? "success" : "destructive"}
              />
              {!valid && missing.length ? (
                <span className="text-muted-foreground">Missing types: {missing.join(", ")}</span>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active configurations</CardTitle>
          <CardDescription>Review every operational type and its linked GL code.</CardDescription>
        </CardHeader>
        <CardContent>
          {configs.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : configs.isError ? (
            <EmptyState title="Could not load configs" description={describeApiError(configs.error)} />
          ) : !configs.data?.length ? (
            <EmptyState
              title="No operational mappings yet"
              description="Create the chart of accounts first, then apply the standard operational wiring from setup."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>UUID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>GL code</TableHead>
                  <TableHead>GL name</TableHead>
                  <TableHead>Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.data.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <CopyableUuid value={c.id} />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{c.type}</TableCell>
                    <TableCell className="font-mono text-xs">{c.glAccountCode}</TableCell>
                    <TableCell>{c.glAccountName}</TableCell>
                    <TableCell>
                      <StatusBadge status={c.active ? "ACTIVE" : "INACTIVE"} />
                    </TableCell>
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
