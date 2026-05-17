"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Permissions } from "@/lib/rbac/permissions";
import { rolesApi, type PermissionInfo } from "@/lib/api/modules/roles";
import { describeApiError } from "@/lib/api/errors";

export default function PermissionCatalogPage() {
  return (
    <RouteGuard permissions={[Permissions.AdminRolesRead]}>
      <PermissionCatalogContent />
    </RouteGuard>
  );
}

function PermissionCatalogContent() {
  const q = useQuery({
    queryKey: ["identity", "roles", "permissions-catalog"],
    queryFn: () => rolesApi.permissionsCatalog(),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Permission catalogue"
        description="Authoritative catalogue of BankingPermission literals you can attach to roles."
      />
      <Card>
        <CardHeader>
          <CardTitle>Catalogue</CardTitle>
          <CardDescription>Enum name, JWT authority, and operator-facing description.</CardDescription>
        </CardHeader>
        <CardContent>
          {q.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : q.isError ? (
            <p className="text-sm text-destructive">{describeApiError(q.error)}</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Authority</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(q.data ?? []).map((row: PermissionInfo) => (
                    <TableRow key={row.name}>
                      <TableCell className="font-mono text-xs">{row.name}</TableCell>
                      <TableCell className="font-mono text-xs">{row.authority ?? "—"}</TableCell>
                      <TableCell className="max-w-md text-sm text-muted-foreground">
                        {row.description ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
