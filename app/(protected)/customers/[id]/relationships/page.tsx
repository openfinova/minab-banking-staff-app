"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CopyableUuid } from "@/components/data/copyable-uuid";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";
import {
  customerRelationshipsApi,
  type CustomerRelationshipType,
} from "@/lib/api/modules/customers";
import { Permissions } from "@/lib/rbac/permissions";
import { CustomerQuickLookup } from "@/components/customers/customer-quick-lookup";

const REL_TYPES: CustomerRelationshipType[] = [
  "SPOUSE",
  "BUSINESS_PARTNER",
  "PARENT",
  "CHILD",
  "SIBLING",
  "AUTHORIZED_USER",
  "POWER_OF_ATTORNEY",
  "BENEFICIARY",
  "GUARDIAN",
  "CORPORATE_OFFICER",
];

function otherCustomerId(
  rel: {
    relatedCustomer?: { id?: string } | null;
    primaryCustomer?: { id?: string } | null;
  },
  customerId: string,
): string {
  const p =
    rel.primaryCustomer && typeof rel.primaryCustomer === "object" && "id" in rel.primaryCustomer
      ? rel.primaryCustomer.id
      : undefined;
  const r =
    rel.relatedCustomer && typeof rel.relatedCustomer === "object" && "id" in rel.relatedCustomer
      ? rel.relatedCustomer.id
      : undefined;
  if (p === customerId) return r ?? "—";
  if (r === customerId) return p ?? "—";
  return r ?? p ?? "—";
}

export default function CustomerRelationshipsPage() {
  return (
    <RouteGuard permissions={[Permissions.CustomerRead]}>
      <CustomerRelationshipsContent />
    </RouteGuard>
  );
}

function CustomerRelationshipsContent() {
  const params = useParams();
  const customerId = typeof params?.id === "string" ? params.id : "";
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [relatedIdInput, setRelatedIdInput] = React.useState("");
  const [relType, setRelType] = React.useState<CustomerRelationshipType>("SPOUSE");

  const list = useQuery({
    queryKey: ["customers", customerId, "relationships"],
    queryFn: () => customerRelationshipsApi.list(customerId),
    enabled: Boolean(customerId),
  });

  const create = useMutation({
    mutationFn: () =>
      customerRelationshipsApi.create(customerId, {
        relatedCustomerId: relatedIdInput.trim(),
        relationshipType: relType,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers", customerId, "relationships"] });
      toast({ title: "Relationship created" });
      setRelatedIdInput("");
      setOpen(false);
    },
    onError: (e) =>
      toast({ variant: "destructive", title: "Create failed", description: describeApiError(e) }),
  });

  const remove = useMutation({
    mutationFn: (p: { relationshipId: string }) =>
      customerRelationshipsApi.remove(customerId, p.relationshipId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers", customerId, "relationships"] });
      toast({ title: "Relationship removed" });
    },
    onError: (e) =>
      toast({ variant: "destructive", title: "Remove failed", description: describeApiError(e) }),
  });

  if (!customerId) {
    return <EmptyState title="Missing customer id" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relationships"
        description={
          <span className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/customers/${customerId}`}>Back to customer</Link>
            </Button>
            <span className="text-muted-foreground text-sm">Counterparties, shareholders, and other linked parties.</span>
          </span>
        }
        actions={
          <Can permissions={[Permissions.CustomerWrite]}>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button type="button">Link customer</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create relationship</DialogTitle>
                  <DialogDescription>
                    Pick the related customer UUID and relationship category. The signed-in operator is recorded on
                    the server.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 py-2">
                  <div className="grid gap-2">
                    <Label htmlFor="rid">Related customer</Label>
                    <Input
                      id="rid"
                      className="font-mono text-sm"
                      value={relatedIdInput}
                      onChange={(e) => setRelatedIdInput(e.target.value)}
                      placeholder="UUID — or search below and choose Use"
                    />
                  </div>
                  <CustomerQuickLookup
                    onPickCustomer={(c) => setRelatedIdInput(c.id)}
                    excludeCustomerIds={[customerId]}
                    actionLabel="Use"
                    helperText="Search by number, name, contact, or UUID; Use fills the id above."
                  />
                  <div className="grid gap-2">
                    <Label>Type</Label>
                    <Select value={relType} onValueChange={(v) => setRelType(v as CustomerRelationshipType)}>
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
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    disabled={create.isPending || !relatedIdInput.trim()}
                    onClick={() => create.mutate()}
                  >
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </Can>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Linked parties</CardTitle>
          <CardDescription>Household, authorized users, corporate structure.</CardDescription>
        </CardHeader>
        <CardContent>
          {list.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : list.isError ? (
            <EmptyState title="Could not load relationships" description={describeApiError(list.error)} />
          ) : !list.data?.length ? (
            <EmptyState title="No relationships" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>UUID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Related customer</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.data.map((r) => {
                  const oid = otherCustomerId(r, customerId);
                  return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <CopyableUuid value={r.id} />
                    </TableCell>
                    <TableCell>{r.relationshipType}</TableCell>
                    <TableCell>
                      {oid !== "—" ? (
                        <CopyableUuid value={oid} href={`/customers/${oid}`} />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{r.active === false ? "No" : "Yes"}</TableCell>
                    <TableCell className="text-right">
                      <Can permissions={[Permissions.CustomerWrite]}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          disabled={remove.isPending}
                          onClick={() =>
                            remove.mutate({
                              relationshipId: r.id,
                            })
                          }
                        >
                          Remove
                        </Button>
                      </Can>
                    </TableCell>
                  </TableRow>
                );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
