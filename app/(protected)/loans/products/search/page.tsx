"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { RouteGuard } from "@/components/rbac/route-guard";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { describeApiError } from "@/lib/api/errors";
import { loanProductsApi, type LoanProductResponse } from "@/lib/api/modules/loans";
import { Permissions } from "@/lib/rbac/permissions";

export default function LoanProductsSearchPage() {
  return (
    <RouteGuard permissions={[Permissions.LoanRead]}>
      <SearchContent />
    </RouteGuard>
  );
}

function SearchContent() {
  const [amount, setAmount] = React.useState("10000");
  const [tenor, setTenor] = React.useState("24");
  const [currency, setCurrency] = React.useState("USD");

  const search = useMutation({
    mutationFn: () => loanProductsApi.findMatching(Number(amount), Number(tenor), currency),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Match products" description="GET /api/v1/loan-products/search" />

      <Card>
        <CardHeader>
          <CardTitle>Criteria</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="grid gap-1.5">
            <Label>Amount</Label>
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} className="w-32" />
          </div>
          <div className="grid gap-1.5">
            <Label>Tenor (months)</Label>
            <Input value={tenor} onChange={(e) => setTenor(e.target.value)} className="w-28" />
          </div>
          <div className="grid gap-1.5">
            <Label>Currency</Label>
            <Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} className="w-24" />
          </div>
          <Button type="button" disabled={search.isPending} onClick={() => search.mutate()}>
            Search
          </Button>
        </CardContent>
      </Card>

      {search.isError ? (
        <p className="text-sm text-destructive">{describeApiError(search.error)}</p>
      ) : search.data ? (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Range</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(search.data as LoanProductResponse[]).map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.productCode}</TableCell>
                  <TableCell>{p.productName}</TableCell>
                  <TableCell>{p.productType}</TableCell>
                  <TableCell className="text-xs">
                    {p.minAmount}–{p.maxAmount} {p.currency}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  );
}
