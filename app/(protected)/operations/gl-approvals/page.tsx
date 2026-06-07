"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CopyableUuid } from "@/components/data/copyable-uuid";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Permissions } from "@/lib/rbac/permissions";
import { glApprovalsApi, type GlApprovalQueueItem } from "@/lib/api/modules/operations";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";
import { handleStepUpOnError, startStepUp } from "@/lib/auth/step-up";
import { useAuth } from "@/lib/auth/auth-provider";
import * as React from "react";
import { ConfirmAction } from "@/components/data/confirm-action";

export default function GlApprovalsPage() {
  return (
    <RouteGuard permissions={[Permissions.GlApprove]}>
      <GlApprovalsStepUpGate />
    </RouteGuard>
  );
}

/**
 * Ensures the session carries a gold ACR token before rendering the approvals UI.
 * GL approve/reject is the one operation that demands step-up even within a gold session
 * (defence-in-depth for irreversible financial entries). Checking upfront avoids the user
 * reaching the Approve button, losing the confirmation dialog context on a 403, and having
 * to restart the action after completing MFA.
 */
function GlApprovalsStepUpGate() {
  const { session } = useAuth();
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    if (!session) return;
    if (session.user.acr === "urn:mace:incommon:iap:gold") {
      setReady(true);
    } else {
      startStepUp(window.location.pathname);
    }
  }, [session]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
        Verifying authentication level…
      </div>
    );
  }
  return <GlApprovalsContent />;
}

function GlApprovalsContent() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const myQueue = useQuery({ queryKey: ["gl", "approvals", "queue"], queryFn: glApprovalsApi.myQueue });
  const myActivity = useQuery({
    queryKey: ["gl", "approvals", "activity"],
    queryFn: glApprovalsApi.myActivity,
  });
  const myLimits = useQuery({
    queryKey: ["gl", "approvals", "limits"],
    queryFn: glApprovalsApi.myLimits,
  });

  const limitsRow = Array.isArray(myLimits.data) ? myLimits.data[0] : undefined;

  const approve = useMutation({
    mutationFn: ({ id, comments }: { id: string; comments?: string }) =>
      glApprovalsApi.approve(id, comments ? { comments } : {}),
    onSuccess: async (body) => {
      toast({
        title: body.posted ? "Posted to GL" : "Approval recorded",
        description: body.posted
          ? "Full approval chain satisfied; journal posted."
          : "Awaiting remaining approvers per limit configuration.",
      });
      await qc.invalidateQueries({ queryKey: ["gl", "approvals"] });
    },
    onError: (e) => {
      if (handleStepUpOnError(e)) return;
      toast({ variant: "destructive", title: "Approve failed", description: describeApiError(e) });
    },
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => glApprovalsApi.reject(id, { reason }),
    onSuccess: async () => {
      toast({ title: "Transaction rejected", variant: "destructive" });
      await qc.invalidateQueries({ queryKey: ["gl", "approvals"] });
    },
    onError: (e) => {
      if (handleStepUpOnError(e)) return;
      toast({ variant: "destructive", title: "Reject failed", description: describeApiError(e) });
    },
  });

  const [approveFor, setApproveFor] = React.useState<GlApprovalQueueItem | null>(null);
  const [rejectFor, setRejectFor] = React.useState<GlApprovalQueueItem | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="GL approvals queue"
        description="Review draft journal postings submitted by makers. Actions use your JWT identity — you cannot delegate another signer from this console."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <LimitsCard
          title="Approval role"
          value={limitsRow?.approvalRole ?? (myLimits.isError ? "No limits row" : "-")}
          loading={myLimits.isLoading}
        />
        <LimitsCard
          title="Approval limit (per posting)"
          value={
            limitsRow?.approvalLimit !== undefined
              ? formatCurrency(limitsRow.approvalLimit, limitsRow.currency ?? undefined)
              : "-"
          }
          loading={myLimits.isLoading}
        />
        <LimitsCard
          title="Required approvals"
          value={
            limitsRow?.requiredApprovals != null ? String(limitsRow.requiredApprovals) : "-"
          }
          loading={myLimits.isLoading}
        />
      </div>
      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue">My queue</TabsTrigger>
          <TabsTrigger value="activity">My activity</TabsTrigger>
        </TabsList>
        <TabsContent value="queue">
          <QueueActionsTable
            items={myQueue.data ?? []}
            isLoading={myQueue.isLoading}
            mode="queue"
            onApprove={(row) => setApproveFor(row)}
            onReject={(row) => setRejectFor(row)}
          />
        </TabsContent>
        <TabsContent value="activity">
          <QueueActionsTable items={myActivity.data ?? []} isLoading={myActivity.isLoading} mode="activity" />
        </TabsContent>
      </Tabs>

      <ConfirmAction
        open={Boolean(approveFor)}
        onOpenChange={(open) => {
          if (!open) setApproveFor(null);
        }}
        title="Approve posting?"
        description={
          approveFor ? (
            <span className="text-sm">
              Transaction{" "}
              <CopyableUuid
                value={approveFor.transactionId}
                href={`/transaction-processing/transactions/${approveFor.transactionId}`}
              />
              {approveFor.transactionRef ? ` (${approveFor.transactionRef})` : ""} — maker-checker rules still apply until the
              final required signature posts the batch.
            </span>
          ) : null
        }
        confirmLabel="Approve"
        reasonLabel="Comments (optional)"
        reasonPlaceholder="Notes visible in audit trail alongside your approval"
        onConfirm={async (comments) => {
          if (!approveFor) return;
          await approve.mutateAsync({
            id: approveFor.transactionId,
            comments: comments.trim() || undefined,
          });
        }}
      />

      <ConfirmAction
        open={Boolean(rejectFor)}
        onOpenChange={(open) => {
          if (!open) setRejectFor(null);
        }}
        title="Reject this posting?"
        description="The journal stays out of balances; makers must revise and resubmit."
        destructive
        confirmLabel="Reject"
        reasonRequired
        reasonMinLength={10}
        reasonPlaceholder="Operational reason documented for auditors (minimum 10 characters)."
        onConfirm={async (reason) => {
          if (!rejectFor) return;
          await reject.mutateAsync({ id: rejectFor.transactionId, reason });
        }}
      />
    </div>
  );
}

function LimitsCard({ title, value, loading }: { title: string; value: string; loading: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
      </CardHeader>
      <CardContent>{loading ? <Skeleton className="h-6 w-24" /> : <p className="text-2xl font-semibold">{value}</p>}</CardContent>
    </Card>
  );
}

function QueueActionsTable({
  items,
  isLoading,
  mode,
  onApprove,
  onReject,
}: {
  items: GlApprovalQueueItem[];
  isLoading: boolean;
  mode: "queue" | "activity";
  onApprove?: (item: GlApprovalQueueItem) => void;
  onReject?: (item: GlApprovalQueueItem) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === "queue" ? "Pending approvals" : "Recent activity"}</CardTitle>
        {mode === "queue" ? (
          <CardDescription>Eligibility checked per row before executing approve or reject.</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : items.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Required role</TableHead>
                <TableHead>Initiated</TableHead>
                <TableHead>Eligibility</TableHead>
                {mode === "queue" ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <ApprovalRow
                  key={item.transactionId + (item.initiatedAt ?? "")}
                  item={item}
                  mode={mode}
                  onApprove={onApprove}
                  onReject={onReject}
                />
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            title={mode === "queue" ? "Queue is empty" : "No activity yet"}
            description={
              mode === "queue"
                ? "You have no pending approvals."
                : "Approvals or rejections you perform will appear here."
            }
          />
        )}
      </CardContent>
    </Card>
  );
}

function ApprovalRow({
  item,
  mode,
  onApprove,
  onReject,
}: {
  item: GlApprovalQueueItem;
  mode: "queue" | "activity";
  onApprove?: (item: GlApprovalQueueItem) => void;
  onReject?: (item: GlApprovalQueueItem) => void;
}) {
  const can = useQuery({
    queryKey: ["gl", "approvals", "can", item.transactionId],
    queryFn: () => glApprovalsApi.canApprove(item.transactionId),
    enabled: mode === "queue",
  });

  const eligible =
    mode === "queue" ? (can.data?.canApprove === true ? "Yes" : can.data?.canApprove === false ? "No" : "…") : "—";

  return (
    <TableRow>
      <TableCell>
        <CopyableUuid
          value={item.transactionId}
          href={`/transaction-processing/transactions/${item.transactionId}`}
        />
      </TableCell>
      <TableCell>{item.transactionRef ?? "—"}</TableCell>
      <TableCell>
        {item.amount !== undefined ? formatCurrency(item.amount, item.currency ?? undefined) : "—"}
      </TableCell>
      <TableCell>
        <Badge variant="muted">{item.requiredRole ?? "—"}</Badge>
      </TableCell>
      <TableCell className="font-mono text-xs">{formatDateTime(item.initiatedAt)}</TableCell>
      <TableCell className="text-xs">
        {mode === "queue" ? (
          <span title={can.data?.reason ?? ""}>
            <Badge variant={can.data?.canApprove ? "default" : can.data?.canApprove === false ? "destructive" : "muted"}>
              {eligible}
            </Badge>
            {can.data?.reason && !can.data.canApprove ? (
              <span className="mt-1 block text-muted-foreground">{can.data.reason}</span>
            ) : null}
          </span>
        ) : (
          item.status ?? "—"
        )}
      </TableCell>
      {mode === "queue" && onApprove && onReject ? (
        <TableCell className="space-x-2 text-right whitespace-nowrap">
          <Button
            size="sm"
            variant="default"
            disabled={!can.data?.canApprove}
            type="button"
            onClick={() => onApprove(item)}
          >
            Approve…
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={!can.data?.canApprove}
            type="button"
            onClick={() => onReject(item)}
          >
            Reject…
          </Button>
        </TableCell>
      ) : mode === "queue" ? (
        <TableCell />
      ) : null}
    </TableRow>
  );
}
