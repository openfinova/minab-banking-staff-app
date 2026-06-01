"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Save } from "lucide-react";

import { RouteGuard } from "@/components/rbac/route-guard";
import { Permissions } from "@/lib/rbac/permissions";
import {
  exchangeApi,
  type ManagedRateRow,
  type ManagedRatesView,
} from "@/lib/api/modules/exchange";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { describeApiError } from "@/lib/api/errors";

const MANAGED_RATES_QUERY_KEY = ["exchange", "managed-rates"] as const;

export default function ExchangeTodaysRatesPage() {
  return (
    <RouteGuard permissions={[Permissions.ExchangeRateRead, Permissions.ExchangeRateWrite]} mode="any">
      <Content />
    </RouteGuard>
  );
}

function Content() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const view = useQuery<ManagedRatesView>({
    queryKey: MANAGED_RATES_QUERY_KEY,
    queryFn: () => exchangeApi.getManagedRates(),
  });

  const syncMutation = useMutation({
    mutationFn: () => exchangeApi.syncNow(),
    onSuccess: (result) => {
      toast({
        title: "Sync complete",
        description: `Inserted ${result.inserted.length}, skipped ${result.skippedAlreadyPresent.length}, missing ${result.unsupportedByProvider.length} (provider: ${result.providerId}).`,
      });
      queryClient.invalidateQueries({ queryKey: MANAGED_RATES_QUERY_KEY });
    },
    onError: (e) => toast({ variant: "destructive", title: "Sync failed", description: describeApiError(e) }),
  });

  const today = view.data?.today;
  const baseCurrency = view.data?.baseCurrency;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Today's rates"
        description="One row per managed currency. Latest mid quoted against the bank's base currency. Edit any value to override; click Sync now to refresh from the provider."
      />

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>
              {baseCurrency ? `${baseCurrency} ↦ X` : "Managed pairs"}
            </CardTitle>
            <CardDescription>
              {today
                ? `Business date: ${today}. Rows older than today are flagged as stale.`
                : "Loading current snapshot."}
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            <RefreshCw className={syncMutation.isPending ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
            {syncMutation.isPending ? "Syncing…" : "Sync now"}
          </Button>
        </CardHeader>
        <CardContent>
          {view.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : view.isError ? (
            <p className="text-sm text-destructive">{describeApiError(view.error)}</p>
          ) : view.data ? (
            <ManagedRatesTable view={view.data} />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function ManagedRatesTable({ view }: { view: ManagedRatesView }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[140px]">Pair</TableHead>
          <TableHead className="w-[220px]">Mid rate</TableHead>
          <TableHead className="w-[140px]">As of</TableHead>
          <TableHead className="w-[120px]">Status</TableHead>
          <TableHead>Last changed</TableHead>
          <TableHead className="w-[120px] text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {view.rows.map((row) => (
          <ManagedRateRowEditor
            key={row.targetCurrency}
            row={row}
            baseCurrency={view.baseCurrency}
            today={view.today}
          />
        ))}
      </TableBody>
    </Table>
  );
}

function ManagedRateRowEditor({
  row,
  baseCurrency,
  today,
}: {
  row: ManagedRateRow;
  baseCurrency: string;
  today: string;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const initial = row.rate != null ? String(row.rate) : "";
  const [draft, setDraft] = React.useState(initial);

  React.useEffect(() => {
    setDraft(row.rate != null ? String(row.rate) : "");
  }, [row.rate, row.id]);

  const dirty = draft.trim() !== initial.trim();

  const saveMutation = useMutation({
    mutationFn: async () => {
      const parsed = Number.parseFloat(draft);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error("Rate must be a positive number");
      }
      const isTodayRow = row.id != null && row.rateDate === today;
      if (isTodayRow && row.id) {
        return exchangeApi.updateRate(row.id, {
          sourceCurrency: baseCurrency,
          targetCurrency: row.targetCurrency,
          rate: parsed,
          rateDate: today,
          rateType: "SPOT",
        });
      }
      return exchangeApi.createRate({
        sourceCurrency: baseCurrency,
        targetCurrency: row.targetCurrency,
        rate: parsed,
        rateDate: today,
        rateType: "SPOT",
      });
    },
    onSuccess: () => {
      toast({ title: `${baseCurrency}/${row.targetCurrency} saved` });
      queryClient.invalidateQueries({ queryKey: MANAGED_RATES_QUERY_KEY });
    },
    onError: (e) =>
      toast({
        variant: "destructive",
        title: `${baseCurrency}/${row.targetCurrency} save failed`,
        description: describeApiError(e),
      }),
  });

  const status = statusFor(row);

  return (
    <TableRow>
      <TableCell className="font-medium">
        {baseCurrency}/{row.targetCurrency}
      </TableCell>
      <TableCell>
        <Input
          type="number"
          step="any"
          inputMode="decimal"
          value={draft}
          placeholder={row.rate == null ? "—" : undefined}
          onChange={(e) => setDraft(e.target.value)}
          className="max-w-[200px]"
        />
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{row.rateDate ?? "—"}</TableCell>
      <TableCell>
        <Badge variant={status.variant}>{status.label}</Badge>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {row.lastChangedAt ? (
          <span>
            {formatDateTime(row.lastChangedAt)}
            {row.updatedBy || row.createdBy ? (
              <span className="block">by {row.updatedBy ?? row.createdBy}</span>
            ) : null}
          </span>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell className="text-right">
        <Button
          type="button"
          size="sm"
          variant="default"
          disabled={!dirty || saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          <Save className="mr-1.5 h-3.5 w-3.5" />
          {saveMutation.isPending ? "Saving…" : "Save"}
        </Button>
      </TableCell>
    </TableRow>
  );
}

function statusFor(
  row: ManagedRateRow,
): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  if (row.rate == null) return { label: "Missing", variant: "destructive" };
  if (row.stale) return { label: "Stale", variant: "outline" };
  return { label: "Fresh", variant: "secondary" };
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  } catch {
    return iso;
  }
}
