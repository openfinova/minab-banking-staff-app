import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Network,
  GitBranch,
  FileSearch,
  FileBarChart2,
  Building2,
  CalendarDays,
  Coins,
  Gauge,
  Workflow,
  ClipboardCheck,
  CalendarRange,
  FileSpreadsheet,
  KeyRound,
  ShieldQuestion,
  type LucideIcon,
} from "lucide-react";
import { Permissions } from "@/lib/rbac/permissions";

export interface NavItem {
  label: string;
  href: string;
  icon?: LucideIcon;
  permissions?: ReadonlyArray<string>;
  permissionMode?: "all" | "any";
}

export interface NavSection {
  id: string;
  label: string;
  icon?: LucideIcon;
  items: NavItem[];
  permissions?: ReadonlyArray<string>;
}

export const navSections: NavSection[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    items: [{ label: "Overview", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    id: "identity",
    label: "Identity & Access",
    icon: Users,
    permissions: [
      Permissions.AdminUsersRead,
      Permissions.AdminRolesRead,
      Permissions.AdminDoaRead,
    ],
    items: [
      {
        label: "Users",
        href: "/identity/users",
        icon: Users,
        permissions: [Permissions.AdminUsersRead],
      },
      {
        label: "Roles & Permissions",
        href: "/identity/roles",
        icon: ShieldCheck,
        permissions: [Permissions.AdminRolesRead],
      },
      {
        label: "Delegations",
        href: "/identity/delegations",
        icon: Network,
        permissions: [Permissions.AdminDoaRead],
      },
      {
        label: "Approval Workflows",
        href: "/identity/approval-workflows",
        icon: GitBranch,
        permissions: [Permissions.AdminDoaRead],
      },
    ],
  },
  {
    id: "security",
    label: "Security & Compliance",
    icon: ShieldCheck,
    permissions: [Permissions.AuditRead, Permissions.ReportGenerate],
    items: [
      {
        label: "Audit Events",
        href: "/security/audit",
        icon: FileSearch,
        permissions: [Permissions.AuditRead],
      },
      {
        label: "Compliance Reports",
        href: "/security/compliance",
        icon: FileBarChart2,
        permissions: [Permissions.ReportGenerate],
      },
    ],
  },
  {
    id: "configuration",
    label: "Configuration",
    icon: Building2,
    permissions: [
      Permissions.AdminConfigRead,
      Permissions.HolidayRead,
      Permissions.FeeRead,
      Permissions.VelocityLimitRead,
    ],
    items: [
      {
        label: "Bank Profile",
        href: "/configuration/bank",
        icon: Building2,
        permissions: [Permissions.AdminConfigRead],
      },
      {
        label: "Holidays",
        href: "/configuration/holidays",
        icon: CalendarDays,
        permissions: [Permissions.HolidayRead],
      },
      {
        label: "Fees",
        href: "/configuration/fees",
        icon: Coins,
        permissions: [Permissions.FeeRead],
      },
      {
        label: "Velocity Limits",
        href: "/configuration/velocity-limits",
        icon: Gauge,
        permissions: [Permissions.VelocityLimitRead],
      },
    ],
  },
  {
    id: "operations",
    label: "Operations Oversight",
    icon: Workflow,
    permissions: [
      Permissions.CompensationRead,
      Permissions.GlApprove,
      Permissions.GlRead,
    ],
    items: [
      {
        label: "Compensation Workflows",
        href: "/operations/compensation",
        icon: Workflow,
        permissions: [Permissions.CompensationRead],
      },
      {
        label: "GL Approvals Queue",
        href: "/operations/gl-approvals",
        icon: ClipboardCheck,
        permissions: [Permissions.GlApprove],
      },
      {
        label: "Fiscal Periods",
        href: "/operations/fiscal-periods",
        icon: CalendarRange,
        permissions: [Permissions.GlRead],
      },
      {
        label: "Financial Statements",
        href: "/operations/reports",
        icon: FileSpreadsheet,
        permissions: [Permissions.GlRead],
      },
    ],
  },
  {
    id: "my-security",
    label: "My Security",
    icon: KeyRound,
    permissions: [
      Permissions.ProfileReadOwn,
      Permissions.PasswordChangeOwn,
      Permissions.MfaManageOwn,
    ],
    items: [
      {
        label: "Profile",
        href: "/account/profile",
        icon: KeyRound,
        permissions: [Permissions.ProfileReadOwn],
      },
      {
        label: "Change Password",
        href: "/account/password",
        icon: KeyRound,
        permissions: [Permissions.PasswordChangeOwn],
      },
      {
        label: "Multi-Factor Auth",
        href: "/account/mfa",
        icon: ShieldQuestion,
        permissions: [Permissions.MfaManageOwn],
      },
      {
        label: "My Audit Events",
        href: "/account/audit",
        icon: FileSearch,
        permissions: [Permissions.AuditReadOwn],
      },
    ],
  },
];
