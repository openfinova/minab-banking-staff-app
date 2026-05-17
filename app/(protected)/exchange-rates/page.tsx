"use client";

import Link from "next/link";
import {
  ArrowLeftRight,
  Calendar,
  FileText,
  HelpCircle,
  History,
  LayoutGrid,
  List,
  Plus,
  SearchCheck,
  TrendingUp,
} from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Permissions } from "@/lib/rbac/permissions";

const sectionPerms = [Permissions.ExchangeRateRead, Permissions.ExchangeRateWrite] as const;

const links = [
  {
    href: "/exchange-rates/today",
    title: "Today's rates",
    description: "Managed-pair board with inline edit and provider sync.",
    icon: LayoutGrid,
    permissions: [Permissions.ExchangeRateRead, Permissions.ExchangeRateWrite] as const,
    mode: "any" as const,
  },
  {
    href: "/exchange-rates/currencies",
    title: "Currencies",
    description: "Supported currencies and display metadata.",
    icon: List,
    permissions: [Permissions.ExchangeRateRead, Permissions.ExchangeRateWrite] as const,
    mode: "any" as const,
  },
  {
    href: "/exchange-rates/currency-support",
    title: "Currency support",
    description: "Which pairs and conventions the desk publishes.",
    icon: HelpCircle,
    permissions: [Permissions.ExchangeRateRead, Permissions.ExchangeRateWrite] as const,
    mode: "any" as const,
  },
  {
    href: "/exchange-rates/latest-rate",
    title: "Latest rate",
    description: "Spot lookup for the current published rate.",
    icon: TrendingUp,
    permissions: [Permissions.ExchangeRateRead, Permissions.ExchangeRateWrite] as const,
    mode: "any" as const,
  },
  {
    href: "/exchange-rates/rate-details",
    title: "Rate details",
    description: "Full detail for a single stored quote.",
    icon: FileText,
    permissions: [Permissions.ExchangeRateRead, Permissions.ExchangeRateWrite] as const,
    mode: "any" as const,
  },
  {
    href: "/exchange-rates/rate-by-date",
    title: "Rate by date",
    description: "Historical rate as of a given business date.",
    icon: Calendar,
    permissions: [Permissions.ExchangeRateRead, Permissions.ExchangeRateWrite] as const,
    mode: "any" as const,
  },
  {
    href: "/exchange-rates/convert",
    title: "Convert",
    description: "Cross-currency amount conversion using desk rates.",
    icon: ArrowLeftRight,
    permissions: [Permissions.ExchangeRateRead, Permissions.ExchangeRateWrite] as const,
    mode: "any" as const,
  },
  {
    href: "/exchange-rates/create-rate",
    title: "Create rate",
    description: "Enter or import a new published exchange rate.",
    icon: Plus,
    permissions: [Permissions.ExchangeRateWrite] as const,
    mode: "any" as const,
  },
  {
    href: "/exchange-rates/rate-history",
    title: "Rate history",
    description: "Time series and audit of rate changes.",
    icon: History,
    permissions: [Permissions.ExchangeRateWrite] as const,
    mode: "any" as const,
  },
  {
    href: "/exchange-rates/rate-exists",
    title: "Rate exists",
    description: "Check whether a quote already exists before posting.",
    icon: SearchCheck,
    permissions: [Permissions.ExchangeRateWrite] as const,
    mode: "any" as const,
  },
] as const;

export default function ExchangeRatesOverviewPage() {
  return (
    <RouteGuard permissions={[...sectionPerms]} mode="any">
      <div className="space-y-6">
        <PageHeader
          title="Exchange rates"
          description="Desk tools to publish, query, convert, and audit institutional FX rates."
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
