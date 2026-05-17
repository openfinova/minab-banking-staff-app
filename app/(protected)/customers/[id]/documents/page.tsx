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
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/data/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";
import {
  customerDocumentsApi,
  type DocumentType,
  type IdentificationDocumentBody,
} from "@/lib/api/modules/customers";
import { Permissions } from "@/lib/rbac/permissions";

const DOC_TYPES: DocumentType[] = [
  "PASSPORT",
  "DRIVERS_LICENSE",
  "NATIONAL_ID",
  "SOCIAL_SECURITY_CARD",
  "TAX_ID_DOCUMENT",
  "UTILITY_BILL",
  "INCORPORATION_CERTIFICATE",
];

export default function CustomerDocumentsPage() {
  return (
    <RouteGuard permissions={[Permissions.CustomerPiiRead]}>
      <CustomerDocumentsContent />
    </RouteGuard>
  );
}

function CustomerDocumentsContent() {
  const params = useParams();
  const customerId = typeof params?.id === "string" ? params.id : "";
  const qc = useQueryClient();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [docType, setDocType] = React.useState<DocumentType>("PASSPORT");
  const [docNumber, setDocNumber] = React.useState("");
  const [issuingCountry, setIssuingCountry] = React.useState("");
  const [issuingAuthority, setIssuingAuthority] = React.useState("");
  const [issueDate, setIssueDate] = React.useState("");
  const [expiryDate, setExpiryDate] = React.useState("");

  const list = useQuery({
    queryKey: ["customers", customerId, "documents"],
    queryFn: () => customerDocumentsApi.list(customerId),
    enabled: Boolean(customerId),
  });

  const resetForm = () => {
    setDocType("PASSPORT");
    setDocNumber("");
    setIssuingCountry("");
    setIssuingAuthority("");
    setIssueDate("");
    setExpiryDate("");
    setEditingId(null);
  };

  const buildBody = (): IdentificationDocumentBody => ({
    type: docType,
    documentNumber: docNumber.trim(),
    issuingCountry: issuingCountry.trim().toUpperCase(),
    ...(issuingAuthority.trim() ? { issuingAuthority: issuingAuthority.trim() } : {}),
    ...(issueDate.trim() ? { issueDate: issueDate.trim() } : {}),
    ...(expiryDate.trim() ? { expiryDate: expiryDate.trim() } : {}),
  });

  const add = useMutation({
    mutationFn: () => customerDocumentsApi.add(customerId, buildBody()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers", customerId, "documents"] });
      toast({ title: "Document added" });
      resetForm();
      setAddOpen(false);
    },
    onError: (e) =>
      toast({ variant: "destructive", title: "Add failed", description: describeApiError(e) }),
  });

  const update = useMutation({
    mutationFn: () =>
      customerDocumentsApi.update(customerId, editingId!, buildBody()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers", customerId, "documents"] });
      toast({ title: "Document updated" });
      resetForm();
      setAddOpen(false);
    },
    onError: (e) =>
      toast({ variant: "destructive", title: "Update failed", description: describeApiError(e) }),
  });

  const verify = useMutation({
    mutationFn: (documentId: string) => customerDocumentsApi.verify(customerId, documentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers", customerId, "documents"] });
      toast({ title: "Document verified" });
    },
    onError: (e) =>
      toast({ variant: "destructive", title: "Verify failed", description: describeApiError(e) }),
  });

  const remove = useMutation({
    mutationFn: (documentId: string) => customerDocumentsApi.delete(customerId, documentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers", customerId, "documents"] });
      toast({ title: "Document removed" });
    },
    onError: (e) =>
      toast({ variant: "destructive", title: "Delete failed", description: describeApiError(e) }),
  });

  const openEdit = (row: { id: string; type: DocumentType }) => {
    setEditingId(row.id);
    setDocType(row.type);
    setAddOpen(true);
    const full = list.data?.find((d) => d.id === row.id);
    if (full) {
      setDocNumber("");
      setIssuingCountry(full.issuingCountry ?? "");
      setIssuingAuthority(full.issuingAuthority ?? "");
      setIssueDate(full.issueDate?.slice(0, 10) ?? "");
      setExpiryDate(full.expiryDate?.slice(0, 10) ?? "");
    }
  };

  if (!customerId) {
    return <EmptyState title="Missing customer id" />;
  }

  const canSubmit =
    docNumber.trim().length > 0 && issuingCountry.trim().length === 2;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Identification documents"
        description={
          <span className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/customers/${customerId}`}>Back to customer</Link>
            </Button>
            <span className="text-muted-foreground text-sm">
              KYC proofs and government IDs — viewing needs customer:pii:read; sensitive numbers may appear masked.
            </span>
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
                  Add document
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingId ? "Edit document" : "Add document"}</DialogTitle>
                  <DialogDescription>
                    Expiry must be in the future when provided (server validation).
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 py-2 max-w-md">
                  <div className="grid gap-2">
                    <Label>Type</Label>
                    <Select value={docType} onValueChange={(v) => setDocType(v as DocumentType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DOC_TYPES.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="dn">Document number</Label>
                    <Input id="dn" value={docNumber} onChange={(e) => setDocNumber(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="ic">Issuing country ISO-2</Label>
                    <Input
                      id="ic"
                      maxLength={2}
                      className="font-mono uppercase"
                      value={issuingCountry}
                      onChange={(e) => setIssuingCountry(e.target.value.toUpperCase())}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="ia">Issuing authority</Label>
                    <Input
                      id="ia"
                      value={issuingAuthority}
                      onChange={(e) => setIssuingAuthority(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="isd">Issue date</Label>
                      <DateInput id="isd" value={issueDate} onChange={setIssueDate} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="exd">Expiry date</Label>
                      <DateInput id="exd" value={expiryDate} onChange={setExpiryDate} />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    disabled={(!editingId ? add.isPending : update.isPending) || !canSubmit}
                    onClick={() => (editingId ? update.mutate() : add.mutate())}
                  >
                    {editingId ? "Save" : "Add"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </Can>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>Regulatory record; numbers are masked in listings for privacy.</CardDescription>
        </CardHeader>
        <CardContent>
          {list.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : list.isError ? (
            <EmptyState title="Could not load" description={describeApiError(list.error)} />
          ) : !list.data?.length ? (
            <EmptyState title="No documents on file" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Masked #</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.data.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.type}</TableCell>
                    <TableCell className="font-mono text-xs">{d.maskedDocumentNumber}</TableCell>
                    <TableCell>{d.issuingCountry}</TableCell>
                    <TableCell>
                      <StatusBadge status={d.documentStatus} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={d.verified ? "VERIFIED" : "PENDING"} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Can permissions={[Permissions.CustomerWrite]}>
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit({ id: d.id, type: d.type })}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={verify.isPending || d.verified}
                            onClick={() => verify.mutate(d.id)}
                          >
                            Verify
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            disabled={remove.isPending}
                            onClick={() => remove.mutate(d.id)}
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
