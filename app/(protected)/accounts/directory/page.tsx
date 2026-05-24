"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { type ColumnDef, type RowSelectionState } from "@tanstack/react-table";
import { RouteGuard } from "@/components/rbac/route-guard";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { CopyableUuid } from "@/components/data/copyable-uuid";
import { StatusBadge } from "@/components/data/status-badge";
import { CustomerIdentityPicker } from "@/components/accounts/customer-identity-picker";
import { DataTable } from "@/components/data/data-table";
import { describeApiError } from "@/lib/api/errors";
import {
  accountsApi,
  type AccountProductType,
  type AccountResponse,
  type AccountStatus,
} from "@/lib/api/modules/accounts";
import { Permissions } from "@/lib/rbac/permissions";
import { Can } from "@/components/rbac/can";
import { useToast } from "@/components/ui/use-toast";

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

const SORT_OPTIONS: { label: string; value: string }[] = [
  { label: "Newest first", value: "createdAt,desc" },
  { label: "Oldest first", value: "createdAt,asc" },
  { label: "Account number A→Z", value: "accountNumber,asc" },
  { label: "Account number Z→A", value: "accountNumber,desc" },
];

const PAGE_SIZES = [10, 20, 50, 100] as const;

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
  const router = useRouter();
  const { toast } = useToast();
  const [page, setPage] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(20);
  const [sort, setSort] = React.useState("createdAt,desc");
  const [productType, setProductType] = React.useState<AccountProductType | "">("");
  const [status, setStatus] = React.useState<AccountStatus | "">("");
  const [primaryUserProfileId, setPrimaryUserProfileId] = React.useState("");
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  const list = useQuery({
    queryKey: [
      "accounts",
      "search",
      page,
      pageSize,
      sort,
      productType || null,
      status || null,
      primaryUserProfileId || null,
    ],
    queryFn: () =>
      accountsApi.search({
        page,
        size: pageSize,
        sort,
        ...(productType ? { productType } : {}),
        ...(status ? { status } : {}),
        ...(primaryUserProfileId.trim() ? { primaryUserProfileId: primaryUserProfileId.trim() } : {}),
      }),
  });

  React.useEffect(() => {
    setRowSelection({});
  }, [page, pageSize, sort, productType, status, primaryUserProfileId, list.data?.number]);

  const rows = list.data?.content ?? [];
  const totalPages = list.data?.totalPages ?? 0;
  const empty = list.isSuccess && rows.length === 0;

  const selectedIds = React.useMemo(() => Object.keys(rowSelection).filter((k) => rowSelection[k]), [rowSelection]);

  const columns = React.useMemo<ColumnDef<AccountResponse, unknown>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false
            }
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
            aria-label="Select all on page"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            aria-label={`Select ${row.original.accountNumber}`}
          />
        ),
      },
      {
        accessorKey: "id",
        header: "UUID",
        cell: ({ row }) => (
          <CopyableUuid value={row.original.id} href={`/accounts/${row.original.id}`} />
        ),
      },
      {
        accessorKey: "accountNumber",
        header: "Number",
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.accountNumber}</span>,
      },
      { accessorKey: "productType", header: "Product" },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "ledgerBalance",
        header: () => <span className="block text-right">Ledger</span>,
        cell: ({ row }) => (
          <span className="block text-right text-sm">{formatMoney(row.original.ledgerBalance, row.original.currency)}</span>
        ),
      },
      {
        accessorKey: "availableBalance",
        header: () => <span className="block text-right">Available</span>,
        cell: ({ row }) => (
          <span className="block text-right text-sm">
            {formatMoney(row.original.availableBalance, row.original.currency)}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="block text-right">Actions</span>,
        cell: ({ row }) => (
          <div className="text-right">
            <Button variant="link" className="h-auto p-0" asChild>
              <Link href={`/accounts/${row.original.id}`}>Open</Link>
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  const copySelected = async () => {
    if (!selectedIds.length) return;
    try {
      await navigator.clipboard.writeText(selectedIds.join(", "));
      toast({ title: "Copied account ids", description: `${selectedIds.length} id(s) on clipboard.` });
    } catch {
      toast({ variant: "destructive", title: "Copy failed", description: "Clipboard permission denied." });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account directory"
        description="Paged search by product, status, or primary relationship customer. Select rows for clipboard export or bulk servicing."
      />

      <Card>
        <CardHeader className="flex flex-col gap-4">
          <div>
            <CardTitle>Accounts</CardTitle>
            <CardDescription>
              Choose how results are sorted and how many rows to load per page. Multi-select feeds the batch
              operations console.
            </CardDescription>
          </div>
          <div className="grid w-full gap-4 lg:grid-cols-3">
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
            <div className="grid gap-1.5">
              <Label htmlFor="acct-sort">Sort</Label>
              <Select
                value={sort}
                onValueChange={(v) => {
                  setPage(0);
                  setSort(v);
                }}
              >
                <SelectTrigger id="acct-sort">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="acct-ps">Page size</Label>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPage(0);
                  setPageSize(Number(v));
                }}
              >
                <SelectTrigger id="acct-ps">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((s) => (
                    <SelectItem key={s} value={String(s)}>
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
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" disabled={!selectedIds.length} onClick={() => void copySelected()}>
                  Copy selected ids
                </Button>
                <Can permissions={[Permissions.AccountWrite]}>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={!selectedIds.length}
                    onClick={() => {
                      const q = new URLSearchParams({ batchIds: selectedIds.join(",") });
                      router.push(`/accounts/operations?${q.toString()}`);
                    }}
                  >
                    Send to bulk operations
                  </Button>
                </Can>
                <span className="text-xs text-muted-foreground">
                  {selectedIds.length ? `${selectedIds.length} selected` : "Select rows to export ids"}
                </span>
              </div>
              <DataTable<AccountResponse>
                columns={columns}
                data={rows}
                getRowId={(row) => row.id}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
                footer={
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
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
                }
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
