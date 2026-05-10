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

export function IdleTimeoutWatcher() {
  const { isAuthenticated, logout, refresh } = useAuth();
  const [open, setOpen] = React.useState(false);

  const { reset } = useIdleTimeout({
    enabled: isAuthenticated,
    onWarning: () => setOpen(true),
    onTimeout: () => {
      setOpen(false);
      void logout();
    },
  });

  const stay = React.useCallback(async () => {
    setOpen(false);
    try {
      await refresh();
    } catch {
      /* refresh failure is handled by provider */
    }
    reset();
  }, [refresh, reset]);

  if (!isAuthenticated) return null;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you still there?</AlertDialogTitle>
          <AlertDialogDescription>
            For your security, your session will end shortly due to inactivity. Choose to stay
            signed in or log out now.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => void logout()}>Log out</AlertDialogCancel>
          <AlertDialogAction onClick={() => void stay()}>Stay signed in</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
