"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RouteGuard } from "@/components/rbac/route-guard";
import { describeApiError } from "@/lib/api/errors";
import { glAuditApi, type GlAuditTrailDto } from "@/lib/api/modules/operations";
import { Permissions } from "@/lib/rbac/permissions";
import { StatusBadge } from "@/components/data/status-badge";
import type { UseQueryResult } from "@tanstack/react-query";

export default function GlAuditPage() {
  return (
    <RouteGuard permissions={[Permissions.GlRead]}>
      <GlAuditContent />
    </RouteGuard>
  );
}

function GlAuditContent() {
  const today = React.useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [recentDate, setRecentDate] = React.useState(today);
  const [recentSubmitted, setRecentSubmitted] = React.useState<string | null>(null);
  const [revStart, setRevStart] = React.useState(today);
  const [revEnd, setRevEnd] = React.useState(today);
  const [revSubmitted, setRevSubmitted] = React.useState<{ start: string; end: string } | null>(null);
  const [riskStart, setRiskStart] = React.useState(today);
  const [riskEnd, setRiskEnd] = React.useState(today);
  const [riskSubmitted, setRiskSubmitted] = React.useState<{ start: string; end: string } | null>(null);

  const recent = useQuery({
    queryKey: ["gl-audit-recent", recentSubmitted],
    queryFn: () => glAuditApi.recent(recentSubmitted!),
    enabled: Boolean(recentSubmitted),
  });

  const reversals = useQuery({
    queryKey: ["gl-audit-reversals", revSubmitted?.start, revSubmitted?.end],
    queryFn: () => glAuditApi.reversals(revSubmitted!.start, revSubmitted!.end),
    enabled: Boolean(revSubmitted),
  });

  const highRisk = useQuery({
    queryKey: ["gl-audit-high-risk", riskSubmitted?.start, riskSubmitted?.end],
    queryFn: () => glAuditApi.highRisk(riskSubmitted!.start, riskSubmitted!.end),
    enabled: Boolean(riskSubmitted),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="GL audit explorer" description="Explore high-risk activity, reversals, and day-level audit slices (read-only)." />

      <Tabs defaultValue="recent">
        <TabsList>
          <TabsTrigger value="recent">Recent changes</TabsTrigger>
          <TabsTrigger value="reversals">Reversals</TabsTrigger>
          <TabsTrigger value="highrisk">High risk</TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily ledger</CardTitle>
              <CardDescription>Snapshot of sensitive movements for a selected business date.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase text-muted-foreground">Date</Label>
                  <Input type="date" value={recentDate} onChange={(e) => setRecentDate(e.target.value)} />
                </div>
                <Button type="button" onClick={() => setRecentSubmitted(recentDate)}>
                  Load
                </Button>
              </div>
              <AuditTable query={recent} awaitingSubmit={!recentSubmitted} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reversals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reversals</CardTitle>
              <CardDescription>Journal lines linked to reversal events.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-2">
                <Field label="Start" value={revStart} onChange={setRevStart} />
                <Field label="End" value={revEnd} onChange={setRevEnd} />
                <Button type="button" onClick={() => setRevSubmitted({ start: revStart, end: revEnd })}>
                  Load
                </Button>
              </div>
              <AuditTable query={reversals} awaitingSubmit={!revSubmitted} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="highrisk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>High-risk actions</CardTitle>
              <CardDescription>Curated queue of materially sensitive postings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-2">
                <Field label="Start" value={riskStart} onChange={setRiskStart} />
                <Field label="End" value={riskEnd} onChange={setRiskEnd} />
                <Button type="button" onClick={() => setRiskSubmitted({ start: riskStart, end: riskEnd })}>
                  Load
                </Button>
              </div>
              <AuditTable query={highRisk} awaitingSubmit={!riskSubmitted} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase text-muted-foreground">{label}</Label>
      <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function AuditTable({
  query,
  awaitingSubmit,
}: {
  query: UseQueryResult<GlAuditTrailDto[]>;
  awaitingSubmit: boolean;
}) {
  if (awaitingSubmit) {
    return <EmptyState title="Press load to query the audit API." />;
  }
  if (query.isLoading) return <Skeleton className="h-32 w-full" />;
  if (query.isError) return <EmptyState title="Query failed" description={describeApiError(query.error)} />;
  const rows = query.data ?? [];
  if (!rows.length) return <EmptyState title="No rows" />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>When</TableHead>
          <TableHead>Actor</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Entity</TableHead>
          <TableHead>Reason</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          return (
            <TableRow key={r.id ?? `${r.performedAt}-${r.entityId}`}>
              <TableCell className="text-xs">{r.performedAt ?? "—"}</TableCell>
              <TableCell className="text-xs">{r.performedBy ?? "—"}</TableCell>
              <TableCell>
                <StatusBadge status={r.action ?? "?"} />
              </TableCell>
              <TableCell className="text-xs">
                {r.entityType ?? "—"}{" "}
                {r.entityId ? <span className="font-mono">({String(r.entityId).slice(0, 8)}…)</span> : null}
              </TableCell>
              <TableCell className="max-w-xs truncate text-xs">{r.reason ?? "—"}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
