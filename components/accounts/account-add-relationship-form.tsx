"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { accountsApi, type RelationshipType } from "@/lib/api/modules/accounts";
import {
  REL_TYPES,
  RELATIONSHIP_ADD_HINT,
  RELATIONSHIP_ROLE_LABEL,
} from "@/lib/accounts/relationship-ui";
import { useAuthStore } from "@/lib/auth/auth-store";

export function AccountAddRelationshipForm({ accountId }: { accountId: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { toast } = useToast();
  const username = useAuthStore((s) => s.session?.user.username ?? "operator");
  const [userProfileId, setUserProfileId] = React.useState("");
  const [relType, setRelType] = React.useState<RelationshipType>("AUTHORIZED_USER");
  const [createdBy, setCreatedBy] = React.useState(username);
  React.useEffect(() => {
    setCreatedBy(username);
  }, [username]);

  const add = useMutation({
    mutationFn: () =>
      accountsApi.addRelationship(accountId, {
        userProfileId: userProfileId.trim(),
        relationshipType: relType,
        createdBy: createdBy.trim() || username,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["accounts", accountId, "relationships"] });
      toast({ title: "Relationship added" });
      setUserProfileId("");
      router.push(`/accounts/${accountId}/relationships`);
    },
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "Add failed",
        description: describeApiError(e),
      }),
  });

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Add relationship</CardTitle>
        <CardDescription>POST /api/v1/accounts/{"{"}id{"}"}/relationships</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <CustomerIdentityPicker
          idPrefix="acct-rel-add"
          role="relatedParty"
          profileUserId={userProfileId}
          onProfileUserIdChange={setUserProfileId}
          actionLabel="Use this customer"
        />
        <div className="grid gap-1.5">
          <Label>Type</Label>
          <Select value={relType} onValueChange={(v) => setRelType(v as RelationshipType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REL_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {RELATIONSHIP_ROLE_LABEL[t]} ({t})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {RELATIONSHIP_ADD_HINT[relType] ? (
            <p className="text-xs text-muted-foreground">{RELATIONSHIP_ADD_HINT[relType]}</p>
          ) : null}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="rel-cb">Created by</Label>
          <Input id="rel-cb" value={createdBy} onChange={(e) => setCreatedBy(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={add.isPending || !userProfileId.trim()}
            onClick={() => add.mutate()}
          >
            {add.isPending ? "Adding…" : "Add"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push(`/accounts/${accountId}/relationships`)}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
