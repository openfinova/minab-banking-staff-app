"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Can } from "@/components/rbac/can";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { describeApiError } from "@/lib/api/errors";
import { useToast } from "@/components/ui/use-toast";
import { loanPaymentsApi } from "@/lib/api/modules/loans";
import { Permissions } from "@/lib/rbac/permissions";
import { Pagination } from "@/components/data/pagination";
import { LoanQuickLookup } from "@/components/loans/loan-quick-lookup";

export default function LoanPaymentsHubPage() {
  return (
    <RouteGuard permissions={[Permissions.LoanRead]}>
      <Hub />
    </RouteGuard>
  );
}

function Hub() {
  const { toast } = useToast();
  const [payId, setPayId] = React.useState("");
  const [ref, setRef] = React.useState("");
  const [page, setPage] = React.useState(0);
  const [revReason, setRevReason] = React.useState("");

  const byId = useQuery({
    queryKey: ["loans", "pay-hub", "id", payId],
    queryFn: () => loanPaymentsApi.getById(payId),
    enabled: false,
  });
  const byRef = useQuery({
    queryKey: ["loans", "pay-hub", "ref", ref],
    queryFn: () => loanPaymentsApi.getByReference(ref),
    enabled: false,
  });

  const reversed = useQuery({
    queryKey: ["loans", "pay-hub", "reversed", page],
    queryFn: () => loanPaymentsApi.listReversed(page, 20),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Payments search" description="Lookup and reversed payments feed" />

      <Card>
        <CardHeader>
          <CardTitle>Open by loan account</CardTitle>
        </CardHeader>
        <CardContent>
          <LoanQuickLookup hrefForLoan={(id) => `/loans/accounts/${id}/payments`} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>By payment id / reference</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 items-end">
          <div className="grid gap-1.5">
            <Label>Payment UUID</Label>
            <Input value={payId} onChange={(e) => setPayId(e.target.value)} className="w-64 font-mono text-xs" />
          </div>
          <Button type="button" variant="secondary" onClick={() => void byId.refetch()}>
            Load
          </Button>
          <div className="grid gap-1.5">
            <Label>Reference</Label>
            <Input value={ref} onChange={(e) => setRef(e.target.value)} />
          </div>
          <Button type="button" variant="secondary" onClick={() => void byRef.refetch()}>
            Load
          </Button>
        </CardContent>
        {byId.data ? (
          <CardContent>
            <pre className="text-xs bg-muted/30 p-3 rounded-md overflow-auto">{JSON.stringify(byId.data, null, 2)}</pre>
            <ReverseRow id={byId.data.id} reason={revReason} setReason={setRevReason} toast={toast} />
          </CardContent>
        ) : null}
        {byRef.data ? (
          <CardContent>
            <pre className="text-xs bg-muted/30 p-3 rounded-md overflow-auto">{JSON.stringify(byRef.data, null, 2)}</pre>
            <ReverseRow id={byRef.data.id} reason={revReason} setReason={setRevReason} toast={toast} />
          </CardContent>
        ) : null}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reversed payments (global)</CardTitle>
        </CardHeader>
        <CardContent>
          {reversed.isError ? (
            <p className="text-destructive text-sm">{describeApiError(reversed.error)}</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(reversed.data?.content ?? []).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-[10px]">{r.id}</TableCell>
                        <TableCell className="font-mono text-[10px]">{r.loanAccountId}</TableCell>
                        <TableCell>{r.paymentAmount}</TableCell>
                        <TableCell>{r.paymentDate}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Pagination page={page} totalPages={reversed.data?.totalPages ?? 0} onPageChange={setPage} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ReverseRow({
  id,
  reason,
  setReason,
  toast,
}: {
  id: string;
  reason: string;
  setReason: (s: string) => void;
  toast: ReturnType<typeof useToast>["toast"];
}) {
  return (
    <Can permissions={[Permissions.LoanWrite]}>
      <div className="mt-3 flex flex-wrap gap-2 items-end">
        <Input
          placeholder="Reversal reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="max-w-md"
        />
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() =>
            loanPaymentsApi
              .reverse(id, reason || "Reversal")
              .then(() => toast({ title: "Reversed" }))
              .catch((e) => toast({ variant: "destructive", description: describeApiError(e) }))
          }
        >
          Reverse payment
        </Button>
      </div>
    </Can>
  );
}
