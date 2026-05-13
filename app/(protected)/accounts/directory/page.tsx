"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { RouteGuard } from "@/components/rbac/route-guard";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { CustomerIdentityPicker } from "@/components/accounts/customer-identity-picker";
import { describeApiError } from "@/lib/api/errors";
import {
  accountsApi,
  type AccountProductType,
  type AccountStatus,
} from "@/lib/api/modules/accounts";
import { Permissions } from "@/lib/rbac/permissions";

const PRODUCT_TYPES: Array<AccountProductType | ""> = [
  "",
  "CHECKING",
  "SAVINGS",
  "MONEY_MARKET",
  "CERTIFICATE_OF_DEPOSIT",
  "CREDIT_LINE",
  "INVESTMENT",
];

const STATUSES: Array<AccountStatus | ""> = [
  "",
  "ACTIVE",
  "SUSPENDED",
  "FROZEN",
  "CLOSED",
  "DORMANT",
];

function formatMoney(v: string | number | undefined, currency: string): string {
  if (v === undefined || v === null) return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(n)) return String(v);
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);
}

export default function AccountsDirectoryPage() {
  return (
    <RouteGuard permissions={[Permissions.AccountRead]}>
      <AccountsDirectoryContent />
    </RouteGuard>
  );
}

function AccountsDirectoryContent() {
  const [page, setPage] = React.useState(0);
  const [productType, setProductType] = React.useState<AccountProductType | "">("");
  const [status, setStatus] = React.useState<AccountStatus | "">("");
  const [primaryUserProfileId, setPrimaryUserProfileId] = React.useState("");

  const list = useQuery({
    queryKey: ["accounts", "search", page, productType || null, status || null, primaryUserProfileId || null],
    queryFn: () =>
      accountsApi.search({
        page,
        size: 20,
        ...(productType ? { productType } : {}),
        ...(status ? { status } : {}),
        ...(primaryUserProfileId.trim() ? { primaryUserProfileId: primaryUserProfileId.trim() } : {}),
      }),
  });

  const rows = list.data?.content ?? [];
  const totalPages = list.data?.totalPages ?? 0;
  const empty = list.isSuccess && rows.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account directory"
        description="Filter by product type, status, or optional primary customer (identity user id) — GET /api/v1/accounts."
      />

      <Card>
        <CardHeader className="flex flex-col gap-4">
          <div>
            <CardTitle>Accounts</CardTitle>
            <CardDescription>
              Default sort is createdAt. Narrow by primary <strong>customer</strong> (their linked identity user
              id) or product/status.
            </CardDescription>
          </div>
          <div className="grid w-full gap-4 lg:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="acct-prod">Product type</Label>
              <Select
                value={productType || "__all__"}
                onValueChange={(v) => {
                  setPage(0);
                  setProductType(v === "__all__" ? "" : (v as AccountProductType));
                }}
              >
                <SelectTrigger id="acct-prod">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All types</SelectItem>
                  {PRODUCT_TYPES.filter(Boolean).map((p) => (
                    <SelectItem key={p} value={p as string}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="acct-status">Status</Label>
              <Select
                value={status || "__all__"}
                onValueChange={(v) => {
                  setPage(0);
                  setStatus(v === "__all__" ? "" : (v as AccountStatus));
                }}
              >
                <SelectTrigger id="acct-status">
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
          <div className="w-full max-w-3xl">
            <CustomerIdentityPicker
              idPrefix="acct-dir"
              role="filter"
              profileUserId={primaryUserProfileId}
              onProfileUserIdChange={(v) => {
                setPage(0);
                setPrimaryUserProfileId(v);
              }}
              actionLabel="Filter by this customer"
            />
          </div>
        </CardHeader>
        <CardContent>
          {list.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : list.isError ? (
            <EmptyState title="Could not load accounts" description={describeApiError(list.error)} />
          ) : empty ? (
            <EmptyState
              title="No accounts"
              description="Adjust filters or onboard a new account from New account."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ledger</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-xs">{a.accountNumber}</TableCell>
                      <TableCell>{a.productType}</TableCell>
                      <TableCell>
                        <StatusBadge status={a.status} />
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatMoney(a.ledgerBalance, a.currency)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatMoney(a.availableBalance, a.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="link" className="h-auto p-0" asChild>
                          <Link href={`/accounts/${a.id}`}>Open</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
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
                    disabled={totalPages > 0 && page >= totalPages - 1}
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
