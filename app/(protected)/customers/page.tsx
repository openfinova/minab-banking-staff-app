"use client";

import Link from "next/link";
import { ClipboardList, IdCard, List, UserPlus } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Permissions } from "@/lib/rbac/permissions";

const links = [
  {
    href: "/customers/directory",
    title: "Directory",
    description: "Browse, search, quick pick, and tax-ID lookup on the master file.",
    icon: List,
    permissions: [Permissions.CustomerRead] as const,
  },
  {
    href: "/customers/new",
    title: "New customer",
    description: "Onboard a new customer and capture core profile data.",
    icon: UserPlus,
    permissions: [Permissions.CustomerWrite] as const,
  },
  {
    href: "/customers/kyc-hub",
    title: "KYC workspace",
    description: "KYC status, tasks, and evidence by customer.",
    icon: ClipboardList,
    permissions: [Permissions.CustomerRead] as const,
  },
  {
    href: "/customers/document-hub",
    title: "ID documents",
    description: "Identity documents and verification artefacts.",
    icon: IdCard,
    permissions: [Permissions.CustomerPiiRead] as const,
  },
] as const;

export default function CustomersOverviewPage() {
  return (
    <RouteGuard
      permissions={[Permissions.CustomerRead, Permissions.CustomerWrite, Permissions.CustomerPiiRead]}
      mode="any"
    >
      <div className="space-y-6">
        <PageHeader
          title="Customers"
          description="Manage customer profiles, contacts, addresses, relationships, and KYC workflows."
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
