"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";
import { glSetupApi } from "@/lib/api/modules/operations";
import {
  GL_BOOTSTRAP_COMPLETE_QUERY_ROOT,
  useGlBootstrapComplete,
} from "@/lib/general-ledger/use-gl-bootstrap-complete";
import { Permissions } from "@/lib/rbac/permissions";
import Link from "next/link";

export default function GlSetupPage() {
  return (
    <RouteGuard permissions={[Permissions.GlApprove]}>
      <GlSetupContent />
    </RouteGuard>
  );
}

function invalidateBootstrapStatus(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: [GL_BOOTSTRAP_COMPLETE_QUERY_ROOT] });
}

function GlSetupContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [currency, setCurrency] = React.useState("USD");
  const [fiscalYear, setFiscalYear] = React.useState(new Date().getFullYear());

  const bootstrap = useGlBootstrapComplete(true);

  React.useEffect(() => {
    if (bootstrap.isSuccess && bootstrap.data.complete) {
      router.replace("/general-ledger");
    }
  }, [bootstrap.isSuccess, bootstrap.data?.complete, router, bootstrap.data]);

  const full = useMutation({
    mutationFn: () =>
      glSetupApi.initializeAll({
        currency: currency.trim().toUpperCase(),
        fiscalYear,
      }),
    onSuccess: (res) => {
      invalidateBootstrapStatus(queryClient);
      toast({
        title: "GL bootstrap complete",
        description: JSON.stringify(res),
      });
    },
    onError: (error) =>
      toast({ variant: "destructive", title: "Initialization failed", description: describeApiError(error) }),
  });

  const chartOnly = useMutation({
    mutationFn: () =>
      glSetupApi.initializeChartOfAccounts(currency.trim().toUpperCase()),
    onSuccess: (r) => {
      invalidateBootstrapStatus(queryClient);
      toast({ title: "Chart step", description: `${r.glAccountsCreated} accounts created.` });
    },
    onError: (e) => toast({ variant: "destructive", description: describeApiError(e) }),
  });

  const opOnly = useMutation({
    mutationFn: () => glSetupApi.initializeOperationalAccounts(),
    onSuccess: (r) => {
      invalidateBootstrapStatus(queryClient);
      toast({ title: "Operational step", description: `${r.operationalAccountsWired} mappings wired.` });
    },
    onError: (e) => toast({ variant: "destructive", description: describeApiError(e) }),
  });

  const periodsOnly = useMutation({
    mutationFn: () => glSetupApi.initializeFiscalPeriods(fiscalYear),
    onSuccess: (r) => {
      invalidateBootstrapStatus(queryClient);
      toast({
        title: "Fiscal periods",
        description: `Created ${r.fiscalPeriodsCreated}, skipped ${r.fiscalPeriodsAlreadyExisted}.`,
      });
    },
    onError: (e) => toast({ variant: "destructive", description: describeApiError(e) }),
  });

  if (bootstrap.isPending) {
    return (
      <div className="space-y-6">
        <PageHeader title="GL system setup" description="Loading status…" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  if (bootstrap.isSuccess && bootstrap.data.complete) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="GL system setup"
        description="Administrative bootstrap for StandardBankTemplateDefinition (chart), operational mappings, and fiscal-period calendar."
      />

      <Card>
        <CardHeader>
          <CardTitle>Parameters</CardTitle>
          <CardDescription>Used for every bootstrap action on this page.</CardDescription>
        </CardHeader>
        <CardContent className="grid max-w-lg gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase text-muted-foreground">Currency</Label>
            <Input value={currency} maxLength={3} onChange={(e) => setCurrency(e.target.value.toUpperCase())} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase text-muted-foreground">Fiscal year</Label>
            <Input type="number" value={fiscalYear} onChange={(e) => setFiscalYear(Number(e.target.value))} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Run setup</CardTitle>
          <CardDescription>
            Full initialization applies chart seeding, operational wiring, and monthly fiscal calendars — safe to repeat.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button type="button" loading={full.isPending} onClick={() => full.mutate()}>
            Run full initialization
          </Button>
          <Button variant="outline" type="button" loading={chartOnly.isPending} onClick={() => chartOnly.mutate()}>
            Chart only
          </Button>
          <Button variant="outline" type="button" loading={opOnly.isPending} onClick={() => opOnly.mutate()}>
            Operational only
          </Button>
          <Button variant="outline" type="button" loading={periodsOnly.isPending} onClick={() => periodsOnly.mutate()}>
            Fiscal periods only
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/general-ledger/fiscal-periods">Open fiscal-period console</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
