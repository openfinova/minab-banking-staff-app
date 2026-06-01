"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { CopyableUuid } from "@/components/data/copyable-uuid";
import { StatusBadge } from "@/components/data/status-badge";
import { Pagination } from "@/components/data/pagination";
import { Can } from "@/components/rbac/can";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Permissions } from "@/lib/rbac/permissions";
import { usersApi, type UserSearchCriteria, type UserSummary } from "@/lib/api/modules/users";
import { Badge } from "@/components/ui/badge";
import { CustomerPartyHoverCell } from "@/components/customers/customer-party-hover-cell";

type AccountStatusFilter = "" | "active" | "disabled" | "locked" | "suspended";

export default function UsersPage() {
  return (
    <RouteGuard permissions={[Permissions.AdminUsersRead]}>
      <UsersList />
    </RouteGuard>
  );
}

function UsersList() {
  const [searchText, setSearchText] = React.useState("");
  const [debouncedQ, setDebouncedQ] = React.useState("");
  const [userType, setUserType] = React.useState<UserSearchCriteria["userType"]>();
  const [branchCode, setBranchCode] = React.useState("");
  const [accountStatus, setAccountStatus] = React.useState<AccountStatusFilter>("");
  const [page, setPage] = React.useState(0);
  const size = 20;

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(searchText.trim()), 320);
    return () => window.clearTimeout(t);
  }, [searchText]);

  const criteria = React.useMemo<UserSearchCriteria>(() => {
    const next: UserSearchCriteria = {};
    if (debouncedQ) next.q = debouncedQ;
    if (userType) next.userType = userType;
    if (branchCode.trim()) next.branchCode = branchCode.trim();
    if (accountStatus === "active") next.enabled = true;
    if (accountStatus === "disabled") next.enabled = false;
    if (accountStatus === "locked") next.locked = true;
    if (accountStatus === "suspended") next.suspended = true;
    return next;
  }, [accountStatus, branchCode, debouncedQ, userType]);

  const hasFilters =
    Boolean(debouncedQ) ||
    Boolean(userType) ||
    Boolean(branchCode.trim()) ||
    Boolean(accountStatus);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["users", criteria, page, size],
    queryFn: () => usersApi.search(criteria, { page, size, sort: "username,asc" }),
  });

  const onClearFilters = () => {
    setSearchText("");
    setDebouncedQ("");
    setUserType(undefined);
    setBranchCode("");
    setAccountStatus("");
    setPage(0);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Search, provision, lock, suspend, and govern user access."
        actions={
          <Can permissions={[Permissions.AdminUsersWrite]}>
            <Button asChild>
              <Link href="/identity/users/new">
                <Plus className="h-4 w-4" /> New user
              </Link>
            </Button>
          </Can>
        }
      />

      <div className="grid max-w-3xl gap-1.5">
        <Label htmlFor="user-search">Search</Label>
        <Input
          id="user-search"
          value={searchText}
          onChange={(e) => {
            setSearchText(e.target.value);
            setPage(0);
          }}
          placeholder="Username, email, or user UUID…"
          autoComplete="off"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4">
          <div>
            <CardTitle>Users</CardTitle>
            <CardDescription>
              Filter the directory by type, branch, or account status. Results update as you change filters.
            </CardDescription>
          </div>
          <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="grid gap-1.5">
              <Label htmlFor="user-type-filter">User type</Label>
              <Select
                value={userType ?? "__all__"}
                onValueChange={(v) => {
                  setPage(0);
                  setUserType(v === "__all__" ? undefined : v);
                }}
              >
                <SelectTrigger id="user-type-filter">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All types</SelectItem>
                  <SelectItem value="STAFF">Staff</SelectItem>
                  <SelectItem value="CUSTOMER">Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="branch-filter">Branch code</Label>
              <Input
                id="branch-filter"
                value={branchCode}
                onChange={(e) => {
                  setBranchCode(e.target.value);
                  setPage(0);
                }}
                placeholder="HQ01"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="account-status-filter">Account status</Label>
              <Select
                value={accountStatus || "__all__"}
                onValueChange={(v) => {
                  setPage(0);
                  setAccountStatus(v === "__all__" ? "" : (v as AccountStatusFilter));
                }}
              >
                <SelectTrigger id="account-status-filter">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All statuses</SelectItem>
                  <SelectItem value="active">Active (enabled)</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                  <SelectItem value="locked">Locked</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={!hasFilters}
                onClick={onClearFilters}
              >
                Clear filters
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => refetch()}
                aria-label="Refresh"
              >
                <RefreshCw className={isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : data?.content?.length ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>UUID</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Account status</TableHead>
                    <TableHead>Provisioning</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.content.map((user) => (
                    <TableRow
                      key={user.id}
                      className="cursor-pointer"
                      onClick={() => {
                        window.location.href = `/identity/users/${user.id}`;
                      }}
                    >
                      <TableCell>
                        <CopyableUuid
                          value={user.id}
                          href={`/identity/users/${user.id}`}
                          stopPropagation
                        />
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/identity/users/${user.id}`}
                          className="font-medium hover:underline"
                        >
                          {user.username}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.email ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="muted">{user.userType}</Badge>
                      </TableCell>
                      <TableCell>
                        <CustomerPartyHoverCell customerPartyId={user.customerPartyId} />
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {user.userType === "STAFF" ? user.employeeId ?? "—" : "—"}
                      </TableCell>
                      <TableCell>{user.branchCode ?? "—"}</TableCell>
                      <TableCell>
                        <UserAccountStatus user={user} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={user.provisioningStatus ?? "—"} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination
                page={data.number ?? page}
                totalPages={data.totalPages ?? 1}
                onPageChange={setPage}
                totalElements={data.totalElements}
              />
            </>
          ) : (
            <EmptyState
              title="No users match your filters"
              description="Try a different search term or clear filters to see everyone."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function UserAccountStatus({ user }: { user: UserSummary }) {
  return (
    <div className="flex flex-wrap gap-1">
      {!user.enabled ? <StatusBadge status="DISABLED" /> : null}
      {user.enabled && !user.locked && !user.suspended ? <StatusBadge status="ENABLED" /> : null}
      {user.locked ? <StatusBadge status="LOCKED" variantOverride="destructive" /> : null}
      {user.suspended ? <StatusBadge status="SUSPENDED" variantOverride="warning" /> : null}
    </div>
  );
}
