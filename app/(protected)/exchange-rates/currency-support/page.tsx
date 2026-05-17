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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";

export default function ExchangeCurrencySupportPage() {
  return (
    <RouteGuard permissions={[Permissions.ExchangeRateRead, Permissions.ExchangeRateWrite]} mode="any">
      <Content />
    </RouteGuard>
  );
}

function Content() {
  const { toast } = useToast();
  const [code, setCode] = React.useState("USD");
  const [supported, setSupported] = React.useState<boolean | null>(null);

  const check = async () => {
    try {
      const r = await exchangeApi.isCurrencySupported(code.trim().toUpperCase());
      setSupported(r.supported);
    } catch (e) {
      setSupported(null);
      toast({ variant: "destructive", title: "Check failed", description: describeApiError(e) });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Currency support"
        description="Confirm whether a currency code is enabled for FX before you rely on rates or conversions."
      />
      <Card>
        <CardHeader>
          <CardTitle>Is currency supported?</CardTitle>
          <CardDescription>Enter a three-letter ISO code.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase text-muted-foreground">Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} className="w-24 uppercase" />
          </div>
          <Button type="button" onClick={check}>
            Check
          </Button>
          {supported !== null ? (
            <Badge variant={supported ? "default" : "destructive"}>{supported ? "Supported" : "Not supported"}</Badge>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
