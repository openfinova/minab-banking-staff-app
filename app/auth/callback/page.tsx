"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { exchangeCodeForTokens, tokenResponseToSession } from "@/lib/auth/oidc";
import { saveSession, takeReturnTo } from "@/lib/auth/storage";
import { useAuthStore } from "@/lib/auth/auth-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AuthCallbackPage() {
  const router = useRouter();
  const search = useSearchParams();
  const { setSession, setError } = useAuthStore();
  const [error, setLocalError] = React.useState<string | null>(null);
  const completed = React.useRef(false);

  React.useEffect(() => {
    if (completed.current) return;
    completed.current = true;

    const errorParam = search.get("error");
    if (errorParam) {
      const description = search.get("error_description") ?? errorParam;
      setLocalError(description);
      setError(description);
      return;
    }

    const code = search.get("code");
    const state = search.get("state");
    if (!code || !state) {
      const message = "Missing authorization code or state parameter.";
      setLocalError(message);
      setError(message);
      return;
    }

    void (async () => {
      try {
        const token = await exchangeCodeForTokens(code, state);
        const session = tokenResponseToSession(token);
        saveSession(session);
        setSession(session);
        const target = takeReturnTo() ?? (session.user.forcePasswordChange
          ? "/account/force-password-change"
          : "/dashboard");
        router.replace(target);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Sign-in failed";
        setLocalError(message);
        setError(message);
      }
    })();
  }, [search, router, setSession, setError]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{error ? "Sign-in failed" : "Finishing sign-in"}</CardTitle>
          <CardDescription>
            {error
              ? "We could not complete your sign-in. You can try again from the login screen."
              : "Validating your session and loading your permissions..."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error ? (
            <>
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
                {error}
              </div>
              <Button
                className="w-full"
                onClick={() => router.replace("/login")}
                variant="outline"
              >
                Back to login
              </Button>
            </>
          ) : (
            <>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-32 w-full" />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
