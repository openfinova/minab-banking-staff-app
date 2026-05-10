"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Can } from "@/components/rbac/can";
import { ConfirmAction } from "@/components/data/confirm-action";
import { StatusBadge } from "@/components/data/status-badge";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Permissions } from "@/lib/rbac/permissions";
import {
  approvalWorkflowsApi,
  type ApprovalWorkflow,
} from "@/lib/api/modules/approval-workflows";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";
import { formatDateTime } from "@/lib/utils";

type ActionKind = "approve" | "reject" | "cancel";

export default function ApprovalWorkflowsPage() {
  return (
    <RouteGuard permissions={[Permissions.AdminDoaRead]}>
      <ApprovalWorkflowsContent />
    </RouteGuard>
  );
}

function ApprovalWorkflowsContent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [resourceType, setResourceType] = React.useState("USER_PROVISIONING");
  const [filterDraft, setFilterDraft] = React.useState(resourceType);

  const query = useQuery({
    queryKey: ["approval-workflows", resourceType],
    queryFn: () => approvalWorkflowsApi.listByResource(resourceType),
    enabled: Boolean(resourceType),
  });

  const [pending, setPending] = React.useState<{
    id: string;
    kind: ActionKind;
  } | null>(null);

  const onAction = async (kind: ActionKind, id: string, comment: string) => {
    try {
      const body = { comment: comment || undefined };
      if (kind === "approve") await approvalWorkflowsApi.approve(id, body);
      if (kind === "reject") await approvalWorkflowsApi.reject(id, body);
      if (kind === "cancel") await approvalWorkflowsApi.cancel(id, body);
      toast({ title: `Workflow ${kind}d` });
      queryClient.invalidateQueries({ queryKey: ["approval-workflows"] });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Action failed",
        description: describeApiError(error),
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approval workflows"
        description="Multi-step approval chains for resource governance and identity changes."
      />
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase text-muted-foreground">Resource type</Label>
            <Input
              value={filterDraft}
              onChange={(e) => setFilterDraft(e.target.value)}
              placeholder="USER_PROVISIONING"
              className="w-[260px]"
            />
          </div>
          <Button onClick={() => setResourceType(filterDraft)}>
            <Search className="h-4 w-4" /> Apply
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Workflows for {resourceType}</CardTitle>
          <CardDescription>Most recent workflow chains and their states.</CardDescription>
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : query.data?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resource ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Required roles</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.map((wf) => (
                  <ApprovalRow
                    key={wf.id}
                    wf={wf}
                    onAction={(kind) => setPending({ id: wf.id, kind })}
                  />
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              title="No workflows for this resource type"
              description="Try a different resource type or create one via the related resource."
            />
          )}
        </CardContent>
      </Card>
      <ConfirmAction
        open={Boolean(pending)}
        onOpenChange={(open) => !open && setPending(null)}
        title={
          pending?.kind === "approve"
            ? "Approve workflow step"
            : pending?.kind === "reject"
              ? "Reject workflow"
              : "Cancel workflow"
        }
        description="Comment is recorded on the timeline (max 500 characters)."
        confirmLabel={
          pending?.kind === "approve"
            ? "Approve"
            : pending?.kind === "reject"
              ? "Reject"
              : "Cancel workflow"
        }
        destructive={pending?.kind !== "approve"}
        reasonLabel="Comment"
        reasonRequired={pending?.kind === "reject"}
        onConfirm={async (comment) => {
          if (pending) await onAction(pending.kind, pending.id, comment);
        }}
      />
    </div>
  );
}

function ApprovalRow({
  wf,
  onAction,
}: {
  wf: ApprovalWorkflow;
  onAction: (kind: ActionKind) => void;
}) {
  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{wf.resourceId}</TableCell>
      <TableCell>
        <StatusBadge status={wf.status} />
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {wf.requiredGlRolesInOrder.map((role) => (
            <span key={role} className="rounded-md bg-muted px-2 py-0.5 text-xs">
              {role}
            </span>
          ))}
        </div>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {formatDateTime(wf.createdAt)}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          <Can permissions={[Permissions.AdminDoaWrite, Permissions.GlApprove]} mode="any">
            <Button size="sm" variant="success" onClick={() => onAction("approve")}>
              Approve
            </Button>
            <Button size="sm" variant="destructive" onClick={() => onAction("reject")}>
              Reject
            </Button>
          </Can>
          <Can permissions={[Permissions.AdminDoaWrite]}>
            <Button size="sm" variant="outline" onClick={() => onAction("cancel")}>
              Cancel
            </Button>
          </Can>
        </div>
      </TableCell>
    </TableRow>
  );
}
