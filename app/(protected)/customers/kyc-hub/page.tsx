"use client";

import { RouteGuard } from "@/components/rbac/route-guard";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Permissions } from "@/lib/rbac/permissions";
import { CustomerQuickLookup } from "@/components/customers/customer-quick-lookup";

export default function KycHubPage() {
  return (
    <RouteGuard permissions={[Permissions.CustomerRead]}>
      <div className="space-y-6">
        <PageHeader
          title="KYC workspace"
          description="Find a customer by number, name, email, phone, address, or UUID — same search as the directory — then open the KYC console."
        />
        <Card className="max-w-4xl">
          <CardHeader>
            <CardTitle>Open workflow</CardTitle>
            <CardDescription>
              Search below, then use “KYC console” on the row you need (initiate, documents, review, history).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CustomerQuickLookup
              hrefForCustomer={(id) => `/customers/${id}/kyc`}
              actionLabel="KYC console"
            />
          </CardContent>
        </Card>
      </div>
    </RouteGuard>
  );
}
