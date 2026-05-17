"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Can } from "@/components/rbac/can";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { LoanServicingLinks } from "@/components/loans/loan-servicing-links";
import { LoanCustomerLink } from "@/components/loans/loan-customer-link";
import { LoanStatusBadge } from "@/components/loans/loan-badges";
import { describeApiError } from "@/lib/api/errors";
import { useToast } from "@/components/ui/use-toast";
import { loanAccountsApi, LOAN_STATUSES, type LoanStatus } from "@/lib/api/modules/loans";
import { Permissions } from "@/lib/rbac/permissions";

export default function LoanAccountDetailPage() {
  return (
    <RouteGuard permissions={[Permissions.LoanRead]}>
      <AccountDetail />
    </RouteGuard>
  );
}

function AccountDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { toast } = useToast();

  const acct = useQuery({
    queryKey: ["loans", "account", id],
    queryFn: () => loanAccountsApi.getById(id),
    enabled: Boolean(id),
  });

  const outstanding = useQuery({
    queryKey: ["loans", "account", id, "outstanding"],
    queryFn: () => loanAccountsApi.totalOutstanding(id),
    enabled: Boolean(id),
  });

  const closure = useQuery({
    queryKey: ["loans", "account", id, "closure"],
    queryFn: () => loanAccountsApi.validateClosure(id),
    enabled: false,
  });

  const [newStatus, setNewStatus] = React.useState<LoanStatus>("ACTIVE");
  const [statusReason, setStatusReason] = React.useState("");
  const patchStatus = useMutation({
    mutationFn: () => loanAccountsApi.updateStatus(id, { newStatus, reason: statusReason || undefined }),
    onSuccess: () => {
      toast({ title: "Status updated" });
      qc.invalidateQueries({ queryKey: ["loans", "account", id] });
    },
    onError: (e) => toast({ variant: "destructive", description: describeApiError(e) }),
  });

  const [disbDate, setDisbDate] = React.useState("");
  const disburse = useMutation({
    mutationFn: () => loanAccountsApi.disburse(id, { disbursementDate: disbDate }),
    onSuccess: () => {
      toast({ title: "Disburse initiated" });
      qc.invalidateQueries({ queryKey: ["loans", "account", id] });
    },
    onError: (e) => toast({ variant: "destructive", description: describeApiError(e) }),
  });

  const [closeDate, setCloseDate] = React.useState("");
  const close = useMutation({
    mutationFn: () => loanAccountsApi.close(id, { closureDate: closeDate }),
    onSuccess: () => {
      toast({ title: "Closed" });
      qc.invalidateQueries({ queryKey: ["loans", "account", id] });
    },
    onError: (e) => toast({ variant: "destructive", description: describeApiError(e) }),
  });

  const [woDate, setWoDate] = React.useState("");
  const [woReason, setWoReason] = React.useState("");
  const writeOff = useMutation({
    mutationFn: () => loanAccountsApi.writeOff(id, { writeOffDate: woDate, reason: woReason }),
    onSuccess: () => {
      toast({ title: "Written off" });
      qc.invalidateQueries({ queryKey: ["loans", "account", id] });
    },
    onError: (e) => toast({ variant: "destructive", description: describeApiError(e) }),
  });

  const [topUp, setTopUp] = React.useState("");
  const topUpM = useMutation({
    mutationFn: () => loanAccountsApi.topUp(id, { topUpAmount: Number(topUp) }),
    onSuccess: () => {
      toast({ title: "Top-up created" });
      qc.invalidateQueries({ queryKey: ["loans", "account", id] });
    },
    onError: (e) => toast({ variant: "destructive", description: describeApiError(e) }),
  });

  const [restructuredDate, setRestructuredDate] = React.useState("");
  const markR = useMutation({
    mutationFn: () => loanAccountsApi.markRestructured(id, { restructuredDate }),
    onSuccess: () => {
      toast({ title: "Marked restructured" });
      qc.invalidateQueries({ queryKey: ["loans", "account", id] });
    },
    onError: (e) => toast({ variant: "destructive", description: describeApiError(e) }),
  });

  const [pd, setPd] = React.useState("0");
  const [idt, setIdt] = React.useState("0");
  const [fd, setFd] = React.useState("0");
  const [pend, setPend] = React.useState("0");
  const balances = useMutation({
    mutationFn: () =>
      loanAccountsApi.updateBalances(id, {
        principalDelta: Number(pd),
        interestDelta: Number(idt),
        feesDelta: Number(fd),
        penaltiesDelta: Number(pend),
      }),
    onSuccess: () => {
      toast({ title: "Balances adjusted" });
      qc.invalidateQueries({ queryKey: ["loans", "account", id] });
    },
    onError: (e) => toast({ variant: "destructive", description: describeApiError(e) }),
  });

  if (acct.isLoading) return <Skeleton className="h-64 w-full" />;
  if (acct.isError) return <p className="text-destructive">{describeApiError(acct.error)}</p>;
  const a = acct.data!;

  return (
    <div className="space-y-6">
      <PageHeader
        title={a.loanAccountNumber}
        description={`Loan ${a.id}`}
        actions={
          <Button variant="outline" asChild>
            <Link href="/loans/accounts">Directory</Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <LoanStatusBadge status={a.status} />
        <LoanCustomerLink customerId={a.customerId} />
        {a.applicationId ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/loans/applications/${a.applicationId}`}>Application</Link>
          </Button>
        ) : null}
      </div>

      <LoanServicingLinks loanAccountId={id} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Balances</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              Principal {a.outstandingPrincipal ?? "—"} | Interest {a.outstandingInterest ?? "—"}
            </p>
            <p>
              Fees {a.outstandingFees ?? "—"} | Penalties {a.outstandingPenalties ?? "—"}
            </p>
            <p>Total outstanding (API): {outstanding.isSuccess ? String(outstanding.data) : "…"}</p>
            <Button
              variant="link"
              className="h-auto p-0"
              type="button"
              onClick={() => outstanding.refetch()}
            >
              Refresh outstanding
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Record</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-64 overflow-auto rounded border bg-muted/30 p-2 text-xs">
              {JSON.stringify(a, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lifecycle</CardTitle>
          <CardDescription>Uses loan:disburse, loan:write-off, loan:restructure where annotated.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3 rounded-md border p-3">
            <h4 className="font-medium">Status</h4>
            <Select value={newStatus} onValueChange={(v) => setNewStatus(v as LoanStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOAN_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Reason" value={statusReason} onChange={(e) => setStatusReason(e.target.value)} />
            <Button size="sm" disabled={patchStatus.isPending} onClick={() => patchStatus.mutate()}>
              Apply status
            </Button>
          </div>

          <Can permissions={[Permissions.LoanDisburse]}>
            <div className="space-y-3 rounded-md border p-3">
              <h4 className="font-medium">Disburse</h4>
              <Input type="date" value={disbDate} onChange={(e) => setDisbDate(e.target.value)} />
              <Button size="sm" disabled={disburse.isPending} onClick={() => disburse.mutate()}>
                Record disbursement
              </Button>
            </div>
          </Can>

          <div className="space-y-3 rounded-md border p-3">
            <h4 className="font-medium">Close</h4>
            <Input type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} />
            <Button size="sm" variant="secondary" disabled={close.isPending} onClick={() => close.mutate()}>
              Close loan
            </Button>
            <Button size="sm" variant="outline" type="button" onClick={() => closure.refetch()}>
              Validate closure
            </Button>
            {closure.data ? (
              <pre className="text-xs bg-muted/30 p-2 rounded">{JSON.stringify(closure.data, null, 2)}</pre>
            ) : null}
          </div>

          <Can permissions={[Permissions.LoanWriteOff]}>
            <div className="space-y-3 rounded-md border p-3">
              <h4 className="font-medium">Write-off</h4>
              <Input type="date" value={woDate} onChange={(e) => setWoDate(e.target.value)} />
              <Input placeholder="Reason" value={woReason} onChange={(e) => setWoReason(e.target.value)} />
              <Button size="sm" variant="destructive" disabled={writeOff.isPending} onClick={() => writeOff.mutate()}>
                Write off
              </Button>
            </div>
          </Can>

          <div className="space-y-3 rounded-md border p-3">
            <h4 className="font-medium">Top-up</h4>
            <Input type="number" value={topUp} onChange={(e) => setTopUp(e.target.value)} />
            <Button size="sm" disabled={topUpM.isPending} onClick={() => topUpM.mutate()}>
              Top-up
            </Button>
          </div>

          <Can permissions={[Permissions.LoanRestructure]}>
            <div className="space-y-3 rounded-md border p-3">
              <h4 className="font-medium">Mark restructured</h4>
              <Input type="date" value={restructuredDate} onChange={(e) => setRestructuredDate(e.target.value)} />
              <Button size="sm" disabled={markR.isPending} onClick={() => markR.mutate()}>
                Mark
              </Button>
            </div>
          </Can>

          <div className="space-y-3 rounded-md border p-3 sm:col-span-2">
            <h4 className="font-medium">Balance deltas (staff)</h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Input placeholder="Principal Δ" value={pd} onChange={(e) => setPd(e.target.value)} />
              <Input placeholder="Interest Δ" value={idt} onChange={(e) => setIdt(e.target.value)} />
              <Input placeholder="Fees Δ" value={fd} onChange={(e) => setFd(e.target.value)} />
              <Input placeholder="Penalties Δ" value={pend} onChange={(e) => setPend(e.target.value)} />
            </div>
            <Button size="sm" variant="outline" disabled={balances.isPending} onClick={() => balances.mutate()}>
              Apply balance adjustments
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
