"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Can } from "@/components/rbac/can";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { CopyableUuid } from "@/components/data/copyable-uuid";
import { LoanServicingLinks } from "@/components/loans/loan-servicing-links";
import { describeApiError } from "@/lib/api/errors";
import { useToast } from "@/components/ui/use-toast";
import {
  loanPaymentsApi,
  type PaymentMethod,
  type PaymentType,
} from "@/lib/api/modules/loans";
import { Permissions } from "@/lib/rbac/permissions";
import { loanPaymentRecordSchema, loanPaymentAllocationFormSchema } from "@/lib/schemas/loans";

const PAY_METHODS: PaymentMethod[] = [
  "CASH",
  "BANK_TRANSFER",
  "CHEQUE",
  "DIRECT_DEBIT",
  "CARD",
  "MOBILE_MONEY",
  "ONLINE",
];
const PAY_TYPES: PaymentType[] = [
  "REGULAR_PAYMENT",
  "PREPAYMENT",
  "EARLY_SETTLEMENT",
  "LATE_FEE",
  "PENALTY",
  "RESTRUCTURING_FEE",
];

export default function LoanAccountPaymentsPage() {
  return (
    <RouteGuard permissions={[Permissions.LoanRead]}>
      <PayContent />
    </RouteGuard>
  );
}

function PayContent() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = React.useState(0);

  const list = useQuery({
    queryKey: ["loans", "pay", id, page],
    queryFn: () => loanPaymentsApi.listByLoanAccount(id, page, 20),
    enabled: Boolean(id),
  });

  const totals = useQuery({
    queryKey: ["loans", "pay", id, "totals"],
    queryFn: async () => ({
      tp: await loanPaymentsApi.totalPayments(id),
      tpr: await loanPaymentsApi.totalPrincipalPaid(id),
      tin: await loanPaymentsApi.totalInterestPaid(id),
      last: await loanPaymentsApi.lastPayment(id).catch(() => null),
    }),
    enabled: Boolean(id),
  });

  const [amt, setAmt] = React.useState("100");
  const [pDate, setPDate] = React.useState("");
  const [pMethod, setPMethod] = React.useState<PaymentMethod>("BANK_TRANSFER");
  const [pref, setPref] = React.useState("");

  const record = useMutation({
    mutationFn: () =>
      loanPaymentsApi.record({
        loanAccountId: id,
        paymentAmount: Number(amt),
        paymentDate: pDate,
        paymentMethod: pMethod,
        transactionReference: pref || undefined,
      }),
    onSuccess: () => {
      toast({ title: "Payment recorded" });
      qc.invalidateQueries({ queryKey: ["loans", "pay", id] });
    },
    onError: (e) => toast({ variant: "destructive", description: describeApiError(e) }),
  });

  const [allocAmt, setAllocAmt] = React.useState("100");
  const allocPrev = useMutation({
    mutationFn: () => loanPaymentsApi.allocationPreview(id, Number(allocAmt)),
    onSuccess: (d) => toast({ title: "Allocation preview", description: JSON.stringify(d) }),
    onError: (e) => toast({ variant: "destructive", description: describeApiError(e) }),
  });

  /** Manual allocation */
  const [mAmt, setMAmt] = React.useState("100");
  const [mPrin, setMPrin] = React.useState("80");
  const [mInt, setMInt] = React.useState("20");
  const [mFee, setMFee] = React.useState("0");
  const [mPen, setMPen] = React.useState("0");
  const [mDate, setMDate] = React.useState("");
  const [mType, setMType] = React.useState<PaymentType>("REGULAR_PAYMENT");
  const [mMethod, setMMethod] = React.useState<PaymentMethod>("BANK_TRANSFER");

  const recordAlloc = useMutation({
    mutationFn: () =>
      loanPaymentsApi.recordWithAllocation({
        loanAccountId: id,
        paymentAmount: Number(mAmt),
        principalPaid: Number(mPrin),
        interestPaid: Number(mInt),
        feesPaid: Number(mFee),
        penaltiesPaid: Number(mPen),
        paymentDate: mDate,
        paymentType: mType,
        paymentMethod: mMethod,
      }),
    onSuccess: () => {
      toast({ title: "Allocated payment recorded" });
      qc.invalidateQueries({ queryKey: ["loans", "pay", id] });
    },
    onError: (e) => toast({ variant: "destructive", description: describeApiError(e) }),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Loan payments" description="Record repayments against principal, interest, and charges." />
      <LoanServicingLinks loanAccountId={id} />

      {totals.data ? (
        <Card>
          <CardHeader>
            <CardTitle>Totals</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p>Total payments: {totals.data.tp}</p>
            <p>Principal paid: {totals.data.tpr}</p>
            <p>Interest paid: {totals.data.tin}</p>
            <p>Last: {totals.data.last ? JSON.stringify(totals.data.last) : "—"}</p>
          </CardContent>
        </Card>
      ) : null}

      <Can permissions={[Permissions.LoanWrite]}>
        <Card>
          <CardHeader>
            <CardTitle>Record (auto allocate)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3 items-end">
            <div className="grid gap-1.5">
              <Label>Amount</Label>
              <Input value={amt} onChange={(e) => setAmt(e.target.value)} className="w-28" />
            </div>
            <div className="grid gap-1.5">
              <Label>Date</Label>
              <DateInput value={pDate} onChange={setPDate} />
            </div>
            <Select value={pMethod} onValueChange={(v) => setPMethod(v as PaymentMethod)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAY_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Ref" value={pref} onChange={(e) => setPref(e.target.value)} className="max-w-xs" />
            <Button
              disabled={record.isPending}
              onClick={() => {
                const p = loanPaymentRecordSchema.safeParse({
                  paymentAmount: Number(amt),
                  paymentDate: pDate,
                  paymentMethod: pMethod,
                  transactionReference: pref,
                });
                if (!p.success) {
                  toast({ variant: "destructive", description: p.error.errors[0]?.message });
                  return;
                }
                record.mutate();
              }}
            >
              Record
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Allocation preview</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2 items-end">
            <Input value={allocAmt} onChange={(e) => setAllocAmt(e.target.value)} className="w-32" />
            <Button type="button" variant="outline" disabled={allocPrev.isPending} onClick={() => allocPrev.mutate()}>
              Preview
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Record with manual allocation</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Input placeholder="Total" value={mAmt} onChange={(e) => setMAmt(e.target.value)} />
            <Input placeholder="Principal" value={mPrin} onChange={(e) => setMPrin(e.target.value)} />
            <Input placeholder="Interest" value={mInt} onChange={(e) => setMInt(e.target.value)} />
            <Input placeholder="Fees" value={mFee} onChange={(e) => setMFee(e.target.value)} />
            <Input placeholder="Penalties" value={mPen} onChange={(e) => setMPen(e.target.value)} />
            <DateInput value={mDate} onChange={setMDate} />
            <Select value={mType} onValueChange={(v) => setMType(v as PaymentType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={mMethod} onValueChange={(v) => setMMethod(v as PaymentMethod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAY_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="sm:col-span-2"
              disabled={recordAlloc.isPending}
              onClick={() => {
                const p = loanPaymentAllocationFormSchema.safeParse({
                  paymentAmount: Number(mAmt),
                  principalPaid: Number(mPrin),
                  interestPaid: Number(mInt),
                  feesPaid: Number(mFee),
                  penaltiesPaid: Number(mPen),
                  paymentDate: mDate,
                  paymentType: mType,
                  paymentMethod: mMethod,
                });
                if (!p.success) {
                  toast({ variant: "destructive", description: p.error.errors[0]?.message });
                  return;
                }
                recordAlloc.mutate();
              }}
            >
              Record allocated
            </Button>
          </CardContent>
        </Card>
      </Can>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>UUID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Ref</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(list.data?.content ?? []).map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <CopyableUuid value={r.id} />
                </TableCell>
                <TableCell>{r.paymentDate}</TableCell>
                <TableCell>{r.paymentAmount}</TableCell>
                <TableCell>{r.paymentMethod}</TableCell>
                <TableCell className="font-mono text-xs">{r.transactionReference}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>
          Prev
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!list.data || list.data.last}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
