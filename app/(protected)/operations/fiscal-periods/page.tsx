"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ConfirmAction } from "@/components/data/confirm-action";
import { StatusBadge } from "@/components/data/status-badge";
import { Can } from "@/components/rbac/can";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Permissions } from "@/lib/rbac/permissions";
import { useAuthStore } from "@/lib/auth/auth-store";
import { fiscalPeriodsApi, type FiscalPeriod } from "@/lib/api/modules/operations";
import {
  createFiscalPeriodSchema,
  type CreateFiscalPeriodInput,
} from "@/lib/schemas/operations";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";
import { formatDate } from "@/lib/utils";

export default function FiscalPeriodsPage() {
  return (
    <RouteGuard permissions={[Permissions.GlRead]}>
      <FiscalPeriodsContent />
    </RouteGuard>
  );
}

function FiscalPeriodsContent() {
  const queryClient = useQueryClient();
  const session = useAuthStore((s) => s.session);
  const { toast } = useToast();
  const list = useQuery({ queryKey: ["fiscal-periods"], queryFn: fiscalPeriodsApi.list });
  const [pending, setPending] = React.useState<{
    period: FiscalPeriod;
    kind: "close" | "reopen";
  } | null>(null);

  const actorId =
    session?.user.username?.trim() ||
    session?.user.email?.trim() ||
    session?.user.subject?.trim() ||
    "";

  const onAction = async (reason: string) => {
    if (!pending) return;
    const { period, kind } = pending;
    const trimmedReason = reason.trim();

    if (!actorId) {
      toast({
        variant: "destructive",
        title: "Missing user identity",
        description: "Sign in again, or ensure your username is available for audit (closedBy / reopenedBy).",
      });
      return;
    }
    if (!trimmedReason) {
      toast({
        variant: "destructive",
        title: "Reason required",
        description: "Enter a brief reason before confirming.",
      });
      return;
    }
    if (kind === "reopen" && trimmedReason.length < 10) {
      toast({
        variant: "destructive",
        title: "Reopen justification too short",
        description: "The server requires at least 10 characters for reopen reasons.",
      });
      return;
    }

    try {
      if (kind === "close") {
        await fiscalPeriodsApi.close(period.id, { closedBy: actorId, reason: trimmedReason });
        toast({
          title: "Period closed",
          description: `${period.name}: status will show CLOSED and posting is BLOCKED.`,
        });
      } else {
        await fiscalPeriodsApi.reopen(period.id, { reopenedBy: actorId, reason: trimmedReason });
        toast({
          title: "Period reopened",
          description: `${period.name} is OPEN again for postings within its dates.`,
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["fiscal-periods"] });
      setPending(null);
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
        title="Fiscal periods"
        description="Open, close, and reopen general ledger reporting periods."
        actions={
          <Can permissions={[Permissions.GlApprove]}>
            <NewFiscalPeriodDialog />
          </Can>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Periods</CardTitle>
          <CardDescription>Posting eligibility is computed against this calendar.</CardDescription>
        </CardHeader>
        <CardContent>
          {list.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : list.data?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Period #</TableHead>
                  <TableHead>Window</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Posting</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.data.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>{p.fiscalYear}</TableCell>
                    <TableCell>{p.periodNumber}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {formatDate(p.startDate)} - {formatDate(p.endDate)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={p.status} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={p.postingAllowed ? "ALLOWED" : "BLOCKED"}
                        variantOverride={p.postingAllowed ? "success" : "destructive"}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Can permissions={[Permissions.GlApprove]}>
                        <div className="flex justify-end gap-1">
                          {p.status === "OPEN" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setPending({ period: p, kind: "close" })}
                            >
                              Close
                            </Button>
                          ) : p.status === "CLOSED" || p.status === "REOPENED" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setPending({ period: p, kind: "reopen" })}
                            >
                              Reopen
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </Can>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              title="No fiscal periods configured"
              description="Create a fiscal period to start posting transactions."
            />
          )}
        </CardContent>
      </Card>
      <ConfirmAction
        open={Boolean(pending)}
        onOpenChange={(open) => !open && setPending(null)}
        title={pending?.kind === "close" ? "Close fiscal period" : "Reopen fiscal period"}
        description={
          pending?.kind === "close" ? (
            <>
              Close <strong className="font-medium text-foreground">{pending.period.name}</strong> (
              {pending.period.fiscalYear} / period {pending.period.periodNumber}
              )? Posting into this window will be blocked until it is reopened.
            </>
          ) : (
            <>
              Reopen <strong className="font-medium text-foreground">{pending?.period.name}</strong>? New postings within
              this period will be allowed. Provide a substantive justification (
              <span className="font-mono">≥ 10 characters</span>).
            </>
          )
        }
        confirmLabel={pending?.kind === "close" ? "Close period" : "Reopen period"}
        destructive={pending?.kind === "close"}
        reasonRequired
        reasonPlaceholder={
          pending?.kind === "close" ? "e.g. January 2026 month-end review complete." : "Regulatory justification (min. 10 characters)."
        }
        onConfirm={onAction}
      />
    </div>
  );
}

function NewFiscalPeriodDialog() {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const form = useForm<CreateFiscalPeriodInput>({
    resolver: zodResolver(createFiscalPeriodSchema),
    defaultValues: {
      name: "",
      startDate: "",
      endDate: "",
      fiscalYear: new Date().getFullYear(),
      periodNumber: 1,
    },
  });
  const create = useMutation({
    mutationFn: (input: CreateFiscalPeriodInput) =>
      fiscalPeriodsApi.create({
        name: input.name,
        startDate: input.startDate,
        endDate: input.endDate,
        fiscalYear: input.fiscalYear,
        periodNumber: input.periodNumber,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fiscal-periods"] });
      toast({ title: "Period created" });
      form.reset();
      setOpen(false);
    },
    onError: (error) =>
      toast({
        variant: "destructive",
        title: "Could not create period",
        description: describeApiError(error),
      }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> New period
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create fiscal period</DialogTitle>
          <DialogDescription>
            Defines an accounting reporting period with explicit start/end dates.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={form.handleSubmit((v) => create.mutate(v))}>
          <Field label="Name" error={form.formState.errors.name?.message} className="md:col-span-2">
            <Input maxLength={50} {...form.register("name")} />
          </Field>
          <Field label="Fiscal year" error={form.formState.errors.fiscalYear?.message}>
            <Input type="number" {...form.register("fiscalYear", { valueAsNumber: true })} />
          </Field>
          <Field label="Period number" error={form.formState.errors.periodNumber?.message}>
            <Input
              type="number"
              min={1}
              max={13}
              {...form.register("periodNumber", { valueAsNumber: true })}
            />
          </Field>
          <Field label="Start date" error={form.formState.errors.startDate?.message}>
            <Input type="date" {...form.register("startDate")} />
          </Field>
          <Field label="End date" error={form.formState.errors.endDate?.message}>
            <Input type="date" {...form.register("endDate")} />
          </Field>
          <DialogFooter className="md:col-span-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending}>
              Create period
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
