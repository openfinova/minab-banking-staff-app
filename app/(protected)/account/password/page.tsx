"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Permissions } from "@/lib/rbac/permissions";
import { meApi } from "@/lib/api/modules/me";
import { changeOwnPasswordSchema, type ChangeOwnPasswordInput } from "@/lib/schemas/me";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";
import { PASSWORD_MAX_LENGTH } from "@/lib/schemas/password-policy";

export default function ChangePasswordPage() {
  return (
    <RouteGuard permissions={[Permissions.PasswordChangeOwn]}>
      <ChangePasswordContent />
    </RouteGuard>
  );
}

function ChangePasswordContent() {
  const { toast } = useToast();
  const form = useForm<ChangeOwnPasswordInput>({
    resolver: zodResolver(changeOwnPasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async (values: ChangeOwnPasswordInput) => {
    try {
      await meApi.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      form.reset();
      toast({ title: "Password updated" });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: describeApiError(error),
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Change password"
        description="Update your sign-in credentials. New password must be 12-128 characters; uppercase, lowercase, digit, and special character are required."
      />
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Update credentials</CardTitle>
          <CardDescription>Calls `PATCH /api/v1/identity/me/password`.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
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
            <Button type="submit" loading={form.formState.isSubmitting}>
              Update password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
