"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { DateTimeInput } from "@/components/ui/datetime-input";
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
import { CustomerQuickLookup } from "@/components/customers/customer-quick-lookup";
import type { CustomerResponse } from "@/lib/api/modules/customers";
import { usersApi, type UserDetail } from "@/lib/api/modules/users";
import { rolesApi } from "@/lib/api/modules/roles";
import {
  createUserSchema,
  CUSTOMER_PORTAL_ROLE_NAME,
  type CreateUserInput,
} from "@/lib/schemas/users";
import {
  generateBankCompliantPassword,
  PASSWORD_MAX_LENGTH,
} from "@/lib/schemas/password-policy";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError, ApiError } from "@/lib/api/errors";
import { handleStepUpOnError } from "@/lib/auth/step-up";

export interface CreateUserFormProps {
  /** When set: always CUSTOMER, party id fixed; omit user-type and party inputs. */
  fixedCustomerPartyId?: string;
  onSuccess?: (user: UserDetail) => void;
  /** Omit default navigate to `/identity/users/:id` (e.g. customer page handles UX). */
  skipNavigateOnSuccess?: boolean;
  /** Compact footer + optional cancel (e.g. inside a dialog). */
  onCancel?: () => void;
  submitLabel?: string;
}

export function CreateUserForm({
  fixedCustomerPartyId,
  onSuccess,
  skipNavigateOnSuccess,
  onCancel,
  submitLabel = "Create user",
}: CreateUserFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pickedCustomerSummary, setPickedCustomerSummary] = React.useState<string | null>(null);

  const form = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
      userType: fixedCustomerPartyId ? "CUSTOMER" : "STAFF",
      branchCode: "",
      employeeId: "",
      glApprovalRole: "",
      customerPartyId: fixedCustomerPartyId ?? "",
      roleNames: fixedCustomerPartyId ? [CUSTOMER_PORTAL_ROLE_NAME] : [],
      accountExpiresAt: "",
      provisioningEligibilityNotes: "",
    },
  });

  const userType = form.watch("userType");
  const selectedRoles = form.watch("roleNames") ?? [];
  const passwordDraft = form.watch("password");
  const partyIdWatch = form.watch("customerPartyId");

  React.useEffect(() => {
    if (!partyIdWatch?.trim()) {
      setPickedCustomerSummary(null);
    }
  }, [partyIdWatch]);

  const rolesQuery = useQuery({
    queryKey: ["roles"],
    queryFn: rolesApi.list,
    enabled: userType === "STAFF" && !fixedCustomerPartyId,
  });

  React.useEffect(() => {
    if (fixedCustomerPartyId) {
      form.setValue("userType", "CUSTOMER");
      form.setValue("customerPartyId", fixedCustomerPartyId);
      form.setValue("roleNames", [CUSTOMER_PORTAL_ROLE_NAME]);
      form.setValue("employeeId", "");
      form.setValue("glApprovalRole", "");
    }
  }, [fixedCustomerPartyId, form]);

  const create = useMutation({
    mutationFn: (input: CreateUserInput) => usersApi.create(buildCreateBody(input)),
    onSuccess: (data) => {
      toast({ title: "User created", description: `Created ${data.username}` });
      onSuccess?.(data);
      if (!skipNavigateOnSuccess) {
        router.push(`/identity/users/${data.id}`);
      }
    },
    onError: (error) => {
      if (handleStepUpOnError(error)) return;
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

  const copyPasswordToClipboard = async () => {
    const pw = form.getValues("password").trim();
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
      toast({ title: "Copied", description: "Initial password copied to clipboard." });
    } catch {
      toast({
        variant: "destructive",
        title: "Copy failed",
        description: "Clipboard access was denied or is unavailable.",
      });
    }
  };

  return (
    <form
      className="grid gap-4 md:grid-cols-2"
      onSubmit={form.handleSubmit((v) => create.mutate(v))}
    >
      {fixedCustomerPartyId ? (
        <Field label="User type" className="md:col-span-2">
          <p className="text-sm text-muted-foreground">
            Customer login — party{" "}
            <span className="font-mono text-xs">{fixedCustomerPartyId}</span>
          </p>
        </Field>
      ) : (
        <Field label="User type" error={form.formState.errors.userType?.message} className="md:col-span-2">
          <Select
            value={userType}
            onValueChange={(v) => {
              const next = v as CreateUserInput["userType"];
              form.setValue("userType", next, { shouldValidate: true });
              if (next === "STAFF") {
                form.setValue("customerPartyId", "");
                form.setValue("roleNames", []);
                setPickedCustomerSummary(null);
              } else {
                form.setValue("employeeId", "");
                form.setValue("glApprovalRole", "");
                form.setValue("roleNames", [CUSTOMER_PORTAL_ROLE_NAME]);
              }
            }}
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
      )}

      <Field label="Username" error={form.formState.errors.username?.message}>
        <Input {...form.register("username")} maxLength={80} autoComplete="off" />
      </Field>
      <Field label="Initial password" error={form.formState.errors.password?.message}>
        <div className="flex flex-wrap gap-2">
          <Input
            type="text"
            autoComplete="off"
            spellCheck={false}
            maxLength={PASSWORD_MAX_LENGTH}
            className="flex-1 font-mono text-sm"
            {...form.register("password")}
          />
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            disabled={create.isPending}
            title="Generate a random password (length, upper, lower, digit, special — identity defaults)"
            onClick={() =>
              form.setValue("password", generateBankCompliantPassword(), {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
          >
            Generate
          </Button>
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            disabled={create.isPending || !passwordDraft?.trim()}
            title="Copy password to clipboard"
            onClick={() => void copyPasswordToClipboard()}
          >
            Copy
          </Button>
        </div>
      </Field>
      <Field label="Email" error={form.formState.errors.email?.message}>
        <Input type="email" maxLength={150} {...form.register("email")} />
      </Field>
      <Field label="Branch code" error={form.formState.errors.branchCode?.message}>
        <Input {...form.register("branchCode")} placeholder="HQ01" />
      </Field>

      {userType === "STAFF" ? (
        <>
          <Field label="Employee ID" error={form.formState.errors.employeeId?.message}>
            <Input {...form.register("employeeId")} />
          </Field>
          <Field label="GL approval role" error={form.formState.errors.glApprovalRole?.message}>
            <Input {...form.register("glApprovalRole")} placeholder="MANAGER" />
          </Field>
        </>
      ) : null}

      {userType === "CUSTOMER" && !fixedCustomerPartyId ? (
        <Field
          label="Link to customer"
          error={form.formState.errors.customerPartyId?.message}
          className="md:col-span-2"
        >
          <input type="hidden" {...form.register("customerPartyId")} />
          <div className="space-y-3">
            {partyIdWatch?.trim() ? (
              <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Selected:</span>
                <span className="font-medium">{pickedCustomerSummary ?? partyIdWatch}</span>
                <span className="font-mono text-xs text-muted-foreground">{partyIdWatch}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-8"
                  disabled={create.isPending}
                  onClick={() => {
                    form.setValue("customerPartyId", "", { shouldValidate: true, shouldDirty: true });
                    setPickedCustomerSummary(null);
                  }}
                >
                  Clear
                </Button>
              </div>
            ) : null}
            <CustomerQuickLookup
              onPickCustomer={(c) => {
                form.setValue("customerPartyId", c.id, { shouldValidate: true, shouldDirty: true });
                setPickedCustomerSummary(customerDirectoryLabel(c));
              }}
              actionLabel="Use"
              helperText="Search by number, name, email, phone, or UUID. Optional — leave unset to create a customer login without linking a party yet."
            />
          </div>
        </Field>
      ) : null}

      {userType === "CUSTOMER" ? (
        <Field label="Role" className="md:col-span-2">
          <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
            <span className="font-medium">{CUSTOMER_PORTAL_ROLE_NAME}</span>
            <span className="text-muted-foreground"> — required for all customer portal logins</span>
          </p>
        </Field>
      ) : (
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
      )}

      <Field label="Account expires at" error={form.formState.errors.accountExpiresAt?.message}>
        <DateTimeInput value={form.watch("accountExpiresAt") ?? ""} onChange={(v) => form.setValue("accountExpiresAt", v, { shouldValidate: true })} />
      </Field>
      <div />
      <Field
        label="Provisioning eligibility notes"
        error={form.formState.errors.provisioningEligibilityNotes?.message}
        className="md:col-span-2"
      >
        <Textarea rows={3} maxLength={2000} {...form.register("provisioningEligibilityNotes")} />
      </Field>

      <div className="md:col-span-2 flex flex-wrap items-center gap-2">
        <Button type="submit" loading={create.isPending}>
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={create.isPending}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function buildCreateBody(values: CreateUserInput) {
  if (values.userType === "CUSTOMER") {
    return {
      username: values.username.trim(),
      password: values.password,
      email: values.email?.trim() ? values.email.trim() : undefined,
      userType: "CUSTOMER" as const,
      branchCode: values.branchCode?.trim() || undefined,
      customerPartyId:
        (values.customerPartyId ?? "").trim() || undefined,
      roleNames: [CUSTOMER_PORTAL_ROLE_NAME],
      accountExpiresAt: values.accountExpiresAt?.trim() || undefined,
      provisioningEligibilityNotes: values.provisioningEligibilityNotes?.trim() || undefined,
    };
  }
  return {
    username: values.username.trim(),
    password: values.password,
    email: (values.email ?? "").trim(),
    userType: "STAFF" as const,
    branchCode: values.branchCode?.trim() || undefined,
    employeeId: values.employeeId?.trim() || undefined,
    glApprovalRole: values.glApprovalRole?.trim() || undefined,
    roleNames: values.roleNames?.length ? values.roleNames : undefined,
    accountExpiresAt: values.accountExpiresAt?.trim() || undefined,
    provisioningEligibilityNotes: values.provisioningEligibilityNotes?.trim() || undefined,
  };
}

function customerDirectoryLabel(c: CustomerResponse): string {
  const label =
    c.type === "BUSINESS" || c.type === "TRUST"
      ? (c.businessName ?? c.customerNumber)
      : [c.firstName, c.lastName].filter(Boolean).join(" ") || c.customerNumber;
  return `${c.customerNumber} — ${label}`;
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
