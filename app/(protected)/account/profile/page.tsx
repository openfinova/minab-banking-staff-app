"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Permissions } from "@/lib/rbac/permissions";
import { meApi } from "@/lib/api/modules/me";

export default function ProfilePage() {
  return (
    <RouteGuard permissions={[Permissions.ProfileReadOwn]}>
      <ProfileContent />
    </RouteGuard>
  );
}

function ProfileContent() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["me", "profile"],
    queryFn: meApi.profile,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="My profile"
        description="Identity attributes and assigned access for your account."
      />
      <Card>
        <CardHeader>
          <CardTitle>Account details</CardTitle>
          <CardDescription>Sourced from `/api/v1/identity/me`.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {isLoading ? (
            <>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-6 w-3/4" />
            </>
          ) : isError || !data ? (
            <p className="text-sm text-destructive">
              Failed to load your profile. Please refresh.
            </p>
          ) : (
            <>
              <Detail label="Username" value={data.username} />
              <Detail label="Email" value={data.email ?? "-"} />
              <Detail label="User type" value={data.userType ?? "-"} />
              <Detail label="Branch" value={data.branchCode ?? "-"} />
              <Detail label="Employee ID" value={data.employeeId ?? "-"} />
              <Detail
                label="MFA"
                value={
                  <Badge variant={data.mfaEnabled ? "success" : "muted"}>
                    {data.mfaEnabled ? "Enabled" : "Not enabled"}
                  </Badge>
                }
              />
            </>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Roles & permissions</CardTitle>
          <CardDescription>Scopes used by guard layers across the portal.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data?.roles?.length ? (
            <div>
              <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Roles</p>
              <div className="flex flex-wrap gap-1.5">
                {data.roles.map((role) => (
                  <Badge key={role} variant="secondary">
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
          {data?.permissions?.length ? (
            <div>
              <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                Permissions
              </p>
              <div className="flex flex-wrap gap-1.5">
                {data.permissions.map((perm) => (
                  <Badge key={perm} variant="muted" className="font-mono text-[11px]">
                    {perm}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-sm font-medium">{value}</div>
    </div>
  );
}
