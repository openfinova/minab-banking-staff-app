"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PauseCircle,
  PlayCircle,
  CheckCircle,
  RefreshCw,
  SkipForward,
  Workflow as WorkflowIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmAction } from "@/components/data/confirm-action";
import { StatusBadge } from "@/components/data/status-badge";
import { Can } from "@/components/rbac/can";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Permissions } from "@/lib/rbac/permissions";
import {
  compensationApi,
  type CompensationWorkflow,
} from "@/lib/api/modules/operations";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";
import { formatDateTime } from "@/lib/utils";

type ActionKind = "pause" | "resume" | "force-complete" | "retry" | "skip";

export default function CompensationPage() {
  return (
    <RouteGuard permissions={[Permissions.CompensationRead]}>
      <CompensationContent />
    </RouteGuard>
  );
}

function CompensationContent() {
  const active = useQuery({
    queryKey: ["compensation", "active"],
    queryFn: compensationApi.active,
  });
  const failed = useQuery({
    queryKey: ["compensation", "failed"],
    queryFn: compensationApi.failed,
  });
  const report = useQuery({
    queryKey: ["compensation", "report"],
    queryFn: compensationApi.report,
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [pending, setPending] = React.useState<{
    kind: ActionKind;
    workflowId: string;
    stepId?: string;
  } | null>(null);

  const onAction = async (action: { kind: ActionKind; workflowId: string; stepId?: string }) => {
    try {
      switch (action.kind) {
        case "pause":
          await compensationApi.pause(action.workflowId);
          break;
        case "resume":
          await compensationApi.resume(action.workflowId);
          break;
        case "force-complete":
          await compensationApi.forceComplete(action.workflowId);
          break;
        case "retry":
          if (!action.stepId) return;
          await compensationApi.retryStep(action.workflowId, action.stepId);
          break;
        case "skip":
          if (!action.stepId) return;
          await compensationApi.skipStep(action.workflowId, action.stepId);
          break;
      }
      toast({ title: "Action complete" });
      queryClient.invalidateQueries({ queryKey: ["compensation"] });
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
        title="Compensation workflows"
        description="Monitor and intervene in saga / compensation orchestrations."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <ReportTile title="Active" value={report.data?.totalActive ?? "-"} loading={report.isLoading} />
        <ReportTile title="Completed" value={report.data?.totalCompleted ?? "-"} loading={report.isLoading} />
        <ReportTile title="Failed" value={report.data?.totalFailed ?? "-"} loading={report.isLoading} variant="destructive" />
      </div>
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="failed">Failed</TabsTrigger>
        </TabsList>
        <TabsContent value="active">
          <WorkflowsTable
            workflows={active.data ?? []}
            isLoading={active.isLoading}
            onPause={(workflowId) => setPending({ kind: "pause", workflowId })}
            onResume={(workflowId) => setPending({ kind: "resume", workflowId })}
            onForceComplete={(workflowId) => setPending({ kind: "force-complete", workflowId })}
            onRetryStep={(workflowId, stepId) => setPending({ kind: "retry", workflowId, stepId })}
            onSkipStep={(workflowId, stepId) => setPending({ kind: "skip", workflowId, stepId })}
          />
        </TabsContent>
        <TabsContent value="failed">
          <WorkflowsTable
            workflows={failed.data ?? []}
            isLoading={failed.isLoading}
            onPause={() => undefined}
            onResume={(workflowId) => setPending({ kind: "resume", workflowId })}
            onForceComplete={(workflowId) => setPending({ kind: "force-complete", workflowId })}
            onRetryStep={(workflowId, stepId) => setPending({ kind: "retry", workflowId, stepId })}
            onSkipStep={(workflowId, stepId) => setPending({ kind: "skip", workflowId, stepId })}
          />
        </TabsContent>
      </Tabs>
      <ConfirmAction
        open={Boolean(pending)}
        onOpenChange={(open) => !open && setPending(null)}
        title={
          pending?.kind === "pause"
            ? "Pause workflow"
            : pending?.kind === "resume"
              ? "Resume workflow"
              : pending?.kind === "force-complete"
                ? "Force complete workflow"
                : pending?.kind === "retry"
                  ? "Retry step"
                  : "Skip step"
        }
        description="Operations interventions are recorded in the audit log."
        confirmLabel="Confirm"
        destructive={pending?.kind === "force-complete" || pending?.kind === "skip"}
        reasonRequired={pending?.kind === "force-complete" || pending?.kind === "skip"}
        onConfirm={async () => {
          if (pending) await onAction(pending);
          setPending(null);
        }}
      />
    </div>
  );
}

function ReportTile({
  title,
  value,
  loading,
  variant,
}: {
  title: string;
  value: number | string;
  loading: boolean;
  variant?: "destructive" | "default";
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-7 w-16" />
        ) : (
          <p className={`text-3xl font-bold ${variant === "destructive" ? "text-destructive" : ""}`}>
            {value}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function WorkflowsTable({
  workflows,
  isLoading,
  onPause,
  onResume,
  onForceComplete,
  onRetryStep,
  onSkipStep,
}: {
  workflows: CompensationWorkflow[];
  isLoading: boolean;
  onPause: (workflowId: string) => void;
  onResume: (workflowId: string) => void;
  onForceComplete: (workflowId: string) => void;
  onRetryStep: (workflowId: string, stepId: string) => void;
  onSkipStep: (workflowId: string, stepId: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <WorkflowIcon className="h-4 w-4" /> Workflows
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : workflows.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workflow</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workflows.map((wf) => (
                <React.Fragment key={wf.workflowId}>
                  <TableRow>
                    <TableCell className="font-mono text-xs">{wf.workflowId}</TableCell>
                    <TableCell>{wf.transactionType}</TableCell>
                    <TableCell>
                      <StatusBadge status={wf.status} />
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {formatDateTime(wf.startedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Can permissions={[Permissions.PaymentInitiate]}>
                        <div className="flex flex-wrap justify-end gap-1">
                          {wf.status === "PAUSED" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onResume(wf.workflowId)}
                            >
                              <PlayCircle className="h-4 w-4" /> Resume
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onPause(wf.workflowId)}
                            >
                              <PauseCircle className="h-4 w-4" /> Pause
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => onForceComplete(wf.workflowId)}
                          >
                            <CheckCircle className="h-4 w-4" /> Force complete
                          </Button>
                        </div>
                      </Can>
                    </TableCell>
                  </TableRow>
                  {wf.steps?.length ? (
                    <TableRow>
                      <TableCell colSpan={5} className="bg-muted/30 p-3">
                        <div className="space-y-2">
                          {wf.steps.map((step) => (
                            <div
                              key={step.stepId}
                              className="flex items-center justify-between gap-2 rounded border bg-background p-2 text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <StatusBadge status={step.status} />
                                <span className="font-medium">{step.name}</span>
                                {step.errorMessage ? (
                                  <span className="text-destructive">{step.errorMessage}</span>
                                ) : null}
                              </div>
                              <Can permissions={[Permissions.PaymentInitiate]}>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => onRetryStep(wf.workflowId, step.stepId)}
                                  >
                                    <RefreshCw className="h-3.5 w-3.5" /> Retry
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => onSkipStep(wf.workflowId, step.stepId)}
                                  >
                                    <SkipForward className="h-3.5 w-3.5" /> Skip
                                  </Button>
                                </div>
                              </Can>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState title="No workflows" description="Nothing to display in this view right now." />
        )}
      </CardContent>
    </Card>
  );
}
