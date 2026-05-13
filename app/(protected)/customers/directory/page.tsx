"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { RouteGuard } from "@/components/rbac/route-guard";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/data/status-badge";
import { describeApiError } from "@/lib/api/errors";
import { customersApi, type CustomerStatus } from "@/lib/api/modules/customers";
import { Permissions } from "@/lib/rbac/permissions";

const STATUSES: Array<CustomerStatus | ""> = [
  "",
  "PROSPECT",
  "ACTIVE",
  "INACTIVE",
  "BLOCKED",
  "DECEASED",
  "CLOSED",
  "ANONYMIZED",
];

export default function CustomerDirectoryPage() {
  return (
    <RouteGuard permissions={[Permissions.CustomerRead]}>
      <CustomerDirectoryContent />
    </RouteGuard>
  );
}

function CustomerDirectoryContent() {
  const [page, setPage] = React.useState(0);
  const [status, setStatus] = React.useState<CustomerStatus | "">("");
  const [searchText, setSearchText] = React.useState("");
  const [debouncedQ, setDebouncedQ] = React.useState("");

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(searchText.trim()), 320);
    return () => window.clearTimeout(t);
  }, [searchText]);

  const list = useQuery({
    queryKey: ["customers", "list", page, status || null, debouncedQ || null],
    queryFn: () =>
      customersApi.list({
        page,
        size: 20,
        ...(status ? { status } : {}),
        ...(debouncedQ ? { q: debouncedQ } : {}),
      }),
  });

  const rows = list.data?.content ?? [];
  const totalPages = list.data?.totalPages ?? 0;
  const empty = list.isSuccess && rows.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer directory"
        description="Search by customer number, name, business name, address fields, email or phone (contacts), or full customer UUID — GET /api/v1/customers?q=…"
      />

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Customers</CardTitle>
            <CardDescription>
              Filter by text (number, name, contacts, UUID) and optional status. Sort: createdAt descending.
            </CardDescription>
          </div>
          <div className="flex w-full flex-col gap-4 sm:max-w-xl sm:flex-row sm:items-end">
            <div className="grid w-full min-w-0 flex-1 gap-1.5">
              <Label htmlFor="cust-search">Search</Label>
              <Input
                id="cust-search"
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setPage(0);
                }}
                placeholder="Number, name, email, phone, or UUID…"
                autoComplete="off"
              />
            </div>
            <div className="grid w-full gap-1.5 sm:w-44">
              <Label htmlFor="status-filter">Status</Label>
              <Select
                value={status || "__all__"}
                onValueChange={(v) => {
                  setPage(0);
                  setStatus(v === "__all__" ? "" : (v as CustomerStatus));
                }}
              >
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All statuses</SelectItem>
                  {STATUSES.filter(Boolean).map((s) => (
                    <SelectItem key={s} value={s as string}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {list.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : list.isError ? (
            <EmptyState title="Could not load customers" description={describeApiError(list.error)} />
          ) : empty ? (
            <EmptyState
              title={debouncedQ ? "No matches" : "No customers"}
              description={
                debouncedQ
                  ? "Try another term or clear the search box. Number, name, email/phone on file, or full UUID are supported."
                  : "Create a profile from New customer or adjust the status filter."
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>KYC</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((c) => {
                    const label =
                      c.type === "BUSINESS" || c.type === "TRUST"
                        ? (c.businessName ?? c.customerNumber)
                        : [c.firstName, c.lastName].filter(Boolean).join(" ") || c.customerNumber;
                    return (
                      <TableRow key={c.id}>
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
                          <Button variant="link" className="h-auto p-0" asChild>
                            <Link href={`/customers/${c.id}`}>Open</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="mt-4 flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  Page {(list.data?.number ?? 0) + 1} of {Math.max(totalPages, 1)}
                  {list.data?.totalElements != null ? ` · ${list.data.totalElements} total` : null}
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page <= 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={totalPages > 0 ? page >= totalPages - 1 : rows.length < 20}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
