"use client";

import { RouteGuard } from "@/components/rbac/route-guard";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Permissions } from "@/lib/rbac/permissions";
import { CustomerQuickLookup } from "@/components/customers/customer-quick-lookup";

export default function DocumentHubPage() {
  return (
    <RouteGuard permissions={[Permissions.CustomerPiiRead]}>
      <div className="space-y-6">
        <PageHeader
          title="ID documents"
          description="Requires customer:pii:read. Search for a customer (same as directory), then open identification documents."
        />
        <Card className="max-w-4xl">
          <CardHeader>
            <CardTitle>Open documents</CardTitle>
            <CardDescription>Search by customer number, name, contact, address, or UUID.</CardDescription>
          </CardHeader>
          <CardContent>
            <CustomerQuickLookup
              hrefForCustomer={(id) => `/customers/${id}/documents`}
              actionLabel="Documents"
            />
          </CardContent>
        </Card>
      </div>
    </RouteGuard>
  );
}
