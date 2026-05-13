"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Permissions } from "@/lib/rbac/permissions";
import { exchangeApi } from "@/lib/api/modules/exchange";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { describeApiError } from "@/lib/api/errors";
import { Badge } from "@/components/ui/badge";

export default function ExchangeCurrenciesPage() {
  return (
    <RouteGuard permissions={[Permissions.ExchangeRateRead, Permissions.ExchangeRateWrite]} mode="any">
      <ExchangeCurrenciesContent />
    </RouteGuard>
  );
}

function ExchangeCurrenciesContent() {
  const q = useQuery({
    queryKey: ["exchange", "currencies"],
    queryFn: () => exchangeApi.getCurrencies(),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supported currencies"
        description="GET /api/v1/exchange/currencies — ISO codes available for FX operations."
      />
      <Card>
        <CardHeader>
          <CardTitle>Currency codes</CardTitle>
          <CardDescription>Returned by the exchange-rate service.</CardDescription>
        </CardHeader>
        <CardContent>
          {q.isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : q.isError ? (
            <p className="text-sm text-destructive">{describeApiError(q.error)}</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {(q.data ?? []).map((c) => (
                <Badge key={c} variant="secondary">
                  {c}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
