"use client";

import Link from "next/link";
import {
  FileBarChart2,
  FileSearch,
  GitBranch,
  ListTree,
  Network,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Permissions } from "@/lib/rbac/permissions";

const sectionPerms = [
  Permissions.AdminUsersRead,
  Permissions.AdminRolesRead,
  Permissions.AdminDoaRead,
  Permissions.AuditRead,
  Permissions.ReportGenerate,
] as const;

const links = [
  {
    href: "/identity/users",
    title: "Users",
    description: "Create, search, and maintain operator identities.",
    icon: Users,
    permissions: [Permissions.AdminUsersRead] as const,
  },
  {
    href: "/identity/roles",
    title: "Roles",
    description: "Role definitions, inheritance, and membership.",
    icon: ShieldCheck,
    permissions: [Permissions.AdminRolesRead] as const,
  },
  {
    href: "/identity/permissions",
    title: "Permission catalogue",
    description: "Browse effective permission codes used in policies.",
    icon: ListTree,
    permissions: [Permissions.AdminRolesRead] as const,
  },
  {
    href: "/identity/delegations",
    title: "Delegations",
    description: "Delegate signing and approval authority between operators.",
    icon: Network,
    permissions: [Permissions.AdminDoaRead] as const,
  },
  {
    href: "/identity/approval-workflows",
    title: "Approval workflows",
    description: "Configure how sensitive identity changes are approved.",
    icon: GitBranch,
    permissions: [Permissions.AdminDoaRead] as const,
  },
  {
    href: "/security/audit",
    title: "Security audit",
    description: "Review authentication and authorization events.",
    icon: FileSearch,
    permissions: [Permissions.AuditRead] as const,
  },
  {
    href: "/security/compliance",
    title: "Compliance reports",
    description: "Generate identity and access compliance artefacts.",
    icon: FileBarChart2,
    permissions: [Permissions.ReportGenerate] as const,
  },
] as const;

export default function IdentityOverviewPage() {
  return (
    <RouteGuard permissions={[...sectionPerms]} mode="any">
      <div className="space-y-6">
        <PageHeader
          title="Identity & Access"
          description="User lifecycle, roles, delegations, approval workflows, and reporting for access governance."
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
