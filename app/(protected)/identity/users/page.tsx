"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
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
import { StatusBadge } from "@/components/data/status-badge";
import { Pagination } from "@/components/data/pagination";
import { Can } from "@/components/rbac/can";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Permissions } from "@/lib/rbac/permissions";
import { usersApi, type UserSearchCriteria } from "@/lib/api/modules/users";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";

export default function UsersPage() {
  return (
    <RouteGuard permissions={[Permissions.AdminUsersRead]}>
      <UsersList />
    </RouteGuard>
  );
}

const CUSTOMER_PARTY_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function UsersList() {
  const router = useRouter();
  const { toast } = useToast();
  const [criteria, setCriteria] = React.useState<UserSearchCriteria>({});
  const [draft, setDraft] = React.useState<UserSearchCriteria>({});
  const [customerPartyId, setCustomerPartyId] = React.useState("");
  const [page, setPage] = React.useState(0);
  const size = 20;

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["users", criteria, page, size],
    queryFn: () =>
      Object.values(criteria).some((v) => v !== undefined && v !== "")
        ? usersApi.search(criteria, { page, size, sort: "username,asc" })
        : usersApi.list({ page, size, sort: "username,asc" }),
  });

  const onApply = () => {
    setCriteria(draft);
    setPage(0);
  };

  const onClear = () => {
    setDraft({});
    setCriteria({});
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
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Field label="Username">
              <Input
                value={draft.username ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, username: e.target.value }))}
                placeholder="staff.ops.01"
              />
            </Field>
            <Field label="Email">
              <Input
                value={draft.email ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                placeholder="ops01@bank.local"
              />
            </Field>
            <Field label="User type">
              <Select
                value={draft.userType ?? "ALL"}
                onValueChange={(v) =>
                  setDraft((d) => ({ ...d, userType: v === "ALL" ? undefined : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="STAFF">Staff</SelectItem>
                  <SelectItem value="CUSTOMER">Customer</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Branch code">
              <Input
                value={draft.branchCode ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, branchCode: e.target.value }))}
                placeholder="HQ01"
              />
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={onApply}>
              <Search className="h-4 w-4" /> Apply filters
            </Button>
            <Button variant="ghost" onClick={onClear}>
              Clear
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              aria-label="Refresh"
            >
              <RefreshCw className={isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            </Button>
          </div>
          <div className="flex flex-wrap items-end gap-2 border-t pt-4">
            <Field label="Open by customer party ID">
              <Input
                className="font-mono md:w-[360px]"
                value={customerPartyId}
                onChange={(e) => setCustomerPartyId(e.target.value)}
                placeholder="Customer party UUID"
              />
            </Field>
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                const id = customerPartyId.trim();
                if (!CUSTOMER_PARTY_UUID_RE.test(id)) {
                  toast({
                    variant: "destructive",
                    title: "Invalid customer party ID",
                    description: "Enter a valid UUID.",
                  });
                  return;
                }
                try {
                  const user = await usersApi.getByCustomerPartyId(id);
                  router.push(`/identity/users/${user.id}`);
                } catch (error) {
                  toast({
                    variant: "destructive",
                    title: "User not found",
                    description: describeApiError(error),
                  });
                }
              }}
            >
              Open user
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
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
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Status</TableHead>
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
                        <Link
                          href={`/identity/users/${user.id}`}
                          className="font-medium hover:underline"
                        >
                          {user.username}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.email ?? "-"}</TableCell>
                      <TableCell>
                        <Badge variant="muted">{user.userType}</Badge>
                      </TableCell>
                      <TableCell>{user.branchCode ?? "-"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <StatusBadge status={user.enabled ? "ENABLED" : "DISABLED"} />
                          {user.locked ? <StatusBadge status="LOCKED" variantOverride="destructive" /> : null}
                          {user.suspended ? <StatusBadge status="SUSPENDED" variantOverride="warning" /> : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={user.provisioningStatus ?? "-"} />
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
              description="Try adjusting the search filters or clear them to see everyone."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
