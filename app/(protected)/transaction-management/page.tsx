"use client";

import { RouteGuard } from "@/components/rbac/route-guard";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function TransactionManagementOverviewPage() {
  return (
    <RouteGuard>
      <div className="space-y-6">
        <PageHeader
          title="Transaction management"
          description="Operational and processing tools for payments and related flows. Links to individual services appear in the sidebar under this module."
        />
        <Card>
          <CardHeader>
            <CardTitle>Getting started</CardTitle>
            <CardDescription>Use the sidebar to open a service.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            More transaction services will be added here over time.
          </CardContent>
        </Card>
      </div>
    </RouteGuard>
  );
}
