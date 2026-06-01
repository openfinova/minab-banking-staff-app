"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
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
import { Badge } from "@/components/ui/badge";
import { compensationApi } from "@/lib/api/modules/transaction-processing";
import { useAuth } from "@/lib/auth/auth-provider";

const links = [
  {
    href: "/transaction-processing/transactions",
    title: "Transactions",
    description: "Journal search, initiation, and credit-back handling",
    icon: List,
    permission: Permissions.TransactionRead,
  },
  {
    href: "/transaction-processing/fees/rules",
    title: "Fee rules",
    description: "Product tariff configuration for payment rails",
    icon: Coins,
    permission: Permissions.FeeRead,
  },
  {
    href: "/transaction-processing/fees/waivers",
    title: "Fee waivers",
    description: "Account-scoped relief and campaigns",
    icon: Coins,
    permission: Permissions.FeeRead,
  },
  {
    href: "/transaction-processing/velocity-limits",
    title: "Velocity limits",
    description: "Per-account velocity caps and breach investigations.",
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
    description: "Account-level history, GL voucher lookup, and corrective links.",
    icon: Wallet,
    permission: Permissions.AccountRead,
  },
] as const;

export default function TransactionProcessingOverviewPage() {
  const { can } = useAuth();
  const allowComp = can([Permissions.CompensationRead], "all");
  const failedComp = useQuery({
    queryKey: ["tp-overview", "comp-failed-count"],
    queryFn: compensationApi.failed,
    enabled: allowComp,
    refetchInterval: 60_000,
  });
  const failCount = failedComp.data?.length ?? 0;

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
                      {item.href === "/transaction-processing/compensation/workflows" && failCount ? (
                        <Badge variant="destructive" className="ml-1 text-[10px]">
                          {failCount} failed
                        </Badge>
                      ) : null}
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
