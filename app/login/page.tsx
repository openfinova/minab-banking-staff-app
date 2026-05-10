"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/auth-provider";

const REASON_TEXT: Record<string, string> = {
  "session-expired": "Your session has expired. Please sign in again.",
  "logged-out": "You have been signed out.",
  "access-denied": "You do not have access to that resource.",
};

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const { isAuthenticated, isLoading, forcePasswordChange, loginWithRedirect } = useAuth();
  const reason = search.get("reason") ?? undefined;
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) {
      router.replace(forcePasswordChange ? "/account/force-password-change" : "/dashboard");
    }
  }, [isAuthenticated, isLoading, forcePasswordChange, router]);

  const onSignIn = async () => {
    setPending(true);
    try {
      await loginWithRedirect();
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/40 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-semibold">Minab Banking</span>
            <span className="text-xs text-muted-foreground">Management Portal</span>
          </div>
        </div>
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Sign in to continue</CardTitle>
            <CardDescription>
              Internal admin & staff access only. Multi-factor authentication is required.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {reason && REASON_TEXT[reason] ? (
              <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
                {REASON_TEXT[reason]}
              </div>
            ) : null}
            <Button className="w-full" onClick={onSignIn} loading={pending} size="lg">
              <ShieldCheck className="h-4 w-4" /> Continue with secure sign-in
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              You will be redirected to the Minab identity server, prompted for credentials and
              your second factor, then returned here.
            </p>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground">
          Need help? Contact the security operations team.
        </p>
      </div>
    </div>
  );
}
