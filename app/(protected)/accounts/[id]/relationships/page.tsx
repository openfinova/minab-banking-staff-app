"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Can } from "@/components/rbac/can";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DateInput } from "@/components/ui/date-input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { CustomerIdentityPicker } from "@/components/accounts/customer-identity-picker";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";
import {
  accountsApi,
  type AccountPermission,
  type RelationshipType,
} from "@/lib/api/modules/accounts";
import { useAuthStore } from "@/lib/auth/auth-store";
import { Permissions } from "@/lib/rbac/permissions";

const REL_TYPES: RelationshipType[] = [
  "PRIMARY_HOLDER",
  "SECONDARY_HOLDER",
  "AUTHORIZED_USER",
  "BENEFICIARY",
  "GUARDIAN",
];

const ALL_PERMISSIONS: AccountPermission[] = ["VIEW", "TRANSACT", "MANAGE", "ADMIN"];

export default function AccountRelationshipsPage() {
  return (
    <RouteGuard permissions={[Permissions.AccountRead]}>
      <AccountRelationshipsContent />
    </RouteGuard>
  );
}

function AccountRelationshipsContent() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const qc = useQueryClient();
  const { toast } = useToast();
  const username = useAuthStore((s) => s.session?.user.username ?? "operator");

  const [userProfileId, setUserProfileId] = React.useState("");
  const [relType, setRelType] = React.useState<RelationshipType>("AUTHORIZED_USER");
  const [createdBy, setCreatedBy] = React.useState(username);
  React.useEffect(() => {
    setCreatedBy(username);
  }, [username]);

  const [benUserId, setBenUserId] = React.useState("");
  const [benPct, setBenPct] = React.useState("");
  const [benDesc, setBenDesc] = React.useState("");
  const [benBirth, setBenBirth] = React.useState("");
  const [benFrom, setBenFrom] = React.useState("");
  const [benUntil, setBenUntil] = React.useState("");

  const [checkUser, setCheckUser] = React.useState("");
  const [checkPerm, setCheckPerm] = React.useState<AccountPermission>("VIEW");

  const list = useQuery({
    queryKey: ["accounts", id, "relationships"],
    queryFn: () => accountsApi.listRelationships(id),
    enabled: Boolean(id),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["accounts", id, "relationships"] });

  const add = useMutation({
    mutationFn: () =>
      accountsApi.addRelationship(id, {
        userProfileId: userProfileId.trim(),
        relationshipType: relType,
        createdBy: createdBy.trim() || username,
      }),
    onSuccess: () => {
      invalidate();
      toast({ title: "Relationship added" });
      setUserProfileId("");
    },
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "Add failed",
        description: describeApiError(e),
      }),
  });

  const remove = useMutation({
    mutationFn: (userId: string) => accountsApi.removeRelationship(id, userId),
    onSuccess: () => {
      invalidate();
      toast({ title: "Removed" });
    },
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "Remove failed",
        description: describeApiError(e),
      }),
  });

  const addBen = useMutation({
    mutationFn: () =>
      accountsApi.addBeneficiary(id, {
        userProfileId: benUserId.trim(),
        percentage: Number(benPct),
        relationshipDescription: benDesc.trim() || undefined,
        birthDate: benBirth || undefined,
        effectiveFrom: benFrom ? `${benFrom}T00:00:00` : undefined,
        effectiveUntil: benUntil ? `${benUntil}T00:00:00` : undefined,
        createdBy: createdBy.trim() || username,
      }),
    onSuccess: () => {
      invalidate();
      toast({ title: "Beneficiary added" });
      setBenUserId("");
      setBenPct("");
      setBenDesc("");
      setBenBirth("");
      setBenFrom("");
      setBenUntil("");
    },
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "Beneficiary failed",
        description: describeApiError(e),
      }),
  });

  const removeBen = useMutation({
    mutationFn: (userId: string) => accountsApi.removeBeneficiary(id, userId),
    onSuccess: () => {
      invalidate();
      toast({ title: "Beneficiary removed" });
    },
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "Remove failed",
        description: describeApiError(e),
      }),
  });

  const permsSave = useMutation({
    mutationFn: (p: { relationshipId: string; permissions: AccountPermission[] }) =>
      accountsApi.updateRelationshipPermissions(p.relationshipId, p.permissions),
    onSuccess: () => {
      invalidate();
      toast({ title: "Permissions saved" });
    },
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "Save failed",
        description: describeApiError(e),
      }),
  });

  const check = useMutation({
    mutationFn: () => accountsApi.checkPermission(id, checkUser.trim(), checkPerm),
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "Check failed",
        description: describeApiError(e),
      }),
  });

  if (!id) {
    return <EmptyState title="Missing account id" />;
  }

  if (list.isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (list.isError) {
    return (
      <EmptyState title="Could not load relationships" description={describeApiError(list.error)} />
    );
  }

  const rows = list.data ?? [];

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/accounts/${id}`}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Account
        </Link>
      </Button>

      <PageHeader
        title="Relationships"
        description={`Parties linked to this account — GET /api/v1/accounts/${id}/relationships`}
      />

      <Can permissions={[Permissions.AccountWrite]}>
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Add relationship</CardTitle>
            <CardDescription>POST /api/v1/accounts/{"{"}id{"}"}/relationships</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <CustomerIdentityPicker
              idPrefix="acct-rel"
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
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="rel-cb">Created by</Label>
              <Input id="rel-cb" value={createdBy} onChange={(e) => setCreatedBy(e.target.value)} />
            </div>
            <Button
              type="button"
              disabled={add.isPending || !userProfileId.trim()}
              onClick={() => add.mutate()}
            >
              {add.isPending ? "Adding…" : "Add"}
            </Button>
          </CardContent>
        </Card>
      </Can>

      <Can permissions={[Permissions.AccountWrite]}>
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Add beneficiary</CardTitle>
            <CardDescription>
              POST /api/v1/accounts/{"{"}id{"}"}/beneficiaries — allocation must sum to ≤ 100%.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <CustomerIdentityPicker
              idPrefix="acct-ben"
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
          </CardContent>
        </Card>
      </Can>

      <Card>
        <CardHeader>
          <CardTitle>Permission check</CardTitle>
          <CardDescription>
            POST /permissions/check?userProfileId=&amp;permission= — validates whether a user can perform an
            action on this account.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="chk-user">User profile id</Label>
            <Input
              id="chk-user"
              className="w-[22rem] font-mono text-xs"
              value={checkUser}
              onChange={(e) => setCheckUser(e.target.value.trim())}
              placeholder="xxxxxxxx-xxxx-…"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Permission</Label>
            <Select value={checkPerm} onValueChange={(v) => setCheckPerm(v as AccountPermission)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_PERMISSIONS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={check.isPending || !checkUser.trim()}
            onClick={() => check.mutate()}
          >
            {check.isPending ? "Checking…" : "Run check"}
          </Button>
          {check.data ? (
            <p className={`text-sm ${check.data.valid ? "text-emerald-600" : "text-destructive"}`}>
              {check.data.valid ? "Allowed" : "Denied"}
              {check.data.message ? ` — ${check.data.message}` : ""}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Linked users</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No relationships recorded.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User profile</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Beneficiary</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <RelationshipRow
                    key={r.id}
                    r={r}
                    onRemove={() => remove.mutate(r.userProfileId)}
                    onRemoveBen={() => removeBen.mutate(r.userProfileId)}
                    onSavePerms={(perms) =>
                      permsSave.mutate({ relationshipId: r.id, permissions: perms })
                    }
                    saving={permsSave.isPending}
                    removing={remove.isPending}
                    removingBen={removeBen.isPending}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface RelationshipRowProps {
  r: {
    id: string;
    userProfileId: string;
    relationshipType: RelationshipType;
    permissions?: AccountPermission[];
    beneficiary?: boolean;
    isBeneficiary?: boolean;
    beneficiaryPercentage?: string | number;
  };
  onRemove: () => void;
  onRemoveBen: () => void;
  onSavePerms: (perms: AccountPermission[]) => void;
  saving: boolean;
  removing: boolean;
  removingBen: boolean;
}

function RelationshipRow({
  r,
  onRemove,
  onRemoveBen,
  onSavePerms,
  saving,
  removing,
  removingBen,
}: RelationshipRowProps) {
  const isBen = r.isBeneficiary ?? r.beneficiary ?? false;
  const [draft, setDraft] = React.useState<Set<AccountPermission>>(
    () => new Set(r.permissions ?? []),
  );
  const toggle = (p: AccountPermission) => {
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };
  const original = React.useMemo(
    () => new Set(r.permissions ?? []),
    [r.permissions],
  );
  const dirty =
    draft.size !== original.size || Array.from(draft).some((p) => !original.has(p));

  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{r.userProfileId}</TableCell>
      <TableCell>{r.relationshipType}</TableCell>
      <TableCell>
        {isBen ? (
          <span>
            Yes{" "}
            {r.beneficiaryPercentage != null
              ? `(${Number(r.beneficiaryPercentage).toFixed(2)}%)`
              : ""}
          </span>
        ) : (
          "No"
        )}
      </TableCell>
      <TableCell>
        <Can
          permissions={[Permissions.AccountWrite]}
          fallback={
            <span className="text-xs text-muted-foreground">
              {(r.permissions ?? []).join(", ") || "—"}
            </span>
          }
        >
          <div className="flex flex-wrap items-center gap-2">
            {ALL_PERMISSIONS.map((p) => (
              <label key={p} className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={draft.has(p)}
                  onChange={() => toggle(p)}
                  className="h-3.5 w-3.5"
                />
                {p}
              </label>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!dirty || saving || draft.size === 0}
              onClick={() => onSavePerms(Array.from(draft))}
            >
              Save
            </Button>
          </div>
        </Can>
      </TableCell>
      <TableCell className="text-right">
        <Can permissions={[Permissions.AccountWrite]}>
          <div className="flex justify-end gap-1">
            {isBen ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive"
                disabled={removingBen}
                onClick={onRemoveBen}
              >
                Remove beneficiary
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              disabled={removing}
              onClick={onRemove}
            >
              Remove
            </Button>
          </div>
        </Can>
      </TableCell>
    </TableRow>
  );
}
