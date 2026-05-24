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
import { Textarea } from "@/components/ui/textarea";
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
import { CopyableUuid } from "@/components/data/copyable-uuid";
import { StatusBadge } from "@/components/data/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError, ApiError } from "@/lib/api/errors";
import {
  customerKycApi,
  type DocumentType,
  type KYCDecision,
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

export default function CustomerKycPage() {
  return (
    <RouteGuard permissions={[Permissions.CustomerRead]}>
      <CustomerKycContent />
    </RouteGuard>
  );
}

function CustomerKycContent() {
  const params = useParams();
  const customerId = typeof params?.id === "string" ? params.id : "";
  const qc = useQueryClient();
  const { toast } = useToast();

  const [docType, setDocType] = React.useState<DocumentType>("PASSPORT");
  const [docNumber, setDocNumber] = React.useState("");
  const [issuingCountry, setIssuingCountry] = React.useState("");
  const [reviewDecision, setReviewDecision] = React.useState<KYCDecision>("APPROVED");
  const [reviewComments, setReviewComments] = React.useState("");
  const [reverifyReason, setReverifyReason] = React.useState("");

  const workflow = useQuery({
    queryKey: ["customers", customerId, "kyc", "workflow"],
    queryFn: () => customerKycApi.workflow(customerId),
    enabled: Boolean(customerId),
    retry: false,
  });

  const history = useQuery({
    queryKey: ["customers", customerId, "kyc", "history"],
    queryFn: () => customerKycApi.history(customerId),
    enabled: Boolean(customerId),
  });

  const initiate = useMutation({
    mutationFn: () => customerKycApi.initiate(customerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers", customerId, "kyc"] });
      toast({ title: "KYC initiated" });
    },
    onError: (e) =>
      toast({ variant: "destructive", title: "Initiate failed", description: describeApiError(e) }),
  });

  const submitDocs = useMutation({
    mutationFn: () =>
      customerKycApi.submitDocuments(customerId, [
          {
            documentType: docType,
            documentNumber: docNumber.trim(),
            issuingCountry: issuingCountry.trim().toUpperCase(),
          },
        ]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers", customerId, "kyc"] });
      toast({ title: "Documents submitted" });
    },
    onError: (e) =>
      toast({ variant: "destructive", title: "Submit failed", description: describeApiError(e) }),
  });

  const review = useMutation({
    mutationFn: () =>
      customerKycApi.review(customerId, {
        decision: reviewDecision,
        comments: reviewComments,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers", customerId, "kyc"] });
      qc.invalidateQueries({ queryKey: ["customers", "detail", customerId] });
      toast({ title: "Review recorded" });
    },
    onError: (e) =>
      toast({ variant: "destructive", title: "Review failed", description: describeApiError(e) }),
  });

  const reverify = useMutation({
    mutationFn: () =>
      customerKycApi.requestReVerification(customerId, reverifyReason.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers", customerId, "kyc"] });
      toast({ title: "Re-verification requested" });
    },
    onError: (e) =>
      toast({
        variant: "destructive",
        title: "Request failed",
        description: describeApiError(e),
      }),
  });

  if (!customerId) {
    return <EmptyState title="Missing customer id" />;
  }

  const wf = workflow.data;
  const wfNotFound = workflow.isError && workflow.error instanceof ApiError && workflow.error.isNotFound;

  return (
    <div className="space-y-6">
      <PageHeader
        title="KYC workflow"
        description={
          <span className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/customers/${customerId}`}>Back to customer</Link>
            </Button>
            <span className="text-muted-foreground text-sm">Due diligence steps, evidence, reviews, and audit history.</span>
          </span>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Current workflow</CardTitle>
          <CardDescription>Current state, reviewer narrative, and blocker reasons.</CardDescription>
        </CardHeader>
        <CardContent>
          {workflow.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : wf ? (
            <div className="space-y-2 text-sm">
              <div className="flex flex-wrap gap-2">
                <CopyableUuid value={wf.id} />
                <StatusBadge status={wf.status} />
              </div>
              {wf.initiatedBy ? (
                <p className="text-muted-foreground">Initiated by {wf.initiatedBy}</p>
              ) : null}
              {wf.initiatedAt ? <p className="text-xs text-muted-foreground">Started {wf.initiatedAt}</p> : null}
              {wf.comments ? <p className="text-sm">{wf.comments}</p> : null}
              {wf.rejectionReason ? (
                <p className="text-sm text-destructive">{wf.rejectionReason}</p>
              ) : null}
            </div>
          ) : (
            <EmptyState
             title={wfNotFound ? "No active workflow" : "Could not load workflow"}
              description={workflow.isError ? describeApiError(workflow.error) : undefined}
            />
          )}
        </CardContent>
      </Card>

      <Can permissions={[Permissions.CustomerWrite]}>
        <Card>
          <CardHeader>
            <CardTitle>Operations</CardTitle>
            <CardDescription>Initiate, submit documents, review, or request re-verification.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={initiate.isPending}
                onClick={() => initiate.mutate()}
              >
                Initiate KYC
              </Button>
            </div>

            <div className="rounded-md border p-4 space-y-3">
              <h3 className="text-sm font-medium">Submit documents</h3>
              <div className="grid gap-3 sm:grid-cols-2 max-w-lg">
                <div className="grid gap-2">
                  <Label>Document type</Label>
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
                    placeholder="e.g. US"
                  />
                </div>
              </div>
              <Button
                type="button"
                disabled={
                  submitDocs.isPending || !docNumber.trim() || issuingCountry.trim().length !== 2
                }
                onClick={() => submitDocs.mutate()}
              >
                Submit
              </Button>
            </div>

            <div className="rounded-md border p-4 space-y-3">
              <h3 className="text-sm font-medium">Review</h3>
              <div className="grid gap-3 max-w-lg">
                <div className="grid gap-2">
                  <Label>Decision</Label>
                  <Select
                    value={reviewDecision}
                    onValueChange={(v) => setReviewDecision(v as KYCDecision)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="APPROVED">APPROVED</SelectItem>
                      <SelectItem value="REJECTED">REJECTED</SelectItem>
                      <SelectItem value="REQUIRES_ADDITIONAL_INFO">
                        REQUIRES_ADDITIONAL_INFO
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="rc">Comments</Label>
                  <Textarea id="rc" value={reviewComments} onChange={(e) => setReviewComments(e.target.value)} />
                </div>
              </div>
              <Button type="button" disabled={review.isPending} onClick={() => review.mutate()}>
                Submit review
              </Button>
            </div>

            <div className="rounded-md border p-4 space-y-3">
              <h3 className="text-sm font-medium">Re-verification</h3>
              <div className="grid gap-3 max-w-lg">
                <div className="grid gap-2">
                  <Label htmlFor="rr">Reason</Label>
                  <Textarea id="rr" value={reverifyReason} onChange={(e) => setReverifyReason(e.target.value)} />
                </div>
              </div>
              <Button
                type="button"
                disabled={reverify.isPending || !reverifyReason.trim()}
                onClick={() => reverify.mutate()}
              >
                Request re-verification
              </Button>
            </div>
          </CardContent>
        </Card>
      </Can>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
          <CardDescription>Chronological decisions, hand-offs, and rework cycles.</CardDescription>
        </CardHeader>
        <CardContent>
          {history.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : history.isError ? (
            <EmptyState title="Could not load history" description={describeApiError(history.error)} />
          ) : !history.data?.length ? (
            <EmptyState title="No KYC history" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>UUID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Initiated</TableHead>
                  <TableHead>Reviewer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.data.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>
                      <CopyableUuid value={h.id} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={h.status} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{h.initiatedAt ?? "—"}</TableCell>
                    <TableCell className="text-xs">{h.reviewedBy ?? "—"}</TableCell>
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
