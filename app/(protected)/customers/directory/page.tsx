"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Can } from "@/components/rbac/can";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { CustomerQuickLookup } from "@/components/customers/customer-quick-lookup";
import { describeApiError } from "@/lib/api/errors";
import { customersApi, type CustomerResponse, type CustomerStatus } from "@/lib/api/modules/customers";
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
  const [tab, setTab] = React.useState("quick");
  const [page, setPage] = React.useState(0);
  const [status, setStatus] = React.useState<CustomerStatus | "">("");
  const [searchText, setSearchText] = React.useState("");
  const [debouncedQ, setDebouncedQ] = React.useState("");
  const [taxId, setTaxId] = React.useState("");

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(searchText.trim()), 320);
    return () => window.clearTimeout(t);
  }, [searchText]);

  const list = useQuery({
    queryKey: ["customers", "list", page, status || null, debouncedQ || null],
    enabled: tab === "browse",
    queryFn: () =>
      customersApi.list({
        page,
        size: 20,
        ...(status ? { status } : {}),
        ...(debouncedQ ? { q: debouncedQ } : {}),
      }),
  });

  const byTax = useMutation({
    mutationFn: () => customersApi.getByTaxId(taxId.trim()),
  });

  const rows = list.data?.content ?? [];
  const totalPages = list.data?.totalPages ?? 0;
  const empty = list.isSuccess && rows.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer directory"
        description="Quick search first when you already have a cue; switch to Browse for paged listings and filters, or Tax ID lookup when you hold customer:pii:read."
      />

      <Card>
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <CardHeader className="space-y-4 pb-3">
            <div>
              <CardTitle>Find customers</CardTitle>
              <CardDescription>
                Quick pick searches on demand without loading the full directory first; Browse pulls the paginated grid
                (and runs its request only while that tab is open); Tax ID uses a dedicated PII-gated endpoint.
              </CardDescription>
            </div>
            <TabsList className="grid h-auto w-full max-w-xl shrink-0 grid-cols-1 gap-2 sm:grid-cols-3">
              <TabsTrigger value="quick">Quick pick</TabsTrigger>
              <TabsTrigger value="browse">Browse</TabsTrigger>
              <TabsTrigger value="tax">Tax ID</TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent className="pt-0">
            <TabsContent value="quick" className="mt-2 focus-visible:outline-none">
              <CustomerQuickLookup hrefForCustomer={(id) => `/customers/${id}`} actionLabel="Open record" />
            </TabsContent>

            <TabsContent value="browse" className="mt-2 space-y-4 focus-visible:outline-none">
              {tab === "browse" ? (
              <>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
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
              </div>

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

                  <div className="flex items-center justify-between gap-2">
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
                </>
              ) : null}
            </TabsContent>

            <TabsContent value="tax" className="mt-2 space-y-4 focus-visible:outline-none">
              <CardDescription className="text-sm">
                Keyword search and browse use generic fields; tax id runs a strict PII-backed lookup only.
              </CardDescription>
              <Can
                permissions={[Permissions.CustomerPiiRead]}
                fallback={
                  <p className="text-sm text-muted-foreground">
                    Tax ID lookup requires the <code className="text-xs">customer:pii:read</code> permission.
                  </p>
                }
              >
                <div className="grid max-w-lg gap-2">
                  <Label htmlFor="tid">Tax identification number</Label>
                  <Input id="tid" value={taxId} onChange={(e) => setTaxId(e.target.value)} />
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    if (!taxId.trim()) return;
                    byTax.mutate();
                  }}
                  disabled={byTax.isPending || !taxId.trim()}
                >
                  {byTax.isPending ? "Loading…" : "Lookup"}
                </Button>
                {byTax.isError ? (
                  <p className="text-sm text-destructive">{describeApiError(byTax.error)}</p>
                ) : null}
                {byTax.data ? <CustomerLookupResult c={byTax.data} /> : null}
              </Can>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}

function CustomerLookupResult({ c }: { c: CustomerResponse }) {
  const label =
    c.type === "BUSINESS" || c.type === "TRUST"
      ? (c.businessName ?? c.customerNumber)
      : [c.firstName, c.lastName].filter(Boolean).join(" ") || c.customerNumber;

  return (
    <div className="rounded-md border bg-card p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">{label}</p>
          <p className="font-mono text-xs text-muted-foreground">{c.customerNumber}</p>
        </div>
        <Button variant="secondary" size="sm" asChild>
          <Link href={`/customers/${c.id}`}>Open record</Link>
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <StatusBadge status={c.status} />
        <StatusBadge status={c.kycStatus} />
        <span className="text-xs text-muted-foreground">{c.type}</span>
      </div>
    </div>
  );
}
