"use client";

import {
  Users,
  ShieldCheck,
  ClipboardCheck,
  Workflow,
  FileSearch,
  Coins,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth/auth-provider";

const tiles = [
  {
    title: "Identity",
    description: "Manage users, roles, delegations, and approvals.",
    icon: Users,
    href: "/identity/users",
  },
  {
    title: "Security & Compliance",
    description: "Audit events and compliance reporting.",
    icon: FileSearch,
    href: "/security/audit",
  },
  {
    title: "Configuration",
    description: "Bank profile, holidays, fees and velocity limits.",
    icon: Coins,
    href: "/configuration/bank",
  },
  {
    title: "Operations",
    description: "Compensation workflows and GL approvals.",
    icon: Workflow,
    href: "/operations/compensation",
  },
];

export default function DashboardPage() {
  const { session } = useAuth();
  const greeting = session?.user.displayName ?? session?.user.username ?? "operator";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${greeting}`}
        description="Quickly jump to the management areas you administer."
        actions={
          session?.user.userType ? (
            <Badge variant="muted">{session.user.userType}</Badge>
          ) : null
        }
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {tiles.map((tile) => (
          <Card key={tile.href} className="transition-shadow hover:shadow-md">
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
              <a
                className="text-sm font-medium text-primary hover:underline"
                href={tile.href}
              >
                Go to {tile.title}
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Your access at a glance</CardTitle>
          <CardDescription>
            Effective permissions decoded from your current session token.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {session?.user.permissions.length ? (
            <div className="flex flex-wrap gap-1.5">
              {session.user.permissions.map((permission) => (
                <Badge key={permission} variant="secondary" className="font-mono text-[11px]">
                  {permission}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No fine-grained permissions detected on this token.
            </p>
          )}
        </CardContent>
        <CardContent className="grid gap-2 text-sm md:grid-cols-3">
          <div>
            <span className="text-muted-foreground">Username</span>
            <p className="font-medium">{session?.user.username}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Branch</span>
            <p className="font-medium">{session?.user.branchCode ?? "-"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Multi-factor</span>
            <p className="font-medium">
              {session?.user.mfaVerified ? "Verified" : session?.user.mfaRequired ? "Required" : "Not enabled"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
