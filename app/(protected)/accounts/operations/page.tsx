"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
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
import { Permissions } from "@/lib/rbac/permissions";
import { ConfirmAction } from "@/components/data/confirm-action";

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
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [batchIds, setBatchIds] = React.useState("");
  const [batchStatus, setBatchStatus] = React.useState<AccountStatus>("SUSPENDED");
  const [confirmBatchStatusOpen, setConfirmBatchStatusOpen] = React.useState(false);

  React.useEffect(() => {
    const fromUrl = searchParams.get("batchIds")?.trim();
    if (!fromUrl) return;
    const normalized = fromUrl.split(/[\s,;]+/).join("\n");
    setBatchIds(normalized);
  }, [searchParams]);

  const batchStatusMutation = useMutation({
    mutationFn: (reason: string) =>
      accountsApi.batchUpdateStatus({
        accountIds: parseIds(batchIds),
        newStatus: batchStatus,
        reason: reason.trim() || "Batch status update",
      }),
    onSuccess: () => {
      toast({ title: "Batch status update completed" });
    },
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "Batch failed",
        description: describeApiError(e),
      }),
  });

  const [closeIds, setCloseIds] = React.useState("");
  const [confirmCloseOpen, setConfirmCloseOpen] = React.useState(false);

  const batchCloseMutation = useMutation({
    mutationFn: (reason: string) =>
      accountsApi.batchClose({
        accountIds: parseIds(closeIds),
        reason: reason.trim() || "Batch closure",
      }),
    onSuccess: () => {
      toast({ title: "Batch close completed" });
    },
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "Batch close failed",
        description: describeApiError(e),
      }),
  });

  const destructiveStatus = batchStatus === "CLOSED" || batchStatus === "FROZEN";

  const closeCount = parseIds(closeIds).length;
  const typedClosePhrase = closeCount > 0 ? `CLOSE-${closeCount}` : "CLOSE-0";

  /** Dormancy detection */
  const [inactivityMonths, setInactivityMonths] = React.useState("12");
  const [confirmDormancyOpen, setConfirmDormancyOpen] = React.useState(false);
  const dormancy = useMutation({
    mutationFn: () => accountsApi.processDormancy(Number(inactivityMonths)),
    onSuccess: (d) =>
      toast({
        title: "Dormancy run complete",
        description: `Marked ${d.accountsMarkedDormant} accounts dormant.`,
      }),
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "Dormancy run failed",
        description: describeApiError(e),
      }),
  });

  const [confirmExpireHoldsOpen, setConfirmExpireHoldsOpen] = React.useState(false);
  const expireHolds = useMutation({
    mutationFn: () => accountsApi.processExpiredHolds(),
    onSuccess: (d) =>
      toast({
        title: "Hold sweep complete",
        description: `Expired ${d.holdsExpired} hold(s).`,
      }),
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "Hold sweep failed",
        description: describeApiError(e),
      }),
  });

  const [accrualDate, setAccrualDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [confirmAccrualOpen, setConfirmAccrualOpen] = React.useState(false);
  const accrual = useMutation({
    mutationFn: () => accountsApi.processInterestAccrual(accrualDate),
    onSuccess: (d) =>
      toast({
        title: "Interest accrual complete",
        description: `Processed ${d.accountsProcessed} account(s).`,
      }),
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "Accrual failed",
        description: describeApiError(e),
      }),
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Account operations"
        description="Back-office batch servicing: maintenance runs, lifecycle status, and controlled closures. Sensitive actions require confirmation and audit reasons; your sign-in is recorded as the operator."
      />

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground">Maintenance</h2>
        <p className="text-xs text-muted-foreground">
          Scheduled or low-risk processing. Confirm before running production sweeps.
        </p>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Expire holds</CardTitle>
              <CardDescription>Release reserved funds from holds that have expired.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Sweeps expired holds and frees the reserved funds on affected accounts.
              </p>
              <Button type="button" variant="outline" onClick={() => setConfirmExpireHoldsOpen(true)}>
                Run hold sweep…
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Interest accrual</CardTitle>
              <CardDescription>Post accrued interest for a given ledger date.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label htmlFor="ac-date">Accrual date</Label>
              <DateInput id="ac-date" value={accrualDate} onChange={setAccrualDate} />
              <Button
                type="button"
                variant="outline"
                disabled={!accrualDate || accrual.isPending}
                onClick={() => setConfirmAccrualOpen(true)}
              >
                Run accrual…
              </Button>
            </CardContent>
          </Card>

          <Card />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground">Lifecycle</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Dormancy detection</CardTitle>
              <CardDescription>
                Identify inactive accounts based on dormancy rules and mark them dormant.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label htmlFor="dm-inact">Inactivity threshold (months)</Label>
              <Input
                id="dm-inact"
                inputMode="numeric"
                value={inactivityMonths}
                onChange={(e) => setInactivityMonths(e.target.value.replace(/\D/g, "").slice(0, 3))}
              />
              <Button
                type="button"
                variant="outline"
                disabled={dormancy.isPending || !inactivityMonths || Number(inactivityMonths) <= 0}
                onClick={() => setConfirmDormancyOpen(true)}
              >
                Run dormancy detection…
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Batch status update</CardTitle>
              <CardDescription>
                Apply one status across many accounts. Frozen and closed statuses can block customers —
                verify the list carefully.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label htmlFor="bs-ids">Account IDs</Label>
              <Textarea
                id="bs-ids"
                className="font-mono text-xs"
                rows={4}
                value={batchIds}
                onChange={(e) => setBatchIds(e.target.value)}
                placeholder="Paste one UUID per line or comma-separated"
              />
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
              </div>
              <Button
                type="button"
                variant={destructiveStatus ? "destructive" : "default"}
                disabled={batchStatusMutation.isPending || parseIds(batchIds).length === 0}
                onClick={() => setConfirmBatchStatusOpen(true)}
              >
                {destructiveStatus ? "Review batch status update…" : `Apply status to ${parseIds(batchIds).length} account(s)…`}
              </Button>
              <BatchResultsTable result={batchStatusMutation.data} />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-destructive">Closure</h2>
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle>Batch close accounts</CardTitle>
            <CardDescription>
              Irreversible servicing action. Requires matching the confirmation phrase and a detailed reason.
              The signed-in user is stamped as closer in the ledger.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label htmlFor="bc-ids">Account IDs</Label>
            <Textarea
              id="bc-ids"
              className="font-mono text-xs"
              rows={4}
              value={closeIds}
              onChange={(e) => setCloseIds(e.target.value)}
              placeholder="Paste one UUID per line or comma-separated"
            />
            <p className="text-xs text-muted-foreground">
              Preview · first IDs:{" "}
              {parseIds(closeIds)
                .slice(0, 5)
                .join(", ") || "—"}
              {closeCount > 5 ? ` … +${closeCount - 5} more` : null}
            </p>
            <Button
              type="button"
              variant="destructive"
              disabled={batchCloseMutation.isPending || closeCount === 0}
              onClick={() => setConfirmCloseOpen(true)}
            >
              Confirm batch closure…
            </Button>
            <BatchResultsTable result={batchCloseMutation.data} />
          </CardContent>
        </Card>
      </section>

      <ConfirmAction
        open={confirmBatchStatusOpen}
        onOpenChange={setConfirmBatchStatusOpen}
        title={destructiveStatus ? `Apply ${batchStatus} to ${parseIds(batchIds).length} account(s)?` : `Update status to ${batchStatus}?`}
        description={
          destructiveStatus ? (
            <span>This can block customer access at the rail. Proceed only after dual control where required.</span>
          ) : (
            <span>Status change is recorded against your session.</span>
          )
        }
        destructive={destructiveStatus}
        confirmLabel={destructiveStatus ? "Apply status" : "Apply"}
        reasonRequired={destructiveStatus}
        reasonMinLength={destructiveStatus ? 10 : 0}
        reasonPlaceholder={
          destructiveStatus ? "Structured reason — minimum 10 characters for regulatory traceability" : "Optional note"
        }
        onConfirm={async (reasonFromDialog) => {
          const reasonUsed = reasonFromDialog.trim() || "Batch status update";
          await batchStatusMutation.mutateAsync(reasonUsed);
        }}
      />

      <ConfirmAction
        open={confirmCloseOpen}
        onOpenChange={setConfirmCloseOpen}
        title={`Close ${closeCount} account(s)?`}
        description="This submits permanent closure instructions for each ID. Recovering mistaken closures may require supervisory procedures."
        destructive
        confirmLabel="Close accounts"
        reasonRequired
        reasonMinLength={10}
        reasonPlaceholder="Supervisory rationale — cite ticket or escalation reference where applicable"
        typedPhraseMustMatch={typedClosePhrase}
        typedPhraseLabel="Type the confirmation phrase to proceed"
        onConfirm={async (reason) => {
          await batchCloseMutation.mutateAsync(reason);
        }}
      />

      <ConfirmAction
        open={confirmExpireHoldsOpen}
        onOpenChange={setConfirmExpireHoldsOpen}
        title="Run expired-hold sweep?"
        description="Processes all accounts for expired regulatory or operational holds."
        confirmLabel="Run sweep"
        reasonRequired={false}
        omitReasonField
        onConfirm={async () => {
          expireHolds.mutate();
        }}
      />

      <ConfirmAction
        open={confirmAccrualOpen}
        onOpenChange={setConfirmAccrualOpen}
        title={`Run interest accrual for ${accrualDate}?`}
        description="Charges or credits accrued interest depending on account configuration."
        confirmLabel="Run accrual"
        reasonRequired={false}
        omitReasonField
        onConfirm={async () => {
          accrual.mutate();
        }}
      />

      <ConfirmAction
        open={confirmDormancyOpen}
        onOpenChange={setConfirmDormancyOpen}
        title="Run dormancy detection?"
        description={`Accounts with no qualifying activity for ${inactivityMonths} months may be marked dormant.`}
        confirmLabel="Run dormancy detection"
        reasonRequired={false}
        omitReasonField
        onConfirm={async () => {
          dormancy.mutate();
        }}
      />
    </div>
  );
}

function BatchResultsTable({ result }: { result: BatchResult | undefined }) {
  if (!result) return null;
  const entries = Object.entries(result);
  if (entries.length === 0) return null;
  const success = entries.filter(([, v]) => v === "SUCCESS").length;
  return (
    <div className="space-y-2 pt-2">
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
              <TableCell className={v === "SUCCESS" ? "text-emerald-600" : "text-destructive"}>{v}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
