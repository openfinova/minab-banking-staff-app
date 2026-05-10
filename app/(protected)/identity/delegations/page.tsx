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
import { Textarea } from "@/components/ui/textarea";
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
import { Can } from "@/components/rbac/can";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Permissions } from "@/lib/rbac/permissions";
import { delegationsApi } from "@/lib/api/modules/delegations";
import { ConfirmAction } from "@/components/data/confirm-action";
import { StatusBadge } from "@/components/data/status-badge";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";
import { formatDateTime } from "@/lib/utils";
import {
  createDelegationSchema,
  type CreateDelegationInput,
} from "@/lib/schemas/delegations";

export default function DelegationsPage() {
  return (
    <RouteGuard permissions={[Permissions.AdminDoaRead]}>
      <DelegationsContent />
    </RouteGuard>
  );
}

function DelegationsContent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useQuery({
    queryKey: ["delegations", "active"],
    queryFn: delegationsApi.active,
  });
  const [revokeId, setRevokeId] = React.useState<string | null>(null);

  const onRevoke = async (reason: string) => {
    if (!revokeId) return;
    try {
      await delegationsApi.revoke(revokeId, { reason: reason || undefined });
      toast({ title: "Delegation revoked" });
      queryClient.invalidateQueries({ queryKey: ["delegations"] });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Revoke failed",
        description: describeApiError(error),
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Delegations"
        description="Active delegation of authority assignments between staff users."
        actions={
          <Can permissions={[Permissions.AdminDoaWrite]}>
            <CreateDelegationDialog />
          </Can>
        }
      />
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : data?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Delegator</TableHead>
                  <TableHead>Delegatee</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Window</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-xs">{d.delegatorUserId}</TableCell>
                    <TableCell className="font-mono text-xs">{d.delegateeUserId}</TableCell>
                    <TableCell>{d.resourceType ?? "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(d.startsAt)} &rarr; {formatDateTime(d.endsAt)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={d.active ? "ACTIVE" : "REVOKED"} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Can permissions={[Permissions.AdminDoaWrite]}>
                        {d.active ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRevokeId(d.id)}
                          >
                            Revoke
                          </Button>
                        ) : null}
                      </Can>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              title="No active delegations"
              description="Create one to grant temporary authority to another staff user."
            />
          )}
        </CardContent>
      </Card>
      <ConfirmAction
        open={Boolean(revokeId)}
        onOpenChange={(open) => !open && setRevokeId(null)}
        title="Revoke delegation"
        description="Specify a reason that will be recorded in the audit trail."
        confirmLabel="Revoke"
        destructive
        onConfirm={onRevoke}
      />
    </div>
  );
}

function CreateDelegationDialog() {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const form = useForm<CreateDelegationInput>({
    resolver: zodResolver(createDelegationSchema),
    defaultValues: {
      delegatorUserId: "",
      delegateeUserId: "",
      resourceType: "",
      startsAt: "",
      endsAt: "",
      reason: "",
    },
  });

  const create = useMutation({
    mutationFn: (input: CreateDelegationInput) =>
      delegationsApi.create({
        delegatorUserId: input.delegatorUserId,
        delegateeUserId: input.delegateeUserId,
        resourceType: input.resourceType || undefined,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        reason: input.reason || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delegations"] });
      toast({ title: "Delegation created" });
      form.reset();
      setOpen(false);
    },
    onError: (error) =>
      toast({
        variant: "destructive",
        title: "Could not create delegation",
        description: describeApiError(error),
      }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> New delegation
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New delegation</DialogTitle>
          <DialogDescription>
            Authorise another staff user to act on the delegator&apos;s behalf for the chosen
            resource type.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={form.handleSubmit((v) => create.mutate(v))}>
          <div className="space-y-1.5">
            <Label>Delegator user ID</Label>
            <Input {...form.register("delegatorUserId")} placeholder="UUID" />
            {form.formState.errors.delegatorUserId ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.delegatorUserId.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label>Delegatee user ID</Label>
            <Input {...form.register("delegateeUserId")} placeholder="UUID" />
            {form.formState.errors.delegateeUserId ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.delegateeUserId.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label>Resource type (optional)</Label>
            <Input {...form.register("resourceType")} placeholder="USER_PROVISIONING" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Starts at</Label>
              <Input type="datetime-local" {...form.register("startsAt")} />
              {form.formState.errors.startsAt ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.startsAt.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label>Ends at</Label>
              <Input type="datetime-local" {...form.register("endsAt")} />
              {form.formState.errors.endsAt ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.endsAt.message}
                </p>
              ) : null}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Textarea rows={2} {...form.register("reason")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending}>
              Create delegation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
