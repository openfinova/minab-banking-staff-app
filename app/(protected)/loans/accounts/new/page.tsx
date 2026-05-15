"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { RouteGuard } from "@/components/rbac/route-guard";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { describeApiError } from "@/lib/api/errors";
import { useToast } from "@/components/ui/use-toast";
import { loanAccountsApi } from "@/lib/api/modules/loans";
import { Permissions } from "@/lib/rbac/permissions";
import { loanAccountCreateSchema } from "@/lib/schemas/loans";

export default function NewLoanAccountPage() {
  return (
    <RouteGuard permissions={[Permissions.LoanWrite]}>
      <NewAccountContent />
    </RouteGuard>
  );
}

function NewAccountContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const { toast } = useToast();
  const [applicationId, setApplicationId] = React.useState(sp.get("applicationId") ?? "");

  React.useEffect(() => {
    const a = sp.get("applicationId");
    if (a) setApplicationId(a);
  }, [sp]);

  const create = useMutation({
    mutationFn: () => loanAccountsApi.create({ applicationId }),
    onSuccess: (acct) => {
      toast({ title: "Account created", description: acct.loanAccountNumber });
      router.push(`/loans/accounts/${acct.id}`);
    },
    onError: (e) => toast({ variant: "destructive", description: describeApiError(e) }),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = loanAccountCreateSchema.safeParse({ applicationId });
    if (!p.success) {
      toast({ variant: "destructive", description: p.error.errors[0]?.message });
      return;
    }
    create.mutate();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="New loan account" description="POST /api/v1/loan-accounts from approved application" />

      <Card>
        <CardHeader>
          <CardTitle>Origination</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid max-w-md gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="appId">Application ID</Label>
              <Input id="appId" value={applicationId} onChange={(e) => setApplicationId(e.target.value)} />
            </div>
            <Button type="submit" disabled={create.isPending}>
              Create account
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
