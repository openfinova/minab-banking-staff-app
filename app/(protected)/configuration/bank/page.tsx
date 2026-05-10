"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Permissions } from "@/lib/rbac/permissions";
import { bankApi } from "@/lib/api/modules/config";

export default function BankProfilePage() {
  return (
    <RouteGuard permissions={[Permissions.AdminConfigRead]}>
      <BankProfileContent />
    </RouteGuard>
  );
}

function BankProfileContent() {
  const { data, isLoading } = useQuery({
    queryKey: ["bank", "details"],
    queryFn: bankApi.details,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bank profile"
        description="Read-only view of the configured bank entity."
      />
      <Card>
        <CardHeader>
          <CardTitle>{data?.name ?? "Bank"}</CardTitle>
          <CardDescription>Source: `/api/v1/bank/details`.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : data ? (
            <dl className="grid gap-4 md:grid-cols-2">
              <Detail label="Legal name" value={data.legalName ?? "-"} />
              <Detail label="SWIFT/BIC" value={data.swiftCode ?? "-"} />
              <Detail label="Tax ID" value={data.taxId ?? "-"} />
              <Detail label="Currency" value={data.currency ?? "-"} />
              <Detail label="Country" value={data.countryCode ?? "-"} />
              <Detail
                label="Address"
                value={[data.addressLine1, data.addressLine2, data.city, data.region, data.postalCode]
                  .filter(Boolean)
                  .join(", ") || "-"}
              />
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">No data available.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  );
}
