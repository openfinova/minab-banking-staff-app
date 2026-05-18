"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

const LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  inbox: "Inbox",
  customers: "Customers",
  accounts: "Accounts",
  lookup: "Lookup",
  directory: "Directory",
  new: "New",
  transactions: "Payments",
  kyc: "KYC",
  contacts: "Contacts",
  documents: "Documents",
  "transaction-processing": "Transaction processing",
  "general-ledger": "General ledger",
  operations: "Operations",
  compensation: "Compensation",
  "gl-approvals": "GL approvals",
  security: "Security",
  audit: "Audit",
  compliance: "AML & compliance",
  configuration: "Configuration",
  holidays: "Holidays",
  fees: "Fees",
  identity: "Identity & access",
  users: "Users",
  loans: "Loans",
};

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function segmentLabel(seg: string, i: number, parts: string[]): string {
  const last = i === parts.length - 1;
  if (last && UUID_RX.test(seg)) return `${seg.slice(0, 10)}…`;
  return LABELS[seg] ?? seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AppBreadcrumbs() {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);

  if (pathname === "/" || pathname === "/dashboard") return null;

  let acc = "";
  const crumbs = parts.map((seg, i) => {
    acc += "/" + seg;
    return { href: acc, label: segmentLabel(seg, i, parts) };
  });

  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
      <Link href="/dashboard" className="hover:text-foreground">
        Dashboard
      </Link>
      {crumbs.flatMap((c, idx) =>
        idx === crumbs.length - 1
          ? [
              <ChevronRight key={`s-${idx}`} className="h-3 w-3 shrink-0 opacity-70" aria-hidden />,
              <span key={`e-${idx}`} className="font-medium text-foreground">
                {c.label}
              </span>,
            ]
          : [
              <ChevronRight key={`s-${idx}`} className="h-3 w-3 shrink-0 opacity-70" aria-hidden />,
              <Link key={`l-${idx}`} href={c.href} className="hover:text-foreground">
                {c.label}
              </Link>,
            ],
      )}
    </nav>
  );
}
