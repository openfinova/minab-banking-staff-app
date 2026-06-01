"use client";

import Link from "next/link";
import {
  ClipboardList,
  CreditCard,
  FileSpreadsheet,
  Package,
  UserPlus,
  Wallet,
  Wrench,
} from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Permissions } from "@/lib/rbac/permissions";

const loanPerms = [
  Permissions.LoanRead,
  Permissions.LoanWrite,
  Permissions.LoanApprove,
  Permissions.LoanDisburse,
  Permissions.LoanDisburseApprove,
  Permissions.LoanWriteOff,
  Permissions.LoanRestructure,
  Permissions.LoanRestructureApprove,
  Permissions.LoanCollect,
  Permissions.LoanCollectApprove,
] as const;

const links = [
  {
    href: "/loans/products",
    title: "Products",
    description: "Maintain loan products, tiers, and pricing parameters.",
    icon: Package,
    permissions: [Permissions.LoanRead] as const,
    mode: "any" as const,
  },
  {
    href: "/loans/applications",
    title: "Applications",
    description: "Work the origination queue from intake to decision.",
    icon: ClipboardList,
    permissions: [Permissions.LoanRead] as const,
    mode: "any" as const,
  },
  {
    href: "/loans/applications/new",
    title: "New application",
    description: "Start a new credit application for a customer.",
    icon: UserPlus,
    permissions: [Permissions.LoanWrite] as const,
    mode: "any" as const,
  },
  {
    href: "/loans/accounts",
    title: "Accounts",
    description: "Servicing workspace for booked loan accounts.",
    icon: Wallet,
    permissions: [Permissions.LoanRead] as const,
    mode: "any" as const,
  },
  {
    href: "/loans/payments",
    title: "Payments",
    description: "Collect and allocate payments across loan accounts.",
    icon: CreditCard,
    permissions: [Permissions.LoanRead] as const,
    mode: "any" as const,
  },
  {
    href: "/loans/operations",
    title: "Operations",
    description: "Batch status moves, write-offs, restructuring, and tools.",
    icon: Wrench,
    permissions: [
      Permissions.LoanWrite,
      Permissions.LoanWriteOff,
      Permissions.LoanRestructure,
    ] as const,
    mode: "any" as const,
  },
  {
    href: "/loans/reports",
    title: "Reports",
    description: "Portfolio, arrears, and exposure reporting.",
    icon: FileSpreadsheet,
    permissions: [Permissions.LoanRead] as const,
    mode: "any" as const,
  },
] as const;

export default function LoansOverviewPage() {
  return (
    <RouteGuard permissions={[...loanPerms]} mode="any">
      <div className="space-y-6">
        <PageHeader
          title="Loans"
          description="Origination queues through servicing shortcuts — disbursements, payments, restructuring, collateral, collections, and reporting."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((item) => (
            <RouteGuard key={item.href} permissions={[...item.permissions]} mode={item.mode}>
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
