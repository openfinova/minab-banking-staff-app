"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Can } from "@/components/rbac/can";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/data/status-badge";
import Link from "next/link";
import { describeApiError } from "@/lib/api/errors";
import { customersApi } from "@/lib/api/modules/customers";
import { Permissions } from "@/lib/rbac/permissions";
import { CustomerQuickLookup } from "@/components/customers/customer-quick-lookup";

export default function CustomerLookupPage() {
  return (
    <RouteGuard permissions={[Permissions.CustomerRead]}>
      <CustomerLookupContent />
    </RouteGuard>
  );
}

function CustomerLookupContent() {
  const [taxId, setTaxId] = React.useState("");

  const byTax = useMutation({
    mutationFn: () => customersApi.getByTaxId(taxId.trim()),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer lookup"
        description="Search customers like the directory (GET /api/v1/customers?q=), or resolve by tax id (GET /api/v1/customers/tax-id/...) with customer:pii:read."
      />

      <Card>
        <CardHeader>
          <CardTitle>Search</CardTitle>
          <CardDescription>
            Text search uses the same rules as the customer directory; tax id uses a separate endpoint.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="search" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="search">Directory search</TabsTrigger>
              <TabsTrigger value="tax">By tax id</TabsTrigger>
            </TabsList>
            <TabsContent value="search" className="pt-4">
              <CustomerQuickLookup
                hrefForCustomer={(id) => `/customers/${id}`}
                actionLabel="Open record"
              />
            </TabsContent>
            <TabsContent value="tax" className="space-y-4 pt-4">
              <Can
                permissions={[Permissions.CustomerPiiRead]}
                fallback={
                  <p className="text-sm text-muted-foreground">
                    Tax id lookup requires the <code className="text-xs">customer:pii:read</code> permission.
                  </p>
                }
              >
                <div className="grid max-w-lg gap-2">
                  <Label htmlFor="tid">Tax identification number</Label>
                  <Input id="tid" value={taxId} onChange={(e) => setTaxId(e.target.value)} />
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    if (!taxId.trim()) return;
                    byTax.mutate();
                  }}
                  disabled={byTax.isPending || !taxId.trim()}
                >
                  {byTax.isPending ? "Loading…" : "Lookup"}
                </Button>
                {byTax.isError ? (
                  <p className="text-sm text-destructive">{describeApiError(byTax.error)}</p>
                ) : null}
                {byTax.data ? <CustomerLookupResult c={byTax.data} /> : null}
              </Can>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function CustomerLookupResult({ c }: { c: Awaited<ReturnType<typeof customersApi.get>> }) {
  const label =
    c.type === "BUSINESS" || c.type === "TRUST"
      ? (c.businessName ?? c.customerNumber)
      : [c.firstName, c.lastName].filter(Boolean).join(" ") || c.customerNumber;

  return (
    <div className="rounded-md border bg-card p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">{label}</p>
          <p className="font-mono text-xs text-muted-foreground">{c.customerNumber}</p>
        </div>
        <Button variant="secondary" size="sm" asChild>
          <Link href={`/customers/${c.id}`}>Open record</Link>
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <StatusBadge status={c.status} />
        <StatusBadge status={c.kycStatus} />
        <span className="text-xs text-muted-foreground">{c.type}</span>
      </div>
    </div>
  );
}
