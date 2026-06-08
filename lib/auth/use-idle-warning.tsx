"use client";

import * as React from "react";
import { useIdleTimeout } from "@/lib/auth/idle-timeout";
import { useAuth } from "@/lib/auth/auth-provider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { appConfig } from "@/lib/config";

export function IdleTimeoutWatcher() {
  const { isAuthenticated, logout } = useAuth();
  const [open, setOpen] = React.useState(false);

  const { reset } = useIdleTimeout({
    enabled: isAuthenticated,
    onWarning: () => setOpen(true),
    onTimeout: () => {
      setOpen(false);
      // Local BFF session end only — avoids IdP post-logout racing with the next OAuth login.
      window.location.assign(appConfig.oidc.sessionEndPath);
    },
  });

  const reauthenticate = React.useCallback(() => {
    setOpen(false);
    reset();
    const url = new URL(appConfig.oidc.loginPath, window.location.origin);
    url.searchParams.set("prompt", "login");
    url.searchParams.set("returnTo", window.location.pathname);
    window.location.assign(url.toString());
  }, [reset]);

  if (!isAuthenticated) return null;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you still there?</AlertDialogTitle>
          <AlertDialogDescription>
            For your security, your session will end shortly due to inactivity. Sign in again to
            continue or log out now.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => void logout()}>Log out</AlertDialogCancel>
          <AlertDialogAction onClick={reauthenticate}>Sign in again</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
