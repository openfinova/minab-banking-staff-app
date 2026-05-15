"use client";

import Link from "next/link";

export function LoanCustomerLink({ customerId, className }: { customerId: string; className?: string }) {
  return (
    <Link
      href={`/customers/${customerId}`}
      className={className ?? "text-sm text-primary hover:underline"}
    >
      Customer {customerId.slice(0, 8)}…
    </Link>
  );
}
