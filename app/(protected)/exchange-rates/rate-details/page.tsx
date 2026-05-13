"use client";

import * as React from "react";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Permissions } from "@/lib/rbac/permissions";
import { exchangeApi, type ExchangeRateResponse, type RateType } from "@/lib/api/modules/exchange";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RateTypeSelect } from "@/components/exchange/exchange-ui";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";

export default function ExchangeRateDetailsPage() {
  return (
    <RouteGuard permissions={[Permissions.ExchangeRateRead, Permissions.ExchangeRateWrite]} mode="any">
      <Content />
    </RouteGuard>
  );
}

function Content() {
  const { toast } = useToast();
  const [source, setSource] = React.useState("USD");
  const [target, setTarget] = React.useState("EUR");
  const [rateType, setRateType] = React.useState<RateType>("SPOT");
  const [details, setDetails] = React.useState<ExchangeRateResponse | null>(null);

  const fetchDetails = async () => {
    try {
      const r = await exchangeApi.getRateDetails({
        sourceCurrency: source.trim().toUpperCase(),
        targetCurrency: target.trim().toUpperCase(),
        rateType,
      });
      setDetails(r);
    } catch (e) {
      setDetails(null);
      toast({ variant: "destructive", title: "Details failed", description: describeApiError(e) });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rate details"
        description="GET /api/v1/exchange/rate/details — full record including audit metadata for the latest date."
      />
      <Card>
        <CardHeader>
          <CardTitle>Lookup</CardTitle>
          <CardDescription>Same pair as mid rate, with full server response payload.</CardDescription>
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
            <Button type="button" onClick={fetchDetails}>
              Get details
            </Button>
          </div>
          {details ? (
            <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto">{JSON.stringify(details, null, 2)}</pre>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
