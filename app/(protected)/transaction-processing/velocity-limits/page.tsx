"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  velocityLimitsApi,
  type CreateVelocityLimitRequest,
} from "@/lib/api/modules/transaction-processing";
import { Permissions } from "@/lib/rbac/permissions";

const TX_TYPES = ["P2P", "TRANSFER", "CASH_IN", "CASH_OUT", "BILL_PAYMENT", "MERCHANT_PURCHASE", "REFUND"];
const PERIODS = ["DAILY", "WEEKLY", "MONTHLY"];

export default function VelocityLimitsPage() {
  return (
    <RouteGuard permissions={[Permissions.VelocityLimitRead]}>
      <VelocityLimitsContent />
    </RouteGuard>
  );
}

function VelocityLimitsContent() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [accountId, setAccountId] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("P2P");
  const [breachStart, setBreachStart] = React.useState("");
  const [breachEnd, setBreachEnd] = React.useState("");
  const [monPeriod, setMonPeriod] = React.useState("DAILY");

  const byAccount = useQuery({
    queryKey: ["velocity", "account", accountId],
    queryFn: () => velocityLimitsApi.byAccount(accountId.trim()),
    enabled: accountId.trim().length > 10,
  });

  const byType = useQuery({
    queryKey: ["velocity", "type", typeFilter],
    queryFn: () => velocityLimitsApi.byType(typeFilter),
  });

  const breaches = useQuery({
    queryKey: ["velocity", "breaches", accountId, breachStart, breachEnd],
    queryFn: () => velocityLimitsApi.breaches(accountId.trim(), breachStart, breachEnd),
    enabled: accountId.trim().length > 10 && Boolean(breachStart && breachEnd),
  });

  const remove = useMutation({
    mutationFn: (id: string) => velocityLimitsApi.delete(id),
    onSuccess: () => {
      toast({ title: "Limit deleted" });
      void qc.invalidateQueries({ queryKey: ["velocity"] });
    },
    onError: (e) =>
      toast({ variant: "destructive", title: "Failed", description: describeApiError(e) }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Velocity limits"
        description="Configuration (admin:config:write) and read-only monitoring per account."
        actions={
          <Can permissions={[Permissions.AdminConfigWrite]}>
            <CreateLimitDialog onDone={() => void qc.invalidateQueries({ queryKey: ["velocity"] })} />
          </Can>
        }
      />

      <Tabs defaultValue="account">
        <TabsList>
          <TabsTrigger value="account">By account</TabsTrigger>
          <TabsTrigger value="type">By type</TabsTrigger>
          <TabsTrigger value="breaches">Breaches</TabsTrigger>
          <TabsTrigger value="monitor">Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Account limits</CardTitle>
              <CardDescription>Load configured caps and recent breaches for the resolved account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Input
                  placeholder="Account UUID"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="max-w-md"
                />
                <Button type="button" onClick={() => void byAccount.refetch()} disabled={!accountId.trim()}>
                  Load
                </Button>
              </div>
              {byAccount.isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : byAccount.data?.length ? (
                <LimitsTable
                  limits={byAccount.data}
                  onDelete={(id) => {
                    if (confirm("Delete limit?")) remove.mutate(id);
                  }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">No limits for this account.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="type">
          <Card>
            <CardHeader>
              <CardTitle>All limits for transaction type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TX_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {byType.isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : byType.data?.length ? (
                <LimitsTable limits={byType.data} onDelete={() => undefined} canDelete={false} />
              ) : (
                <p className="text-sm text-muted-foreground">No limits</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breaches">
          <Card>
            <CardHeader>
              <CardTitle>Breach history</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 md:grid-cols-3">
                <Input placeholder="Account UUID" value={accountId} onChange={(e) => setAccountId(e.target.value)} />
                <Input type="date" value={breachStart} onChange={(e) => setBreachStart(e.target.value)} />
                <Input type="date" value={breachEnd} onChange={(e) => setBreachEnd(e.target.value)} />
              </div>
              <Button type="button" onClick={() => void breaches.refetch()} disabled={!accountId.trim()}>
                Load breaches
              </Button>
              {breaches.isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : breaches.data?.length ? (
                <pre className="max-h-80 overflow-auto rounded bg-muted p-3 text-xs">
                  {JSON.stringify(breaches.data, null, 2)}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground">No data</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitor">
          <Card>
            <CardHeader>
              <CardTitle>Remaining / status helpers</CardTitle>
              <CardDescription>Requires account id and transaction type.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 md:grid-cols-3">
                <Input placeholder="Account UUID" value={accountId} onChange={(e) => setAccountId(e.target.value)} />
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TX_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={monPeriod} onValueChange={setMonPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIODS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <MonitorFetch accountId={accountId.trim()} type={typeFilter} period={monPeriod} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LimitsTable({
  limits,
  onDelete,
  canDelete = true,
}: {
  limits: { id?: string; accountId?: string; transactionType?: string; period?: string; maxAmount?: unknown; maxCount?: unknown }[];
  onDelete: (id: string) => void;
  canDelete?: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Id</TableHead>
          <TableHead>Account</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Period</TableHead>
          <TableHead>Max amt</TableHead>
          <TableHead>Max cnt</TableHead>
          {canDelete ? <TableHead /> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {limits.map((l) => (
          <TableRow key={l.id}>
            <TableCell className="font-mono text-xs">{l.id?.slice(0, 8)}…</TableCell>
            <TableCell className="font-mono text-xs">{l.accountId}</TableCell>
            <TableCell>{l.transactionType}</TableCell>
            <TableCell>{l.period}</TableCell>
            <TableCell>{l.maxAmount != null ? String(l.maxAmount) : "—"}</TableCell>
            <TableCell>{l.maxCount != null ? String(l.maxCount) : "—"}</TableCell>
            {canDelete && l.id ? (
              <TableCell>
                <Can permissions={[Permissions.AdminConfigWrite]}>
                  <Button size="sm" variant="destructive" onClick={() => onDelete(l.id!)}>
                    Delete
                  </Button>
                </Can>
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function CreateLimitDialog({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [accountId, setAccountId] = React.useState("");
  const [transactionType, setTxn] = React.useState("P2P");
  const [period, setPeriod] = React.useState("DAILY");
  const [maxAmount, setMaxAmount] = React.useState("");
  const [maxCount, setMaxCount] = React.useState("");
  const [pending, setPending] = React.useState(false);

  const submit = async () => {
    setPending(true);
    try {
      const body: CreateVelocityLimitRequest = {
        accountId: accountId.trim(),
        transactionType,
        period,
        maxAmount: maxAmount.trim() ? Number(maxAmount) : undefined,
        maxCount: maxCount.trim() ? Number(maxCount) : undefined,
      };
      await velocityLimitsApi.create(body);
      toast({ title: "Limit created" });
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
        <Button>New limit</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create velocity limit</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2">
          <Label>Account id</Label>
          <Input value={accountId} onChange={(e) => setAccountId(e.target.value)} />
          <Label>Transaction type</Label>
          <Select value={transactionType} onValueChange={setTxn}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TX_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Label>Period</Label>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Label>Max amount</Label>
          <Input value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} />
          <Label>Max count</Label>
          <Input value={maxCount} onChange={(e) => setMaxCount(e.target.value)} />
          <Button type="button" disabled={pending || !accountId.trim()} onClick={() => void submit()}>
            Create
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MonitorFetch({
  accountId,
  type,
  period,
}: {
  accountId: string;
  type: string;
  period: string;
}) {
  const { toast } = useToast();
  const [snap, setSnap] = React.useState<unknown>(null);
  const load = async () => {
    if (!accountId) {
      toast({ title: "Account id required", variant: "destructive" });
      return;
    }
    try {
      const [remaining, status, amt, cnt, nxt] = await Promise.all([
        velocityLimitsApi.remaining(accountId, type),
        velocityLimitsApi.limitStatus(accountId, type),
        velocityLimitsApi.remainingAmount(accountId, type, period),
        velocityLimitsApi.remainingCount(accountId, type, period),
        velocityLimitsApi.nextReset(accountId, type, period),
      ]);
      setSnap({ remaining, status, amt, cnt, nxt });
    } catch (e) {
      toast({ variant: "destructive", title: "Load failed", description: describeApiError(e) });
    }
  };
  return (
    <div className="space-y-2">
      <Button type="button" onClick={() => void load()}>
        Fetch snapshot
      </Button>
      {snap ? (
        <pre className="max-h-96 overflow-auto rounded bg-muted p-3 text-xs">{JSON.stringify(snap, null, 2)}</pre>
      ) : null}
    </div>
  );
}
