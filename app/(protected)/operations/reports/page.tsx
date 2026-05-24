"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
import { glReportsApi, type FinancialStatementResponse } from "@/lib/api/modules/operations";
import { formatCurrency } from "@/lib/utils";

export default function ReportsPage() {
  return (
    <RouteGuard permissions={[Permissions.GlRead]}>
      <ReportsContent />
    </RouteGuard>
  );
}

function ReportsContent() {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 7)}-01`;
  const [period, setPeriod] = React.useState({
    startDate: monthStart,
    endDate: today,
    asOfDate: today,
  });
  const [draft, setDraft] = React.useState(period);

  const income = useQuery({
    queryKey: ["reports", "income-statement", period.startDate, period.endDate],
    queryFn: () =>
      glReportsApi.incomeStatement({
        startDate: period.startDate,
        endDate: period.endDate,
      }),
  });
  const balance = useQuery({
    queryKey: ["reports", "balance-sheet", period.asOfDate],
    queryFn: () => glReportsApi.balanceSheet({ asOfDate: period.asOfDate }),
  });
  const cashFlow = useQuery({
    queryKey: ["reports", "cash-flow", period.startDate, period.endDate],
    queryFn: () =>
      glReportsApi.cashFlow({
        startDate: period.startDate,
        endDate: period.endDate,
      }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial statements"
        description="Income statement, balance sheet, and cash flow snapshots."
      />
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Statement parameters</CardTitle>
          <CardDescription>
            Period range drives the income statement and cash flow tabs. As-of date drives
            the balance sheet tab. Apply updates all three.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Income statement &amp; cash flow period
            </p>
            <DateRangeFilter
              startDate={draft.startDate}
              endDate={draft.endDate}
              startLabel="Start date"
              endLabel="End date"
              onChange={({ startDate, endDate }) =>
                setDraft({ ...draft, startDate, endDate })
              }
            />
          </div>
          <Field label="Balance sheet as of date">
            <DateInput
              value={draft.asOfDate}
              onChange={(v) => setDraft({ ...draft, asOfDate: v })}
            />
          </Field>
          <Button onClick={() => setPeriod(draft)} className="w-full sm:w-auto">
            Apply to all reports
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="income">
        <TabsList>
          <TabsTrigger value="income">Income statement</TabsTrigger>
          <TabsTrigger value="balance">Balance sheet</TabsTrigger>
          <TabsTrigger value="cashflow">Cash flow</TabsTrigger>
        </TabsList>
        <TabsContent value="income">
          <ReportCard title="Income statement" data={income.data} loading={income.isLoading} />
        </TabsContent>
        <TabsContent value="balance">
          <ReportCard title="Balance sheet" data={balance.data} loading={balance.isLoading} />
        </TabsContent>
        <TabsContent value="cashflow">
          <ReportCard title="Cash flow" data={cashFlow.data} loading={cashFlow.isLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReportCard({
  title,
  data,
  loading,
}: {
  title: string;
  data?: FinancialStatementResponse;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {data?.startDate && data?.endDate
            ? `${data.startDate} → ${data.endDate}`
            : data?.asOfDate
              ? `As of ${data.asOfDate}`
              : "Period selected above"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <Skeleton className="h-32 w-full" />
        ) : data?.lineItems?.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.lineItems.map((item) => (
                <React.Fragment key={`${item.accountCode}-${item.accountName}`}>
                  <TableRow>
                    <TableCell className="font-medium">
                      {item.accountCode ? (
                        <span className="font-mono text-xs">{item.accountCode}</span>
                      ) : null}{" "}
                      {item.accountName}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {item.amount !== undefined ? formatCurrency(item.amount, data.currency) : "-"}
                    </TableCell>
                  </TableRow>
                  {item.children?.map((child) => (
                    <TableRow key={`${child.accountCode}-${child.accountName}`}>
                      <TableCell className="pl-8 text-muted-foreground">
                        {child.accountCode ? (
                          <span className="font-mono text-xs">{child.accountCode}</span>
                        ) : null}{" "}
                        {child.accountName}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {child.amount !== undefined ? formatCurrency(child.amount, data.currency) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState title="No data for this period" />
        )}
        {data?.totals && Object.keys(data.totals).length > 0 ? (
          <div className="grid gap-2 md:grid-cols-3">
            {Object.entries(data.totals).map(([k, v]) => (
              <div key={k} className="rounded-md border p-3 text-sm">
                <p className="text-xs uppercase text-muted-foreground">{k}</p>
                <p className="text-lg font-semibold">{formatCurrency(v, data.currency)}</p>
              </div>
            ))}
          </div>
        ) : null}
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
