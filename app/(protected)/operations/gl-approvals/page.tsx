"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Permissions } from "@/lib/rbac/permissions";
import { glApprovalsApi, type GlApprovalQueueItem } from "@/lib/api/modules/operations";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default function GlApprovalsPage() {
  return (
    <RouteGuard permissions={[Permissions.GlApprove]}>
      <GlApprovalsContent />
    </RouteGuard>
  );
}

function GlApprovalsContent() {
  const myQueue = useQuery({ queryKey: ["gl", "approvals", "queue"], queryFn: glApprovalsApi.myQueue });
  const myActivity = useQuery({
    queryKey: ["gl", "approvals", "activity"],
    queryFn: glApprovalsApi.myActivity,
  });
  const myLimits = useQuery({
    queryKey: ["gl", "approvals", "limits"],
    queryFn: glApprovalsApi.myLimits,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="GL approvals queue"
        description="Items pending your action and your historical approval activity."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <LimitsCard
          title="Approval role"
          value={myLimits.data?.approvalRole ?? "-"}
          loading={myLimits.isLoading}
        />
        <LimitsCard
          title="Max amount"
          value={
            myLimits.data?.maxAmount !== undefined
              ? formatCurrency(myLimits.data.maxAmount)
              : "-"
          }
          loading={myLimits.isLoading}
        />
        <LimitsCard
          title="Remaining today"
          value={
            myLimits.data?.remainingDailyAmount !== undefined
              ? formatCurrency(myLimits.data.remainingDailyAmount)
              : "-"
          }
          loading={myLimits.isLoading}
        />
      </div>
      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue">My queue</TabsTrigger>
          <TabsTrigger value="activity">My activity</TabsTrigger>
        </TabsList>
        <TabsContent value="queue">
          <QueueTable items={myQueue.data ?? []} isLoading={myQueue.isLoading} mode="queue" />
        </TabsContent>
        <TabsContent value="activity">
          <QueueTable items={myActivity.data ?? []} isLoading={myActivity.isLoading} mode="activity" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LimitsCard({
  title,
  value,
  loading,
}: {
  title: string;
  value: string;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-6 w-24" />
        ) : (
          <p className="text-2xl font-semibold">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}

function QueueTable({
  items,
  isLoading,
  mode,
}: {
  items: GlApprovalQueueItem[];
  isLoading: boolean;
  mode: "queue" | "activity";
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === "queue" ? "Pending approvals" : "Recent activity"}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : items.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Required role</TableHead>
                <TableHead>Initiated</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.transactionId}>
                  <TableCell className="font-mono text-xs">{item.transactionId}</TableCell>
                  <TableCell>{item.transactionRef ?? "-"}</TableCell>
                  <TableCell>
                    {item.amount !== undefined
                      ? formatCurrency(item.amount, item.currency ?? undefined)
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="muted">{item.requiredRole ?? "-"}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {formatDateTime(item.initiatedAt)}
                  </TableCell>
                  <TableCell>{item.status ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            title={mode === "queue" ? "Queue is empty" : "No activity yet"}
            description={
              mode === "queue"
                ? "You have no pending approvals at the moment."
                : "Approvals you action will appear here."
            }
          />
        )}
      </CardContent>
    </Card>
  );
}
