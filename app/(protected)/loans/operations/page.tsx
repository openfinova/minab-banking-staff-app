"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Can } from "@/components/rbac/can";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { describeApiError } from "@/lib/api/errors";
import { useToast } from "@/components/ui/use-toast";
import { loanAccountsApi, LOAN_STATUSES, type LoanStatus } from "@/lib/api/modules/loans";
import { Permissions } from "@/lib/rbac/permissions";

function parseIds(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function LoanOperationsPage() {
  return (
    <RouteGuard permissions={[Permissions.LoanRead]}>
      <Content />
    </RouteGuard>
  );
}

function Content() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [batchIds, setBatchIds] = React.useState("");
  const [batchStatus, setBatchStatus] = React.useState<LoanStatus>("ACTIVE");
  const [batchReason, setBatchReason] = React.useState("");

  const batch = useMutation({
    mutationFn: () =>
      loanAccountsApi.batchStatusUpdate({
        loanAccountIds: parseIds(batchIds),
        newStatus: batchStatus,
        reason: batchReason || undefined,
      }),
    onSuccess: () => {
      toast({ title: "Batch status submitted" });
      qc.invalidateQueries({ queryKey: ["loans"] });
    },
    onError: (e) => toast({ variant: "destructive", description: describeApiError(e) }),
  });

  const delinquent = useQuery({
    queryKey: ["loans", "ops", "delinquent"],
    queryFn: () => loanAccountsApi.listDelinquent(0, 30),
  });

  const [mrId, setMrId] = React.useState("");
  const [mrDate, setMrDate] = React.useState("");

  const markR = useMutation({
    mutationFn: () => loanAccountsApi.markRestructured(mrId, { restructuredDate: mrDate }),
    onSuccess: () => {
      toast({ title: "Marked restructured" });
      qc.invalidateQueries({ queryKey: ["loans"] });
    },
    onError: (e) => toast({ variant: "destructive", description: describeApiError(e) }),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Loan operations" description="Batch status, write-off queue hints, restructure marking" />

      <Can permissions={[Permissions.LoanWrite]}>
        <Card>
          <CardHeader>
            <CardTitle>Batch status update</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-w-2xl">
            <Textarea
              placeholder="Loan account UUIDs (space, comma, or newline)"
              value={batchIds}
              onChange={(e) => setBatchIds(e.target.value)}
              className="font-mono text-xs min-h-[100px]"
            />
            <select className="border rounded-md p-2 text-sm" value={batchStatus} onChange={(e) => setBatchStatus(e.target.value as LoanStatus)}>
              {LOAN_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <Input placeholder="Reason (optional)" value={batchReason} onChange={(e) => setBatchReason(e.target.value)} />
            <Button disabled={batch.isPending || !batchIds.trim()} onClick={() => batch.mutate()}>
              Apply batch status
            </Button>
          </CardContent>
        </Card>
      </Can>

      <Card>
        <CardHeader>
          <CardTitle>Write-off queue (delinquent accounts)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground text-xs">
            Use account detail → actions with <code className="text-[10px]">loan:write-off</code>.
          </p>
          <ul className="space-y-1">
            {(delinquent.data?.content ?? []).map((row) => (
              <li key={row.id}>
                <Link href={`/loans/accounts/${row.id}`} className="underline font-mono text-xs">
                  {row.loanAccountNumber}
                </Link>{" "}
                <span className="text-muted-foreground">{row.status}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Can permissions={[Permissions.LoanRestructure]}>
        <Card>
          <CardHeader>
            <CardTitle>Mark account restructured</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 items-end max-w-xl">
            <Input placeholder="Loan account UUID" value={mrId} onChange={(e) => setMrId(e.target.value)} className="font-mono text-xs flex-1 min-w-[12rem]" />
            <DateInput value={mrDate} onChange={setMrDate} />
            <Button disabled={markR.isPending || !mrId || !mrDate} onClick={() => markR.mutate()}>
              Mark restructured
            </Button>
          </CardContent>
        </Card>
      </Can>
    </div>
  );
}
