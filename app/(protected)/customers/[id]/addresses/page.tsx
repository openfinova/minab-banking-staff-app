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
import { StatusBadge } from "@/components/data/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";
import { customerAddressesApi, type AddressType } from "@/lib/api/modules/customers";
import { Permissions } from "@/lib/rbac/permissions";

const ADDR_TYPES: AddressType[] = ["LEGAL", "PHYSICAL", "MAILING", "REGISTERED_OFFICE"];

export default function CustomerAddressesPage() {
  return (
    <RouteGuard permissions={[Permissions.CustomerRead]}>
      <CustomerAddressesContent />
    </RouteGuard>
  );
}

function CustomerAddressesContent() {
  const params = useParams();
  const customerId = typeof params?.id === "string" ? params.id : "";
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [editAddressId, setEditAddressId] = React.useState<string | null>(null);
  const [type, setType] = React.useState<AddressType>("LEGAL");
  const [line1, setLine1] = React.useState("");
  const [line2, setLine2] = React.useState("");
  const [city, setCity] = React.useState("");
  const [state, setState] = React.useState("");
  const [postalCode, setPostalCode] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [primary, setPrimary] = React.useState(false);

  const resetForm = () => {
    setEditAddressId(null);
    setType("LEGAL");
    setLine1("");
    setLine2("");
    setCity("");
    setState("");
    setPostalCode("");
    setCountry("");
    setPrimary(false);
  };

  const list = useQuery({
    queryKey: ["customers", customerId, "addresses"],
    queryFn: () => customerAddressesApi.list(customerId),
    enabled: Boolean(customerId),
  });

  const add = useMutation({
    mutationFn: () =>
      customerAddressesApi.add(customerId, {
        type,
        line1: line1.trim(),
        ...(line2.trim() ? { line2: line2.trim() } : {}),
        city: city.trim(),
        ...(state.trim() ? { state: state.trim() } : {}),
        postalCode: postalCode.trim(),
        country: country.trim().toUpperCase(),
        ...(primary ? { primary: true } : {}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers", customerId, "addresses"] });
      toast({ title: "Address added" });
      resetForm();
      setOpen(false);
    },
    onError: (e) =>
      toast({ variant: "destructive", title: "Add failed", description: describeApiError(e) }),
  });

  const update = useMutation({
    mutationFn: () =>
      customerAddressesApi.update(customerId, editAddressId!, {
        type,
        line1: line1.trim(),
        ...(line2.trim() ? { line2: line2.trim() } : {}),
        city: city.trim(),
        ...(state.trim() ? { state: state.trim() } : {}),
        postalCode: postalCode.trim(),
        country: country.trim().toUpperCase(),
        ...(primary ? { primary: true } : {}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers", customerId, "addresses"] });
      toast({ title: "Address updated" });
      resetForm();
      setOpen(false);
    },
    onError: (e) =>
      toast({ variant: "destructive", title: "Update failed", description: describeApiError(e) }),
  });

  const setPrimaryM = useMutation({
    mutationFn: (addressId: string) => customerAddressesApi.setPrimary(customerId, addressId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers", customerId, "addresses"] });
      toast({ title: "Primary updated" });
    },
    onError: (e) =>
      toast({ variant: "destructive", title: "Update failed", description: describeApiError(e) }),
  });

  const remove = useMutation({
    mutationFn: (addressId: string) => customerAddressesApi.delete(customerId, addressId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers", customerId, "addresses"] });
      toast({ title: "Address removed" });
    },
    onError: (e) =>
      toast({ variant: "destructive", title: "Delete failed", description: describeApiError(e) }),
  });

  if (!customerId) {
    return <EmptyState title="Missing customer id" />;
  }

  const canSubmit =
    line1.trim() && city.trim() && postalCode.trim() && country.trim().length === 2;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Addresses"
        description={
          <span className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/customers/${customerId}`}>Back to customer</Link>
            </Button>
            <span className="text-muted-foreground">{`GET /api/v1/customers/{id}/addresses`}</span>
          </span>
        }
        actions={
          <Can permissions={[Permissions.CustomerWrite]}>
            <Dialog
              open={open}
              onOpenChange={(o) => {
                setOpen(o);
                if (!o) resetForm();
              }}
            >
              <DialogTrigger asChild>
                <Button type="button" onClick={() => resetForm()}>
                  Add address
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editAddressId ? "Edit address" : "Add address"}</DialogTitle>
                  <DialogDescription>
                    {editAddressId
                      ? `PUT /api/v1/customers/{id}/addresses/{addressId}`
                      : `POST /api/v1/customers/{id}/addresses`}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 py-2">
                  <div className="grid gap-2">
                    <Label>Type</Label>
                    <Select value={type} onValueChange={(v) => setType(v as AddressType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ADDR_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="l1">Line 1</Label>
                    <Input id="l1" value={line1} onChange={(e) => setLine1(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="l2">Line 2</Label>
                    <Input id="l2" value={line2} onChange={(e) => setLine2(e.target.value)} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="ci">City</Label>
                      <Input id="ci" value={city} onChange={(e) => setCity(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="st">State / region</Label>
                      <Input id="st" value={state} onChange={(e) => setState(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="pc">Postal code</Label>
                      <Input id="pc" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="ct">Country (ISO-2)</Label>
                      <Input
                        id="ct"
                        maxLength={2}
                        className="font-mono uppercase"
                        value={country}
                        onChange={(e) => setCountry(e.target.value.toUpperCase())}
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={primary}
                      onChange={(e) => setPrimary(e.target.checked)}
                    />
                    Primary for this type
                  </label>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    disabled={(editAddressId ? update.isPending : add.isPending) || !canSubmit}
                    onClick={() => (editAddressId ? update.mutate() : add.mutate())}
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
          <CardTitle>Registered & mailing addresses</CardTitle>
          <CardDescription>Supports primary designation per type.</CardDescription>
        </CardHeader>
        <CardContent>
          {list.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : list.isError ? (
            <EmptyState title="Could not load addresses" description={describeApiError(list.error)} />
          ) : !list.data?.length ? (
            <EmptyState title="No addresses" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Lines</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Primary</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.data.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.type}</TableCell>
                    <TableCell className="max-w-xs">
                      <div className="text-sm">{a.line1}</div>
                      {a.line2 ? <div className="text-xs text-muted-foreground">{a.line2}</div> : null}
                    </TableCell>
                    <TableCell>
                      {a.city}
                      {a.state ? `, ${a.state}` : ""}
                      <div className="font-mono text-xs text-muted-foreground">
                        {a.postalCode} {a.country}
                      </div>
                    </TableCell>
                    <TableCell>{a.primary ? <StatusBadge status="PRIMARY" variantOverride="secondary" /> : "—"}</TableCell>
                    <TableCell className="text-right">
                      <Can permissions={[Permissions.CustomerWrite]}>
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditAddressId(a.id);
                              setType(a.type);
                              setLine1(a.line1);
                              setLine2(a.line2 ?? "");
                              setCity(a.city);
                              setState(a.state ?? "");
                              setPostalCode(a.postalCode);
                              setCountry(a.country);
                              setPrimary(a.primary);
                              setOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={setPrimaryM.isPending || a.primary}
                            onClick={() => setPrimaryM.mutate(a.id)}
                          >
                            Primary
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            disabled={remove.isPending}
                            onClick={() => remove.mutate(a.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      </Can>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
