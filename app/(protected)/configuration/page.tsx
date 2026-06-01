"use client";

import Link from "next/link";
import { Building2, CalendarDays, Coins, Gauge } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Permissions } from "@/lib/rbac/permissions";

const sectionPerms = [
  Permissions.AdminConfigRead,
  Permissions.HolidayRead,
  Permissions.FeeRead,
  Permissions.VelocityLimitRead,
] as const;

const links = [
  {
    href: "/configuration/bank",
    title: "Bank profile",
    description: "Legal entity, branches, and core reference data for the bank.",
    icon: Building2,
    permissions: [Permissions.AdminConfigRead] as const,
  },
  {
    href: "/configuration/holidays",
    title: "Holidays",
    description: "Business-day calendar and institution holiday maintenance.",
    icon: CalendarDays,
    permissions: [Permissions.HolidayRead] as const,
  },
  {
    href: "/configuration/fees",
    title: "Fees",
    description: "Reference tariff configuration linked to products and rails.",
    icon: Coins,
    permissions: [Permissions.FeeRead] as const,
  },
  {
    href: "/configuration/velocity-limits",
    title: "Velocity limits",
    description: "Throughput and velocity defaults for configuration teams.",
    icon: Gauge,
    permissions: [Permissions.VelocityLimitRead] as const,
  },
] as const;

export default function ConfigurationOverviewPage() {
  return (
    <RouteGuard permissions={[...sectionPerms]} mode="any">
      <div className="space-y-6">
        <PageHeader
          title="Configurations"
          description="Bank profile, calendars, fees, and throughput policies shared across the platform."
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
