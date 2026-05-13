"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/data/status-badge";
import { describeApiError } from "@/lib/api/errors";
import { customersApi, type CustomerResponse } from "@/lib/api/modules/customers";

export interface CustomerQuickLookupProps {
  /** Target URL for each row when not using onPickCustomer */
  hrefForCustomer?: (customerId: string) => string;
  /** If set, the action uses a button that calls this (e.g. fill a form) instead of navigating */
  onPickCustomer?: (customer: CustomerResponse) => void;
  /** Omit these customer ids from the result table (e.g. current profile when linking “other” party) */
  excludeCustomerIds?: string[];
  /** Label for the row action link */
  actionLabel?: string;
  /** Shown under the search field when empty */
  helperText?: string;
  className?: string;
}

/**
 * Debounced directory-style search (GET /api/v1/customers?q=…) with result list.
 * Provide {@link hrefForCustomer} for navigation, {@link onPickCustomer} to fill a form, or both.
 */
export function CustomerQuickLookup({
  hrefForCustomer,
  onPickCustomer,
  excludeCustomerIds,
  actionLabel = "Open",
  helperText = "Enter customer number, name, email or phone on file, address fragment, or full UUID.",
  className,
}: CustomerQuickLookupProps) {
  if (!hrefForCustomer && !onPickCustomer) {
    throw new Error("CustomerQuickLookup requires hrefForCustomer and/or onPickCustomer");
  }
  const [searchText, setSearchText] = React.useState("");
  const [debouncedQ, setDebouncedQ] = React.useState("");

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(searchText.trim()), 320);
    return () => window.clearTimeout(t);
  }, [searchText]);

  const list = useQuery({
    queryKey: ["customers", "quick-lookup", debouncedQ],
    queryFn: () =>
      customersApi.list({
        page: 0,
        size: 20,
        ...(debouncedQ ? { q: debouncedQ } : {}),
      }),
    enabled: debouncedQ.length > 0,
  });

  const exclude = React.useMemo(() => new Set(excludeCustomerIds ?? []), [excludeCustomerIds]);
  const rows = (list.data?.content ?? []).filter((c) => !exclude.has(c.id));

  return (
    <div className={className}>
      <div className="grid max-w-md gap-1.5">
        <Label htmlFor="customer-quick-lookup-q">Search</Label>
        <Input
          id="customer-quick-lookup-q"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Number, name, email, phone, or UUID…"
          autoComplete="off"
        />
      </div>
      {!debouncedQ ? (
        <p className="mt-3 text-sm text-muted-foreground">{helperText}</p>
      ) : list.isLoading ? (
        <Skeleton className="mt-4 h-36 w-full max-w-3xl" />
      ) : list.isError ? (
        <p className="mt-3 text-sm text-destructive">{describeApiError(list.error)}</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No matches. Try another term or use the customer directory for paging.
        </p>
      ) : (
        <div className="mt-4 max-w-4xl overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>KYC</TableHead>
                <TableHead className="text-right"> </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <CustomerLookupRow
                  key={c.id}
                  c={c}
                  href={hrefForCustomer?.(c.id)}
                  onPick={onPickCustomer}
                  actionLabel={actionLabel}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function CustomerLookupRow({
  c,
  href,
  onPick,
  actionLabel,
}: {
  c: CustomerResponse;
  href?: string;
  onPick?: (customer: CustomerResponse) => void;
  actionLabel: string;
}) {
  const label =
    c.type === "BUSINESS" || c.type === "TRUST"
      ? (c.businessName ?? c.customerNumber)
      : [c.firstName, c.lastName].filter(Boolean).join(" ") || c.customerNumber;

  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{c.customerNumber}</TableCell>
      <TableCell>{label}</TableCell>
      <TableCell>{c.type}</TableCell>
      <TableCell>
        <StatusBadge status={c.status} />
      </TableCell>
      <TableCell>
        <StatusBadge status={c.kycStatus} />
      </TableCell>
      <TableCell className="text-right">
        {onPick ? (
          <Button type="button" variant="link" className="h-auto p-0" onClick={() => onPick(c)}>
            {actionLabel}
          </Button>
        ) : href ? (
          <Button variant="link" className="h-auto p-0" asChild>
            <Link href={href}>{actionLabel}</Link>
          </Button>
        ) : null}
      </TableCell>
    </TableRow>
  );
}
