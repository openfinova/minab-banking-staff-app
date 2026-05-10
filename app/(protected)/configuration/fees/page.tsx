"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
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
import { ConfirmAction } from "@/components/data/confirm-action";
import { Can } from "@/components/rbac/can";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Permissions } from "@/lib/rbac/permissions";
import { feesApi, type FeeRule } from "@/lib/api/modules/config";
import {
  customerTiers,
  feeRuleSchema,
  feeTypes,
  transactionTypes,
  type FeeRuleInput,
} from "@/lib/schemas/config";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";

export default function FeesPage() {
  return (
    <RouteGuard permissions={[Permissions.FeeRead]}>
      <FeesContent />
    </RouteGuard>
  );
}

function FeesContent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const list = useQuery({ queryKey: ["fees", "rules"], queryFn: feesApi.rules });
  const [pending, setPending] = React.useState<FeeRule | null>(null);

  const onDelete = async () => {
    if (!pending) return;
    try {
      await feesApi.deleteRule(pending.id);
      queryClient.invalidateQueries({ queryKey: ["fees", "rules"] });
      toast({ title: "Fee rule deleted" });
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
        title="Fee rules"
        description="Manage transaction fee policy: fixed, percentage, and tiered."
        actions={
          <Can permissions={[Permissions.AdminConfigWrite]}>
            <NewFeeDialog />
          </Can>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Active rules</CardTitle>
          <CardDescription>Affects fee assessment in transaction processing.</CardDescription>
        </CardHeader>
        <CardContent>
          {list.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : list.data?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Fixed</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Min/Max</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.data.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <Badge variant="muted">{rule.transactionType}</Badge>
                    </TableCell>
                    <TableCell>{rule.customerTier ?? "-"}</TableCell>
                    <TableCell>{rule.feeType}</TableCell>
                    <TableCell>{rule.fixedAmount ?? "-"}</TableCell>
                    <TableCell>{rule.percentageRate !== undefined ? `${rule.percentageRate}%` : "-"}</TableCell>
                    <TableCell>
                      {rule.minFee ?? "-"} / {rule.maxFee ?? "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Can permissions={[Permissions.AdminConfigWrite]}>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Delete rule"
                          onClick={() => setPending(rule)}
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
            <EmptyState title="No fee rules" description="Create a rule to start charging fees." />
          )}
        </CardContent>
      </Card>
      <ConfirmAction
        open={Boolean(pending)}
        onOpenChange={(open) => !open && setPending(null)}
        title="Delete fee rule"
        description="This rule will no longer apply to new transactions."
        confirmLabel="Delete"
        destructive
        reasonLabel="Audit note (optional)"
        onConfirm={onDelete}
      />
    </div>
  );
}

function NewFeeDialog() {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const form = useForm<FeeRuleInput>({
    resolver: zodResolver(feeRuleSchema),
    defaultValues: {
      transactionType: transactionTypes[0],
      customerTier: customerTiers[0],
      feeType: "PERCENTAGE",
      percentageRate: 0,
    },
  });
  const create = useMutation({
    mutationFn: (input: FeeRuleInput) =>
      feesApi.createRule({
        transactionType: input.transactionType,
        customerTier: input.customerTier || undefined,
        feeType: input.feeType,
        fixedAmount: input.fixedAmount,
        percentageRate: input.percentageRate,
        minFee: input.minFee,
        maxFee: input.maxFee,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fees", "rules"] });
      toast({ title: "Fee rule created" });
      form.reset();
      setOpen(false);
    },
    onError: (error) =>
      toast({
        variant: "destructive",
        title: "Could not create rule",
        description: describeApiError(error),
      }),
  });
  const feeType = form.watch("feeType");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> New fee rule
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create fee rule</DialogTitle>
          <DialogDescription>
            Affects how fees are assessed for the chosen transaction type and tier.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={form.handleSubmit((v) => create.mutate(v))}>
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
          <Field label="Customer tier">
            <Select
              value={form.watch("customerTier") || "ANY"}
              onValueChange={(v) =>
                form.setValue("customerTier", v === "ANY" ? "" : v)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ANY">Any</SelectItem>
                {customerTiers.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Fee type">
            <Select
              value={feeType}
              onValueChange={(v) => form.setValue("feeType", v as FeeRuleInput["feeType"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {feeTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {feeType === "FIXED" ? (
            <Field
              label="Fixed amount"
              error={form.formState.errors.fixedAmount?.message}
            >
              <Input
                type="number"
                step="0.01"
                {...form.register("fixedAmount", { valueAsNumber: true })}
              />
            </Field>
          ) : (
            <Field
              label="Percentage rate"
              error={form.formState.errors.percentageRate?.message}
            >
              <Input
                type="number"
                step="0.01"
                {...form.register("percentageRate", { valueAsNumber: true })}
              />
            </Field>
          )}
          <Field label="Min fee">
            <Input
              type="number"
              step="0.01"
              {...form.register("minFee", { valueAsNumber: true })}
            />
          </Field>
          <Field label="Max fee" error={form.formState.errors.maxFee?.message}>
            <Input
              type="number"
              step="0.01"
              {...form.register("maxFee", { valueAsNumber: true })}
            />
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
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
