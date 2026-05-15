"use client";

import Link from "next/link";
import {
  Coins,
  Gauge,
  List,
  Wallet,
  Workflow,
} from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Permissions } from "@/lib/rbac/permissions";

const links = [
  {
    href: "/transaction-processing/transactions",
    title: "Transactions",
    description: "Search, initiate, refunds — /api/v1/transactions",
    icon: List,
    permission: Permissions.TransactionRead,
  },
  {
    href: "/transaction-processing/fees/rules",
    title: "Fee rules",
    description: "Configure fee rules — /api/v1/fees/rules",
    icon: Coins,
    permission: Permissions.FeeRead,
  },
  {
    href: "/transaction-processing/fees/waivers",
    title: "Fee waivers",
    description: "Waivers by customer/account id",
    icon: Coins,
    permission: Permissions.FeeRead,
  },
  {
    href: "/transaction-processing/velocity-limits",
    title: "Velocity limits",
    description: "Limits and breaches — /api/v1/velocity-limits",
    icon: Gauge,
    permission: Permissions.VelocityLimitRead,
  },
  {
    href: "/transaction-processing/compensation/workflows",
    title: "Compensation workflows",
    description: "Saga monitoring and actions",
    icon: Workflow,
    permission: Permissions.CompensationRead,
  },
  {
    href: "/transaction-processing/account-transactions",
    title: "Account transactions",
    description: "Statement history and GL link — /api/v1/accounts/…/transactions",
    icon: Wallet,
    permission: Permissions.AccountRead,
  },
] as const;

export default function TransactionProcessingOverviewPage() {
  return (
    <RouteGuard
      permissions={[
        Permissions.TransactionRead,
        Permissions.FeeRead,
        Permissions.VelocityLimitRead,
        Permissions.CompensationRead,
        Permissions.AccountRead,
      ]}
      mode="any"
    >
      <div className="space-y-6">
        <PageHeader
          title="Transaction processing"
          description="Admin and staff tools for payments, fees, limits, compensation, and account-level transaction history."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((item) => (
            <RouteGuard key={item.href} permissions={[item.permission]}>
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
