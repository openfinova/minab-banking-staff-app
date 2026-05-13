"use client";

import * as React from "react";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Permissions } from "@/lib/rbac/permissions";
import { exchangeApi, type ExchangeRateRequestBody, type RateType } from "@/lib/api/modules/exchange";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RateTypeSelect } from "@/components/exchange/exchange-ui";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/auth-provider";

export default function ExchangeCreateRatePage() {
  return (
    <RouteGuard permissions={[Permissions.ExchangeRateWrite]}>
      <Content />
    </RouteGuard>
  );
}

function Content() {
  const { session } = useAuth();
  const operator = session?.user.username ?? "";
  const { toast } = useToast();
  const [form, setForm] = React.useState<ExchangeRateRequestBody>({
    sourceCurrency: "USD",
    targetCurrency: "EUR",
    rate: 1,
    rateDate: new Date().toISOString().slice(0, 10),
    rateType: "SPOT",
  });
  const [creating, setCreating] = React.useState(false);

  const onCreate = async () => {
    if (!operator) {
      toast({ variant: "destructive", title: "Missing operator identity" });
      return;
    }
    setCreating(true);
    try {
      await exchangeApi.createRate({
        ...form,
        sourceCurrency: form.sourceCurrency.trim().toUpperCase(),
        targetCurrency: form.targetCurrency.trim().toUpperCase(),
        createdBy: operator,
      });
      toast({ title: "Exchange rate created" });
    } catch (e) {
      toast({ variant: "destructive", title: "Create failed", description: describeApiError(e) });
    } finally {
      setCreating(false);
    }
  };

  const setRateType = (rateType: RateType) => setForm((f) => ({ ...f, rateType }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create exchange rate"
        description="POST /api/v1/exchange/rates — publish a new rate row (natural key: pair, date, type)."
      />
      <Card>
        <CardHeader>
          <CardTitle>New rate</CardTitle>
          <CardDescription>Optional bid/ask must bracket the mid rate when provided.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase text-muted-foreground">Source</Label>
              <Input
                value={form.sourceCurrency}
                onChange={(e) => setForm((f) => ({ ...f, sourceCurrency: e.target.value }))}
                className="uppercase"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase text-muted-foreground">Target</Label>
              <Input
                value={form.targetCurrency}
                onChange={(e) => setForm((f) => ({ ...f, targetCurrency: e.target.value }))}
                className="uppercase"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase text-muted-foreground">Mid rate</Label>
              <Input
                type="number"
                step="any"
                value={form.rate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, rate: Number.parseFloat(e.target.value) || 0 }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase text-muted-foreground">Bid (optional)</Label>
              <Input
                type="number"
                step="any"
                value={form.bidRate ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    bidRate: e.target.value ? Number.parseFloat(e.target.value) : undefined,
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase text-muted-foreground">Ask (optional)</Label>
              <Input
                type="number"
                step="any"
                value={form.askRate ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    askRate: e.target.value ? Number.parseFloat(e.target.value) : undefined,
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase text-muted-foreground">Rate date</Label>
              <Input
                type="date"
                value={form.rateDate}
                onChange={(e) => setForm((f) => ({ ...f, rateDate: e.target.value }))}
              />
            </div>
            <RateTypeSelect value={form.rateType} onChange={setRateType} label="Rate type" />
          </div>
          <Button type="button" disabled={creating || !operator} onClick={onCreate}>
            {creating ? "Creating…" : "Create"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
