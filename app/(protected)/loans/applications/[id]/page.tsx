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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ApplicationStatusBadge } from "@/components/loans/loan-badges";
import { LoanCustomerLink } from "@/components/loans/loan-customer-link";
import { describeApiError } from "@/lib/api/errors";
import { useToast } from "@/components/ui/use-toast";
import { loanApplicationsApi } from "@/lib/api/modules/loans";
import { Permissions } from "@/lib/rbac/permissions";

export default function LoanApplicationDetailPage() {
  return (
    <RouteGuard permissions={[Permissions.LoanRead]}>
      <DetailContent />
    </RouteGuard>
  );
}

function DetailContent() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { toast } = useToast();

  const detail = useQuery({
    queryKey: ["loans", "app", id],
    queryFn: () => loanApplicationsApi.getById(id),
    enabled: Boolean(id),
  });

  const guarantorCheck = useQuery({
    queryKey: ["loans", "app", id, "guarantors-req"],
    queryFn: () => loanApplicationsApi.guarantorsRequiredCheck(id),
    enabled: Boolean(id),
  });

  const submit = useMutation({
    mutationFn: () => loanApplicationsApi.submit(id),
    onSuccess: () => {
      toast({ title: "Submitted" });
      qc.invalidateQueries({ queryKey: ["loans", "app", id] });
    },
    onError: (e) => toast({ variant: "destructive", description: describeApiError(e) }),
  });

  const [underwriterId, setUnderwriterId] = React.useState("");
  const assign = useMutation({
    mutationFn: () => loanApplicationsApi.assignUnderwriter(id, { underwriterId }),
    onSuccess: () => {
      toast({ title: "Assigned" });
      qc.invalidateQueries({ queryKey: ["loans", "app", id] });
    },
    onError: (e) => toast({ variant: "destructive", description: describeApiError(e) }),
  });

  const score = useMutation({
    mutationFn: () => loanApplicationsApi.evaluateCreditScore(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["loans", "app", id] }),
    onError: (e) => toast({ variant: "destructive", description: describeApiError(e) }),
  });

  const risk = useMutation({
    mutationFn: () => loanApplicationsApi.assessRisk(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["loans", "app", id] }),
    onError: (e) => toast({ variant: "destructive", description: describeApiError(e) }),
  });

  const [apprAmount, setApprAmount] = React.useState("");
  const [apprTenor, setApprTenor] = React.useState("");
  const [apprRate, setApprRate] = React.useState("");
  const [apprGuar, setApprGuar] = React.useState("0");
  const approve = useMutation({
    mutationFn: () =>
      loanApplicationsApi.approve(id, {
        approvedAmount: Number(apprAmount),
        approvedTenorMonths: Number(apprTenor),
        approvedInterestRate: Number(apprRate),
        guarantorsRequired: Number(apprGuar),
      }),
    onSuccess: () => {
      toast({ title: "Approved" });
      qc.invalidateQueries({ queryKey: ["loans", "app", id] });
    },
    onError: (e) => toast({ variant: "destructive", description: describeApiError(e) }),
  });

  const [rejectReason, setRejectReason] = React.useState("");
  const reject = useMutation({
    mutationFn: () => loanApplicationsApi.reject(id, { rejectionReason: rejectReason }),
    onSuccess: () => {
      toast({ title: "Rejected" });
      qc.invalidateQueries({ queryKey: ["loans", "app", id] });
    },
    onError: (e) => toast({ variant: "destructive", description: describeApiError(e) }),
  });

  const [infoRequired, setInfoRequired] = React.useState("");
  const reqInfo = useMutation({
    mutationFn: () => loanApplicationsApi.requestAdditionalInfo(id, { informationRequired: infoRequired }),
    onSuccess: () => {
      toast({ title: "Requested info" });
      qc.invalidateQueries({ queryKey: ["loans", "app", id] });
    },
    onError: (e) => toast({ variant: "destructive", description: describeApiError(e) }),
  });

  React.useEffect(() => {
    const app = detail.data;
    if (app) {
      setApprAmount(String(app.approvedAmount ?? app.requestedAmount ?? ""));
      setApprTenor(String(app.approvedTenorMonths ?? app.requestedTenorMonths ?? ""));
      setApprRate(String(app.approvedInterestRate ?? ""));
      setApprGuar(String(app.guarantorsRequired ?? 0));
    }
  }, [detail.data]);

  if (detail.isLoading) return <Skeleton className="h-64 w-full" />;
  if (detail.isError) return <p className="text-destructive">{describeApiError(detail.error)}</p>;
  const a = detail.data!;

  return (
    <div className="space-y-6">
      <PageHeader
        title={a.applicationNumber}
        description={`Application ${a.id}`}
      />
      <div className="flex flex-wrap items-center gap-3">
        <ApplicationStatusBadge status={a.status} />
        <LoanCustomerLink customerId={a.customerId} />
        <Button variant="outline" size="sm" asChild>
          <Link href={`/loans/accounts/new?applicationId=${encodeURIComponent(a.id)}`}>Create loan account</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payload</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="max-h-96 overflow-auto rounded-md border bg-muted/30 p-3 text-xs">
            {JSON.stringify(a, null, 2)}
          </pre>
          <p className="mt-3 text-sm text-muted-foreground">
            Guarantors required check: {guarantorCheck.isLoading ? "…" : String(guarantorCheck.data)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>Buttons follow your loan permissions — only actions you may perform stay available.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <Can permissions={[Permissions.LoanWrite]}>
            <div className="space-y-2 rounded-md border p-3">
              <h4 className="text-sm font-medium">Origination</h4>
              <Button size="sm" disabled={submit.isPending} onClick={() => submit.mutate()}>
                Submit application
              </Button>
              <div className="grid gap-1.5 pt-2">
                <Label>Information required</Label>
                <Textarea value={infoRequired} onChange={(e) => setInfoRequired(e.target.value)} />
                <Button size="sm" variant="secondary" disabled={reqInfo.isPending} onClick={() => reqInfo.mutate()}>
                  Request additional info
                </Button>
              </div>
            </div>
          </Can>

          <Can permissions={[Permissions.LoanApprove]}>
            <div className="space-y-2 rounded-md border p-3">
              <h4 className="text-sm font-medium">Underwriting</h4>
              <div className="flex flex-wrap gap-2">
                <Input
                  placeholder="Underwriter id"
                  value={underwriterId}
                  onChange={(e) => setUnderwriterId(e.target.value)}
                  className="max-w-xs"
                />
                <Button size="sm" variant="outline" disabled={assign.isPending} onClick={() => assign.mutate()}>
                  Assign
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={score.isPending} onClick={() => score.mutate()}>
                  Credit score
                </Button>
                <Button size="sm" variant="outline" disabled={risk.isPending} onClick={() => risk.mutate()}>
                  Risk assess
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label>Approved amount</Label>
                  <Input value={apprAmount} onChange={(e) => setApprAmount(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Approved tenor</Label>
                  <Input value={apprTenor} onChange={(e) => setApprTenor(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Approved rate %</Label>
                  <Input value={apprRate} onChange={(e) => setApprRate(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Guarantors required</Label>
                  <Input value={apprGuar} onChange={(e) => setApprGuar(e.target.value)} />
                </div>
              </div>
              <Button size="sm" disabled={approve.isPending} onClick={() => approve.mutate()}>
                Approve
              </Button>
              <div className="grid gap-1.5">
                <Label>Rejection reason</Label>
                <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                <Button size="sm" variant="destructive" disabled={reject.isPending} onClick={() => reject.mutate()}>
                  Reject
                </Button>
              </div>
            </div>
          </Can>
        </CardContent>
      </Card>
    </div>
  );
}
