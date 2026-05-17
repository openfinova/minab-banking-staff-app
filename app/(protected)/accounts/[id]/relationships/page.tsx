"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, UserPlus, Users } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { CustomerPartyLink } from "@/components/customers/customer-party-link";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";
import {
  accountsApi,
  type AccountPermission,
  type AccountRelationshipResponse,
  type RelationshipType,
} from "@/lib/api/modules/accounts";
import { Permissions } from "@/lib/rbac/permissions";
import {
  ALL_PERMISSIONS,
  RELATIONSHIP_ROLE_LABEL,
  sortRelationshipRows,
} from "@/lib/accounts/relationship-ui";

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

  const [checkUser, setCheckUser] = React.useState("");
  const [checkPerm, setCheckPerm] = React.useState<AccountPermission>("VIEW");

  const list = useQuery({
    queryKey: ["accounts", id, "relationships"],
    queryFn: () => accountsApi.listRelationships(id),
    enabled: Boolean(id),
  });

  const accountDetail = useQuery({
    queryKey: ["accounts", "detail", id],
    queryFn: () => accountsApi.get(id),
    enabled: Boolean(id),
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["accounts", id, "relationships"] });

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

  const rows = sortRelationshipRows(list.data ?? []);
  const accountPrimaryProfileId = accountDetail.data?.primaryUserProfileId;

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
        description={`Co-borrowers, signers, and payout parties linked to this account.`}
        actions={
          <Can permissions={[Permissions.AccountWrite]}>
            <Button size="sm" asChild>
              <Link href={`/accounts/${id}/relationships/add`}>
                <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                Add relationship
              </Link>
            </Button>
            <Button size="sm" variant="secondary" asChild>
              <Link href={`/accounts/${id}/relationships/beneficiary/add`}>
                <Users className="mr-1.5 h-3.5 w-3.5" />
                Add beneficiary
              </Link>
            </Button>
          </Can>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Linked customers</CardTitle>
          <CardDescription>
            Customer (resolved from identity profile id), relationship type, and access. Use the buttons above to add
            rows.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No relationship rows for this account.</p>
          ) : (
            <LinkedCustomersTable
              rows={rows}
              accountPrimaryProfileId={accountPrimaryProfileId}
              remove={remove}
              removeBen={removeBen}
              permsSave={permsSave}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Permission check</CardTitle>
          <CardDescription>
            Enter a staff user profile and permission name to see whether they may act on this account.
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
    </div>
  );
}

function LinkedCustomersTable({
  rows,
  accountPrimaryProfileId,
  remove,
  removeBen,
  permsSave,
}: {
  rows: AccountRelationshipResponse[];
  accountPrimaryProfileId?: string;
  remove: { mutate: (userId: string) => void; isPending: boolean };
  removeBen: { mutate: (userId: string) => void; isPending: boolean };
  permsSave: {
    mutate: (p: { relationshipId: string; permissions: AccountPermission[] }) => void;
    isPending: boolean;
  };
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Customer</TableHead>
          <TableHead>Relationship type</TableHead>
          <TableHead>Beneficiary</TableHead>
          <TableHead>Permissions</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <LinkedCustomerRow
            key={r.id}
            r={r}
            matchesAccountPrimary={Boolean(
              accountPrimaryProfileId && r.userProfileId === accountPrimaryProfileId,
            )}
            onRemove={() => remove.mutate(r.userProfileId)}
            onRemoveBen={() => removeBen.mutate(r.userProfileId)}
            onSavePerms={(perms) => permsSave.mutate({ relationshipId: r.id, permissions: perms })}
            saving={permsSave.isPending}
            removing={remove.isPending}
            removingBen={removeBen.isPending}
          />
        ))}
      </TableBody>
    </Table>
  );
}

interface LinkedCustomerRowProps {
  r: {
    id: string;
    userProfileId: string;
    relationshipType: RelationshipType;
    permissions?: AccountPermission[];
    beneficiary?: boolean;
    isBeneficiary?: boolean;
    beneficiaryPercentage?: string | number;
  };
  matchesAccountPrimary?: boolean;
  onRemove: () => void;
  onRemoveBen: () => void;
  onSavePerms: (perms: AccountPermission[]) => void;
  saving: boolean;
  removing: boolean;
  removingBen: boolean;
}

function LinkedCustomerRow({
  r,
  matchesAccountPrimary = false,
  onRemove,
  onRemoveBen,
  onSavePerms,
  saving,
  removing,
  removingBen,
}: LinkedCustomerRowProps) {
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
      <TableCell>
        <div className="flex max-w-[18rem] flex-col gap-1">
          <CustomerPartyLink profileUserId={r.userProfileId} />
          <span className="break-all font-mono text-[10px] text-muted-foreground">{r.userProfileId}</span>
          {matchesAccountPrimary ? (
            <Badge variant="secondary" className="w-fit whitespace-normal text-left text-[10px] font-normal leading-snug">
              Same profile as Summary primary
            </Badge>
          ) : null}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{RELATIONSHIP_ROLE_LABEL[r.relationshipType]}</span>
          <span className="font-mono text-[10px] text-muted-foreground">{r.relationshipType}</span>
        </div>
      </TableCell>
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
