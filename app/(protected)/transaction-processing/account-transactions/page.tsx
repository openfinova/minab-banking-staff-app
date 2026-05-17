"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AccountResolveField } from "@/components/accounts/account-resolve-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { describeApiError } from "@/lib/api/errors";
import { accountTransactionsApi } from "@/lib/api/modules/transaction-processing";
import { Permissions } from "@/lib/rbac/permissions";
import { formatDateTime } from "@/lib/utils";

function defaultRangeIso() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);
  return {
    from: start.toISOString().slice(0, 16),
    to: end.toISOString().slice(0, 16),
  };
}

export default function AccountTransactionsOpsPage() {
  return (
    <RouteGuard permissions={[Permissions.AccountRead]}>
      <AccountTxContent />
    </RouteGuard>
  );
}

function AccountTxContent() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { from: df, to: dt } = defaultRangeIso();
  const [accountId, setAccountId] = React.useState("");
  const [fromDate, setFromDate] = React.useState(df);
  const [toDate, setToDate] = React.useState(dt);
  const [page, setPage] = React.useState(0);
  const [lookupId, setLookupId] = React.useState("");
  const [glLinkId, setGlLinkId] = React.useState("");

  React.useEffect(() => {
    setPage(0);
  }, [accountId]);

  const history = useQuery({
    queryKey: ["account-tx-history", accountId, fromDate, toDate, page],
    queryFn: () =>
      accountTransactionsApi.list(
        accountId.trim(),
        new Date(fromDate).toISOString(),
        new Date(toDate).toISOString(),
        { page, size: 50, sort: "transactionDate,desc" },
      ),
    enabled: accountId.trim().length > 0,
  });

  const one = useQuery({
    queryKey: ["account-tx-one", lookupId],
    queryFn: () => accountTransactionsApi.get(lookupId.trim()),
    enabled: lookupId.trim().length > 10,
  });

  const linkGl = useMutation({
    mutationFn: () => accountTransactionsApi.updateGlLink(lookupId.trim(), glLinkId.trim()),
    onSuccess: () => {
      toast({ title: "GL link updated" });
      void qc.invalidateQueries({ queryKey: ["account-tx-one"] });
    },
    onError: (e) =>
      toast({ variant: "destructive", title: "Failed", description: describeApiError(e) }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account transactions"
        description="Customer-account statement layer — requires account:read / account:write."
      />

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
          <CardDescription>
            Resolve an account (id, number, IBAN) or find a customer and pick the primary-holder account, then review
            posted movements and GL links.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AccountResolveField instanceId="acct-tx-ops" value={accountId} onChange={(id) => setAccountId(id)} />
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <Label>From</Label>
              <Input type="datetime-local" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div>
              <Label>To</Label>
              <Input type="datetime-local" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>
          <Button
            type="button"
            onClick={() => void history.refetch()}
            disabled={!accountId.trim() || history.isFetching}
          >
            {history.isFetching ? "Loading…" : "Refresh history"}
          </Button>
          {history.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : history.data?.content?.length ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Id</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead>GL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.data.content.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-mono text-xs">{tx.id}</TableCell>
                      <TableCell>{tx.transactionType}</TableCell>
                      <TableCell>
                        {tx.amount != null ? String(tx.amount) : "—"} {tx.currency}
                      </TableCell>
                      <TableCell className="text-xs">{tx.transactionDate ? formatDateTime(tx.transactionDate) : "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{tx.glTransactionId ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between">
                <Button variant="outline" disabled={page <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {(history.data.number ?? page) + 1} / {history.data.totalPages ?? 1}
                </span>
                <Button variant="outline" disabled={history.data.last} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {accountId.trim() ? "No rows in range." : "Resolve an account above to load history."}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lookup & GL link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Account transaction UUID"
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
              className="max-w-md"
            />
            <Button type="button" onClick={() => void one.refetch()} disabled={!lookupId.trim()}>
              Load
            </Button>
          </div>
          {one.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : one.data ? (
            <pre className="rounded bg-muted p-3 text-xs overflow-auto">{JSON.stringify(one.data, null, 2)}</pre>
          ) : null}
          <Can permissions={[Permissions.AccountWrite]}>
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <Label>GL transaction id</Label>
                <Input value={glLinkId} onChange={(e) => setGlLinkId(e.target.value)} placeholder="UUID" />
              </div>
              <Button
                type="button"
                disabled={!lookupId.trim() || !glLinkId.trim() || linkGl.isPending}
                onClick={() => linkGl.mutate()}
              >
                Link to GL posting
              </Button>
            </div>
          </Can>
          <Can permissions={[Permissions.AccountWrite]}>
            <RecordTransactionDialog accountId={accountId} onDone={() => void history.refetch()} />
          </Can>
        </CardContent>
      </Card>
    </div>
  );
}

function RecordTransactionDialog({
  accountId,
  onDone,
}: {
  accountId: string;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [acct, setAcct] = React.useState("");
  const [type, setType] = React.useState("DEPOSIT");
  const [amount, setAmount] = React.useState("");
  const [currency, setCurrency] = React.useState("USD");
  const [txDate, setTxDate] = React.useState(() => new Date().toISOString().slice(0, 16));
  const [description, setDescription] = React.useState("");
  const [ref, setRef] = React.useState("");
  const [glId, setGlId] = React.useState("");
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (accountId) setAcct(accountId);
  }, [accountId]);

  const submit = async (withGl: boolean) => {
    setPending(true);
    try {
      const common = {
        transactionType: type,
        amount: Number(amount),
        currency: currency.toUpperCase(),
        transactionDate: new Date(txDate).toISOString(),
        description: description.trim() || undefined,
        referenceId: ref.trim() || undefined,
      };
      if (withGl) {
        await accountTransactionsApi.recordWithGl(acct.trim(), {
          ...common,
          glTransactionId: glId.trim(),
        });
      } else {
        await accountTransactionsApi.record(acct.trim(), common);
      }
      toast({ title: "Recorded" });
      setOpen(false);
      onDone();
    } catch (e) {
      toast({ variant: "destructive", title: "Failed", description: describeApiError(e) });
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">Record transaction</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record account transaction</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2">
          <Label>Account id</Label>
          <Input value={acct} onChange={(e) => setAcct(e.target.value)} />
          <Label>Type</Label>
          <Input value={type} onChange={(e) => setType(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Amount</Label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label>Currency</Label>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value)} />
            </div>
          </div>
          <Label>Transaction time</Label>
          <Input type="datetime-local" value={txDate} onChange={(e) => setTxDate(e.target.value)} />
          <Label>Description</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          <Label>Reference</Label>
          <Input value={ref} onChange={(e) => setRef(e.target.value)} />
          <Label>GL transaction id (for with-gl only)</Label>
          <Input value={glId} onChange={(e) => setGlId(e.target.value)} />
          <div className="flex gap-2">
            <Button type="button" disabled={pending || !acct.trim() || !amount} onClick={() => void submit(false)}>
              Record pending
            </Button>
            <Button type="button" disabled={pending || !acct.trim() || !amount || !glId.trim()} onClick={() => void submit(true)}>
              Record with GL
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
