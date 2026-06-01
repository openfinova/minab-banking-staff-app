"use client";

import { CopyableUuid } from "@/components/data/copyable-uuid";

export function LoanCustomerLink({ customerId, className }: { customerId: string; className?: string }) {
  return (
    <CopyableUuid
      value={customerId}
      href={`/customers/${customerId}`}
      className={className}
    />
  );
}
