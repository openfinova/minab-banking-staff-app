"use client";

import Link from "next/link";
import { RouteGuard } from "@/components/rbac/route-guard";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Permissions } from "@/lib/rbac/permissions";
import { navSections } from "@/lib/nav/navigation";
import { cn } from "@/lib/utils";

export default function CustomersOverviewPage() {
  const section = navSections.find((s) => s.id === "customers");

  return (
    <RouteGuard permissions={[Permissions.CustomerRead, Permissions.CustomerWrite]} mode="any">
      <div className="space-y-6">
        <PageHeader
          title="Customers"
          description="Management tools for customer profiles, contacts, addresses, relationships, and KYC workflows (backend /api/v1/customers)."
        />
        <Card>
          <CardHeader>
            <CardTitle>Module routes</CardTitle>
            <CardDescription>
              Sub-pages map to the customer service controllers: core CRUD, contacts, addresses,
              relationships, and KYC under each customer id.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {section?.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex flex-col rounded-md border border-border/80 bg-card px-3 py-2 text-sm shadow-sm transition-colors",
                      "hover:bg-accent/40",
                    )}
                  >
                    <span className="font-medium">{item.label}</span>
                    {item.title ? (
                      <span className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{item.title}</span>
                    ) : (
                      <span className="mt-0.5 font-mono text-[10px] text-muted-foreground">{item.href}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </RouteGuard>
  );
}
