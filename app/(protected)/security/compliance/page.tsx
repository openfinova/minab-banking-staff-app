"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/data/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Permissions } from "@/lib/rbac/permissions";
import { complianceReportsApi, type ReportDateRange } from "@/lib/api/modules/audit";
import { formatDateTime } from "@/lib/utils";

export default function ComplianceReportsPage() {
  return (
    <RouteGuard permissions={[Permissions.ReportGenerate]}>
      <ComplianceContent />
    </RouteGuard>
  );
}

function ComplianceContent() {
  const [range, setRange] = React.useState<ReportDateRange>({});
  const [draft, setDraft] = React.useState<ReportDateRange>({});

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance reports"
        description="User access, permission changes, login activity, and SoD violation reports."
      />
      <Card>
        <CardContent className="grid gap-3 pt-6 md:grid-cols-4">
          <Field label="Start date">
            <Input
              type="date"
              value={draft.startDate ?? ""}
              onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
            />
          </Field>
          <Field label="End date">
            <Input
              type="date"
              value={draft.endDate ?? ""}
              onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}
            />
          </Field>
          <Field label="As of date">
            <Input
              type="date"
              value={draft.asOfDate ?? ""}
              onChange={(e) => setDraft({ ...draft, asOfDate: e.target.value })}
            />
          </Field>
          <div className="flex items-end gap-2">
            <Button onClick={() => setRange(draft)}>Apply</Button>
            <Button
              variant="ghost"
              onClick={() => {
                setDraft({});
                setRange({});
              }}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="user-access">
        <TabsList>
          <TabsTrigger value="user-access">User access</TabsTrigger>
          <TabsTrigger value="permission-changes">Permission changes</TabsTrigger>
          <TabsTrigger value="login-activity">Login activity</TabsTrigger>
          <TabsTrigger value="sod">SoD violations</TabsTrigger>
        </TabsList>
        <TabsContent value="user-access">
          <UserAccessReport range={range} />
        </TabsContent>
        <TabsContent value="permission-changes">
          <PermissionChangesReport range={range} />
        </TabsContent>
        <TabsContent value="login-activity">
          <LoginActivityReport range={range} />
        </TabsContent>
        <TabsContent value="sod">
          <SodReport range={range} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function UserAccessReport({ range }: { range: ReportDateRange }) {
  const [page, setPage] = React.useState(0);
  const { data, isLoading } = useQuery({
    queryKey: ["compliance", "user-access", range, page],
    queryFn: () => complianceReportsApi.userAccess(range, { page, size: 25 }),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>User access report</CardTitle>
        <CardDescription>Status snapshot of users and their assigned permissions.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : data?.content?.length ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Last login</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.content.map((row) => (
                  <TableRow key={row.userId}>
                    <TableCell>{row.username}</TableCell>
                    <TableCell>{row.userType ?? "-"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {row.roles?.map((r) => (
                          <Badge key={r} variant="muted" className="text-[11px]">
                            {r}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {formatDateTime(row.lastLoginAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.enabled ? "success" : "destructive"}>
                        {row.enabled ? "Enabled" : "Disabled"}
                      </Badge>
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
          <EmptyState title="No data" description="Adjust the date filters." />
        )}
      </CardContent>
    </Card>
  );
}

function PermissionChangesReport({ range }: { range: ReportDateRange }) {
  const [page, setPage] = React.useState(0);
  const { data, isLoading } = useQuery({
    queryKey: ["compliance", "permission-changes", range, page],
    queryFn: () => complianceReportsApi.permissionChanges(range, { page, size: 25 }),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Permission changes</CardTitle>
        <CardDescription>Audit trail of role / permission mutations.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : data?.content?.length ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Change type</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Permission</TableHead>
                  <TableHead>Actor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.content.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">
                      {formatDateTime(row.timestamp)}
                    </TableCell>
                    <TableCell>{row.changeType}</TableCell>
                    <TableCell>{row.roleName ?? "-"}</TableCell>
                    <TableCell className="font-mono text-xs">{row.permission ?? "-"}</TableCell>
                    <TableCell>{row.actorUsername ?? "-"}</TableCell>
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
          <EmptyState title="No data" />
        )}
      </CardContent>
    </Card>
  );
}

function LoginActivityReport({ range }: { range: ReportDateRange }) {
  const [page, setPage] = React.useState(0);
  const { data, isLoading } = useQuery({
    queryKey: ["compliance", "login-activity", range, page],
    queryFn: () => complianceReportsApi.loginActivity(range, { page, size: 25 }),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Login activity</CardTitle>
        <CardDescription>Successful and failed login attempts.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : data?.content?.length ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>MFA</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.content.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{formatDateTime(row.timestamp)}</TableCell>
                    <TableCell>{row.username}</TableCell>
                    <TableCell>
                      <Badge variant={row.result === "SUCCESS" ? "success" : "destructive"}>
                        {row.result}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {row.mfaUsed === undefined ? (
                        "-"
                      ) : (
                        <Badge variant={row.mfaUsed ? "success" : "muted"}>
                          {row.mfaUsed ? "Used" : "Skipped"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.ipAddress ?? "-"}</TableCell>
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
          <EmptyState title="No login events" />
        )}
      </CardContent>
    </Card>
  );
}

function SodReport({ range }: { range: ReportDateRange }) {
  const { data, isLoading } = useQuery({
    queryKey: ["compliance", "sod", range],
    queryFn: () => complianceReportsApi.sodViolations(range),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Segregation of Duties violations</CardTitle>
        <CardDescription>
          Identifies conflicting permissions assigned to single users.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : data?.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Conflicts</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.userId}>
                  <TableCell>{row.username}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {row.conflictingPermissions.map((p) => (
                        <Badge key={p} variant="destructive" className="font-mono text-[11px]">
                          {p}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{row.details}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState title="No violations detected" description="All users currently respect Segregation of Duties policies." />
        )}
      </CardContent>
    </Card>
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
