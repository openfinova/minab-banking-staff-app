"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/auth-provider";
import { meApi } from "@/lib/api/modules/me";
import { changeOwnPasswordSchema, type ChangeOwnPasswordInput } from "@/lib/schemas/me";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";
import { PASSWORD_MAX_LENGTH } from "@/lib/schemas/password-policy";

export default function ForcePasswordChangePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, loginWithRedirect, logout, session } = useAuth();
  const { toast } = useToast();

  const form = useForm<ChangeOwnPasswordInput>({
    resolver: zodResolver(changeOwnPasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  React.useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) router.replace("/login");
    if (session && !session.user.forcePasswordChange) router.replace("/dashboard");
  }, [isAuthenticated, isLoading, router, session]);

  const onSubmit = async (values: ChangeOwnPasswordInput) => {
    try {
      await meApi.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast({
        title: "Password updated",
        description: "Your password was changed successfully. Re-establishing your session...",
      });
      await loginWithRedirect("/dashboard");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not update password",
        description: describeApiError(error),
      });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-warning/10 text-warning">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <CardTitle>Password change required</CardTitle>
          <CardDescription>
            You must update your password before continuing to the portal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                {...form.register("currentPassword")}
              />
              {form.formState.errors.currentPassword ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.currentPassword.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                maxLength={PASSWORD_MAX_LENGTH}
                {...form.register("newPassword")}
              />
              {form.formState.errors.newPassword ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.newPassword.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                maxLength={PASSWORD_MAX_LENGTH}
                {...form.register("confirmPassword")}
              />
              {form.formState.errors.confirmPassword ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.confirmPassword.message}
                </p>
              ) : null}
            </div>
            <Button type="submit" className="w-full" loading={form.formState.isSubmitting}>
              Update password
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => void logout()}
            >
              Sign out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
