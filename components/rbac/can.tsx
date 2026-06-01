"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth/auth-provider";
import type { PermissionMode } from "@/lib/rbac/permissions";

interface CanProps {
  permissions: ReadonlyArray<string>;
  mode?: PermissionMode;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function Can({ permissions, mode = "all", fallback = null, children }: CanProps) {
  const { can } = useAuth();
  if (!can(permissions, mode)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
