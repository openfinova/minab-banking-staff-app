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
import { customerContactsApi, type ContactType } from "@/lib/api/modules/customers";
import { Permissions } from "@/lib/rbac/permissions";

const CONTACT_TYPES: ContactType[] = [
  "EMAIL",
  "PHONE_MOBILE",
  "PHONE_HOME",
  "PHONE_WORK",
  "FAX",
  "WEBSITE",
];

export default function CustomerContactsPage() {
  return (
    <RouteGuard permissions={[Permissions.CustomerRead]}>
      <CustomerContactsContent />
    </RouteGuard>
  );
}

function CustomerContactsContent() {
  const params = useParams();
  const customerId = typeof params?.id === "string" ? params.id : "";
  const qc = useQueryClient();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = React.useState(false);
  const [editContactId, setEditContactId] = React.useState<string | null>(null);
  const [newType, setNewType] = React.useState<ContactType>("EMAIL");
  const [newValue, setNewValue] = React.useState("");
  const [newPrimary, setNewPrimary] = React.useState(false);

  const resetForm = () => {
    setEditContactId(null);
    setNewType("EMAIL");
    setNewValue("");
    setNewPrimary(false);
  };

  const list = useQuery({
    queryKey: ["customers", customerId, "contacts"],
    queryFn: () => customerContactsApi.list(customerId),
    enabled: Boolean(customerId),
  });

  const add = useMutation({
    mutationFn: () =>
      customerContactsApi.add(customerId, {
        type: newType,
        value: newValue.trim(),
        ...(newPrimary ? { primary: true } : {}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers", customerId, "contacts"] });
      toast({ title: "Contact added" });
      resetForm();
      setAddOpen(false);
    },
    onError: (e) =>
      toast({ variant: "destructive", title: "Add failed", description: describeApiError(e) }),
  });

  const update = useMutation({
    mutationFn: () =>
      customerContactsApi.update(customerId, editContactId!, {
        type: newType,
        value: newValue.trim(),
        ...(newPrimary ? { primary: true } : {}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers", customerId, "contacts"] });
      toast({ title: "Contact updated" });
      resetForm();
      setAddOpen(false);
    },
    onError: (e) =>
      toast({ variant: "destructive", title: "Update failed", description: describeApiError(e) }),
  });

  const verify = useMutation({
    mutationFn: (contactId: string) => customerContactsApi.verify(customerId, contactId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers", customerId, "contacts"] });
      toast({ title: "Marked verified" });
    },
    onError: (e) =>
      toast({ variant: "destructive", title: "Verify failed", description: describeApiError(e) }),
  });

  const setPrimary = useMutation({
    mutationFn: (contactId: string) => customerContactsApi.setPrimary(customerId, contactId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers", customerId, "contacts"] });
      toast({ title: "Primary updated" });
    },
    onError: (e) =>
      toast({ variant: "destructive", title: "Update failed", description: describeApiError(e) }),
  });

  const remove = useMutation({
    mutationFn: (contactId: string) => customerContactsApi.delete(customerId, contactId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers", customerId, "contacts"] });
      toast({ title: "Contact removed" });
    },
    onError: (e) =>
      toast({ variant: "destructive", title: "Delete failed", description: describeApiError(e) }),
  });

  if (!customerId) {
    return <EmptyState title="Missing customer id" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contacts"
        description={
          <span className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/customers/${customerId}`}>Back to customer</Link>
            </Button>
            <span className="text-muted-foreground text-sm">Phones, emails, and secure contact channels.</span>
          </span>
        }
        actions={
          <Can permissions={[Permissions.CustomerWrite]}>
            <Dialog
              open={addOpen}
              onOpenChange={(o) => {
                setAddOpen(o);
                if (!o) resetForm();
              }}
            >
              <DialogTrigger asChild>
                <Button type="button" onClick={() => resetForm()}>
                  Add contact
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editContactId ? "Edit contact" : "Add contact"}</DialogTitle>
                  <DialogDescription>
                    {editContactId ? "Update an existing contact channel." : "Register a new validated contact method."}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 py-2">
                  <div className="grid gap-2">
                    <Label>Type</Label>
                    <Select value={newType} onValueChange={(v) => setNewType(v as ContactType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTACT_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="cv">Value</Label>
                    <Input id="cv" value={newValue} onChange={(e) => setNewValue(e.target.value)} />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={newPrimary}
                      onChange={(e) => setNewPrimary(e.target.checked)}
                    />
                    Primary for this type
                  </label>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    disabled={
                      (editContactId ? update.isPending : add.isPending) || !newValue.trim()
                    }
                    onClick={() => (editContactId ? update.mutate() : add.mutate())}
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
          <CardTitle>Contact details</CardTitle>
          <CardDescription>Email, phone, and other channels.</CardDescription>
        </CardHeader>
        <CardContent>
          {list.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : list.isError ? (
            <EmptyState title="Could not load contacts" description={describeApiError(list.error)} />
          ) : !list.data?.length ? (
            <EmptyState title="No contacts" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.type}</TableCell>
                    <TableCell>{row.value}</TableCell>
                    <TableCell className="space-x-1">
                      {row.primary ? <StatusBadge status="PRIMARY" variantOverride="secondary" /> : null}
                      <StatusBadge status={row.verified ? "VERIFIED" : "PENDING"} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Can permissions={[Permissions.CustomerWrite]}>
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditContactId(row.id);
                              setNewType(row.type);
                              setNewValue(row.value);
                              setNewPrimary(row.primary);
                              setAddOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={verify.isPending || row.verified}
                            onClick={() => verify.mutate(row.id)}
                          >
                            Verify
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={setPrimary.isPending || row.primary}
                            onClick={() => setPrimary.mutate(row.id)}
                          >
                            Primary
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            disabled={remove.isPending}
                            onClick={() => remove.mutate(row.id)}
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
