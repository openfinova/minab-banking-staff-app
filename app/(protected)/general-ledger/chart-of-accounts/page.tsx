"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LibraryBig } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Can } from "@/components/rbac/can";
import { RouteGuard } from "@/components/rbac/route-guard";
import { useToast } from "@/components/ui/use-toast";
import { CopyableUuid } from "@/components/data/copyable-uuid";
import { StatusBadge } from "@/components/data/status-badge";
import { describeApiError } from "@/lib/api/errors";
import { glAccountsApi, glSetupApi } from "@/lib/api/modules/operations";
import { Permissions } from "@/lib/rbac/permissions";
import { cn } from "@/lib/utils";

export default function ChartOfAccountsPage() {
  return (
    <RouteGuard permissions={[Permissions.GlRead]}>
      <ChartOfAccountsContent />
    </RouteGuard>
  );
}

function ChartOfAccountsContent() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = React.useState(0);
  const [searchDraft, setSearchDraft] = React.useState("");
  const [search, setSearch] = React.useState<string | undefined>(undefined);

  const list = useQuery({
    queryKey: ["gl-accounts", page, search],
    queryFn: () => glAccountsApi.list({ page, size: 25, search }),
  });

  const totalElements = list.data?.totalElements ?? 0;
  const showInstallStandardChart = list.isSuccess && totalElements === 0;

  const submitSearch = () => {
    setPage(0);
    setSearch(searchDraft.trim() || undefined);
  };

  const empty =
    list.isSuccess &&
    (!list.data?.content?.length || list.data.totalElements === 0) &&
    page === 0;

  const initChart = useMutation({
    mutationFn: (currency: string) =>
      glSetupApi.initializeChartOfAccounts(currency.trim().toUpperCase()),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["gl-accounts"] });
      toast({
        title: "Standard chart installed",
        description: `Created ${res.glAccountsCreated} GL account${res.glAccountsCreated === 1 ? "" : "s"} (${res.currency}).`,
      });
    },
    onError: (error) =>
      toast({ variant: "destructive", title: "Setup failed", description: describeApiError(error) }),
  });

  const totalPages = list.data?.totalPages ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chart of accounts"
        description="Paged view of GL accounts plus one-click install of the server standard banking template."
        actions={
          showInstallStandardChart ? (
            <Can permissions={[Permissions.GlApprove]}>
              <StandardChartDialog
                submitting={initChart.isPending}
                onSubmit={(currency) => initChart.mutate(currency)}
                triggerLabel="Install standard chart of accounts"
              />
            </Can>
          ) : null
        }
      />

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Accounts</CardTitle>
            <CardDescription>Search and maintain the authoritative chart powering every journal.</CardDescription>
          </div>
          <div className="flex w-full max-w-md gap-2">
            <Input
              placeholder="Search code or name"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitSearch();
              }}
            />
            <Button type="button" variant="secondary" onClick={submitSearch}>
              Search
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {list.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : list.isError ? (
            <EmptyState title="Could not load accounts" description={describeApiError(list.error)} />
          ) : empty ? (
            <EmptyState
              icon={<LibraryBig className="h-5 w-5" />}
              title="No GL accounts yet"
              description={
                "Install the bank's standard chart template, then wire operational mappings from the Operational accounts screen."
              }
              action={
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Can permissions={[Permissions.GlApprove]}>
                    <StandardChartDialog
                      submitting={initChart.isPending}
                      onSubmit={(currency) => initChart.mutate(currency)}
                      triggerLabel="Install standard chart of accounts"
                    />
                  </Can>
                  <Button variant="outline" asChild>
                    <Link href="/general-ledger/operational-accounts">Operational mappings</Link>
                  </Button>
                </div>
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>UUID</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>CCY</TableHead>
                    <TableHead>Parent</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(list.data?.content ?? []).map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <CopyableUuid value={a.id} />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{a.code}</TableCell>
                      <TableCell>{a.name}</TableCell>
                      <TableCell>{a.type}</TableCell>
                      <TableCell>{a.currency}</TableCell>
                      <TableCell className="font-mono text-xs">{a.parentCode ?? "—"}</TableCell>
                      <TableCell>
                        <StatusBadge status={a.status ?? "?"} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalPages > 1 ? (
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Page {(list.data?.number ?? 0) + 1} of {totalPages} ·{" "}
                    {(list.data?.totalElements ?? 0).toLocaleString()} rows
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StandardChartDialog({
  submitting,
  onSubmit,
  triggerLabel = "Install standard chart of accounts",
  triggerClassName,
}: {
  submitting: boolean;
  onSubmit: (currency: string) => void;
  triggerLabel?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [currency, setCurrency] = React.useState("EUR");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          className={cn(
            "h-auto min-h-9 w-full max-w-full whitespace-normal text-balance leading-snug px-4 py-2.5 sm:w-auto sm:max-w-sm",
            triggerClassName,
          )}
        >
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Standard chart of accounts</DialogTitle>
          <DialogDescription>
            Seeds the predefined template — existing codes are skipped; definition is owned by the GL service package.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Base currency</Label>
            <Input value={currency} maxLength={3} onChange={(e) => setCurrency(e.target.value.toUpperCase())} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            loading={submitting}
            onClick={() => {
              onSubmit(currency);
              setOpen(false);
            }}
          >
            Install
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
