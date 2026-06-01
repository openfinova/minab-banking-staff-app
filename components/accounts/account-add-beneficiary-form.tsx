"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-input";
import { CustomerIdentityPicker } from "@/components/accounts/customer-identity-picker";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";
import { accountsApi } from "@/lib/api/modules/accounts";

export function AccountAddBeneficiaryForm({ accountId }: { accountId: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [benUserId, setBenUserId] = React.useState("");
  const [benPct, setBenPct] = React.useState("");
  const [benDesc, setBenDesc] = React.useState("");
  const [benBirth, setBenBirth] = React.useState("");
  const [benFrom, setBenFrom] = React.useState("");
  const [benUntil, setBenUntil] = React.useState("");

  const addBen = useMutation({
    mutationFn: () =>
      accountsApi.addBeneficiary(accountId, {
        userProfileId: benUserId.trim(),
        percentage: Number(benPct),
        relationshipDescription: benDesc.trim() || undefined,
        birthDate: benBirth || undefined,
        effectiveFrom: benFrom ? `${benFrom}T00:00:00` : undefined,
        effectiveUntil: benUntil ? `${benUntil}T00:00:00` : undefined,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["accounts", accountId, "relationships"] });
      toast({ title: "Beneficiary added" });
      setBenUserId("");
      setBenPct("");
      setBenDesc("");
      setBenBirth("");
      setBenFrom("");
      setBenUntil("");
      router.push(`/accounts/${accountId}/relationships`);
    },
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "Beneficiary failed",
        description: describeApiError(e),
      }),
  });

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Add beneficiary</CardTitle>
        <CardDescription>
          Add a beneficiary — allocation across beneficiaries must total at most 100%.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <CustomerIdentityPicker
          idPrefix="acct-ben-add"
          role="relatedParty"
          profileUserId={benUserId}
          onProfileUserIdChange={setBenUserId}
          actionLabel="Use this customer"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="ben-pct">Percentage</Label>
            <Input
              id="ben-pct"
              inputMode="decimal"
              value={benPct}
              onChange={(e) => setBenPct(e.target.value)}
              placeholder="0.01 – 100.00"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ben-desc">Relationship description</Label>
            <Input
              id="ben-desc"
              value={benDesc}
              onChange={(e) => setBenDesc(e.target.value)}
              placeholder="Spouse, child, …"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ben-bd">Birth date</Label>
            <DateInput id="ben-bd" value={benBirth} onChange={setBenBirth} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ben-from">Effective from</Label>
            <DateInput id="ben-from" value={benFrom} onChange={setBenFrom} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ben-until">Effective until</Label>
            <DateInput id="ben-until" value={benUntil} onChange={setBenUntil} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={
              addBen.isPending ||
              !benUserId.trim() ||
              benPct.trim() === "" ||
              Number.isNaN(Number(benPct))
            }
            onClick={() => addBen.mutate()}
          >
            {addBen.isPending ? "Adding…" : "Add beneficiary"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push(`/accounts/${accountId}/relationships`)}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
