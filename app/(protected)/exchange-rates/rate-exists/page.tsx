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
import { Badge } from "@/components/ui/badge";
import { RateTypeSelect } from "@/components/exchange/exchange-ui";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";

export default function ExchangeRateExistsPage() {
  return (
    <RouteGuard permissions={[Permissions.ExchangeRateWrite]}>
      <Content />
    </RouteGuard>
  );
}

function Content() {
  const { toast } = useToast();
  const [source, setSource] = React.useState("USD");
  const [target, setTarget] = React.useState("EUR");
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [rateType, setRateType] = React.useState<RateType>("SPOT");
  const [exists, setExists] = React.useState<boolean | null>(null);

  const check = async () => {
    try {
      const r = await exchangeApi.rateExists({
        sourceCurrency: source.trim().toUpperCase(),
        targetCurrency: target.trim().toUpperCase(),
        date,
        rateType,
      });
      setExists(r.exists);
    } catch (e) {
      setExists(null);
      toast({ variant: "destructive", title: "Check failed", description: describeApiError(e) });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rate exists"
        description="GET /api/v1/exchange/rates/exists — whether a row exists for the natural key (admin)."
      />
      <Card>
        <CardHeader>
          <CardTitle>Existence check</CardTitle>
          <CardDescription>Pair, effective date, and rate type.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase text-muted-foreground">Source</Label>
            <Input value={source} onChange={(e) => setSource(e.target.value)} className="w-24 uppercase" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase text-muted-foreground">Target</Label>
            <Input value={target} onChange={(e) => setTarget(e.target.value)} className="w-24 uppercase" />
          </div>
          <RateTypeSelect value={rateType} onChange={setRateType} label="Rate type" />
          <div className="space-y-1.5">
            <Label className="text-xs uppercase text-muted-foreground">Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <Button type="button" onClick={check}>
            Check
          </Button>
          {exists !== null ? (
            <Badge variant={exists ? "default" : "secondary"}>{exists ? "Exists" : "Does not exist"}</Badge>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
