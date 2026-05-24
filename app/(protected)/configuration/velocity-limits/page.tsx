"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
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
import { CopyableUuid } from "@/components/data/copyable-uuid";
import { ConfirmAction } from "@/components/data/confirm-action";
import { Can } from "@/components/rbac/can";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Permissions } from "@/lib/rbac/permissions";
import { velocityLimitsApi, type VelocityLimit } from "@/lib/api/modules/config";
import {
  velocityLimitSchema,
  velocityPeriods,
  transactionTypes,
  type VelocityLimitInput,
} from "@/lib/schemas/config";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";

export default function VelocityLimitsPage() {
  return (
    <RouteGuard permissions={[Permissions.VelocityLimitRead]}>
      <VelocityLimitsContent />
    </RouteGuard>
  );
}

function VelocityLimitsContent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [accountId, setAccountId] = React.useState("");
  const [committedAccountId, setCommittedAccountId] = React.useState("");
  const [pending, setPending] = React.useState<VelocityLimit | null>(null);

  const list = useQuery({
    queryKey: ["velocity-limits", "by-account", committedAccountId],
    queryFn: () => velocityLimitsApi.byAccount(committedAccountId),
    enabled: Boolean(committedAccountId),
  });

  const onDelete = async () => {
    if (!pending) return;
    try {
      await velocityLimitsApi.delete(pending.id);
      queryClient.invalidateQueries({ queryKey: ["velocity-limits"] });
      toast({ title: "Limit removed" });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: describeApiError(error),
      });
    }
    setPending(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Velocity limits"
        description="Per-account transaction velocity caps by period and transaction type."
        actions={
          <Can permissions={[Permissions.AdminConfigWrite]}>
            <NewLimitDialog defaultAccountId={committedAccountId} />
          </Can>
        }
      />
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <div className="space-y-1.5 min-w-[280px]">
            <Label className="text-xs uppercase text-muted-foreground">Account ID</Label>
            <Input value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="UUID" />
          </div>
          <Button onClick={() => setCommittedAccountId(accountId.trim())}>
            <Search className="h-4 w-4" /> Lookup
          </Button>
        </CardContent>
      </Card>
      {committedAccountId ? (
        <Card>
          <CardHeader>
            <CardTitle>
              Limits for{" "}
              <CopyableUuid value={committedAccountId} href={`/accounts/${committedAccountId}`} />
            </CardTitle>
            <CardDescription>Limits applied to this account across periods.</CardDescription>
          </CardHeader>
          <CardContent>
            {list.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : list.data?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>UUID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Max amount</TableHead>
                    <TableHead>Max count</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.data.map((limit) => (
                    <TableRow key={limit.id}>
                      <TableCell>
                        <CopyableUuid value={limit.id} />
                      </TableCell>
                      <TableCell>
                        <Badge variant="muted">{limit.transactionType}</Badge>
                      </TableCell>
                      <TableCell>{limit.period}</TableCell>
                      <TableCell>{limit.maxAmount}</TableCell>
                      <TableCell>{limit.maxCount ?? "-"}</TableCell>
                      <TableCell className="text-right">
                        <Can permissions={[Permissions.AdminConfigWrite]}>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Delete limit"
                            onClick={() => setPending(limit)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </Can>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                title="No limits set"
                description="No velocity limits configured for this account."
              />
            )}
          </CardContent>
        </Card>
      ) : null}
      <ConfirmAction
        open={Boolean(pending)}
        onOpenChange={(open) => !open && setPending(null)}
        title="Remove velocity limit"
        description="Account will no longer be subject to this limit."
        confirmLabel="Remove"
        destructive
        reasonLabel="Audit note (optional)"
        onConfirm={onDelete}
      />
    </div>
  );
}

function NewLimitDialog({ defaultAccountId }: { defaultAccountId: string }) {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const form = useForm<VelocityLimitInput>({
    resolver: zodResolver(velocityLimitSchema),
    defaultValues: {
      accountId: defaultAccountId,
      transactionType: transactionTypes[0],
      period: "DAILY",
      maxAmount: 1000,
    },
  });

  React.useEffect(() => {
    form.reset({
      accountId: defaultAccountId,
      transactionType: transactionTypes[0],
      period: "DAILY",
      maxAmount: 1000,
    });
  }, [defaultAccountId, form]);

  const create = useMutation({
    mutationFn: (input: VelocityLimitInput) =>
      velocityLimitsApi.create({
        accountId: input.accountId || undefined,
        transactionType: input.transactionType,
        period: input.period,
        maxAmount: input.maxAmount,
        maxCount: input.maxCount,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["velocity-limits"] });
      toast({ title: "Limit created" });
      form.reset();
      setOpen(false);
    },
    onError: (error) =>
      toast({
        variant: "destructive",
        title: "Could not create limit",
        description: describeApiError(error),
      }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> New limit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create velocity limit</DialogTitle>
          <DialogDescription>
            Set a transaction cap for a specific account, type, and period window.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={form.handleSubmit((v) => create.mutate(v))}>
          <Field label="Account ID" error={form.formState.errors.accountId?.message} className="md:col-span-2">
            <Input {...form.register("accountId")} placeholder="UUID" />
          </Field>
          <Field label="Transaction type">
            <Select
              value={form.watch("transactionType")}
              onValueChange={(v) => form.setValue("transactionType", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {transactionTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Period">
            <Select
              value={form.watch("period")}
              onValueChange={(v) => form.setValue("period", v as VelocityLimitInput["period"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {velocityPeriods.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Max amount" error={form.formState.errors.maxAmount?.message}>
            <Input type="number" step="0.01" {...form.register("maxAmount", { valueAsNumber: true })} />
          </Field>
          <Field label="Max count" error={form.formState.errors.maxCount?.message}>
            <Input type="number" {...form.register("maxCount", { valueAsNumber: true })} />
          </Field>
          <DialogFooter className="md:col-span-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending}>
              Create
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
