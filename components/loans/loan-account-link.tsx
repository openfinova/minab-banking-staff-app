"use client";

import Link from "next/link";
import type { LoanAccountResponse } from "@/lib/api/modules/loans";

export function LoanAccountLink({
  loan,
  href,
  className,
}: {
  loan: Pick<LoanAccountResponse, "id" | "loanAccountNumber">;
  href?: string;
  className?: string;
}) {
  const to = href ?? `/loans/accounts/${loan.id}`;
  return (
    <Link href={to} className={className ?? "font-medium text-primary hover:underline"}>
      {loan.loanAccountNumber}
    </Link>
  );
}
