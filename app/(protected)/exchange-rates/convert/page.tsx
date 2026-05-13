"use client";

import * as React from "react";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Permissions } from "@/lib/rbac/permissions";
import { exchangeApi } from "@/lib/api/modules/exchange";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";

export default function ExchangeConvertPage() {
  return (
    <RouteGuard permissions={[Permissions.ExchangeRateRead, Permissions.ExchangeRateWrite]} mode="any">
      <Content />
    </RouteGuard>
  );
}

function Content() {
  const { toast } = useToast();
  const [amount, setAmount] = React.useState("1000");
  const [from, setFrom] = React.useState("USD");
  const [to, setTo] = React.useState("EUR");
  const [conversionDate, setConversionDate] = React.useState("");
  const [result, setResult] = React.useState<Record<string, unknown> | null>(null);

  const run = async () => {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast({ variant: "destructive", title: "Enter a positive amount" });
      return;
    }
    try {
      const body = {
        amount: amt,
        fromCurrency: from.trim().toUpperCase(),
        toCurrency: to.trim().toUpperCase(),
        ...(conversionDate.trim() ? { conversionDate: conversionDate.trim() } : {}),
      };
      const r = await exchangeApi.convert(body);
      setResult(r as unknown as Record<string, unknown>);
    } catch (e) {
      setResult(null);
      toast({ variant: "destructive", title: "Convert failed", description: describeApiError(e) });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Currency conversion"
        description="POST /api/v1/exchange/convert — amount in one currency using the rate for the chosen date (or today if omitted)."
      />
      <Card>
        <CardHeader>
          <CardTitle>Convert</CardTitle>
          <CardDescription>Mid rate path uses SPOT for the selected conversion date on the server.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase text-muted-foreground">Amount</Label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} className="w-32" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase text-muted-foreground">From</Label>
              <Input value={from} onChange={(e) => setFrom(e.target.value)} className="w-24 uppercase" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase text-muted-foreground">To</Label>
              <Input value={to} onChange={(e) => setTo(e.target.value)} className="w-24 uppercase" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase text-muted-foreground">Conversion date</Label>
              <Input
                type="date"
                value={conversionDate}
                onChange={(e) => setConversionDate(e.target.value)}
                className="w-[11rem]"
              />
            </div>
            <Button type="button" onClick={run}>
              Convert
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
