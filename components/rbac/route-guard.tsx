"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-provider";
import { setReturnTo } from "@/lib/auth/storage";
import type { PermissionMode } from "@/lib/rbac/permissions";
import { AccessDenied } from "@/components/rbac/access-denied";
import { Skeleton } from "@/components/ui/skeleton";

interface RouteGuardProps {
  permissions?: ReadonlyArray<string>;
  mode?: PermissionMode;
  children: React.ReactNode;
}

export function RouteGuard({
  permissions = [],
  mode = "all",
  children,
}: RouteGuardProps) {
  const { isAuthenticated, isLoading, forcePasswordChange, can } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      if (pathname && pathname !== "/login") setReturnTo(pathname);
      router.replace("/login");
      return;
    }
    if (forcePasswordChange && pathname !== "/account/force-password-change") {
      router.replace("/account/force-password-change");
    }
  }, [isAuthenticated, isLoading, forcePasswordChange, router, pathname]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="space-y-3 p-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (forcePasswordChange && pathname !== "/account/force-password-change") {
    return null;
  }

  if (permissions.length > 0 && !can(permissions, mode)) {
    return <AccessDenied required={permissions} />;
  }

  return <>{children}</>;
}
