"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
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
import { CopyableUuid } from "@/components/data/copyable-uuid";
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
  const resourceTypesQuery = useQuery({
    queryKey: ["approval-workflows", "resource-types"],
    queryFn: approvalWorkflowsApi.resourceTypes,
  });
  const resourceTypeOptions =
    resourceTypesQuery.data?.length ? resourceTypesQuery.data : ["USER_PROVISIONING"];
  const [resourceType, setResourceType] = React.useState("USER_PROVISIONING");
  const [filterDraft, setFilterDraft] = React.useState(resourceType);
  const [detailId, setDetailId] = React.useState<string | null>(null);

  const query = useQuery({
    queryKey: ["approval-workflows", resourceType],
    queryFn: () => approvalWorkflowsApi.listByResource(resourceType),
    enabled: Boolean(resourceType),
  });

  const detailQuery = useQuery({
    queryKey: ["approval-workflows", "detail", detailId],
    queryFn: () => approvalWorkflowsApi.get(detailId!),
    enabled: Boolean(detailId),
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
      if (kind === "cancel") await approvalWorkflowsApi.cancel(id);
      const done =
        kind === "approve" ? "approved" : kind === "reject" ? "rejected" : "cancelled";
      toast({ title: `Workflow ${done}` });
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
        actions={
          <Can permissions={[Permissions.AdminDoaWrite]}>
            <StartWorkflowDialog
              resourceTypeOptions={resourceTypeOptions}
              defaultResourceType={resourceType}
            />
          </Can>
        }
      />
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase text-muted-foreground">Resource type</Label>
            <Select
              value={filterDraft}
              onValueChange={setFilterDraft}
              disabled={resourceTypesQuery.isLoading}
            >
              <SelectTrigger className="w-[260px]">
                <SelectValue placeholder="Resource type" />
              </SelectTrigger>
              <SelectContent>
                {resourceTypeOptions.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                  <TableHead>UUID</TableHead>
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
                    onView={() => setDetailId(wf.id)}
                    onAction={(kind) => setPending({ id: wf.id, kind })}
                  />
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              title="No workflows for this resource type"
              description="Try another resource type, or use Start workflow to create one."
            />
          )}
        </CardContent>
      </Card>
      <Dialog open={Boolean(detailId)} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Workflow detail</DialogTitle>
            <DialogDescription>
              Latest server state including each step in the chain.
            </DialogDescription>
          </DialogHeader>
          {detailQuery.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : detailQuery.data ? (
            <WorkflowDetailBody wf={detailQuery.data} />
          ) : (
            <p className="text-sm text-muted-foreground">Could not load workflow.</p>
          )}
        </DialogContent>
      </Dialog>
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
        description={
          pending?.kind === "cancel"
            ? "This cancels the workflow on the server. No comment is accepted for this action."
            : "Comment is recorded on the timeline (max 500 characters)."
        }
        confirmLabel={
          pending?.kind === "approve"
            ? "Approve"
            : pending?.kind === "reject"
              ? "Reject"
              : "Cancel workflow"
        }
        destructive={pending?.kind !== "approve"}
        reasonLabel={pending?.kind === "cancel" ? undefined : "Comment"}
        reasonRequired={pending?.kind === "reject"}
        onConfirm={async (comment) => {
          if (pending) await onAction(pending.kind, pending.id, comment);
        }}
      />
    </div>
  );
}

function WorkflowDetailBody({ wf }: { wf: ApprovalWorkflow }) {
  return (
    <div className="space-y-3 text-sm">
      <div className="grid gap-1">
        <span className="text-muted-foreground">ID</span>
        <CopyableUuid value={wf.id} truncate={false} />
      </div>
      <div className="grid gap-1">
        <span className="text-muted-foreground">Resource</span>
        <span>
          {wf.resourceType} / <CopyableUuid value={wf.resourceId} />
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Status</span>
        <StatusBadge status={wf.status} />
      </div>
      <div className="grid gap-1">
        <span className="text-muted-foreground">Steps</span>
        <ol className="list-decimal space-y-2 pl-4">
          {wf.steps.map((s) => (
            <li key={s.stepNumber} className="text-xs">
              <div>
                Step {s.stepNumber}: {s.requiredRole}{" "}
                <StatusBadge status={s.status} />
              </div>
              {s.actorUserId ? (
                <div className="text-muted-foreground">
                  Actor{" "}
                  <CopyableUuid
                    value={s.actorUserId}
                    href={`/identity/users/${s.actorUserId}`}
                  />
                </div>
              ) : null}
              {s.comment ? <div className="text-muted-foreground">{s.comment}</div> : null}
              {s.decidedAt ? (
                <div className="text-muted-foreground">{formatDateTime(s.decidedAt)}</div>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function StartWorkflowDialog({
  resourceTypeOptions,
  defaultResourceType,
}: {
  resourceTypeOptions: string[];
  defaultResourceType: string;
}) {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [resourceType, setResourceType] = React.useState(defaultResourceType);
  const [resourceId, setResourceId] = React.useState("");
  const [rolesCsv, setRolesCsv] = React.useState("");

  React.useEffect(() => {
    if (open) setResourceType(defaultResourceType);
  }, [open, defaultResourceType]);

  const start = useMutation({
    mutationFn: () => {
      const requiredGlRolesInOrder = rolesCsv
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (!requiredGlRolesInOrder.length) {
        throw new Error("Enter at least one GL role in order (comma-separated).");
      }
      return approvalWorkflowsApi.create({
        resourceType: resourceType.trim(),
        resourceId: resourceId.trim(),
        requiredGlRolesInOrder,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval-workflows"] });
      toast({ title: "Workflow started" });
      setResourceId("");
      setRolesCsv("");
      setOpen(false);
    },
    onError: (error) =>
      toast({
        variant: "destructive",
        title: "Could not start workflow",
        description: error instanceof Error ? error.message : describeApiError(error),
      }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Start workflow
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start approval workflow</DialogTitle>
          <DialogDescription>
            Starts a governed chain: provide the resource and an ordered list of GL roles (one approver step each).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label>Resource type</Label>
            <Select value={resourceType} onValueChange={setResourceType}>
              <SelectTrigger>
                <SelectValue placeholder="Resource type" />
              </SelectTrigger>
              <SelectContent>
                {resourceTypeOptions.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Resource ID</Label>
            <Input
              className="font-mono text-xs"
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
              placeholder="Logical id for the governed resource"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Required GL roles (in order)</Label>
            <Input
              value={rolesCsv}
              onChange={(e) => setRolesCsv(e.target.value)}
              placeholder="MANAGER, CFO"
            />
            <p className="text-xs text-muted-foreground">Comma-separated; order defines the chain.</p>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button
            type="button"
            loading={start.isPending}
            onClick={() => start.mutate()}
            disabled={!resourceType.trim() || !resourceId.trim()}
          >
            Start
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ApprovalRow({
  wf,
  onView,
  onAction,
}: {
  wf: ApprovalWorkflow;
  onView: () => void;
  onAction: (kind: ActionKind) => void;
}) {
  return (
    <TableRow>
      <TableCell>
        <CopyableUuid value={wf.id} />
      </TableCell>
      <TableCell>
        <CopyableUuid value={wf.resourceId} />
      </TableCell>
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
        <div className="flex flex-wrap justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={onView}>
            Details
          </Button>
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
