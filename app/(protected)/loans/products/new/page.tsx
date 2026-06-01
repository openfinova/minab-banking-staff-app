"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
import { describeApiError } from "@/lib/api/errors";
import { useToast } from "@/components/ui/use-toast";
import {
  loanProductsApi,
  AMORTIZATION_TYPES,
  INTEREST_METHODS,
  LOAN_PRODUCT_TYPES,
  REPAYMENT_FREQUENCIES,
  type LoanProductRequestBody,
} from "@/lib/api/modules/loans";
import { Permissions } from "@/lib/rbac/permissions";
import { loanProductRequestSchema } from "@/lib/schemas/loans";

const empty: LoanProductRequestBody = {
  productCode: "",
  productName: "",
  productType: "PERSONAL_LOAN",
  description: "",
  minAmount: 1000,
  maxAmount: 100_000,
  minTenorMonths: 6,
  maxTenorMonths: 60,
  interestRate: 12,
  interestCalculationMethod: "REDUCING_BALANCE",
  repaymentFrequency: "MONTHLY",
  amortizationType: "EQUAL_INSTALLMENTS",
  currency: "EUR",
  collateralRequired: false,
  guarantorRequired: false,
  gracePeriodDays: 0,
};

export default function NewLoanProductPage() {
  return (
    <RouteGuard permissions={[Permissions.LoanWrite]}>
      <NewLoanProductContent />
    </RouteGuard>
  );
}

function NewLoanProductContent() {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = React.useState<LoanProductRequestBody>(empty);

  const create = useMutation({
    mutationFn: () => loanProductsApi.create(form),
    onSuccess: (p) => {
      toast({ title: "Product created", description: p.productCode });
      router.push(`/loans/products/${p.id}`);
    },
    onError: (e) => toast({ variant: "destructive", title: "Create failed", description: describeApiError(e) }),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = loanProductRequestSchema.safeParse(form);
    if (!parsed.success) {
      toast({ variant: "destructive", title: "Validation", description: parsed.error.errors[0]?.message });
      return;
    }
    create.mutate();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="New loan product" description="Define pricing, tenor, repayment, and amortization defaults." />

      <Card>
        <CardHeader>
          <CardTitle>Definition</CardTitle>
          <CardDescription>All required fields per LoanProductRequest; optional fee fields may be blank.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid max-w-3xl gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="pc">Product code</Label>
                <Input id="pc" value={form.productCode} onChange={(ev) => setForm({ ...form, productCode: ev.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="pn">Product name</Label>
                <Input id="pn" value={form.productName} onChange={(ev) => setForm({ ...form, productName: ev.target.value })} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Type</Label>
              <Select
                value={form.productType}
                onValueChange={(v) => setForm({ ...form, productType: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOAN_PRODUCT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="desc">Description</Label>
              <Textarea id="desc" value={form.description ?? ""} onChange={(ev) => setForm({ ...form, description: ev.target.value })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="minA">Min amount</Label>
                <Input id="minA" type="number" value={form.minAmount} onChange={(ev) => setForm({ ...form, minAmount: Number(ev.target.value) })} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="maxA">Max amount</Label>
                <Input id="maxA" type="number" value={form.maxAmount} onChange={(ev) => setForm({ ...form, maxAmount: Number(ev.target.value) })} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="minT">Min tenor (months)</Label>
                <Input id="minT" type="number" value={form.minTenorMonths} onChange={(ev) => setForm({ ...form, minTenorMonths: Number(ev.target.value) })} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="maxT">Max tenor (months)</Label>
                <Input id="maxT" type="number" value={form.maxTenorMonths} onChange={(ev) => setForm({ ...form, maxTenorMonths: Number(ev.target.value) })} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ir">Interest rate (%)</Label>
              <Input id="ir" type="number" step="0.01" value={form.interestRate} onChange={(ev) => setForm({ ...form, interestRate: Number(ev.target.value) })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label>Interest method</Label>
                <Select value={form.interestCalculationMethod} onValueChange={(v) => setForm({ ...form, interestCalculationMethod: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTEREST_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Repayment frequency</Label>
                <Select value={form.repaymentFrequency} onValueChange={(v) => setForm({ ...form, repaymentFrequency: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REPAYMENT_FREQUENCIES.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Amortization</Label>
                <Select value={form.amortizationType} onValueChange={(v) => setForm({ ...form, amortizationType: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AMORTIZATION_TYPES.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5 sm:max-w-xs">
              <Label htmlFor="ccy">Currency (ISO)</Label>
              <Input id="ccy" maxLength={3} value={form.currency} onChange={(ev) => setForm({ ...form, currency: ev.target.value.toUpperCase() })} />
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!form.collateralRequired} onChange={(ev) => setForm({ ...form, collateralRequired: ev.target.checked })} />
                Collateral required
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!form.guarantorRequired} onChange={(ev) => setForm({ ...form, guarantorRequired: ev.target.checked })} />
                Guarantor required
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Grace days</Label>
                <Input type="number" value={form.gracePeriodDays ?? 0} onChange={(ev) => setForm({ ...form, gracePeriodDays: Number(ev.target.value) })} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Processing fee %</Label>
                <Input type="number" step="0.01" value={form.processingFeePercentage ?? ""} onChange={(ev) => setForm({ ...form, processingFeePercentage: ev.target.value === "" ? undefined : Number(ev.target.value) })} />
              </div>
              <div className="grid gap-1.5">
                <Label>Processing fee fixed</Label>
                <Input type="number" step="0.01" value={form.processingFeeFixed ?? ""} onChange={(ev) => setForm({ ...form, processingFeeFixed: ev.target.value === "" ? undefined : Number(ev.target.value) })} />
              </div>
              <div className="grid gap-1.5">
                <Label>Late fee %</Label>
                <Input type="number" step="0.01" value={form.lateFeePercentage ?? ""} onChange={(ev) => setForm({ ...form, lateFeePercentage: ev.target.value === "" ? undefined : Number(ev.target.value) })} />
              </div>
              <div className="grid gap-1.5">
                <Label>Late fee fixed</Label>
                <Input type="number" step="0.01" value={form.lateFeeFixed ?? ""} onChange={(ev) => setForm({ ...form, lateFeeFixed: ev.target.value === "" ? undefined : Number(ev.target.value) })} />
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label>Prepayment penalty %</Label>
                <Input type="number" step="0.01" value={form.prepaymentPenaltyPercentage ?? ""} onChange={(ev) => setForm({ ...form, prepaymentPenaltyPercentage: ev.target.value === "" ? undefined : Number(ev.target.value) })} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={create.isPending}>
                Create
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
