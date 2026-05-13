"use client";

import Link from "next/link";
import { RouteGuard } from "@/components/rbac/route-guard";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Permissions } from "@/lib/rbac/permissions";
import { navSections } from "@/lib/nav/navigation";
import { cn } from "@/lib/utils";

export default function GeneralLedgerOverviewPage() {
  const gl = navSections.find((s) => s.id === "general-ledger");

  return (
    <RouteGuard permissions={[Permissions.GlRead, Permissions.GlApprove]} mode="any">
      <div className="space-y-6">
        <PageHeader
          title="General ledger"
          description="Management surfaces for chart maintenance, operational wiring, balances, suspense, revaluation, and audit queries."
        />
        <Card>
          <CardHeader>
            <CardTitle>Module routes</CardTitle>
            <CardDescription>Each entry maps to backend controllers under /api/v1/gl/*.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {gl?.items.map((item) => (
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
