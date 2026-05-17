"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Can } from "@/components/rbac/can";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/data/status-badge";
import { ConfirmAction } from "@/components/data/confirm-action";
import { CustomerServicingLinks } from "@/components/customers/customer-servicing-links";
import { CustomerExtendedEditor } from "@/components/customers/customer-extended-editor";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";
import { customersApi, type CustomerAuditEvent, type CustomerStatus } from "@/lib/api/modules/customers";
import { accountsApi } from "@/lib/api/modules/accounts";
import { Permissions } from "@/lib/rbac/permissions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

const STATUSES: CustomerStatus[] = [
  "PROSPECT",
  "ACTIVE",
  "INACTIVE",
  "BLOCKED",
  "DECEASED",
  "CLOSED",
  "ANONYMIZED",
];

export default function CustomerDetailPage() {
  return (
    <RouteGuard permissions={[Permissions.CustomerRead]}>
      <CustomerDetailContent />
    </RouteGuard>
  );
}

function CustomerDetailContent() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const router = useRouter();
  const qc = useQueryClient();
  const { toast } = useToast();

  const detail = useQuery({
    queryKey: ["customers", "detail", id],
    queryFn: () => customersApi.get(id),
    enabled: Boolean(id),
  });

  const [auditPage, setAuditPage] = React.useState(0);
  const linkedPid = detail.data?.linkedIdentityUserId;

  const linkedAccounts = useQuery({
    queryKey: ["customers", "linked-accounts", id, linkedPid],
    queryFn: () =>
      accountsApi.search({
        primaryUserProfileId: linkedPid!,
        page: 0,
        size: 50,
        sort: "createdAt,desc",
      }),
    enabled: Boolean(id && linkedPid),
  });

  const auditTrail = useQuery({
    queryKey: ["customers", "audit", id, auditPage],
    queryFn: () => customersApi.listAuditEvents(id, { page: auditPage, size: 15 }),
    enabled: Boolean(id) && Boolean(detail.data),
  });

  const [profileFirst, setProfileFirst] = React.useState("");
  const [profileLast, setProfileLast] = React.useState("");
  const [profileBusiness, setProfileBusiness] = React.useState("");
  const [profileDob, setProfileDob] = React.useState("");
  const [profileTaxId, setProfileTaxId] = React.useState("");
  const [statusDraft, setStatusDraft] = React.useState<CustomerStatus>("PROSPECT");
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  React.useEffect(() => {
    const c = detail.data;
    if (!c) return;
    setProfileFirst(c.firstName ?? "");
    setProfileLast(c.lastName ?? "");
    setProfileBusiness(c.businessName ?? "");
    setProfileDob(c.dateOfBirth?.slice(0, 10) ?? "");
    setProfileTaxId("");
    setStatusDraft(c.status);
  }, [detail.data]);

  const saveProfile = useMutation({
    mutationFn: () =>
      customersApi.updateProfile(id, {
          ...(profileFirst.trim() ? { firstName: profileFirst.trim() } : {}),
          ...(profileLast.trim() ? { lastName: profileLast.trim() } : {}),
          ...(profileBusiness.trim() ? { businessName: profileBusiness.trim() } : {}),
          ...(profileDob.trim() ? { dateOfBirth: profileDob.trim() } : {}),
          ...(profileTaxId.trim() ? { taxId: profileTaxId.trim() } : {}),
        }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers", "detail", id] });
      qc.invalidateQueries({ queryKey: ["customers", "list"] });
      toast({ title: "Profile updated" });
    },
    onError: (error) =>
      toast({
        variant: "destructive",
        title: "Update failed",
        description: describeApiError(error),
      }),
  });

  const saveStatus = useMutation({
    mutationFn: (status: CustomerStatus) => customersApi.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers", "detail", id] });
      qc.invalidateQueries({ queryKey: ["customers", "list"] });
      toast({ title: "Status updated" });
    },
    onError: (error) =>
      toast({
        variant: "destructive",
        title: "Status update failed",
        description: describeApiError(error),
      }),
  });

  const remove = useMutation({
    mutationFn: () => customersApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers", "list"] });
      toast({ title: "Customer deleted" });
      router.push("/customers/directory");
    },
    onError: (error) =>
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: describeApiError(error),
      }),
  });

  if (!id) {
    return <EmptyState title="Missing id" description="Invalid customer link." />;
  }

  if (detail.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (detail.isError || !detail.data) {
    return (
      <EmptyState
        title="Customer not found"
        description={detail.isError ? describeApiError(detail.error) : undefined}
        action={
          <Button variant="outline" asChild>
            <Link href="/customers/directory">Back to directory</Link>
          </Button>
        }
      />
    );
  }

  const c = detail.data;
  const titleName =
    c.type === "BUSINESS" || c.type === "TRUST"
      ? (c.businessName ?? c.customerNumber)
      : [c.firstName, c.lastName].filter(Boolean).join(" ") || c.customerNumber;

  return (
    <div className="space-y-6">
      <PageHeader
        title={titleName}
        description={
          <span className="flex flex-wrap items-center gap-2 text-muted-foreground">
            <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
              <Link href="/customers/directory">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Directory
              </Link>
            </Button>
            <span className="font-mono text-xs">{c.customerNumber}</span>
            <StatusBadge status={c.status} />
            <StatusBadge status={c.kycStatus} />
            {c.pepFlag ? <StatusBadge status="PEP" variantOverride="warning" /> : null}
            {c.sanctionFlag ? <StatusBadge status="SANCTIONS" variantOverride="destructive" /> : null}
            {c.linkedIdentityUsername ? (
              <span className="text-xs">Login: {c.linkedIdentityUsername}</span>
            ) : null}
          </span>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Servicing</CardTitle>
          <CardDescription>Jump to nested resources for this customer id.</CardDescription>
        </CardHeader>
        <CardContent>
          <CustomerServicingLinks customerId={id} />
        </CardContent>
      </Card>

      <Card id="customer-bank-accounts" className="scroll-mt-24">
        <CardHeader>
          <CardTitle>Accounts as primary holder</CardTitle>
          <CardDescription>
            Accounts where this party is recorded as primary (identity-linked user matches this customer&apos;s banking
            profile).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!linkedPid ? (
            <p className="text-sm text-muted-foreground">
              This customer record is not linked to an identity user yet — onboarding may still attach the profile user
              id.
            </p>
          ) : linkedAccounts.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading accounts…</p>
          ) : linkedAccounts.isError ? (
            <p className="text-sm text-destructive">{describeApiError(linkedAccounts.error)}</p>
          ) : !(linkedAccounts.data?.content ?? []).length ? (
            <p className="text-sm text-muted-foreground">No accounts found as primary holder for this linkage.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(linkedAccounts.data?.content ?? []).map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">
                      <Link href={`/accounts/${a.id}`} className="text-primary hover:underline">
                        {a.accountNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{a.productType}</TableCell>
                    <TableCell>
                      <StatusBadge status={a.status} />
                    </TableCell>
                    <TableCell className="text-right text-sm">{a.currency}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile audit trail</CardTitle>
          <CardDescription>
            Immutable ledger of profile and servicing changes. Sensitive attributes may appear masked depending on your
            entitlements.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {auditTrail.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading audit events…</p>
          ) : auditTrail.isError ? (
            <p className="text-sm text-destructive">{describeApiError(auditTrail.error)}</p>
          ) : !(auditTrail.data?.content ?? []).length ? (
            <p className="text-sm text-muted-foreground">No audit events indexed for this customer.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Field</TableHead>
                    <TableHead>From → To</TableHead>
                    <TableHead>Actor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(auditTrail.data?.content ?? []).map((ev: CustomerAuditEvent) => (
                    <TableRow key={ev.id}>
                      <TableCell className="font-mono text-xs whitespace-nowrap">
                        {ev.changedAt ? formatDateTime(ev.changedAt) : "—"}
                      </TableCell>
                      <TableCell className="text-xs">{ev.action ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{ev.fieldName ?? "—"}</TableCell>
                      <TableCell className="max-w-[14rem] truncate text-xs">
                        {(ev.oldValue ?? "—").toString()} → {(ev.newValue ?? "—").toString()}
                        {ev.valueMasked ? (
                          <span className="ml-1 rounded bg-muted px-1 py-0.5 text-[10px] uppercase">Masked</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-xs">{ev.changedBy ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>
                  Page {(auditTrail.data?.number ?? auditPage) + 1}
                  {auditTrail.data?.totalPages != null ? ` · ${auditTrail.data.totalPages} pages` : null}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={auditPage <= 0}
                  onClick={() => setAuditPage((p) => Math.max(0, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={
                    auditTrail.data?.totalPages != null && auditPage >= (auditTrail.data.totalPages ?? 1) - 1
                  }
                  onClick={() => setAuditPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Can permissions={[Permissions.CustomerWrite]}>
        <CustomerExtendedEditor id={id} data={c} />
        <Card>
          <CardHeader>
            <CardTitle>Profile update</CardTitle>
            <CardDescription>Adjust profile names, identifiers, and demographics — saves are audited.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 max-w-xl">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="p-fn">First name</Label>
                <Input id="p-fn" value={profileFirst} onChange={(e) => setProfileFirst(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="p-ln">Last name</Label>
                <Input id="p-ln" value={profileLast} onChange={(e) => setProfileLast(e.target.value)} />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="p-bn">Business name</Label>
                <Input
                  id="p-bn"
                  value={profileBusiness}
                  onChange={(e) => setProfileBusiness(e.target.value)}
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="p-dob">Date of birth</Label>
                <DateInput id="p-dob" value={profileDob} onChange={setProfileDob} />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="p-tax">Tax ID (only if changing)</Label>
                <Input
                  id="p-tax"
                  value={profileTaxId}
                  onChange={(e) => setProfileTaxId(e.target.value)}
                  placeholder="Leave blank to keep existing"
                />
              </div>
            </div>
            <Button type="button" disabled={saveProfile.isPending} onClick={() => saveProfile.mutate()}>
              {saveProfile.isPending ? "Saving…" : "Save profile"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lifecycle status</CardTitle>
            <CardDescription>Move the party through active, dormant, suspended, closed, … with an audit reason.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3 max-w-md">
            <div className="grid flex-1 gap-2 min-w-[12rem]">
              <Label>Status</Label>
              <Select value={statusDraft} onValueChange={(v) => setStatusDraft(v as CustomerStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={saveStatus.isPending || statusDraft === c.status}
              onClick={() => saveStatus.mutate(statusDraft)}
            >
              Apply
            </Button>
          </CardContent>
        </Card>

        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-destructive">Danger zone</CardTitle>
            <CardDescription>Retire the party when duplicates or closures demand it — server policy may logical-delete.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)}>
              Delete customer
            </Button>
            <ConfirmAction
              open={deleteOpen}
              onOpenChange={setDeleteOpen}
              title="Delete this customer?"
              description="This permanently retires the customer subject to policy and retention rules."
              destructive
              confirmLabel="Delete"
              onConfirm={async () => {
                await remove.mutateAsync();
              }}
            />
          </CardContent>
        </Card>
      </Can>
    </div>
  );
}
