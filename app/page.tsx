"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-provider";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomePage() {
  const { isAuthenticated, isLoading, forcePasswordChange } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (forcePasswordChange) {
      router.replace("/account/force-password-change");
      return;
    }
    router.replace("/dashboard");
  }, [isAuthenticated, isLoading, forcePasswordChange, router]);

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-md space-y-3">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-6 w-1/3" />
      </div>
    </div>
  );
}
