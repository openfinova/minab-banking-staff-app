"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CalendarRange,
  ClipboardCheck,
  FileSpreadsheet,
  Layers,
  Link2,
  ListOrdered,
  RefreshCw,
  Scale,
  ScrollText,
  SearchCode,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth/auth-provider";
import { useGlBootstrapComplete } from "@/lib/general-ledger/use-gl-bootstrap-complete";
import { Permissions } from "@/lib/rbac/permissions";

const links = [
  {
    href: "/general-ledger/chart-of-accounts",
    title: "Chart of accounts",
    description: "Maintain the account tree and posting categories.",
    icon: Layers,
    permissions: [Permissions.GlRead] as const,
  },
  {
    href: "/general-ledger/operational-accounts",
    title: "Operational mappings",
    description: "Wire product and operational types to GL accounts.",
    icon: Link2,
    permissions: [Permissions.GlRead] as const,
  },
  {
    href: "/general-ledger/fiscal-periods",
    title: "Fiscal periods",
    description: "Open, close, and control accounting periods.",
    icon: CalendarRange,
    permissions: [Permissions.GlRead] as const,
  },
  {
    href: "/operations/gl-approvals",
    title: "GL approvals queue",
    description: "Postings and journals awaiting supervisory release.",
    icon: ClipboardCheck,
    permissions: [Permissions.GlApprove] as const,
  },
  {
    href: "/general-ledger/trial-balance",
    title: "Trial balance",
    description: "Point-in-time balances and sign-offs.",
    icon: Scale,
    permissions: [Permissions.GlRead] as const,
  },
  {
    href: "/general-ledger/transaction-lookup",
    title: "Transaction lookup",
    description: "Find journal activity by reference or transaction id.",
    icon: SearchCode,
    permissions: [Permissions.GlRead] as const,
  },
  {
    href: "/general-ledger/journal-by-account",
    title: "Journal by account",
    description: "Drill into posted lines for a single GL account.",
    icon: ListOrdered,
    permissions: [Permissions.GlRead] as const,
  },
  {
    href: "/general-ledger/suspense",
    title: "Suspense",
    description: "Clear balancing and exception items in suspense.",
    icon: AlertTriangle,
    permissions: [Permissions.GlRead] as const,
  },
  {
    href: "/compliance/aml-review",
    title: "AML review queue",
    description: "Suspense and postings held for compliance review.",
    icon: ShieldAlert,
    permissions: [Permissions.GlRead] as const,
  },
  {
    href: "/general-ledger/revaluation",
    title: "FX revaluation",
    description: "Run and review foreign-currency revaluation.",
    icon: RefreshCw,
    permissions: [Permissions.GlRead] as const,
  },
  {
    href: "/general-ledger/audit",
    title: "Audit explorer",
    description: "Trace who changed what across GL configuration and postings.",
    icon: ScrollText,
    permissions: [Permissions.GlRead] as const,
  },
  {
    href: "/general-ledger/reports",
    title: "Financial statements",
    description: "Statement packs and management reporting views.",
    icon: FileSpreadsheet,
    permissions: [Permissions.GlRead] as const,
  },
] as const;

function GeneralLedgerOverviewContent() {
  const { can } = useAuth();
  const canApprove = can([Permissions.GlApprove]);
  const bootstrap = useGlBootstrapComplete(canApprove);
  const incomplete =
    bootstrap.data && !bootstrap.data.complete;
  const showSetupBanner =
    canApprove && bootstrap.isFetched && !bootstrap.isPending && (bootstrap.isError || incomplete);

  return (
    <div className="space-y-6">
      <PageHeader
        title="General ledger"
        description="Management surfaces for chart maintenance, operational wiring, balances, suspense, revaluation, and audit queries."
      />

      {canApprove ? (
        bootstrap.isPending ? (
          <Skeleton className="h-36 w-full rounded-lg" />
        ) : showSetupBanner ? (
          <Card className="border-amber-500/35 bg-amber-500/[0.06]">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Wrench className="h-5 w-5 text-amber-600 dark:text-amber-500" />
                GL system setup
              </CardTitle>
              <CardDescription>
                One-time bootstrap: standard chart of accounts, operational mappings, and fiscal periods. Required before
                routine posting runs cleanly.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button asChild>
                <Link href="/general-ledger/setup">Open GL setup</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null
      ) : null}

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
  );
}

export default function GeneralLedgerOverviewPage() {
  return (
    <RouteGuard permissions={[Permissions.GlRead, Permissions.GlApprove]} mode="any">
      <GeneralLedgerOverviewContent />
    </RouteGuard>
  );
}
