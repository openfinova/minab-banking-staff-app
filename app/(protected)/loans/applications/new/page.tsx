"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { RouteGuard } from "@/components/rbac/route-guard";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoanProductPicker } from "@/components/loans/loan-product-picker";
import { describeApiError } from "@/lib/api/errors";
import { useToast } from "@/components/ui/use-toast";
import { loanApplicationsApi } from "@/lib/api/modules/loans";
import { Permissions } from "@/lib/rbac/permissions";
import { loanApplicationCreateSchema } from "@/lib/schemas/loans";

export default function NewLoanApplicationPage() {
  return (
    <RouteGuard permissions={[Permissions.LoanWrite]}>
      <NewAppContent />
    </RouteGuard>
  );
}

function NewAppContent() {
  const router = useRouter();
  const { toast } = useToast();
  const [customerId, setCustomerId] = React.useState("");
  const [productId, setProductId] = React.useState("");
  const [requestedAmount, setRequestedAmount] = React.useState("5000");
  const [requestedTenorMonths, setRequestedTenorMonths] = React.useState("12");
  const [currency, setCurrency] = React.useState("USD");
  const [purpose, setPurpose] = React.useState("");
  const [remarks, setRemarks] = React.useState("");

  const create = useMutation({
    mutationFn: () =>
      loanApplicationsApi.create({
        customerId,
        productId,
        requestedAmount: Number(requestedAmount),
        requestedTenorMonths: Number(requestedTenorMonths),
        currency,
        purpose: purpose || undefined,
        remarks: remarks || undefined,
      }),
    onSuccess: (a) => {
      toast({ title: "Created", description: a.applicationNumber });
      router.push(`/loans/applications/${a.id}`);
    },
    onError: (e) => toast({ variant: "destructive", description: describeApiError(e) }),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = loanApplicationCreateSchema.safeParse({
      customerId,
      productId,
      requestedAmount: Number(requestedAmount),
      requestedTenorMonths: Number(requestedTenorMonths),
      currency,
      purpose,
      remarks,
    });
    if (!parsed.success) {
      toast({ variant: "destructive", description: parsed.error.errors[0]?.message });
      return;
    }
    create.mutate();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="New loan application" description="Start an application with product, amount, and party details." />

      <Card>
        <CardHeader>
          <CardTitle>Application</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid max-w-lg gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="cid">Customer ID (UUID)</Label>
              <Input id="cid" value={customerId} onChange={(e) => setCustomerId(e.target.value)} placeholder="UUID" />
            </div>
            <LoanProductPicker value={productId} onChange={(id) => setProductId(id)} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Amount</Label>
                <Input type="number" value={requestedAmount} onChange={(e) => setRequestedAmount(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Tenor (mo)</Label>
                <Input type="number" value={requestedTenorMonths} onChange={(e) => setRequestedTenorMonths(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-1.5 sm:max-w-[8rem]">
              <Label>Currency</Label>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} />
            </div>
            <div className="grid gap-1.5">
              <Label>Purpose</Label>
              <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Remarks</Label>
              <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </div>
            <Button type="submit" disabled={create.isPending}>
              Create
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
