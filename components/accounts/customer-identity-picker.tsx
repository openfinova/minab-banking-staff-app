"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CustomerQuickLookup } from "@/components/customers/customer-quick-lookup";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/auth/auth-provider";
import { Permissions } from "@/lib/rbac/permissions";
import type { CustomerResponse } from "@/lib/api/modules/customers";

export type CustomerIdentityPickerProps = {
  /** Identity user profile UUID used by `/api/v1/accounts` (primary holder or related party). */
  profileUserId: string;
  onProfileUserIdChange: (uuid: string) => void;
  /** Row action label in the lookup table. */
  actionLabel?: string;
  /** Prefix for generated ids (e.g. `new-acct` → `new-acct-fallback-uuid`). */
  idPrefix?: string;
  /** "primaryHolder" (new account) vs "relatedParty" (account relationship) vs "filter" (directory). */
  role?: "primaryHolder" | "relatedParty" | "filter";
};

/**
 * Accounts are owned by **customers** via their linked digital-banking identity user
 * (`CustomerResponse.linkedIdentityUserId`), not staff directory records.
 */
export function CustomerIdentityPicker({
  profileUserId,
  onProfileUserIdChange,
  actionLabel = "Use this customer",
  idPrefix = "cust-id",
  role = "primaryHolder",
}: CustomerIdentityPickerProps) {
  const { toast } = useToast();
  const { can } = useAuth();
  const canSearchCustomers = can([Permissions.CustomerRead]);

  const onPick = React.useCallback(
    (c: CustomerResponse) => {
      const linked = c.linkedIdentityUserId?.trim();
      if (!linked) {
        toast({
          variant: "destructive",
          title: "No linked identity user",
          description: `Customer ${c.customerNumber} has no digital banking login linked. Open the customer record and link identity first.`,
        });
        return;
      }
      onProfileUserIdChange(linked);
    },
    [onProfileUserIdChange, toast],
  );

  const manualLabel =
    role === "relatedParty"
      ? "Identity user id (related customer)"
      : role === "filter"
        ? "Primary holder identity user id (optional filter)"
        : "Identity user id (primary holder)";
  const manualDescription =
    role === "relatedParty"
      ? "Pick a customer below to use their linked identity user, or paste the UUID."
      : role === "filter"
        ? "Narrow the list by the customer’s linked digital banking user, or paste their identity user UUID."
        : "Search for a customer below to fill this from linkedIdentityUserId, or paste the UUID if you already know it.";

  return (
    <div className="space-y-3">
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-manual`}>{manualLabel}</Label>
        <p className="text-xs text-muted-foreground">{manualDescription}</p>
        <Input
          id={`${idPrefix}-manual`}
          className="font-mono text-xs"
          value={profileUserId}
          onChange={(e) => onProfileUserIdChange(e.target.value.trim())}
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          autoComplete="off"
        />
        {profileUserId ? (
          <Button type="button" variant="ghost" size="sm" className="h-8 w-fit px-2 text-xs" onClick={() => onProfileUserIdChange("")}>
            Clear
          </Button>
        ) : null}
      </div>

      {canSearchCustomers ? (
        <CustomerQuickLookup
          onPickCustomer={onPick}
          actionLabel={actionLabel}
          helperText="Customers only — matches GET /api/v1/customers. Pick a row to set the identity user from the customer's linked digital banking login."
        />
      ) : (
        <p className="text-xs text-muted-foreground">
          Customer directory search requires the <code className="text-[10px]">customer:read</code>{" "}
          permission. Paste the primary holder's identity user UUID above, or open Customers to look up{" "}
          <code className="text-[10px]">linkedIdentityUserId</code>.
        </p>
      )}
    </div>
  );
}
