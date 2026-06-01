"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { RouteGuard } from "@/components/rbac/route-guard";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CopyableUuid } from "@/components/data/copyable-uuid";
import { Pagination } from "@/components/data/pagination";
import { ApplicationStatusBadge } from "@/components/loans/loan-badges";
import { describeApiError } from "@/lib/api/errors";
import { loanApplicationsApi, type LoanApplicationResponse } from "@/lib/api/modules/loans";
import { Permissions } from "@/lib/rbac/permissions";
import { Skeleton } from "@/components/ui/skeleton";

export default function LoanApplicationsPage() {
  return (
    <RouteGuard permissions={[Permissions.LoanRead]}>
      <ApplicationsContent />
    </RouteGuard>
  );
}

function ApplicationsContent() {
  const [page, setPage] = React.useState(0);
  const [tab, setTab] = React.useState("pending");
  const [start, setStart] = React.useState("");
  const [end, setEnd] = React.useState("");

  const pending = useQuery({
    queryKey: ["loans", "apps", "pending", page],
    queryFn: () => loanApplicationsApi.listPending(page, 20),
    enabled: tab === "pending",
  });
  const approved = useQuery({
    queryKey: ["loans", "apps", "approved", page],
    queryFn: () => loanApplicationsApi.listApproved(page, 20),
    enabled: tab === "approved",
  });
  const rejected = useQuery({
    queryKey: ["loans", "apps", "rejected", page],
    queryFn: () => loanApplicationsApi.listRejected(page, 20),
    enabled: tab === "rejected",
  });
  const guarantors = useQuery({
    queryKey: ["loans", "apps", "guarantors", page],
    queryFn: () => loanApplicationsApi.listRequiringGuarantors(page, 20),
    enabled: tab === "guarantors",
  });
  const range = useQuery({
    queryKey: ["loans", "apps", "range", start, end, page],
    queryFn: () => loanApplicationsApi.listApprovedBetween(start, end, page, 20),
    enabled: tab === "range" && Boolean(start) && Boolean(end),
  });

  const q =
    tab === "pending"
      ? pending
      : tab === "approved"
        ? approved
        : tab === "rejected"
          ? rejected
          : tab === "guarantors"
            ? guarantors
            : range;

  const rows = q.data?.content ?? [];
  const totalPages = q.data?.totalPages ?? 0;

  React.useEffect(() => {
    setPage(0);
  }, [tab]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Loan applications"
        description="Submission and underwriting queues grouped by reviewer state."
        actions={
          <Button asChild>
            <Link href="/loans/applications/new">New application</Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-4 flex flex-wrap h-auto gap-1">
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="guarantors">Needs guarantors</TabsTrigger>
              <TabsTrigger value="range">Approved date range</TabsTrigger>
            </TabsList>
            {tab === "range" ? (
              <DateRangeFilter
                startDate={start}
                endDate={end}
                onChange={({ startDate, endDate }) => {
                  setStart(startDate);
                  setEnd(endDate);
                }}
              />
            ) : null}
            <TabsContent value={tab} className="mt-0">
              {q.isLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : q.isError ? (
                <p className="text-destructive text-sm">{describeApiError(q.error)}</p>
              ) : (
                <>
                  <AppTable rows={rows} />
                  <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function AppTable({ rows }: { rows: LoanApplicationResponse[] }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No rows.</p>;
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>UUID</TableHead>
            <TableHead>Number</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Tenor</TableHead>
            <TableHead className="text-right"> </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <CopyableUuid value={r.id} href={`/loans/applications/${r.id}`} />
              </TableCell>
              <TableCell className="font-mono text-xs">{r.applicationNumber}</TableCell>
              <TableCell>
                <ApplicationStatusBadge status={r.status} />
              </TableCell>
              <TableCell>{r.requestedAmount}</TableCell>
              <TableCell>{r.requestedTenorMonths}</TableCell>
              <TableCell className="text-right">
                <Button variant="link" className="h-auto p-0" asChild>
                  <Link href={`/loans/applications/${r.id}`}>Open</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
