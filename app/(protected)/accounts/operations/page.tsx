"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { RouteGuard } from "@/components/rbac/route-guard";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { DateInput } from "@/components/ui/date-input";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";
import { accountsApi, type AccountStatus, type BatchResult } from "@/lib/api/modules/accounts";
import { useAuthStore } from "@/lib/auth/auth-store";
import { Permissions } from "@/lib/rbac/permissions";

const STATUSES: AccountStatus[] = ["ACTIVE", "SUSPENDED", "FROZEN", "DORMANT", "CLOSED"];

function parseIds(text: string): string[] {
  return Array.from(
    new Set(
      text
        .split(/[\s,;]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  );
}

export default function AccountsOperationsPage() {
  return (
    <RouteGuard permissions={[Permissions.AccountWrite]}>
      <AccountsOperationsContent />
    </RouteGuard>
  );
}

function AccountsOperationsContent() {
  const { toast } = useToast();
  const username = useAuthStore((s) => s.session?.user.username ?? "operator");

  /** Batch status update */
  const [batchIds, setBatchIds] = React.useState("");
  const [batchStatus, setBatchStatus] = React.useState<AccountStatus>("SUSPENDED");
  const [batchReason, setBatchReason] = React.useState("");
  const [batchActor, setBatchActor] = React.useState(username);
  React.useEffect(() => setBatchActor(username), [username]);

  const batchStatusMutation = useMutation({
    mutationFn: () =>
      accountsApi.batchUpdateStatus({
        accountIds: parseIds(batchIds),
        newStatus: batchStatus,
        reason: batchReason.trim() || "Batch status update",
        changedBy: batchActor.trim() || username,
      }),
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "Batch failed",
        description: describeApiError(e),
      }),
  });

  /** Batch close */
  const [closeIds, setCloseIds] = React.useState("");
  const [closeReason, setCloseReason] = React.useState("");
  const [closedBy, setClosedBy] = React.useState(username);
  React.useEffect(() => setClosedBy(username), [username]);

  const batchCloseMutation = useMutation({
    mutationFn: () =>
      accountsApi.batchClose({
        accountIds: parseIds(closeIds),
        reason: closeReason.trim() || "Batch closure",
        closedBy: closedBy.trim() || username,
      }),
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "Batch close failed",
        description: describeApiError(e),
      }),
  });

  /** Dormancy detection */
  const [inactivityMonths, setInactivityMonths] = React.useState("12");
  const dormancy = useMutation({
    mutationFn: () => accountsApi.processDormancy(Number(inactivityMonths)),
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "Dormancy run failed",
        description: describeApiError(e),
      }),
  });

  /** Process expired holds */
  const expireHolds = useMutation({
    mutationFn: () => accountsApi.processExpiredHolds(),
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "Hold sweep failed",
        description: describeApiError(e),
      }),
  });

  /** Interest accrual */
  const [accrualDate, setAccrualDate] = React.useState(new Date().toISOString().slice(0, 10));
  const accrual = useMutation({
    mutationFn: () => accountsApi.processInterestAccrual(accrualDate),
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "Accrual failed",
        description: describeApiError(e),
      }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account operations"
        description="Back-office batch and maintenance actions across the customer account module."
      />

      <Card>
        <CardHeader>
          <CardTitle>Batch status update</CardTitle>
          <CardDescription>POST /api/v1/accounts/batch/status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-1.5">
            <Label htmlFor="bs-ids">Account ids (newline or comma separated)</Label>
            <Textarea
              id="bs-ids"
              className="font-mono text-xs"
              rows={4}
              value={batchIds}
              onChange={(e) => setBatchIds(e.target.value)}
              placeholder="uuid1\nuuid2"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>New status</Label>
              <Select value={batchStatus} onValueChange={(v) => setBatchStatus(v as AccountStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="bs-by">Changed by</Label>
              <Input id="bs-by" value={batchActor} onChange={(e) => setBatchActor(e.target.value)} />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="bs-reason">Reason</Label>
              <Input id="bs-reason" value={batchReason} onChange={(e) => setBatchReason(e.target.value)} />
            </div>
          </div>
          <Button
            type="button"
            disabled={batchStatusMutation.isPending || parseIds(batchIds).length === 0}
            onClick={() => batchStatusMutation.mutate()}
          >
            {batchStatusMutation.isPending ? "Running…" : `Apply to ${parseIds(batchIds).length} account(s)`}
          </Button>
          <BatchResultsTable result={batchStatusMutation.data} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Batch close</CardTitle>
          <CardDescription>POST /api/v1/accounts/batch/close</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-1.5">
            <Label htmlFor="bc-ids">Account ids</Label>
            <Textarea
              id="bc-ids"
              className="font-mono text-xs"
              rows={4}
              value={closeIds}
              onChange={(e) => setCloseIds(e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="bc-reason">Reason</Label>
              <Input id="bc-reason" value={closeReason} onChange={(e) => setCloseReason(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="bc-by">Closed by</Label>
              <Input id="bc-by" value={closedBy} onChange={(e) => setClosedBy(e.target.value)} />
            </div>
          </div>
          <Button
            type="button"
            variant="destructive"
            disabled={batchCloseMutation.isPending || parseIds(closeIds).length === 0}
            onClick={() => batchCloseMutation.mutate()}
          >
            {batchCloseMutation.isPending
              ? "Closing…"
              : `Close ${parseIds(closeIds).length} account(s)`}
          </Button>
          <BatchResultsTable result={batchCloseMutation.data} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Dormancy detection</CardTitle>
            <CardDescription>POST /dormancy/process?inactivityMonths=…</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-1.5">
              <Label htmlFor="dm-inact">Inactivity months</Label>
              <Input
                id="dm-inact"
                inputMode="numeric"
                value={inactivityMonths}
                onChange={(e) => setInactivityMonths(e.target.value.replace(/\D/g, "").slice(0, 3))}
              />
            </div>
            <Button
              type="button"
              disabled={dormancy.isPending || !inactivityMonths || Number(inactivityMonths) <= 0}
              onClick={() => dormancy.mutate()}
            >
              {dormancy.isPending ? "Running…" : "Run"}
            </Button>
            {dormancy.data ? (
              <p className="text-sm text-emerald-600">
                Marked {dormancy.data.accountsMarkedDormant} accounts dormant.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expire holds</CardTitle>
            <CardDescription>POST /holds/process-expired</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Sweeps expired holds and frees the reserved funds.
            </p>
            <Button
              type="button"
              disabled={expireHolds.isPending}
              onClick={() => expireHolds.mutate()}
            >
              {expireHolds.isPending ? "Running…" : "Run sweep"}
            </Button>
            {expireHolds.data ? (
              <p className="text-sm text-emerald-600">
                Expired {expireHolds.data.holdsExpired} hold(s).
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Interest accrual</CardTitle>
            <CardDescription>POST /interest/process-accrual?accrualDate=…</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ac-date">Accrual date</Label>
              <DateInput id="ac-date" value={accrualDate} onChange={setAccrualDate} />
            </div>
            <Button
              type="button"
              disabled={accrual.isPending || !accrualDate}
              onClick={() => accrual.mutate()}
            >
              {accrual.isPending ? "Running…" : "Run accrual"}
            </Button>
            {accrual.data ? (
              <p className="text-sm text-emerald-600">
                Processed {accrual.data.accountsProcessed} account(s).
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function BatchResultsTable({ result }: { result: BatchResult | undefined }) {
  if (!result) return null;
  const entries = Object.entries(result);
  if (entries.length === 0) return null;
  const success = entries.filter(([, v]) => v === "SUCCESS").length;
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {success} succeeded · {entries.length - success} failed
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Account id</TableHead>
            <TableHead>Result</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map(([id, v]) => (
            <TableRow key={id}>
              <TableCell className="font-mono text-xs">{id}</TableCell>
              <TableCell className={v === "SUCCESS" ? "text-emerald-600" : "text-destructive"}>
                {v}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
