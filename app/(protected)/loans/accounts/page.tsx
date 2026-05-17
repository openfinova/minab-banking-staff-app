"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { RouteGuard } from "@/components/rbac/route-guard";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/data/pagination";
import { LoanStatusBadge } from "@/components/loans/loan-badges";
import { LoanQuickLookup } from "@/components/loans/loan-quick-lookup";
import { describeApiError } from "@/lib/api/errors";
import {
  loanAccountsApi,
  LOAN_STATUSES,
  type DelinquencyBucket,
  type LoanStatus,
} from "@/lib/api/modules/loans";
import { Permissions } from "@/lib/rbac/permissions";
import { Skeleton } from "@/components/ui/skeleton";

const BUCKETS: DelinquencyBucket[] = [
  "CURRENT",
  "DPD_1_30",
  "DPD_31_60",
  "DPD_61_90",
  "DPD_91_180",
  "DPD_180_PLUS",
];

export default function LoanAccountsDirectoryPage() {
  return (
    <RouteGuard permissions={[Permissions.LoanRead]}>
      <AccountsContent />
    </RouteGuard>
  );
}

function AccountsContent() {
  const [mode, setMode] = React.useState<
    "status" | "delinquent" | "bucket" | "maturing" | "customer"
  >("status");
  const [page, setPage] = React.useState(0);
  const [status, setStatus] = React.useState<LoanStatus>("ACTIVE");
  const [bucket, setBucket] = React.useState<DelinquencyBucket>("DPD_1_30");
  const [mStart, setMStart] = React.useState("");
  const [mEnd, setMEnd] = React.useState("");
  const [customerId, setCustomerId] = React.useState("");

  const byStatus = useQuery({
    queryKey: ["loans", "accounts", "status", status, page],
    queryFn: () => loanAccountsApi.listByStatus(status, page, 20),
    enabled: mode === "status",
  });
  const delinquent = useQuery({
    queryKey: ["loans", "accounts", "delinquent", page],
    queryFn: () => loanAccountsApi.listDelinquent(page, 20),
    enabled: mode === "delinquent",
  });
  const byBucket = useQuery({
    queryKey: ["loans", "accounts", "bucket", bucket, page],
    queryFn: () => loanAccountsApi.listByDelinquencyBucket(bucket, page, 20),
    enabled: mode === "bucket",
  });
  const maturing = useQuery({
    queryKey: ["loans", "accounts", "maturing", mStart, mEnd, page],
    queryFn: () => loanAccountsApi.listMaturingBetween(mStart, mEnd, page, 20),
    enabled: mode === "maturing" && Boolean(mStart) && Boolean(mEnd),
  });
  const byCustomer = useQuery({
    queryKey: ["loans", "accounts", "customer", customerId, page],
    queryFn: () => loanAccountsApi.listByCustomer(customerId, page, 20),
    enabled: mode === "customer" && customerId.length > 10,
  });

  const q =
    mode === "status"
      ? byStatus
      : mode === "delinquent"
        ? delinquent
        : mode === "bucket"
          ? byBucket
          : mode === "maturing"
            ? maturing
            : byCustomer;

  const rows = q.data?.content ?? [];
  const totalPages = q.data?.totalPages ?? 0;

  React.useEffect(() => {
    setPage(0);
  }, [mode, status, bucket, mStart, mEnd, customerId]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Loan accounts"
        description="Slice the live loan book by lifecycle status — open a facility for deep servicing."
        actions={
          <Button asChild>
            <Link href="/loans/accounts/new">New account</Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Browse</CardTitle>
          <CardDescription>Pick a portfolio slice — there is no single unfiltered “all loans” view.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-1.5 sm:max-w-xs">
            <Label>View</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="status">By status</SelectItem>
                <SelectItem value="delinquent">Delinquent</SelectItem>
                <SelectItem value="bucket">Delinquency bucket</SelectItem>
                <SelectItem value="maturing">Maturing between</SelectItem>
                <SelectItem value="customer">By customer id</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mode === "status" ? (
            <div className="grid gap-1.5 sm:max-w-xs">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as LoanStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOAN_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {mode === "bucket" ? (
            <div className="grid gap-1.5 sm:max-w-xs">
              <Label>Bucket</Label>
              <Select value={bucket} onValueChange={(v) => setBucket(v as DelinquencyBucket)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUCKETS.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {mode === "maturing" ? (
            <div className="flex flex-wrap gap-3">
              <div className="grid gap-1.5">
                <Label>Start</Label>
                <Input type="date" value={mStart} onChange={(e) => setMStart(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>End</Label>
                <Input type="date" value={mEnd} onChange={(e) => setMEnd(e.target.value)} />
              </div>
            </div>
          ) : null}

          {mode === "customer" ? (
            <div className="grid gap-1.5 max-w-lg">
              <Label>Customer UUID</Label>
              <Input value={customerId} onChange={(e) => setCustomerId(e.target.value)} placeholder="Customer id" />
            </div>
          ) : null}

          <div>
            <h4 className="mb-2 text-sm font-medium">Quick open by account</h4>
            <LoanQuickLookup hrefForLoan={(lid) => `/loans/accounts/${lid}`} />
          </div>

          {q.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : q.isError ? (
            <p className="text-destructive text-sm">{describeApiError(q.error)}</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Number</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Principal</TableHead>
                      <TableHead className="text-right"> </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">{r.loanAccountNumber}</TableCell>
                        <TableCell>
                          <LoanStatusBadge status={r.status} />
                        </TableCell>
                        <TableCell className="font-mono text-[10px]">{r.customerId}</TableCell>
                        <TableCell>
                          {r.principalAmount} {r.currency}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="link" className="h-auto p-0" asChild>
                            <Link href={`/loans/accounts/${r.id}`}>Open</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
