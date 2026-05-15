"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/data/status-badge";
import { describeApiError } from "@/lib/api/errors";
import { customersApi, type CustomerResponse } from "@/lib/api/modules/customers";

/** Single-line label for directory / account servicing (not PII heavy). */
export function customerPartyLabel(c: CustomerResponse) {
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
  if (name) return name;
  if (c.businessName) return c.businessName;
  return c.customerNumber;
}

export function useCustomerByProfileOrId(profileUserId: string | undefined | null) {
  const id = profileUserId?.trim() ?? "";
  return useQuery({
    queryKey: ["customers", "resolve-profile-or-id", id],
    queryFn: () => customersApi.list({ q: id, page: 0, size: 3 }),
    enabled: id.length > 0,
    select: (page) => page.content?.[0] ?? null,
  });
}

export function CustomerPartyLink({
  profileUserId,
  className,
}: {
  profileUserId?: string | null;
  className?: string;
}) {
  const id = profileUserId?.trim() ?? "";
  const q = useCustomerByProfileOrId(id || undefined);

  if (!id) {
    return <span className={className}>—</span>;
  }
  if (q.isLoading) {
    return <Skeleton className="inline-block h-4 w-36 align-middle" />;
  }
  if (q.isError) {
    return (
      <span className={`text-xs text-destructive ${className ?? ""}`} title={describeApiError(q.error)}>
        {id}
      </span>
    );
  }
  if (q.data) {
    const c = q.data;
    return (
      <Link href={`/customers/${c.id}`} className={`text-primary underline ${className ?? ""}`}>
        {customerPartyLabel(c)}
        <span className="ml-1 text-muted-foreground">({c.customerNumber})</span>
      </Link>
    );
  }
  return (
    <span className={`font-mono text-xs ${className ?? ""}`} title="No customer row matched this id search">
      {id}
    </span>
  );
}

/** Summary card: name, number, type, status, KYC, profile id, link to customer. */
export function CustomerPartySummaryBlock({ profileUserId }: { profileUserId?: string | null }) {
  const id = profileUserId?.trim() ?? "";
  const q = useCustomerByProfileOrId(id || undefined);

  if (!id) {
    return <p className="text-sm text-muted-foreground">—</p>;
  }
  if (q.isLoading) {
    return <Skeleton className="h-24 w-full max-w-lg" />;
  }
  if (q.isError) {
    return (
      <p className="text-sm text-destructive" title={describeApiError(q.error)}>
        Could not load customer (profile id below).
      </p>
    );
  }
  if (!q.data) {
    return (
      <div className="rounded-md border border-dashed bg-muted/20 p-3 text-sm">
        <p className="text-xs text-muted-foreground">No customer row matches this identity / profile id.</p>
        <p className="mt-1 break-all font-mono text-[10px] text-muted-foreground">{id}</p>
      </div>
    );
  }
  const c = q.data;
  return (
    <div className="rounded-md border bg-muted/20 p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="font-medium">{customerPartyLabel(c)}</p>
          <p className="text-muted-foreground">
            <span className="font-mono text-xs">{c.customerNumber}</span>
            {c.type ? <span> · {c.type}</span> : null}
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <StatusBadge status={c.status} />
            {c.kycStatus ? (
              <span className="text-xs text-muted-foreground">KYC {c.kycStatus}</span>
            ) : null}
          </div>
          <p className="break-all pt-1 font-mono text-[10px] text-muted-foreground">{id}</p>
        </div>
        <Button variant="secondary" size="sm" asChild>
          <Link href={`/customers/${c.id}`}>Customer profile</Link>
        </Button>
      </div>
    </div>
  );
}
