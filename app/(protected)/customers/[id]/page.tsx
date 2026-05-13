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
import { customersApi, type CustomerStatus } from "@/lib/api/modules/customers";
import { useAuthStore } from "@/lib/auth/auth-store";
import { Permissions } from "@/lib/rbac/permissions";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

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
  const username = useAuthStore((s) => s.session?.user.username ?? "operator");

  const detail = useQuery({
    queryKey: ["customers", "detail", id],
    queryFn: () => customersApi.get(id),
    enabled: Boolean(id),
  });

  const [profileFirst, setProfileFirst] = React.useState("");
  const [profileLast, setProfileLast] = React.useState("");
  const [profileBusiness, setProfileBusiness] = React.useState("");
  const [profileDob, setProfileDob] = React.useState("");
  const [profileTaxId, setProfileTaxId] = React.useState("");
  const [updatedBy, setUpdatedBy] = React.useState(username);
  const [statusDraft, setStatusDraft] = React.useState<CustomerStatus>("PROSPECT");
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  React.useEffect(() => {
    setUpdatedBy(username);
  }, [username]);

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
      customersApi.updateProfile(
        id,
        {
          ...(profileFirst.trim() ? { firstName: profileFirst.trim() } : {}),
          ...(profileLast.trim() ? { lastName: profileLast.trim() } : {}),
          ...(profileBusiness.trim() ? { businessName: profileBusiness.trim() } : {}),
          ...(profileDob.trim() ? { dateOfBirth: profileDob.trim() } : {}),
          ...(profileTaxId.trim() ? { taxId: profileTaxId.trim() } : {}),
        },
        updatedBy.trim() || username,
      ),
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

      <Can permissions={[Permissions.CustomerWrite]}>
        <CustomerExtendedEditor id={id} data={c} />
        <Card>
          <CardHeader>
            <CardTitle>Profile update</CardTitle>
            <CardDescription>{`PUT /api/v1/customers/{id}/profile?updatedBy= — audited profile changes.`}</CardDescription>
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
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="p-by">Updated by</Label>
                <Input id="p-by" value={updatedBy} onChange={(e) => setUpdatedBy(e.target.value)} />
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
            <CardDescription>{`PUT /api/v1/customers/{id}/status?status=`}</CardDescription>
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
            <CardDescription>{`DELETE /api/v1/customers/{id} (server may perform logical delete).`}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)}>
              Delete customer
            </Button>
            <ConfirmAction
              open={deleteOpen}
              onOpenChange={setDeleteOpen}
              title="Delete this customer?"
              description="This calls the administrative delete endpoint. Ensure compliance with retention policy."
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
