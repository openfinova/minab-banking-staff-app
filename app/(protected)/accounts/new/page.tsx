"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { RouteGuard } from "@/components/rbac/route-guard";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CustomerIdentityPicker } from "@/components/accounts/customer-identity-picker";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";
import {
  accountsApi,
  ACCOUNT_NUMBER_REGEX,
  type AccountProductType,
} from "@/lib/api/modules/accounts";
import { Permissions } from "@/lib/rbac/permissions";

const PRODUCT_TYPES: AccountProductType[] = [
  "CHECKING",
  "SAVINGS",
  "MONEY_MARKET",
  "CERTIFICATE_OF_DEPOSIT",
  "CREDIT_LINE",
  "INVESTMENT",
];

export default function NewAccountPage() {
  return (
    <RouteGuard permissions={[Permissions.AccountWrite]}>
      <NewAccountContent />
    </RouteGuard>
  );
}

function NewAccountContent() {
  const router = useRouter();
  const { toast } = useToast();

  const [primaryUserProfileId, setPrimaryUserProfileId] = React.useState("");
  const [productType, setProductType] = React.useState<AccountProductType>("CHECKING");
  const [currency, setCurrency] = React.useState("USD");
  const [accountNumber, setAccountNumber] = React.useState("");

  const normalizedAccountNumber = accountNumber.trim().toUpperCase();
  const accountNumberValid = ACCOUNT_NUMBER_REGEX.test(normalizedAccountNumber);
  const accountNumberError =
    accountNumber.trim().length > 0 && !accountNumberValid
      ? "Use 8–20 uppercase letters or digits (A–Z, 0–9)."
      : null;

  const create = useMutation({
    mutationFn: () =>
      accountsApi.create({
        primaryUserProfileId: primaryUserProfileId.trim(),
        productType,
        currency: currency.trim().toUpperCase(),
        accountNumber: normalizedAccountNumber,
      }),
    onSuccess: (a) => {
      toast({ title: "Account created", description: a.accountNumber });
      router.push(`/accounts/${a.id}`);
    },
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "Create failed",
        description: describeApiError(e),
      }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="New account"
        description="Open a deposit or loan account for the customer's primary digital-banking user — needs account:write."
      />

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>
            Primary holder is the customer’s identity user profile (not a staff user). Link identity on the
            customer record before onboarding if needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CustomerIdentityPicker
            idPrefix="new-acct"
            profileUserId={primaryUserProfileId}
            onProfileUserIdChange={setPrimaryUserProfileId}
            actionLabel="Set as primary holder"
          />
          <div className="grid gap-1.5">
            <Label htmlFor="prod">Product type</Label>
            <Select value={productType} onValueChange={(v) => setProductType(v as AccountProductType)}>
              <SelectTrigger id="prod">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRODUCT_TYPES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ccy">Currency (ISO 4217)</Label>
            <Input
              id="ccy"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              maxLength={3}
              className="uppercase"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="acct-num">Account number</Label>
            <Input
              id="acct-num"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.toUpperCase())}
              maxLength={20}
              className="font-mono uppercase"
              placeholder="e.g. CHK0001ABCD12"
              aria-invalid={accountNumberError != null}
            />
            <p className="text-xs text-muted-foreground">
              Server enforces <code className="text-[10px]">account.number.regex</code> (default{" "}
              <code className="text-[10px]">^[A-Z0-9]{"{"}8,20{"}"}$</code>). Must be unique.
            </p>
            {accountNumberError ? (
              <p className="text-xs text-destructive">{accountNumberError}</p>
            ) : null}
          </div>
          <Button
            type="button"
            disabled={
              create.isPending ||
              !primaryUserProfileId.trim() ||
              currency.trim().length !== 3 ||
              !accountNumberValid
            }
            onClick={() => create.mutate()}
          >
            {create.isPending ? "Creating…" : "Create account"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
