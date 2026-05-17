"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { StaffUserField } from "@/components/identity/staff-user-field";

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
  const txTypesQuery = useQuery({
    queryKey: ["delegations", "transaction-types"],
    queryFn: delegationsApi.transactionTypes,
  });
  const transactionTypeOptions =
    txTypesQuery.data?.length ? txTypesQuery.data : ["USER_PROVISIONING"];
  const [activeDraft, setActiveDraft] = React.useState({
    delegateeUserId: "",
    transactionType: transactionTypeOptions[0],
  });

  React.useEffect(() => {
    const opts = txTypesQuery.data;
    if (!opts?.length) return;
    setActiveDraft((s) =>
      opts.includes(s.transactionType) ? s : { ...s, transactionType: opts[0] },
    );
  }, [txTypesQuery.data]);
  const [activeLookup, setActiveLookup] = React.useState<{
    delegateeUserId: string;
    transactionType: string;
  } | null>(null);

  const [browseUserId, setBrowseUserId] = React.useState("");
  const [browseKind, setBrowseKind] = React.useState<"outgoing" | "incoming" | null>(null);

  const activeQuery = useQuery({
    queryKey: ["delegations", "active", activeLookup?.delegateeUserId, activeLookup?.transactionType],
    queryFn: () =>
      delegationsApi.active(activeLookup!.delegateeUserId, activeLookup!.transactionType.trim()),
    enabled:
      Boolean(activeLookup) &&
      activeLookup!.delegateeUserId.trim().length > 0 &&
      activeLookup!.transactionType.trim().length > 0,
  });

  const browseQuery = useQuery({
    queryKey: ["delegations", browseKind, browseUserId],
    queryFn: () =>
      browseKind === "outgoing"
        ? delegationsApi.outgoing(browseUserId)
        : delegationsApi.incoming(browseUserId),
    enabled: Boolean(browseKind && browseUserId.trim().length > 0),
  });

  const [revokeId, setRevokeId] = React.useState<string | null>(null);

  const onRevoke = async () => {
    if (!revokeId) return;
    try {
      await delegationsApi.revoke(revokeId);
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

  const runActiveLookup = () => {
    const delegateeUserId = activeDraft.delegateeUserId.trim();
    const transactionType = activeDraft.transactionType.trim();
    if (!delegateeUserId) {
      toast({
        variant: "destructive",
        title: "Delegatee required",
        description: "Enter a staff user id (UUID, username, or email fragment).",
      });
      return;
    }
    if (!transactionType) {
      toast({
        variant: "destructive",
        title: "Transaction type required",
        description: "Enter the transaction type to match active delegations.",
      });
      return;
    }
    setActiveLookup({ delegateeUserId, transactionType });
  };

  const runBrowse = (kind: "outgoing" | "incoming") => {
    const id = browseUserId.trim();
    if (!id) {
      toast({
        variant: "destructive",
        title: "Staff user required",
        description: "Enter a staff user id (UUID, username, or email fragment).",
      });
      return;
    }
    setBrowseKind(kind);
  };

  const delegationTable = (rows: typeof browseQuery.data, loading: boolean, emptyHint: string) =>
    loading ? (
      <Skeleton className="h-32 w-full" />
    ) : rows?.length ? (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>From</TableHead>
            <TableHead>To</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Window</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((d) => (
            <TableRow key={d.id}>
              <TableCell className="text-xs">
                <div className="font-mono">{d.delegatedFromUserId}</div>
                <div className="text-muted-foreground">{d.delegatedFromUsername ?? ""}</div>
              </TableCell>
              <TableCell className="text-xs">
                <div className="font-mono">{d.delegatedToUserId}</div>
                <div className="text-muted-foreground">{d.delegatedToUsername ?? ""}</div>
              </TableCell>
              <TableCell>{d.transactionType ?? "-"}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {formatDateTime(d.validFrom)} &rarr; {formatDateTime(d.validUntil)}
              </TableCell>
              <TableCell>
                <StatusBadge status={d.status} />
              </TableCell>
              <TableCell className="text-right">
                <Can permissions={[Permissions.AdminDoaWrite]}>
                  {d.status === "ACTIVE" ? (
                    <Button variant="outline" size="sm" onClick={() => setRevokeId(d.id)}>
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
      <EmptyState title="No delegations" description={emptyHint} />
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Delegations"
        description="Delegation of authority between staff users: lookup active chains, browse by user, or create."
        actions={
          <Can permissions={[Permissions.AdminDoaWrite]}>
            <CreateDelegationDialog transactionTypeOptions={transactionTypeOptions} />
          </Can>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Active for delegatee and transaction type</CardTitle>
          <CardDescription>
            Matches the supervisory check API: active delegations where the given user is the
            delegatee for a specific transaction type.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <StaffUserField
              id="delegatee-user"
              label="Delegatee user"
              className="space-y-1.5 md:w-[320px]"
              inputClassName="font-mono"
              value={activeDraft.delegateeUserId}
              onChange={(v) => setActiveDraft((s) => ({ ...s, delegateeUserId: v }))}
            />
            <div className="space-y-1.5">
              <Label>Transaction type</Label>
              <Select
                value={activeDraft.transactionType}
                onValueChange={(v) =>
                  setActiveDraft((s) => ({ ...s, transactionType: v }))
                }
                disabled={txTypesQuery.isLoading}
              >
                <SelectTrigger className="md:w-[260px]">
                  <SelectValue placeholder="Choose transaction type" />
                </SelectTrigger>
                <SelectContent>
                  {transactionTypeOptions.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="button" onClick={runActiveLookup}>
              <Search className="h-4 w-4" /> Lookup
            </Button>
          </div>
          {activeLookup
            ? delegationTable(
                activeQuery.data,
                activeQuery.isLoading,
                "No active delegations match this delegatee and transaction type.",
              )
            : (
              <p className="text-sm text-muted-foreground">
                Enter a staff delegatee (UUID, username, or email) and transaction type, then run lookup.
              </p>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Browse by staff user</CardTitle>
          <CardDescription>Outgoing (granted by) or incoming (received by) delegations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <StaffUserField
              id="browse-staff-user"
              label="Staff user"
              className="space-y-1.5 md:w-[320px]"
              inputClassName="font-mono"
              value={browseUserId}
              onChange={setBrowseUserId}
            />
            <Button type="button" variant="secondary" onClick={() => runBrowse("outgoing")}>
              Load outgoing
            </Button>
            <Button type="button" variant="secondary" onClick={() => runBrowse("incoming")}>
              Load incoming
            </Button>
          </div>
          {browseKind
            ? delegationTable(
                browseQuery.data,
                browseQuery.isFetching,
                browseKind === "outgoing"
                  ? "This user has not delegated authority to others (or none are returned)."
                  : "No delegations target this user as delegatee.",
              )
            : (
              <p className="text-sm text-muted-foreground">
                Enter a staff user (UUID, username, or email) and choose outgoing or incoming.
              </p>
            )}
        </CardContent>
      </Card>

      <ConfirmAction
        open={Boolean(revokeId)}
        onOpenChange={(open) => !open && setRevokeId(null)}
        title="Revoke delegation"
        description="This sets the delegation to revoked. The server does not accept an optional reason on this call."
        confirmLabel="Revoke"
        destructive
        onConfirm={async () => onRevoke()}
      />
    </div>
  );
}

function CreateDelegationDialog({
  transactionTypeOptions,
}: {
  transactionTypeOptions: string[];
}) {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const form = useForm<CreateDelegationInput>({
    resolver: zodResolver(createDelegationSchema),
    defaultValues: {
      delegatedFromUserId: "",
      delegatedToUserId: "",
      transactionType: "USER_PROVISIONING",
      validFrom: "",
      validUntil: "",
      currency: "",
      approvalLimit: "",
      actingGlApprovalRole: "",
    },
  });

  React.useEffect(() => {
    if (!open || !transactionTypeOptions.length) return;
    const cur = form.getValues("transactionType")?.trim();
    if (!cur || !transactionTypeOptions.includes(cur)) {
      form.setValue("transactionType", transactionTypeOptions[0]);
    }
  }, [open, transactionTypeOptions, form]);

  const create = useMutation({
    mutationFn: (input: CreateDelegationInput) => {
      const limitRaw = input.approvalLimit?.trim();
      const approvalLimit =
        limitRaw && Number.isFinite(Number(limitRaw)) ? Number(limitRaw) : undefined;
      return delegationsApi.create({
        delegatedFromUserId: input.delegatedFromUserId,
        delegatedToUserId: input.delegatedToUserId,
        transactionType: input.transactionType.trim(),
        validFrom: input.validFrom,
        validUntil: input.validUntil?.trim() || undefined,
        currency: input.currency?.trim() || undefined,
        approvalLimit,
        actingGlApprovalRole: input.actingGlApprovalRole?.trim() || undefined,
      });
    },
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
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New delegation</DialogTitle>
          <DialogDescription>
            Delegated-from and delegated-to must be STAFF users. Enter a UUID, username, or email
            fragment that uniquely resolves on the server; transaction type and validity window are
            required. Optional monetary limit requires a 3-letter currency.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={form.handleSubmit((v) => create.mutate(v))}>
          <Controller
            name="delegatedFromUserId"
            control={form.control}
            render={({ field, fieldState }) => (
              <div className="space-y-1.5">
                <StaffUserField
                  id="delegation-from"
                  label="Delegated from user"
                  value={field.value}
                  onChange={field.onChange}
                  inputClassName="font-mono"
                />
                {fieldState.error ? (
                  <p className="text-xs text-destructive">{fieldState.error.message}</p>
                ) : null}
              </div>
            )}
          />
          <Controller
            name="delegatedToUserId"
            control={form.control}
            render={({ field, fieldState }) => (
              <div className="space-y-1.5">
                <StaffUserField
                  id="delegation-to"
                  label="Delegated to user"
                  value={field.value}
                  onChange={field.onChange}
                  inputClassName="font-mono"
                />
                {fieldState.error ? (
                  <p className="text-xs text-destructive">{fieldState.error.message}</p>
                ) : null}
              </div>
            )}
          />
          <div className="space-y-1.5">
            <Label>Transaction type</Label>
            <Controller
              name="transactionType"
              control={form.control}
              render={({ field, fieldState }) => (
                <>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose transaction type" />
                    </SelectTrigger>
                    <SelectContent>
                      {transactionTypeOptions.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.error ? (
                    <p className="text-xs text-destructive">{fieldState.error.message}</p>
                  ) : null}
                </>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Valid from</Label>
              <Input type="datetime-local" {...form.register("validFrom")} />
              {form.formState.errors.validFrom ? (
                <p className="text-xs text-destructive">{form.formState.errors.validFrom.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label>Valid until (optional)</Label>
              <Input type="datetime-local" {...form.register("validUntil")} />
              {form.formState.errors.validUntil ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.validUntil.message}
                </p>
              ) : null}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Currency (optional, max 3)</Label>
              <Input {...form.register("currency")} placeholder="EUR" maxLength={3} />
              {form.formState.errors.currency ? (
                <p className="text-xs text-destructive">{form.formState.errors.currency.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label>Approval limit (optional)</Label>
              <Input {...form.register("approvalLimit")} placeholder="100000" />
              {form.formState.errors.approvalLimit ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.approvalLimit.message}
                </p>
              ) : null}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Acting GL approval role (optional)</Label>
            <Input {...form.register("actingGlApprovalRole")} />
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
