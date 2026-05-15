"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Can } from "@/components/rbac/can";
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
import { Skeleton } from "@/components/ui/skeleton";
import { describeApiError } from "@/lib/api/errors";
import { useToast } from "@/components/ui/use-toast";
import {
  loanProductsApi,
  AMORTIZATION_TYPES,
  INTEREST_METHODS,
  LOAN_PRODUCT_TYPES,
  REPAYMENT_FREQUENCIES,
  type LoanProductRequestBody,
  type LoanProductResponse,
} from "@/lib/api/modules/loans";
import { Permissions } from "@/lib/rbac/permissions";
import { loanProductRequestSchema } from "@/lib/schemas/loans";

function responseToForm(p: LoanProductResponse): LoanProductRequestBody {
  return {
    productCode: p.productCode,
    productName: p.productName,
    productType: p.productType,
    description: p.description ?? "",
    minAmount: p.minAmount,
    maxAmount: p.maxAmount,
    minTenorMonths: p.minTenorMonths,
    maxTenorMonths: p.maxTenorMonths,
    interestRate: p.interestRate,
    interestCalculationMethod: p.interestCalculationMethod,
    repaymentFrequency: p.repaymentFrequency,
    amortizationType: p.amortizationType,
    currency: p.currency,
    collateralRequired: p.collateralRequired,
    guarantorRequired: p.guarantorRequired,
    gracePeriodDays: p.gracePeriodDays ?? 0,
    processingFeePercentage: p.processingFeePercentage,
    processingFeeFixed: p.processingFeeFixed,
    lateFeePercentage: p.lateFeePercentage,
    lateFeeFixed: p.lateFeeFixed,
    prepaymentPenaltyPercentage: p.prepaymentPenaltyPercentage,
  };
}

export default function LoanProductDetailPage() {
  return (
    <RouteGuard permissions={[Permissions.LoanRead]}>
      <LoanProductDetailContent />
    </RouteGuard>
  );
}

function LoanProductDetailContent() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = React.useState<LoanProductRequestBody | null>(null);

  const detail = useQuery({
    queryKey: ["loans", "product", id],
    queryFn: () => loanProductsApi.getById(id),
    enabled: Boolean(id),
  });

  React.useEffect(() => {
    if (detail.data) setForm(responseToForm(detail.data));
  }, [detail.data]);

  const save = useMutation({
    mutationFn: () => loanProductsApi.update(id, form!),
    onSuccess: () => {
      toast({ title: "Saved" });
      qc.invalidateQueries({ queryKey: ["loans", "product", id] });
    },
    onError: (e) => toast({ variant: "destructive", description: describeApiError(e) }),
  });

  const activate = useMutation({
    mutationFn: () => loanProductsApi.activate(id),
    onSuccess: () => {
      toast({ title: "Activated" });
      qc.invalidateQueries({ queryKey: ["loans", "product", id] });
    },
    onError: (e) => toast({ variant: "destructive", description: describeApiError(e) }),
  });

  const deactivate = useMutation({
    mutationFn: () => loanProductsApi.deactivate(id),
    onSuccess: () => {
      toast({ title: "Deactivated" });
      qc.invalidateQueries({ queryKey: ["loans", "product", id] });
    },
    onError: (e) => toast({ variant: "destructive", description: describeApiError(e) }),
  });

  const [valAmount, setValAmount] = React.useState("5000");
  const [valTenor, setValTenor] = React.useState("12");
  const validate = useQuery({
    queryKey: ["loans", "product", id, "validate", valAmount, valTenor],
    queryFn: () => loanProductsApi.validateParameters(id, Number(valAmount), Number(valTenor)),
    enabled: false,
  });

  const [feeLoan, setFeeLoan] = React.useState("10000");
  const [feeOverdue, setFeeOverdue] = React.useState("100");
  const [feePrepay, setFeePrepay] = React.useState("5000");

  if (detail.isLoading || !form)
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  if (detail.isError)
    return <p className="text-destructive">{describeApiError(detail.error)}</p>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Product ${detail.data?.productCode}`}
        description={`PUT /api/v1/loan-products/${id}`}
        actions={
          <Button variant="outline" onClick={() => router.push("/loans/products")}>
            Back
          </Button>
        }
      />

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Edit</CardTitle>
            <CardDescription>Update definition; activation is a separate action.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Can permissions={[Permissions.LoanWrite]}>
              <Button type="button" variant="secondary" size="sm" onClick={() => activate.mutate()} disabled={activate.isPending}>
                Activate
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => deactivate.mutate()} disabled={deactivate.isPending}>
                Deactivate
              </Button>
            </Can>
          </div>
        </CardHeader>
        <CardContent>
          <form
            className="grid max-w-3xl gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              const parsed = loanProductRequestSchema.safeParse(form);
              if (!parsed.success) {
                toast({ variant: "destructive", description: parsed.error.errors[0]?.message });
                return;
              }
              save.mutate();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Product code</Label>
                <Input value={form.productCode} onChange={(ev) => setForm({ ...form, productCode: ev.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label>Product name</Label>
                <Input value={form.productName} onChange={(ev) => setForm({ ...form, productName: ev.target.value })} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Type</Label>
              <Select value={form.productType} onValueChange={(v) => setForm({ ...form, productType: v })}>
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
              <Label>Description</Label>
              <Textarea value={form.description ?? ""} onChange={(ev) => setForm({ ...form, description: ev.target.value })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Min amount</Label>
                <Input type="number" value={form.minAmount} onChange={(ev) => setForm({ ...form, minAmount: Number(ev.target.value) })} />
              </div>
              <div className="grid gap-1.5">
                <Label>Max amount</Label>
                <Input type="number" value={form.maxAmount} onChange={(ev) => setForm({ ...form, maxAmount: Number(ev.target.value) })} />
              </div>
              <div className="grid gap-1.5">
                <Label>Min tenor</Label>
                <Input type="number" value={form.minTenorMonths} onChange={(ev) => setForm({ ...form, minTenorMonths: Number(ev.target.value) })} />
              </div>
              <div className="grid gap-1.5">
                <Label>Max tenor</Label>
                <Input type="number" value={form.maxTenorMonths} onChange={(ev) => setForm({ ...form, maxTenorMonths: Number(ev.target.value) })} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Interest rate (%)</Label>
              <Input type="number" step="0.01" value={form.interestRate} onChange={(ev) => setForm({ ...form, interestRate: Number(ev.target.value) })} />
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
                <Label>Repayment freq</Label>
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
              <Label>Currency</Label>
              <Input maxLength={3} value={form.currency} onChange={(ev) => setForm({ ...form, currency: ev.target.value.toUpperCase() })} />
            </div>
            <Can permissions={[Permissions.LoanWrite]}>
              <Button type="submit" disabled={save.isPending}>
                Save changes
              </Button>
            </Can>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Validation & fees</CardTitle>
          <CardDescription>GET /validate, /fees/processing, /fees/late, /fees/prepayment</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-end gap-2">
            <div className="grid gap-1.5">
              <Label>Amount</Label>
              <Input value={valAmount} onChange={(e) => setValAmount(e.target.value)} className="w-28" />
            </div>
            <div className="grid gap-1.5">
              <Label>Tenor mo</Label>
              <Input value={valTenor} onChange={(e) => setValTenor(e.target.value)} className="w-24" />
            </div>
            <Button type="button" variant="secondary" onClick={() => validate.refetch()}>
              Validate
            </Button>
          </div>
          {validate.isFetching ? (
            <Skeleton className="h-16 w-full" />
          ) : validate.data ? (
            <pre className="rounded-md border bg-muted/40 p-3 text-xs">{JSON.stringify(validate.data, null, 2)}</pre>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Processing — loan amount</Label>
              <Input value={feeLoan} onChange={(e) => setFeeLoan(e.target.value)} />
              <Button type="button" size="sm" variant="outline" onClick={async () => {
                  try {
                    const v = await loanProductsApi.processingFee(id, Number(feeLoan));
                    toast({ title: "Processing fee", description: String(v) });
                  } catch (e) {
                    toast({ variant: "destructive", description: describeApiError(e) });
                  }
                }}>
                Calc processing
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Late — overdue amount</Label>
              <Input value={feeOverdue} onChange={(e) => setFeeOverdue(e.target.value)} />
              <Button type="button" size="sm" variant="outline" onClick={async () => {
                  try {
                    const v = await loanProductsApi.lateFee(id, Number(feeOverdue));
                    toast({ title: "Late fee", description: String(v) });
                  } catch (e) {
                    toast({ variant: "destructive", description: describeApiError(e) });
                  }
                }}>
                Calc late
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Prepay — amount</Label>
              <Input value={feePrepay} onChange={(e) => setFeePrepay(e.target.value)} />
              <Button type="button" size="sm" variant="outline" onClick={async () => {
                  try {
                    const v = await loanProductsApi.prepaymentPenalty(id, Number(feePrepay));
                    toast({ title: "Prepayment penalty", description: String(v) });
                  } catch (e) {
                    toast({ variant: "destructive", description: describeApiError(e) });
                  }
                }}>
                Calc prepay
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
