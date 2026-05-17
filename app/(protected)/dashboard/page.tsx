"use client";

import * as React from "react";
import {
  Users,
  ClipboardCheck,
  FileSearch,
  Coins,
  Contact,
  Wallet,
  Briefcase,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth/auth-provider";
import { Can } from "@/components/rbac/can";
import { Permissions } from "@/lib/rbac/permissions";

const tiles: Array<{
  title: string;
  description: string;
  icon: typeof Users;
  href: string;
  permissions: string[];
}> = [
  {
    title: "Customers",
    description: "Search the customer file and open onboarding or servicing tasks.",
    icon: Contact,
    href: "/customers/directory",
    permissions: [Permissions.CustomerRead],
  },
  {
    title: "Accounts",
    description: "Directory, lookups, holdings, batch servicing consoles.",
    icon: Wallet,
    href: "/accounts/directory",
    permissions: [Permissions.AccountRead],
  },
  {
    title: "Payments",
    description: "Search payments, refunds, velocity and fee tooling.",
    icon: Briefcase,
    href: "/transaction-processing/transactions",
    permissions: [Permissions.TransactionRead],
  },
  {
    title: "Identity",
    description: "Users, roles, delegations, approvals, credential policy.",
    icon: Users,
    href: "/identity/users",
    permissions: [Permissions.AdminUsersRead],
  },
  {
    title: "Security & Compliance",
    description: "Access reviews and regulatory reporting artefacts.",
    icon: FileSearch,
    href: "/security/audit",
    permissions: [Permissions.AuditRead],
  },
  {
    title: "Configuration",
    description: "Bank ledger profile, calendars, tariff books, throughput limits.",
    icon: Coins,
    href: "/configuration/bank",
    permissions: [Permissions.AdminConfigRead],
  },
  {
    title: "Operations desk",
    description: "Saga remediation and postings awaiting supervisory release.",
    icon: ClipboardCheck,
    href: "/operations/compensation",
    permissions: [Permissions.CompensationRead],
  },
];

export default function DashboardPage() {
  const { session } = useAuth();
  const greeting = session?.user.displayName ?? session?.user.username ?? "operator";
  const roles = session?.user.roles ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${greeting}`}
        description="Pick up where regulation, risk, or the branch queue left off — shortcuts below respect your clearance."
        actions={
          session?.user.userType ? (
            <Badge variant="muted">{session.user.userType}</Badge>
          ) : null
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {tiles.map((tile) => (
          <Can key={tile.href} permissions={tile.permissions} mode="any">
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="space-y-1">
                  <CardTitle className="text-base">{tile.title}</CardTitle>
                  <CardDescription className="text-xs">{tile.description}</CardDescription>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <tile.icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <a className="text-sm font-medium text-primary hover:underline" href={tile.href}>
                  Open {tile.title}
                </a>
              </CardContent>
            </Card>
          </Can>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workspace context</CardTitle>
          <CardDescription>Operational summary from your authenticated session.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3 text-sm">
          <div>
            <span className="text-muted-foreground">Operator id</span>
            <p className="font-medium">{session?.user.username}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Home branch</span>
            <p className="font-medium">{session?.user.branchCode ?? "—"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Multi-factor session</span>
            <p className="font-medium">
              {session?.user.mfaVerified
                ? "Step-up satisfied"
                : session?.user.mfaRequired
                  ? "Awaiting MFA"
                  : "Not mandated"}
            </p>
          </div>
        </CardContent>

        <CardContent className="border-t pt-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Role bundle</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {roles.length ? (
              roles.map((role) => (
                <Badge key={role} variant="outline">
                  {role}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No named roles surfaced on token.</p>
            )}
          </div>
          <details className="mt-4 rounded-md border bg-muted/30 p-3">
            <summary className="cursor-pointer text-sm font-medium">
              Fine-grained entitlements ({session?.user.permissions.length ?? 0})
            </summary>
            <div className="mt-3 max-h-48 overflow-auto">
              {session?.user.permissions.length ? (
                <div className="flex flex-wrap gap-1">
                  {session.user.permissions.map((permission) => (
                    <Badge key={permission} variant="secondary" className="font-mono text-[10px] leading-tight">
                      {permission}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">JWT carried no granular permission catalogue.</p>
              )}
            </div>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}
