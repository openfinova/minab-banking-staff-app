"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth/auth-provider";
import type { PermissionMode } from "@/lib/rbac/permissions";

interface NavGuardProps {
  permissions: ReadonlyArray<string>;
  mode?: PermissionMode;
  children: React.ReactNode;
}

export function NavGuard({ permissions, mode = "any", children }: NavGuardProps) {
  const { can } = useAuth();
  if (permissions.length > 0 && !can(permissions, mode)) {
    return null;
  }
  return <>{children}</>;
}
