"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Banknote,
  CalendarClock,
  CreditCard,
  FileText,
  GitBranch,
  HandCoins,
  Landmark,
  Shield,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links: { href: (id: string) => string; label: string; icon: React.ElementType }[] = [
  { href: (id) => `/loans/accounts/${id}`, label: "Summary", icon: FileText },
  { href: (id) => `/loans/accounts/${id}/statement`, label: "Statement", icon: FileText },
  { href: (id) => `/loans/accounts/${id}/disbursements`, label: "Disbursements", icon: Banknote },
  { href: (id) => `/loans/accounts/${id}/schedules`, label: "Schedule", icon: CalendarClock },
  { href: (id) => `/loans/accounts/${id}/payments`, label: "Payments", icon: CreditCard },
  { href: (id) => `/loans/accounts/${id}/restructurings`, label: "Restructure", icon: GitBranch },
  { href: (id) => `/loans/accounts/${id}/settlements`, label: "Settlement", icon: HandCoins },
  { href: (id) => `/loans/accounts/${id}/collateral`, label: "Collateral", icon: Landmark },
  { href: (id) => `/loans/accounts/${id}/guarantors`, label: "Guarantors", icon: Shield },
  { href: (id) => `/loans/accounts/${id}/collections`, label: "Collections", icon: ClipboardList },
];

export function LoanServicingLinks({ loanAccountId }: { loanAccountId: string }) {
  const pathname = usePathname();
  return (
    <div className="flex flex-wrap gap-2">
      {links.map(({ href, label, icon: Icon }) => {
        const to = href(loanAccountId);
        const active =
          label === "Summary" ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
        return (
          <Button key={to} type="button" variant={active ? "secondary" : "outline"} size="sm" asChild>
            <Link href={to} className={cn("gap-1.5")}>
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          </Button>
        );
      })}
    </div>
  );
}
