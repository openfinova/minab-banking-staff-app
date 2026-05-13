"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Can } from "@/components/rbac/can";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError, ApiError } from "@/lib/api/errors";
import { usersApi } from "@/lib/api/modules/users";
import { customersApi } from "@/lib/api/modules/customers";
import { Permissions } from "@/lib/rbac/permissions";
import { CreateUserForm } from "@/components/identity/create-user-form";

export default function CustomerIdentityPage() {
  return (
    <RouteGuard permissions={[Permissions.AdminUsersRead]}>
      <CustomerIdentityContent />
    </RouteGuard>
  );
}

function CustomerIdentityContent() {
  const params = useParams();
  const customerId = typeof params?.id === "string" ? params.id : "";
  const qc = useQueryClient();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [linkUserId, setLinkUserId] = React.useState("");
  const [linkSearchText, setLinkSearchText] = React.useState("");
  const [linkSearchDebounced, setLinkSearchDebounced] = React.useState("");

  React.useEffect(() => {
    const t = window.setTimeout(() => setLinkSearchDebounced(linkSearchText.trim()), 320);
    return () => window.clearTimeout(t);
  }, [linkSearchText]);

  const linkUserSearch = useQuery({
    queryKey: ["identity", "link-user-search", linkSearchDebounced],
    queryFn: () =>
      usersApi.search(
        { q: linkSearchDebounced, userType: "CUSTOMER" },
        { page: 0, size: 20, sort: "username,asc" },
      ),
    enabled: linkOpen && linkSearchDebounced.length > 0,
  });

  const linked = useQuery({
    queryKey: ["identity", "by-customer", customerId],
    queryFn: () => usersApi.getByCustomerPartyId(customerId),
    enabled: Boolean(customerId),
    retry: false,
  });

  const customerDetail = useQuery({
    queryKey: ["customers", "detail", customerId],
    queryFn: () => customersApi.get(customerId),
    enabled: Boolean(customerId),
  });

  const linkUser = useMutation({
    mutationFn: () =>
      usersApi.updateAccess(linkUserId.trim(), { customerPartyId: customerId }),
    onSuccess: (u) => {
      qc.invalidateQueries({ queryKey: ["identity", "by-customer", customerId] });
      qc.invalidateQueries({ queryKey: ["customers", "detail", customerId] });
      toast({ title: "User linked", description: u.username });
      setLinkOpen(false);
      setLinkUserId("");
      setLinkSearchText("");
      setLinkSearchDebounced("");
    },
    onError: (e) =>
      toast({ variant: "destructive", title: "Link failed", description: describeApiError(e) }),
  });

  if (!customerId) {
    return <EmptyState title="Missing customer id" />;
  }

  const notFound = linked.isError && linked.error instanceof ApiError && linked.error.isNotFound;
  const user = linked.data;
  const hasLinkedUser = Boolean(user?.id);
  const customerStatusMessage = !hasLinkedUser
    ? customerDetail.isLoading
      ? "Checking whether this customer can receive a login…"
      : customerDetail.isError
        ? describeApiError(customerDetail.error)
        : customerDetail.data && customerDetail.data.status !== "ACTIVE"
          ? `Assigning a login is only allowed when the customer is ACTIVE (current status: ${customerDetail.data.status}).`
          : null
    : null;
  const canAssignLogin =
    !hasLinkedUser &&
    !customerDetail.isLoading &&
    !customerDetail.isError &&
    customerDetail.data?.status === "ACTIVE";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Digital banking login"
        description={
          <span className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/customers/${customerId}`}>Back to customer</Link>
            </Button>
            <span className="text-muted-foreground">
              Links identity customer_party_id with customer linkedIdentityUserId via admin APIs.
            </span>
          </span>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Linked user</CardTitle>
          <CardDescription>
            {`GET /api/v1/identity/users/by-customer/{customerPartyId}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {linked.isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : notFound || !user ? (
            <EmptyState
              title={notFound ? "No user linked" : "Could not load user"}
              description={linked.isError && !notFound ? describeApiError(linked.error) : undefined}
            />
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <div>
                <p className="font-medium">{user.username}</p>
                <p className="text-xs text-muted-foreground font-mono">{user.id}</p>
                {user.email ? <p className="text-xs">{user.email}</p> : null}
              </div>
              <Button variant="secondary" size="sm" asChild>
                <Link href={`/identity/users/${user.id}`}>Open in Identity</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Can permissions={[Permissions.AdminUsersWrite]}>
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>Requires admin users write.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  disabled={!canAssignLogin}
                  title={!canAssignLogin ? (customerStatusMessage ?? undefined) : undefined}
                >
                  Assign user
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg md:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>New login</DialogTitle>
                  <DialogDescription>
                    Same form as Identity → Users → Create user, with user type fixed to this
                    customer party.
                  </DialogDescription>
                </DialogHeader>
                <CreateUserForm
                  fixedCustomerPartyId={customerId}
                  skipNavigateOnSuccess
                  submitLabel="Create"
                  onCancel={() => setCreateOpen(false)}
                  onSuccess={() => {
                    qc.invalidateQueries({ queryKey: ["identity", "by-customer", customerId] });
                    qc.invalidateQueries({ queryKey: ["customers", "detail", customerId] });
                    setCreateOpen(false);
                  }}
                />
              </DialogContent>
            </Dialog>

            <Dialog
              open={linkOpen}
              onOpenChange={(open) => {
                setLinkOpen(open);
                if (!open) {
                  setLinkUserId("");
                  setLinkSearchText("");
                  setLinkSearchDebounced("");
                }
              }}
            >
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canAssignLogin}
                  title={!canAssignLogin ? (customerStatusMessage ?? undefined) : undefined}
                >
                  Link existing user
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign customer party</DialogTitle>
                  <DialogDescription>
                    Search by username, email, or identity user UUID, pick a row, then link this
                    customer party.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 py-2">
                  <div className="grid gap-2">
                    <Label htmlFor="link-user-q">Search users</Label>
                    <Input
                      id="link-user-q"
                      value={linkSearchText}
                      onChange={(e) => {
                        setLinkSearchText(e.target.value);
                        setLinkUserId("");
                      }}
                      placeholder="Username, email, or UUID…"
                      autoComplete="off"
                    />
                  </div>
                  {!linkSearchDebounced ? (
                    <p className="text-sm text-muted-foreground">
                      Type to search CUSTOMER logins. Rows already linked to another party cannot be
                      selected here.
                    </p>
                  ) : linkUserSearch.isLoading ? (
                    <Skeleton className="h-32 w-full" />
                  ) : linkUserSearch.isError ? (
                    <p className="text-sm text-destructive">
                      {describeApiError(linkUserSearch.error)}
                    </p>
                  ) : (linkUserSearch.data?.content ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No matching users.</p>
                  ) : (
                    <div className="max-h-64 overflow-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Username</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead className="hidden sm:table-cell">Party</TableHead>
                            <TableHead className="text-right"> </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(linkUserSearch.data?.content ?? []).map((u) => {
                            const elsewhere =
                              u.customerPartyId &&
                              u.customerPartyId.toLowerCase() !== customerId.toLowerCase();
                            return (
                              <TableRow key={u.id}>
                                <TableCell className="font-medium">{u.username}</TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                  {u.email ?? "—"}
                                </TableCell>
                                <TableCell className="hidden font-mono text-xs sm:table-cell">
                                  {u.customerPartyId ?? "—"}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    type="button"
                                    variant="link"
                                    className="h-auto p-0"
                                    disabled={Boolean(elsewhere)}
                                    title={
                                      elsewhere
                                        ? "Already linked to another customer party"
                                        : undefined
                                    }
                                    onClick={() => setLinkUserId(u.id)}
                                  >
                                    Use
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  {linkUserId ? (
                    <p className="text-sm">
                      Selected:{" "}
                      <span className="font-medium font-mono">
                        {linkUserSearch.data?.content?.find((u) => u.id === linkUserId)?.username ??
                          "…"}
                      </span>
                      <span className="ml-2 text-muted-foreground font-mono text-xs">
                        {linkUserId}
                      </span>
                    </p>
                  ) : null}
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    disabled={linkUser.isPending || !linkUserId.trim()}
                    onClick={() => linkUser.mutate()}
                  >
                    Link
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            </div>
            {customerStatusMessage ? (
              <p className="text-sm text-muted-foreground">{customerStatusMessage}</p>
            ) : null}
          </CardContent>
        </Card>
      </Can>
    </div>
  );
}
