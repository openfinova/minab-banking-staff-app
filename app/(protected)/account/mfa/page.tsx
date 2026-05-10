"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Permissions } from "@/lib/rbac/permissions";
import { meApi, type MfaSetupResponse } from "@/lib/api/modules/me";
import { mfaDisableSchema, mfaVerifySchema, type MfaDisableInput, type MfaVerifyInput } from "@/lib/schemas/me";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";

export default function MfaPage() {
  return (
    <RouteGuard permissions={[Permissions.MfaManageOwn]}>
      <MfaContent />
    </RouteGuard>
  );
}

function MfaContent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const profile = useQuery({ queryKey: ["me", "profile"], queryFn: meApi.profile });
  const [setup, setSetup] = React.useState<MfaSetupResponse | null>(null);

  const setupMutation = useMutation({
    mutationFn: meApi.mfaSetup,
    onSuccess: (data) => {
      setSetup(data);
      toast({ title: "Scan the QR code in your authenticator app" });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Could not start MFA setup",
        description: describeApiError(error),
      });
    },
  });

  const verifyForm = useForm<MfaVerifyInput>({
    resolver: zodResolver(mfaVerifySchema),
    defaultValues: { code: "" },
  });

  const verifyMutation = useMutation({
    mutationFn: (input: MfaVerifyInput) => meApi.mfaVerify(input),
    onSuccess: () => {
      verifyForm.reset();
      setSetup(null);
      void queryClient.invalidateQueries({ queryKey: ["me", "profile"] });
      toast({ title: "MFA verified", description: "Multi-factor protection is now active." });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: describeApiError(error),
      });
    },
  });

  const disableForm = useForm<MfaDisableInput>({
    resolver: zodResolver(mfaDisableSchema),
    defaultValues: { currentPassword: "" },
  });

  const disableMutation = useMutation({
    mutationFn: (input: MfaDisableInput) => meApi.mfaDisable(input),
    onSuccess: () => {
      disableForm.reset();
      void queryClient.invalidateQueries({ queryKey: ["me", "profile"] });
      toast({ title: "MFA disabled" });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Could not disable MFA",
        description: describeApiError(error),
      });
    },
  });

  const enabled = profile.data?.mfaEnabled ?? false;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Multi-factor authentication"
        description="TOTP enrollment, verification, and recovery codes."
        actions={
          <Badge variant={enabled ? "success" : "warning"}>
            {enabled ? (
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Enabled
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <ShieldAlert className="h-3 w-3" /> Not enabled
              </span>
            )}
          </Badge>
        }
      />

      {!enabled ? (
        <Card>
          <CardHeader>
            <CardTitle>Set up authenticator app</CardTitle>
            <CardDescription>
              Generate a TOTP secret and verify a 6-digit code to complete enrollment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!setup ? (
              <Button
                onClick={() => setupMutation.mutate()}
                loading={setupMutation.isPending}
              >
                Start MFA setup
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="rounded-md border bg-muted/30 p-3 text-sm">
                  <p className="font-medium">Authenticator URI</p>
                  <p className="break-all font-mono text-xs">{setup.qrUri}</p>
                  <Separator className="my-2" />
                  <p className="font-medium">Shared secret</p>
                  <p className="break-all font-mono text-xs">{setup.secret}</p>
                </div>
                {setup.recoveryCodes?.length ? (
                  <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
                    <p className="mb-1 font-medium">Recovery codes</p>
                    <p className="text-xs">
                      Store these securely. Each code can be used once if you lose your
                      authenticator.
                    </p>
                    <ul className="mt-2 grid grid-cols-2 gap-1 font-mono text-xs">
                      {setup.recoveryCodes.map((code) => (
                        <li key={code}>{code}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <form
                  className="flex items-end gap-3"
                  onSubmit={verifyForm.handleSubmit((data) => verifyMutation.mutate(data))}
                >
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor="code">Authenticator code</Label>
                    <Input
                      id="code"
                      inputMode="numeric"
                      maxLength={6}
                      autoComplete="one-time-code"
                      {...verifyForm.register("code")}
                    />
                    {verifyForm.formState.errors.code ? (
                      <p className="text-xs text-destructive">
                        {verifyForm.formState.errors.code.message}
                      </p>
                    ) : null}
                  </div>
                  <Button type="submit" loading={verifyMutation.isPending}>
                    Verify and enable
                  </Button>
                </form>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Disable multi-factor authentication</CardTitle>
            <CardDescription>
              Confirm your password to remove the second factor from your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="flex items-end gap-3"
              onSubmit={disableForm.handleSubmit((data) => disableMutation.mutate(data))}
            >
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="currentPassword">Current password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  {...disableForm.register("currentPassword")}
                />
                {disableForm.formState.errors.currentPassword ? (
                  <p className="text-xs text-destructive">
                    {disableForm.formState.errors.currentPassword.message}
                  </p>
                ) : null}
              </div>
              <Button
                type="submit"
                variant="destructive"
                loading={disableMutation.isPending}
              >
                Disable MFA
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
