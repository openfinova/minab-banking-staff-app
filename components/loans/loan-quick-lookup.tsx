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
import { describeApiError } from "@/lib/api/errors";
import { loanAccountsApi, type LoanAccountResponse } from "@/lib/api/modules/loans";
import { CopyableUuid } from "@/components/data/copyable-uuid";
import { LoanStatusBadge } from "@/components/loans/loan-badges";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface LoanQuickLookupProps {
  hrefForLoan?: (loanId: string) => string;
  onPickLoan?: (loan: LoanAccountResponse) => void;
  actionLabel?: string;
  helperText?: string;
  className?: string;
}

export function LoanQuickLookup({
  hrefForLoan,
  onPickLoan,
  actionLabel = "Open",
  helperText = "Enter loan account number or full loan account UUID.",
  className,
}: LoanQuickLookupProps) {
  if (!hrefForLoan && !onPickLoan) {
    throw new Error("LoanQuickLookup requires hrefForLoan and/or onPickLoan");
  }
  const [searchText, setSearchText] = React.useState("");
  const [debouncedQ, setDebouncedQ] = React.useState("");

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(searchText.trim()), 320);
    return () => window.clearTimeout(t);
  }, [searchText]);

  const isUuid = UUID_RE.test(debouncedQ);

  const byId = useQuery({
    queryKey: ["loans", "lookup-id", debouncedQ],
    queryFn: () => loanAccountsApi.getById(debouncedQ),
    enabled: isUuid,
    retry: false,
  });

  const byNumber = useQuery({
    queryKey: ["loans", "lookup-number", debouncedQ],
    queryFn: () => loanAccountsApi.getByNumber(debouncedQ),
    enabled: debouncedQ.length > 0 && !isUuid,
    retry: false,
  });

  const resultLoan: LoanAccountResponse | undefined = isUuid
    ? byId.data
    : byNumber.data;
  const loading = isUuid ? byId.isLoading : byNumber.isLoading;
  const err = isUuid ? byId.error : byNumber.error;
  const rows = resultLoan ? [resultLoan] : [];

  return (
    <div className={className}>
      <div className="grid max-w-md gap-1.5">
        <Label htmlFor="loan-quick-lookup-q">Search</Label>
        <Input
          id="loan-quick-lookup-q"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Loan number or UUID…"
          autoComplete="off"
        />
      </div>
      {!debouncedQ ? (
        <p className="mt-3 text-sm text-muted-foreground">{helperText}</p>
      ) : loading ? (
        <Skeleton className="mt-4 h-24 w-full max-w-3xl" />
      ) : err ? (
        <p className="mt-3 text-sm text-destructive">{describeApiError(err)}</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No loan found for this query.</p>
      ) : (
        <div className="mt-4 max-w-4xl overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>UUID</TableHead>
                <TableHead>Account #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead className="text-right"> </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <CopyableUuid
                      value={l.id}
                      href={hrefForLoan ? hrefForLoan(l.id) : `/loans/accounts/${l.id}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{l.loanAccountNumber}</TableCell>
                  <TableCell>
                    <CopyableUuid value={l.customerId} href={l.customerId ? `/customers/${l.customerId}` : undefined} />
                  </TableCell>
                  <TableCell>
                    <LoanStatusBadge status={l.status} />
                  </TableCell>
                  <TableCell>{l.currency}</TableCell>
                  <TableCell className="text-right">
                    {onPickLoan ? (
                      <Button type="button" variant="link" className="h-auto p-0" onClick={() => onPickLoan(l)}>
                        {actionLabel}
                      </Button>
                    ) : hrefForLoan ? (
                      <Button variant="link" className="h-auto p-0" asChild>
                        <Link href={hrefForLoan(l.id)}>{actionLabel}</Link>
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
