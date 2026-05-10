"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/ui/page-header";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Permissions } from "@/lib/rbac/permissions";
import { usersApi } from "@/lib/api/modules/users";
import { rolesApi } from "@/lib/api/modules/roles";
import { createUserSchema, type CreateUserInput } from "@/lib/schemas/users";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";
import { ApiError } from "@/lib/api/errors";

export default function NewUserPage() {
  return (
    <RouteGuard permissions={[Permissions.AdminUsersWrite]}>
      <NewUserForm />
    </RouteGuard>
  );
}

function NewUserForm() {
  const router = useRouter();
  const { toast } = useToast();
  const rolesQuery = useQuery({ queryKey: ["roles"], queryFn: rolesApi.list });

  const form = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
      userType: "STAFF",
      branchCode: "",
      employeeId: "",
      glApprovalRole: "",
      customerPartyId: "",
      roleNames: [],
      accountExpiresAt: "",
      provisioningEligibilityNotes: "",
    },
  });

  const userType = form.watch("userType");

  const create = useMutation({
    mutationFn: (input: CreateUserInput) =>
      usersApi.create({
        username: input.username,
        password: input.password,
        email: input.email || undefined,
        userType: input.userType,
        branchCode: input.branchCode || undefined,
        employeeId: input.employeeId || undefined,
        glApprovalRole: input.glApprovalRole || undefined,
        customerPartyId: input.customerPartyId || undefined,
        roleNames: input.roleNames?.length ? input.roleNames : undefined,
        accountExpiresAt: input.accountExpiresAt || undefined,
        provisioningEligibilityNotes:
          input.provisioningEligibilityNotes || undefined,
      }),
    onSuccess: (data) => {
      toast({ title: "User created", description: `Created ${data.username}` });
      router.push(`/identity/users/${data.id}`);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          form.setError(field as keyof CreateUserInput, { message });
        }
      }
      toast({
        variant: "destructive",
        title: "Could not create user",
        description: describeApiError(error),
      });
    },
  });

  const selectedRoles = form.watch("roleNames") ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create user"
        description="Provision a new staff or customer account with optional role bindings."
      />
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Account details</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit((v) => create.mutate(v))}>
            <Field label="Username" error={form.formState.errors.username?.message}>
              <Input {...form.register("username")} maxLength={80} />
            </Field>
            <Field label="User type" error={form.formState.errors.userType?.message}>
              <Select
                value={userType}
                onValueChange={(v) => form.setValue("userType", v as CreateUserInput["userType"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STAFF">Staff</SelectItem>
                  <SelectItem value="CUSTOMER">Customer</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Initial password" error={form.formState.errors.password?.message}>
              <Input type="password" autoComplete="new-password" {...form.register("password")} />
            </Field>
            <Field label="Email" error={form.formState.errors.email?.message}>
              <Input type="email" maxLength={150} {...form.register("email")} />
            </Field>
            <Field label="Branch code" error={form.formState.errors.branchCode?.message}>
              <Input {...form.register("branchCode")} placeholder="HQ01" />
            </Field>
            <Field label="Employee ID" error={form.formState.errors.employeeId?.message}>
              <Input {...form.register("employeeId")} />
            </Field>
            <Field label="GL approval role" error={form.formState.errors.glApprovalRole?.message}>
              <Input {...form.register("glApprovalRole")} placeholder="MANAGER" />
            </Field>
            <Field label="Customer party ID" error={form.formState.errors.customerPartyId?.message}>
              <Input {...form.register("customerPartyId")} placeholder="UUID" />
            </Field>
            <Field
              label="Account expires at"
              error={form.formState.errors.accountExpiresAt?.message}
            >
              <Input type="datetime-local" {...form.register("accountExpiresAt")} />
            </Field>
            <Field label="Roles" className="md:col-span-2">
              {rolesQuery.isLoading ? (
                <p className="text-xs text-muted-foreground">Loading roles...</p>
              ) : rolesQuery.data?.length ? (
                <div className="grid gap-2 md:grid-cols-3">
                  {rolesQuery.data.map((role) => {
                    const checked = selectedRoles.includes(role.name);
                    return (
                      <label
                        key={role.id}
                        className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(c) => {
                            const next = c
                              ? Array.from(new Set([...selectedRoles, role.name]))
                              : selectedRoles.filter((r) => r !== role.name);
                            form.setValue("roleNames", next, { shouldDirty: true });
                          }}
                        />
                        <span>{role.displayName ?? role.name}</span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No roles available</p>
              )}
            </Field>
            <Field
              label="Provisioning eligibility notes"
              error={form.formState.errors.provisioningEligibilityNotes?.message}
              className="md:col-span-2"
            >
              <Textarea rows={3} maxLength={2000} {...form.register("provisioningEligibilityNotes")} />
            </Field>
            <div className="md:col-span-2 flex items-center gap-2">
              <Button type="submit" loading={create.isPending}>
                Create user
              </Button>
              <Button type="button" variant="ghost" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
