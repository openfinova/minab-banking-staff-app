"use client";

import Link from "next/link";
import { FileSpreadsheet, List, Search, UserPlus, Wrench } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Permissions } from "@/lib/rbac/permissions";

const links = [
  {
    href: "/accounts/directory",
    title: "Directory",
    description: "Search and filter accounts across the portfolio.",
    icon: List,
    permissions: [Permissions.AccountRead] as const,
  },
  {
    href: "/accounts/new",
    title: "New account",
    description: "Open a deposit or transactional account for a customer.",
    icon: UserPlus,
    permissions: [Permissions.AccountWrite] as const,
  },
  {
    href: "/accounts/lookup",
    title: "Lookup",
    description: "Resolve an account by id, number, or IBAN.",
    icon: Search,
    permissions: [Permissions.AccountRead] as const,
  },
  {
    href: "/accounts/reports",
    title: "Portfolio reports",
    description: "Slice the book by product type or operational status.",
    icon: FileSpreadsheet,
    permissions: [Permissions.AccountRead] as const,
  },
  {
    href: "/accounts/operations",
    title: "Operations",
    description: "Batch status changes, dormancy, holds, and servicing jobs.",
    icon: Wrench,
    permissions: [Permissions.AccountWrite] as const,
  },
] as const;

export default function AccountsOverviewPage() {
  return (
    <RouteGuard permissions={[Permissions.AccountRead, Permissions.AccountWrite]} mode="any">
      <div className="space-y-6">
        <PageHeader
          title="Accounts"
          description="Run the customer account lifecycle — balances, relationships, holds, limits, and servicing tools."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((item) => (
            <RouteGuard key={item.href} permissions={[...item.permissions]} mode="any">
              <Link href={item.href} className="block rounded-lg transition-opacity hover:opacity-90">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <item.icon className="h-4 w-4" />
                      {item.title}
                    </CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </RouteGuard>
          ))}
        </div>
      </div>
    </RouteGuard>
  );
}
