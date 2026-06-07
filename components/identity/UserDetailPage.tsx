"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, KeyRound, Lock, LockOpen, ShieldCheck, ShieldX, Trash2, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmAction } from "@/components/data/confirm-action";
import { StatusBadge } from "@/components/data/status-badge";
import { Can } from "@/components/rbac/can";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Permissions } from "@/lib/rbac/permissions";
import { usersApi } from "@/lib/api/modules/users";
import { rolesApi } from "@/lib/api/modules/roles";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";
import { handleStepUpOnError } from "@/lib/auth/step-up";
import { generateBankCompliantPassword, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/schemas/password-policy";
import { CUSTOMER_PORTAL_ROLE_NAME } from "@/lib/schemas/users";
import { Checkbox } from "@/components/ui/checkbox";
import { DateTimeInput } from "@/components/ui/datetime-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ActionKind =
  | "lock"
  | "unlock"
  | "suspend"
  | "reactivate"
  | "deprovision"
  | "delete"
  | "approve-provisioning"
  | "reject-provisioning"
  | "force-password-change"
  | "reset-password"
  | "disable"
  | "enable";

const ACTION_CONFIG: Record<
  ActionKind,
  {
    title: string;
    description: string;
    confirmLabel: string;
    destructive?: boolean;
    reasonRequired?: boolean;
  }
> = {
  lock: {
    title: "Lock user account",
    description: "Locking prevents the user from signing in.",
    confirmLabel: "Lock account",
    destructive: true,
    reasonRequired: true,
  },
  unlock: {
    title: "Unlock user account",
    description: "The user will be able to sign in immediately.",
    confirmLabel: "Unlock account",
  },
  suspend: {
    title: "Suspend user",
    description: "Suspension blocks login and triggers compliance audit entry.",
    confirmLabel: "Suspend",
    destructive: true,
    reasonRequired: true,
  },
  reactivate: {
    title: "Reactivate user",
    description: "Restores normal access for the user.",
    confirmLabel: "Reactivate",
  },
  deprovision: {
    title: "Deprovision user",
    description: "Removes access; can be reactivated by re-provisioning.",
    confirmLabel: "Deprovision",
    destructive: true,
  },
  delete: {
    title: "Delete user",
    description: "This permanent action cannot be undone.",
    confirmLabel: "Delete user",
    destructive: true,
    reasonRequired: false,
  },
  "approve-provisioning": {
    title: "Approve provisioning",
    description: "User will move to APPROVED state and be eligible to sign in.",
    confirmLabel: "Approve",
  },
  "reject-provisioning": {
    title: "Reject provisioning",
    description: "User will not be allowed to sign in.",
    confirmLabel: "Reject",
    destructive: true,
    reasonRequired: true,
  },
  "force-password-change": {
    title: "Force password change",
    description: "User must change password on next sign-in.",
    confirmLabel: "Force change",
  },
  "reset-password": {
    title: "Reset user password",
    description: "Provide the new password (the user will be required to change it again).",
    confirmLabel: "Reset password",
    destructive: true,
  },
  disable: {
    title: "Disable user",
    description: "User cannot sign in until re-enabled.",
    confirmLabel: "Disable",
    destructive: true,
  },
  enable: {
    title: "Enable user",
    description: "Allows the user to sign in.",
    confirmLabel: "Enable",
  },
};

export function UserDetailPage() {
  return (
    <RouteGuard permissions={[Permissions.AdminUsersRead]}>
      <UserDetail />
    </RouteGuard>
  );
}

function UserDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [action, setAction] = React.useState<ActionKind | null>(null);
  const [suspensionUntil, setSuspensionUntil] = React.useState("");
  const [resetPassword, setResetPassword] = React.useState("");

  const userQuery = useQuery({
    queryKey: ["users", id],
    queryFn: () => usersApi.get(id),
    enabled: Boolean(id),
  });

  const refresh = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["users", id] });
    void queryClient.invalidateQueries({ queryKey: ["users"] });
  }, [id, queryClient]);

  const handleAction = async (kind: ActionKind, reason: string) => {
    try {
      switch (kind) {
        case "lock":
          await usersApi.lock(id, { reason });
          break;
        case "unlock":
          await usersApi.unlock(id);
          break;
        case "suspend":
          await usersApi.suspend(id, {
            reason,
            suspensionUntil: suspensionUntil || undefined,
          });
          break;
        case "reactivate":
          await usersApi.reactivate(id);
          break;
        case "deprovision":
          await usersApi.deprovision(id, { reason: reason || undefined });
          break;
        case "delete":
          await usersApi.delete(id);
          toast({ title: "User deleted" });
          router.replace("/identity/users");
          return;
        case "approve-provisioning":
          await usersApi.approveProvisioning(id);
          break;
        case "reject-provisioning":
          await usersApi.rejectProvisioning(id, { reason });
          break;
        case "force-password-change":
          await usersApi.forcePasswordChange(id);
          break;
        case "reset-password": {
          const len = resetPassword.length;
          if (!resetPassword || len < PASSWORD_MIN_LENGTH || len > PASSWORD_MAX_LENGTH) {
            const tooLong = len > PASSWORD_MAX_LENGTH;
            toast({
              variant: "destructive",
              title: tooLong ? "Password too long" : "Password too short",
              description: tooLong
                ? `Maximum length is ${PASSWORD_MAX_LENGTH} characters.`
                : `Minimum length is ${PASSWORD_MIN_LENGTH} characters.`,
            });
            return;
          }
          await usersApi.resetPassword(id, { password: resetPassword });
          setResetPassword("");
          break;
        }
        case "disable":
          await usersApi.setEnabled(id, false);
          break;
        case "enable":
          await usersApi.setEnabled(id, true);
          break;
      }
      toast({ title: "Action complete" });
      setSuspensionUntil("");
      refresh();
    } catch (error) {
      if (handleStepUpOnError(error)) return;
      toast({
        variant: "destructive",
        title: "Action failed",
        description: describeApiError(error),
      });
    }
  };

  const copyResetPasswordToClipboard = async () => {
    const pw = resetPassword.trim();
    if (!pw) {
      toast({
        variant: "destructive",
        title: "Nothing to copy",
        description: "Enter or generate a password first.",
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(pw);
      toast({ title: "Copied", description: "New password copied to clipboard." });
    } catch {
      toast({
        variant: "destructive",
        title: "Copy failed",
        description: "Clipboard access was denied or is unavailable.",
      });
    }
  };

  if (userQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!userQuery.data) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <p className="text-sm text-muted-foreground">User not found.</p>
      </div>
    );
  }

  const user = userQuery.data;
  const isCustomer = user.userType === "CUSTOMER";

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/identity/users">
          <ArrowLeft className="h-4 w-4" /> Back to users
        </Link>
      </Button>
      <PageHeader
        title={user.username}
        description={user.email ?? user.id}
        actions={
          <div className="flex flex-wrap items-center gap-1">
            <Can permissions={[Permissions.AdminUsersWrite]}>
              {user.locked ? (
                <Button variant="outline" size="sm" onClick={() => setAction("unlock")}>
                  <LockOpen className="h-4 w-4" /> Unlock
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setAction("lock")}>
                  <Lock className="h-4 w-4" /> Lock
                </Button>
              )}
              {user.suspended ? (
                <Button variant="outline" size="sm" onClick={() => setAction("reactivate")}>
                  <UserCheck className="h-4 w-4" /> Reactivate
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setAction("suspend")}>
                  <UserX className="h-4 w-4" /> Suspend
                </Button>
              )}
              {user.enabled ? (
                <Button variant="outline" size="sm" onClick={() => setAction("disable")}>
                  <ShieldX className="h-4 w-4" /> Disable
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setAction("enable")}>
                  <ShieldCheck className="h-4 w-4" /> Enable
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAction("force-password-change")}
              >
                <KeyRound className="h-4 w-4" /> Force password change
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAction("reset-password")}
              >
                Reset password
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setAction("deprovision")}
              >
                Deprovision
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setAction("delete")}
              >
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </Can>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
          <CardDescription>Current user state and provisioning posture.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Detail label="Type"><Badge variant="muted">{user.userType}</Badge></Detail>
          <Detail label="Enabled"><StatusBadge status={user.enabled ? "ENABLED" : "DISABLED"} /></Detail>
          <Detail label="Locked"><StatusBadge status={user.locked ? "LOCKED" : "OK"} variantOverride={user.locked ? "destructive" : "muted"} /></Detail>
          <Detail label="Suspended"><StatusBadge status={user.suspended ? "SUSPENDED" : "OK"} variantOverride={user.suspended ? "warning" : "muted"} /></Detail>
          <Detail label="Provisioning"><StatusBadge status={user.provisioningStatus ?? "-"} /></Detail>
          <Detail label="MFA"><StatusBadge status={user.mfaEnabled ? "VERIFIED" : "NOT ENABLED"} variantOverride={user.mfaEnabled ? "success" : "muted"} /></Detail>
          <Detail label="Branch">{user.branchCode ?? "-"}</Detail>
          {!isCustomer ? (
            <>
              <Detail label="Employee ID">{user.employeeId ?? "-"}</Detail>
              <Detail label="GL approval role">{user.glApprovalRole ?? "-"}</Detail>
            </>
          ) : null}
        </CardContent>
        {user.provisioningStatus === "PENDING" ? (
          <CardContent className="flex flex-wrap gap-2 border-t pt-4">
            <Can permissions={[Permissions.AdminUsersWrite]}>
              <Button onClick={() => setAction("approve-provisioning")} variant="success" size="sm">
                Approve provisioning
              </Button>
              <Button
                onClick={() => setAction("reject-provisioning")}
                variant="destructive"
                size="sm"
              >
                Reject provisioning
              </Button>
            </Can>
          </CardContent>
        ) : null}
      </Card>

      <Tabs defaultValue="roles">
        <TabsList>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="access">Access details</TabsTrigger>
        </TabsList>
        <TabsContent value="roles">
          <UserRolesEditor
            userId={id}
            userType={user.userType}
            currentRoles={user.roles ?? []}
          />
        </TabsContent>
        <TabsContent value="access">
          <UserAccessEditor user={user} />
        </TabsContent>
      </Tabs>

      <ConfirmAction
        open={action !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAction(null);
            setSuspensionUntil("");
            setResetPassword("");
          }
        }}
        title={action ? ACTION_CONFIG[action].title : ""}
        description={
          <div className="space-y-2">
            <p>{action ? ACTION_CONFIG[action].description : ""}</p>
            {action === "suspend" ? (
              <div className="space-y-1">
                <Label htmlFor="suspensionUntil" className="text-xs">
                  Suspension until (optional)
                </Label>
                <DateTimeInput
                  id="suspensionUntil"
                  value={suspensionUntil}
                  onChange={setSuspensionUntil}
                />
              </div>
            ) : null}
            {action === "reset-password" ? (
              <div className="space-y-1">
                <Label htmlFor="newPassword" className="text-xs">
                  New password ({PASSWORD_MIN_LENGTH}-{PASSWORD_MAX_LENGTH} chars)
                </Label>
                <div className="flex flex-wrap gap-2">
                  <Input
                    id="newPassword"
                    type="text"
                    autoComplete="off"
                    spellCheck={false}
                    className="min-w-0 flex-1 font-mono text-sm"
                    maxLength={PASSWORD_MAX_LENGTH}
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => setResetPassword(generateBankCompliantPassword())}
                  >
                    Generate
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0"
                    disabled={!resetPassword.trim()}
                    title="Copy password to clipboard"
                    onClick={() => void copyResetPasswordToClipboard()}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        }
        confirmLabel={action ? ACTION_CONFIG[action].confirmLabel : "Confirm"}
        destructive={action ? ACTION_CONFIG[action].destructive : false}
        reasonRequired={action ? ACTION_CONFIG[action].reasonRequired : false}
        onConfirm={async (reason) => {
          if (action) await handleAction(action, reason);
        }}
      />
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm font-medium">{children}</div>
    </div>
  );
}

function UserRolesEditor({
  userId,
  userType,
  currentRoles,
}: {
  userId: string;
  userType: string;
  currentRoles: string[];
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const rolesQuery = useQuery({ queryKey: ["roles"], queryFn: rolesApi.list });
  const [selected, setSelected] = React.useState<string[]>(currentRoles);

  const customerPortalUpper = CUSTOMER_PORTAL_ROLE_NAME.toUpperCase();
  const isCustomer = userType === "CUSTOMER";

  const visibleRoles = React.useMemo(() => {
    const all = rolesQuery.data ?? [];
    if (isCustomer) {
      return all.filter((r) => r.name.toUpperCase() === customerPortalUpper);
    }
    return all.filter((r) => r.name.toUpperCase() !== customerPortalUpper);
  }, [rolesQuery.data, isCustomer, customerPortalUpper]);

  React.useEffect(() => {
    if (isCustomer) {
      setSelected(currentRoles.filter((r) => r.toUpperCase() === customerPortalUpper));
    } else {
      setSelected(currentRoles.filter((r) => r.toUpperCase() !== customerPortalUpper));
    }
  }, [currentRoles, isCustomer, customerPortalUpper]);

  const setRoles = useMutation({
    mutationFn: () => usersApi.setRoles(userId, selected),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", userId] });
      toast({ title: "Roles updated" });
    },
    onError: (error) => {
      if (handleStepUpOnError(error)) return;
      toast({
        variant: "destructive",
        title: "Could not update roles",
        description: describeApiError(error),
      });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Role assignment</CardTitle>
        <CardDescription>
          {isCustomer
            ? `Customer accounts may only hold the ${CUSTOMER_PORTAL_ROLE_NAME} portal role.`
            : `Staff roles (admin portal). The ${CUSTOMER_PORTAL_ROLE_NAME} role is reserved for customer users.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rolesQuery.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : visibleRoles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {isCustomer
              ? `No "${CUSTOMER_PORTAL_ROLE_NAME}" role is defined in the directory. Add it under Identity → Roles, or adjust identity.rbac.customer-portal-role-name on the server.`
              : "No assignable roles returned from the API."}
          </p>
        ) : (
          <div className="grid gap-2 md:grid-cols-3">
            {visibleRoles.map((role) => {
              const checked = selected.includes(role.name);
              return (
                <label
                  key={role.id}
                  className="flex items-start gap-2 rounded-md border px-3 py-2"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(c) => {
                      setSelected((prev) =>
                        c ? Array.from(new Set([...prev, role.name])) : prev.filter((r) => r !== role.name),
                      );
                    }}
                  />
                  <div>
                    <p className="text-sm font-medium">{role.displayName ?? role.name}</p>
                    {role.description ? (
                      <p className="text-xs text-muted-foreground">{role.description}</p>
                    ) : null}
                  </div>
                </label>
              );
            })}
          </div>
        )}
        <Can permissions={[Permissions.AdminUsersWrite]}>
          <Button onClick={() => setRoles.mutate()} loading={setRoles.isPending}>
            Save roles
          </Button>
        </Can>
      </CardContent>
    </Card>
  );
}

function UserAccessEditor({
  user,
}: {
  user: {
    id: string;
    userType?: string;
    email?: string;
    branchCode?: string;
    employeeId?: string;
    glApprovalRole?: string;
    customerPartyId?: string;
    accountExpiresAt?: string;
  };
}) {
  const isCustomer = user.userType === "CUSTOMER";
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [draft, setDraft] = React.useState({
    email: user.email ?? "",
    branchCode: user.branchCode ?? "",
    employeeId: user.employeeId ?? "",
    glApprovalRole: user.glApprovalRole ?? "",
    customerPartyId: user.customerPartyId ?? "",
    accountExpiresAt: user.accountExpiresAt ?? "",
  });

  const update = useMutation({
    mutationFn: () =>
      usersApi.updateAccess(user.id, {
        email: draft.email || undefined,
        branchCode: draft.branchCode || undefined,
        ...(isCustomer
          ? {}
          : {
              employeeId: draft.employeeId || undefined,
              glApprovalRole: draft.glApprovalRole || undefined,
            }),
        customerPartyId: draft.customerPartyId || undefined,
        accountExpiresAt: draft.accountExpiresAt || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", user.id] });
      toast({ title: "Access updated" });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: describeApiError(error),
      });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Access details</CardTitle>
        <CardDescription>Update directory attributes for this account.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <Field label="Email">
          <Input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
        </Field>
        <Field label="Branch code">
          <Input
            value={draft.branchCode}
            onChange={(e) => setDraft({ ...draft, branchCode: e.target.value })}
          />
        </Field>
        {!isCustomer ? (
          <>
            <Field label="Employee ID">
              <Input
                value={draft.employeeId}
                onChange={(e) => setDraft({ ...draft, employeeId: e.target.value })}
              />
            </Field>
            <Field label="GL approval role">
              <Input
                value={draft.glApprovalRole}
                onChange={(e) => setDraft({ ...draft, glApprovalRole: e.target.value })}
              />
            </Field>
          </>
        ) : null}
        <Field label="Customer party ID">
          <Input
            value={draft.customerPartyId}
            onChange={(e) => setDraft({ ...draft, customerPartyId: e.target.value })}
          />
        </Field>
        <Field label="Account expires at">
          <DateTimeInput
            value={draft.accountExpiresAt}
            onChange={(v) => setDraft({ ...draft, accountExpiresAt: v })}
          />
        </Field>
        <div className="md:col-span-2">
          <Can permissions={[Permissions.AdminUsersWrite]}>
            <Button onClick={() => update.mutate()} loading={update.isPending}>
              Save changes
            </Button>
          </Can>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
