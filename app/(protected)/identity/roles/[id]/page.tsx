"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Can } from "@/components/rbac/can";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Permissions } from "@/lib/rbac/permissions";
import { rolesApi } from "@/lib/api/modules/roles";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";

export default function RoleDetailPage() {
  return (
    <RouteGuard permissions={[Permissions.AdminRolesRead]}>
      <RoleDetail />
    </RouteGuard>
  );
}

function RoleDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const roleQuery = useQuery({ queryKey: ["roles", id], queryFn: () => rolesApi.get(id) });
  const catalogQuery = useQuery({ queryKey: ["permissions-catalog"], queryFn: rolesApi.permissionsCatalog });

  const [meta, setMeta] = React.useState({ displayName: "", description: "" });
  const [selected, setSelected] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (roleQuery.data) {
      setMeta({
        displayName: roleQuery.data.displayName ?? "",
        description: roleQuery.data.description ?? "",
      });
      setSelected(roleQuery.data.permissions ?? []);
    }
  }, [roleQuery.data]);

  const updateMeta = useMutation({
    mutationFn: () =>
      rolesApi.update(id, {
        displayName: meta.displayName || undefined,
        description: meta.description || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles", id] });
      toast({ title: "Role updated" });
    },
    onError: (error) =>
      toast({
        variant: "destructive",
        title: "Update failed",
        description: describeApiError(error),
      }),
  });

  const setPermissions = useMutation({
    mutationFn: () => rolesApi.setPermissions(id, selected),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles", id] });
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast({ title: "Permissions updated" });
    },
    onError: (error) =>
      toast({
        variant: "destructive",
        title: "Update failed",
        description: describeApiError(error),
      }),
  });

  if (roleQuery.isLoading || !roleQuery.data) {
    return <Skeleton className="h-64 w-full" />;
  }
  const role = roleQuery.data;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/identity/roles">
          <ArrowLeft className="h-4 w-4" /> Back to roles
        </Link>
      </Button>
      <PageHeader
        title={role.displayName ?? role.name}
        description={role.name}
        actions={role.systemRole ? <Badge variant="warning">System role</Badge> : null}
      />
      <Card>
        <CardHeader>
          <CardTitle>Metadata</CardTitle>
          <CardDescription>Display and description for the role catalogue.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Display name</Label>
            <Input
              value={meta.displayName}
              onChange={(e) => setMeta({ ...meta, displayName: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Description</Label>
            <Textarea
              value={meta.description}
              onChange={(e) => setMeta({ ...meta, description: e.target.value })}
              rows={3}
            />
          </div>
          <div>
            <Can permissions={[Permissions.AdminRolesWrite]}>
              <Button onClick={() => updateMeta.mutate()} loading={updateMeta.isPending}>
                Save metadata
              </Button>
            </Can>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Permissions</CardTitle>
          <CardDescription>
            {role.systemRole ? (
              <>
                System roles cannot have permissions added, removed, or replaced from this console.
                Use a custom role if you need a different bundle; ADMIN keeps full platform access by design.
              </>
            ) : (
              <>Set the full permission list for this role. Changing permissions may require an approved ROLE_PERMISSION_CHANGE workflow when enforcement is enabled.</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {catalogQuery.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <div className="grid max-h-96 gap-1 overflow-auto rounded-md border p-2 scrollbar-thin md:grid-cols-2">
              {catalogQuery.data?.map((perm) => {
                const value = perm.authority ?? perm.name;
                const checked = selected.includes(value);
                return (
                  <label
                    key={value}
                    className={`flex items-start gap-2 rounded px-2 py-1 hover:bg-accent ${role.systemRole ? "opacity-60" : ""}`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={checked}
                      disabled={role.systemRole}
                      onChange={(e) =>
                        setSelected((prev) =>
                          e.target.checked
                            ? Array.from(new Set([...prev, value]))
                            : prev.filter((p) => p !== value),
                        )
                      }
                    />
                    <span className="font-mono text-xs">{value}</span>
                  </label>
                );
              })}
            </div>
          )}
          {!role.systemRole ? (
            <Can permissions={[Permissions.AdminRolesWrite]}>
              <Button onClick={() => setPermissions.mutate()} loading={setPermissions.isPending}>
                Save permissions
              </Button>
            </Can>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
