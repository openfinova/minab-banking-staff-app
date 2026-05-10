"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import { Can } from "@/components/rbac/can";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Permissions } from "@/lib/rbac/permissions";
import { rolesApi } from "@/lib/api/modules/roles";
import { createRoleSchema, type CreateRoleInput } from "@/lib/schemas/roles";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";

export default function RolesPage() {
  return (
    <RouteGuard permissions={[Permissions.AdminRolesRead]}>
      <RolesContent />
    </RouteGuard>
  );
}

function RolesContent() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["roles"],
    queryFn: rolesApi.list,
  });
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const { toast } = useToast();

  const onDelete = async () => {
    if (!deleteId) return;
    try {
      await rolesApi.delete(deleteId);
      toast({ title: "Role deleted" });
      void refetch();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: describeApiError(error),
      });
    }
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & permissions"
        description="Catalogue, create, and govern role definitions used across services."
        actions={
          <Can permissions={[Permissions.AdminRolesWrite]}>
            <CreateRoleDialog onCreated={() => refetch()} />
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
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>System</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <Link
                        href={`/identity/roles/${role.id}`}
                        className="font-medium hover:underline"
                      >
                        {role.displayName ?? role.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{role.name}</p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{role.description ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant="muted">{role.permissionCount ?? "-"}</Badge>
                    </TableCell>
                    <TableCell>
                      {role.systemRole ? (
                        <Badge variant="warning">System</Badge>
                      ) : (
                        <Badge variant="secondary">User-defined</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Can permissions={[Permissions.AdminRolesWrite]}>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Delete role"
                          disabled={role.systemRole}
                          onClick={() => setDeleteId(role.id)}
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
            <EmptyState title="No roles defined" description="Create your first role to get started." />
          )}
        </CardContent>
      </Card>

      <ConfirmAction
        open={Boolean(deleteId)}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete role"
        description="Users currently assigned to this role will lose its associated permissions."
        confirmLabel="Delete role"
        destructive
        onConfirm={onDelete}
      />
    </div>
  );
}

function CreateRoleDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const permissionsQuery = useQuery({
    queryKey: ["permissions-catalog"],
    queryFn: rolesApi.permissionsCatalog,
    enabled: open,
  });
  const form = useForm<CreateRoleInput>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: { name: "", displayName: "", description: "", permissions: [] },
  });

  const create = useMutation({
    mutationFn: (input: CreateRoleInput) =>
      rolesApi.create({
        name: input.name,
        displayName: input.displayName || undefined,
        description: input.description || undefined,
        permissions: input.permissions ?? [],
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast({ title: "Role created" });
      form.reset();
      setOpen(false);
      onCreated();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Could not create role",
        description: describeApiError(error),
      });
    },
  });

  const selected = form.watch("permissions") ?? [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> New role
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create role</DialogTitle>
          <DialogDescription>Define a role and attach permissions.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit((v) => create.mutate(v))}>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input maxLength={60} placeholder="OPS_SUPERVISOR" {...form.register("name")} />
              {form.formState.errors.name ? (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label>Display name</Label>
              <Input maxLength={120} {...form.register("displayName")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea maxLength={500} rows={2} {...form.register("description")} />
          </div>
          <div className="space-y-1.5">
            <Label>Permissions</Label>
            {permissionsQuery.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="grid max-h-72 gap-1 overflow-auto rounded-md border p-2 scrollbar-thin md:grid-cols-2">
                {permissionsQuery.data?.map((perm) => {
                  const value = perm.authority ?? perm.name;
                  const checked = selected.includes(value);
                  return (
                    <label
                      key={value}
                      className="flex items-start gap-2 rounded px-2 py-1 hover:bg-accent"
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? Array.from(new Set([...selected, value]))
                            : selected.filter((p) => p !== value);
                          form.setValue("permissions", next, { shouldDirty: true });
                        }}
                      />
                      <span className="font-mono text-xs">{value}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending}>
              Create role
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
