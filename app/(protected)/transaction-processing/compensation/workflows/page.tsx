"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PauseCircle, PlayCircle, CheckCircle, RefreshCw, SkipForward, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CopyableUuid } from "@/components/data/copyable-uuid";
import { ConfirmAction } from "@/components/data/confirm-action";
import { StatusBadge } from "@/components/data/status-badge";
import { Can } from "@/components/rbac/can";
import { RouteGuard } from "@/components/rbac/route-guard";
import { useToast } from "@/components/ui/use-toast";
import {
  compensationApi,
  type CompensationStepRow,
  type CompensationWorkflow,
} from "@/lib/api/modules/transaction-processing";
import { describeApiError } from "@/lib/api/errors";
import { useAuthStore } from "@/lib/auth/auth-store";
import { Permissions } from "@/lib/rbac/permissions";
import { formatDateTime } from "@/lib/utils";

type ActionKind = "pause" | "resume" | "force-complete" | "retry" | "skip";

function defaultReportRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export default function CompensationWorkflowsPage() {
  return (
    <RouteGuard permissions={[Permissions.CompensationRead]}>
      <CompensationWorkflowsContent />
    </RouteGuard>
  );
}

function CompensationWorkflowsContent() {
  const { start, end } = defaultReportRange();
  const [rs, setRs] = React.useState(start);
  const [re, setRe] = React.useState(end);
  const username = useAuthStore((s) => s.session?.user.username ?? "operator");
  const active = useQuery({
    queryKey: ["compensation", "active"],
    queryFn: compensationApi.active,
  });
  const failed = useQuery({
    queryKey: ["compensation", "failed"],
    queryFn: compensationApi.failed,
  });
  const report = useQuery({
    queryKey: ["compensation", "report", rs, re],
    queryFn: () => compensationApi.report(rs, re),
    enabled: Boolean(rs && re),
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [pending, setPending] = React.useState<{
    kind: ActionKind;
    workflowId: string;
    stepId?: string;
  } | null>(null);

  const onAction = async (action: { kind: ActionKind; workflowId: string; stepId?: string }, reason: string) => {
    try {
      switch (action.kind) {
        case "pause":
          await compensationApi.pause(action.workflowId, reason || "operator");
          break;
        case "resume":
          await compensationApi.resume(action.workflowId, username);
          break;
        case "force-complete":
          await compensationApi.forceComplete(action.workflowId, reason || "force", username);
          break;
        case "retry":
          if (!action.stepId) return;
          await compensationApi.retryStep(action.workflowId, action.stepId, username);
          break;
        case "skip":
          if (!action.stepId) return;
          await compensationApi.skipStep(
            action.workflowId,
            action.stepId,
            reason || "skip",
            username,
          );
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
        description="Monitoring and manual actions (mutations require payment:initiate)."
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Report window</CardTitle>
          <CardDescription>Open the compensation workflow backlog and throughput summary.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <DateRangeFilter
            startDate={rs}
            endDate={re}
            startLabel="Start"
            endLabel="End"
            onChange={({ startDate, endDate }) => {
              setRs(startDate);
              setRe(endDate);
            }}
          />
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        <ReportTile title="Active" value={report.data?.activeWorkflows ?? "-"} loading={report.isLoading} />
        <ReportTile title="Completed" value={report.data?.completedWorkflows ?? "-"} loading={report.isLoading} />
        <ReportTile
          title="Failed"
          value={report.data?.failedWorkflows ?? "-"}
          loading={report.isLoading}
          variant="destructive"
        />
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
        reasonRequired={
          pending?.kind === "force-complete" || pending?.kind === "skip" || pending?.kind === "pause"
        }
        onConfirm={async (reason) => {
          if (pending) await onAction(pending, reason);
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

function workflowKey(wf: CompensationWorkflow) {
  return wf.id ?? (wf as { workflowId?: string }).workflowId ?? "";
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
        <CardTitle className="flex items-center gap-2 text-base">
          <Workflow className="h-4 w-4" /> Workflows
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : workflows.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>UUID</TableHead>
                <TableHead>Transaction</TableHead>
                <TableHead>Steps</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workflows.map((wf) => {
                const wid = workflowKey(wf);
                return (
                  <TableRow key={wid}>
                    <TableCell>
                      <CopyableUuid value={wid} />
                    </TableCell>
                    <TableCell>
                      <CopyableUuid
                        value={wf.transactionId}
                        href={
                          wf.transactionId
                            ? `/transaction-processing/transactions/${wf.transactionId}`
                            : undefined
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {wf.completedSteps ?? 0}/{wf.totalSteps ?? 0}
                      {typeof wf.failedSteps === "number" && wf.failedSteps > 0 ? (
                        <span className="ml-1 text-destructive">({wf.failedSteps} failed)</span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={wf.status ?? ""} />
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {wf.createdAt ? formatDateTime(wf.createdAt) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        <StepsDialog
                          workflowId={wid}
                          onRetryStep={onRetryStep}
                          onSkipStep={onSkipStep}
                        />
                        <Can permissions={[Permissions.PaymentInitiate]}>
                          {wf.status === "PAUSED" ? (
                            <Button size="sm" variant="outline" onClick={() => onResume(wid)}>
                              <PlayCircle className="h-4 w-4" /> Resume
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => onPause(wid)}>
                              <PauseCircle className="h-4 w-4" /> Pause
                            </Button>
                          )}
                          <Button size="sm" variant="destructive" onClick={() => onForceComplete(wid)}>
                            <CheckCircle className="h-4 w-4" /> Force complete
                          </Button>
                        </Can>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <EmptyState title="No workflows" description="Nothing to display in this view right now." />
        )}
      </CardContent>
    </Card>
  );
}

function StepsDialog({
  workflowId,
  onRetryStep,
  onSkipStep,
}: {
  workflowId: string;
  onRetryStep: (w: string, s: string) => void;
  onSkipStep: (w: string, s: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const q = useQuery({
    queryKey: ["compensation", "steps", workflowId],
    queryFn: () => compensationApi.steps(workflowId),
    enabled: open && Boolean(workflowId),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          Steps
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Steps — <CopyableUuid value={workflowId} truncate />
          </DialogTitle>
        </DialogHeader>
        {q.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : q.data?.length ? (
          <div className="space-y-2">
            {q.data.map((step: CompensationStepRow) => (
              <div
                key={step.stepId ?? step.description}
                className="flex flex-col gap-2 rounded border p-2 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={String(step.status ?? "")} />
                  <span className="font-mono text-xs">{step.stepType}</span>
                  <span>{step.description}</span>
                </div>
                {step.errorMessage ? <p className="text-xs text-destructive">{step.errorMessage}</p> : null}
                <Can permissions={[Permissions.PaymentInitiate]}>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!step.stepId}
                      onClick={() => step.stepId && onRetryStep(workflowId, step.stepId)}
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Retry
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!step.stepId}
                      onClick={() => step.stepId && onSkipStep(workflowId, step.stepId)}
                    >
                      <SkipForward className="h-3.5 w-3.5" /> Skip
                    </Button>
                  </div>
                </Can>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No steps</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
