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
import { useAuthStore } from "@/lib/auth/auth-store";
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
  const username = useAuthStore((s) => s.session?.user.username ?? "operator");

  const [docType, setDocType] = React.useState<DocumentType>("PASSPORT");
  const [docNumber, setDocNumber] = React.useState("");
  const [issuingCountry, setIssuingCountry] = React.useState("");
  const [submittedBy, setSubmittedBy] = React.useState(username);
  const [reviewDecision, setReviewDecision] = React.useState<KYCDecision>("APPROVED");
  const [reviewComments, setReviewComments] = React.useState("");
  const [reviewedBy, setReviewedBy] = React.useState(username);
  const [reverifyReason, setReverifyReason] = React.useState("");
  const [requestedBy, setRequestedBy] = React.useState(username);

  React.useEffect(() => {
    setSubmittedBy(username);
    setReviewedBy(username);
    setRequestedBy(username);
  }, [username]);

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
    mutationFn: (initiatedBy: string) => customerKycApi.initiate(customerId, initiatedBy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers", customerId, "kyc"] });
      toast({ title: "KYC initiated" });
    },
    onError: (e) =>
      toast({ variant: "destructive", title: "Initiate failed", description: describeApiError(e) }),
  });

  const submitDocs = useMutation({
    mutationFn: () =>
      customerKycApi.submitDocuments(
        customerId,
        [
          {
            documentType: docType,
            documentNumber: docNumber.trim(),
            issuingCountry: issuingCountry.trim().toUpperCase(),
          },
        ],
        submittedBy.trim() || username,
      ),
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
        reviewedBy: reviewedBy.trim() || username,
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
      customerKycApi.requestReVerification(
        customerId,
        reverifyReason.trim(),
        requestedBy.trim() || username,
      ),
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
            <span className="text-muted-foreground">{`/api/v1/customers/{id}/kyc/*`}</span>
          </span>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Current workflow</CardTitle>
          <CardDescription>GET /kyc/workflow</CardDescription>
        </CardHeader>
        <CardContent>
          {workflow.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : wf ? (
            <div className="space-y-2 text-sm">
              <div className="flex flex-wrap gap-2">
                <span className="font-mono text-xs">{wf.id}</span>
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
                onClick={() => initiate.mutate(username)}
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
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="sb">Submitted by</Label>
                  <Input id="sb" value={submittedBy} onChange={(e) => setSubmittedBy(e.target.value)} />
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
                <div className="grid gap-2">
                  <Label htmlFor="rb">Reviewed by</Label>
                  <Input id="rb" value={reviewedBy} onChange={(e) => setReviewedBy(e.target.value)} />
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
                <div className="grid gap-2">
                  <Label htmlFor="rqb">Requested by</Label>
                  <Input id="rqb" value={requestedBy} onChange={(e) => setRequestedBy(e.target.value)} />
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
          <CardDescription>GET /kyc/history</CardDescription>
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
                  <TableHead>Id</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Initiated</TableHead>
                  <TableHead>Reviewer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.data.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-mono text-xs">{h.id}</TableCell>
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
