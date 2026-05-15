"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { RouteGuard } from "@/components/rbac/route-guard";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { Pagination } from "@/components/data/pagination";
import { describeApiError } from "@/lib/api/errors";
import {
  loanProductsApi,
  LOAN_PRODUCT_TYPES,
  type LoanProductType,
} from "@/lib/api/modules/loans";
import { Permissions } from "@/lib/rbac/permissions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function LoanProductsDirectoryPage() {
  return (
    <RouteGuard permissions={[Permissions.LoanRead]}>
      <LoanProductsContent />
    </RouteGuard>
  );
}

function LoanProductsContent() {
  const [page, setPage] = React.useState(0);
  const [includeInactive, setIncludeInactive] = React.useState(false);
  const [filterType, setFilterType] = React.useState<LoanProductType | "">("");

  const list = useQuery({
    queryKey: ["loans", "products", "list", page, includeInactive],
    queryFn: () => loanProductsApi.list({ page, size: 20, includeInactive }),
    enabled: !filterType,
  });

  const byType = useQuery({
    queryKey: ["loans", "products", "by-type", filterType, page],
    queryFn: () => loanProductsApi.listByType(filterType as LoanProductType, page, 20),
    enabled: Boolean(filterType),
  });

  const q = filterType ? byType : list;
  const rows = q.data?.content ?? [];
  const totalPages = q.data?.totalPages ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Loan products"
        description="Paged catalog — GET /api/v1/loan-products. Toggle inactive, filter by type, or open a product for fees and validation."
        actions={
          <Button asChild>
            <Link href="/loans/products/new">New product</Link>
          </Button>
        }
      />

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Catalog</CardTitle>
            <CardDescription>Active-only by default; use filters for inactive or product type slices.</CardDescription>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <Switch
                id="inc-inactive"
                checked={includeInactive}
                onCheckedChange={(v) => {
                  setIncludeInactive(v);
                  setPage(0);
                }}
              />
              <Label htmlFor="inc-inactive">Include inactive</Label>
            </div>
            <div className="grid gap-1.5 sm:w-52">
              <Label>Type filter</Label>
              <Select
                value={filterType || "__all__"}
                onValueChange={(v) => {
                  setPage(0);
                  setFilterType(v === "__all__" ? "" : (v as LoanProductType));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types (paged)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All (list)</SelectItem>
                  {LOAN_PRODUCT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" asChild>
              <Link href="/loans/products/search">Match by amount</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {q.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : q.isError ? (
            <p className="text-sm text-destructive">{describeApiError(q.error)}</p>
          ) : rows.length === 0 ? (
            <EmptyState title="No products" description="Create a product or widen filters." />
          ) : (
            <>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Currency</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead className="text-right"> </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{p.productCode}</TableCell>
                        <TableCell>{p.productName}</TableCell>
                        <TableCell>{p.productType}</TableCell>
                        <TableCell>{p.currency}</TableCell>
                        <TableCell>
                          <StatusBadge status={p.active ? "ACTIVE" : "INACTIVE"} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="link" className="h-auto p-0" asChild>
                            <Link href={`/loans/products/${p.id}`}>Open</Link>
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
