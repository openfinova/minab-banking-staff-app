"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  exchangeCodeForTokens,
  flagNextAuthorizeForceLogin,
  startRpInitiatedLogout,
  tokenResponseToSession,
} from "@/lib/auth/oidc";
import { saveSession, takeReturnTo } from "@/lib/auth/storage";
import { useAuthStore } from "@/lib/auth/auth-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function formatTokenExchangeError(message: string): string {
  if (/token exchange failed:\s*403\b/i.test(message)) {
    return "This account is not allowed to sign in to the management portal (the identity server denied issuing tokens). If access is pending approval, wait for provisioning or ask an administrator. Use “Sign out of identity server” if you are stuck in a loop, or “Back to login” and try again—you may be prompted to sign in again.";
  }
  return message;
}

function shouldForceNextLoginPrompt(message: string): boolean {
  return /token exchange failed:\s*(401|403)\b/i.test(message);
}

function AuthCallbackContent() {
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
        const raw = err instanceof Error ? err.message : "Sign-in failed";
        if (shouldForceNextLoginPrompt(raw)) {
          flagNextAuthorizeForceLogin();
        }
        const message = formatTokenExchangeError(raw);
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
                onClick={() => {
                  setError(null);
                  router.replace("/login");
                }}
                variant="outline"
              >
                Back to login
              </Button>
              <Button
                className="w-full"
                onClick={() => startRpInitiatedLogout()}
                variant="secondary"
              >
                Sign out of identity server
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

export default function AuthCallbackPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Finishing sign-in</CardTitle>
              <CardDescription>Loading…</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      }
    >
      <AuthCallbackContent />
    </React.Suspense>
  );
}
