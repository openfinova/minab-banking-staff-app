"use client";

import { RouteGuard } from "@/components/rbac/route-guard";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoansOverviewPage() {
  return (
    <RouteGuard>
      <div className="space-y-6">
        <PageHeader
          title="Loans"
          description="Origination, servicing, and lifecycle tooling. Services will appear in the sidebar as they are added."
        />
        <Card>
          <CardHeader>
            <CardTitle>Module overview</CardTitle>
            <CardDescription>No loan services are registered in the portal yet.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Use this area for pipelines, collections, and collateral when lending modules are connected.
          </CardContent>
        </Card>
      </div>
    </RouteGuard>
  );
}
