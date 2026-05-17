"use client";

import * as React from "react";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Permissions } from "@/lib/rbac/permissions";
import { exchangeApi, type RateType } from "@/lib/api/modules/exchange";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RateTypeSelect } from "@/components/exchange/exchange-ui";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";

export default function ExchangeLatestRatePage() {
  return (
    <RouteGuard permissions={[Permissions.ExchangeRateRead, Permissions.ExchangeRateWrite]} mode="any">
      <Content />
    </RouteGuard>
  );
}

function Content() {
  const { toast } = useToast();
  const [source, setSource] = React.useState("EUR");
  const [target, setTarget] = React.useState("EUR");
  const [rateType, setRateType] = React.useState<RateType>("SPOT");
  const [result, setResult] = React.useState<Record<string, unknown> | null>(null);

  const fetchRate = async () => {
    try {
      const r = await exchangeApi.getRate({
        sourceCurrency: source.trim().toUpperCase(),
        targetCurrency: target.trim().toUpperCase(),
        rateType,
      });
      setResult(r as unknown as Record<string, unknown>);
    } catch (e) {
      setResult(null);
      toast({ variant: "destructive", title: "Lookup failed", description: describeApiError(e) });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Latest mid rate"
        description="Retrieve the published spot or forward mid for a currency pair right now."
      />
      <Card>
        <CardHeader>
          <CardTitle>Lookup</CardTitle>
          <CardDescription>Uses the latest available rate date in the system.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase text-muted-foreground">Source</Label>
              <Input value={source} onChange={(e) => setSource(e.target.value)} className="w-24 uppercase" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase text-muted-foreground">Target</Label>
              <Input value={target} onChange={(e) => setTarget(e.target.value)} className="w-24 uppercase" />
            </div>
            <RateTypeSelect value={rateType} onChange={setRateType} label="Rate type" />
            <Button type="button" onClick={fetchRate}>
              Get rate
            </Button>
          </div>
          {result ? (
            <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto">{JSON.stringify(result, null, 2)}</pre>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
