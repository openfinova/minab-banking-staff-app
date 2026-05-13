"use client";

import * as React from "react";
import { Pencil, Trash2 } from "lucide-react";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Permissions } from "@/lib/rbac/permissions";
import {
  exchangeApi,
  type ExchangeRateRequestBody,
  type ExchangeRateResponse,
  type RateType,
} from "@/lib/api/modules/exchange";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatExchangeNum, RateTypeSelect } from "@/components/exchange/exchange-ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/auth-provider";

export default function ExchangeRateHistoryPage() {
  return (
    <RouteGuard permissions={[Permissions.ExchangeRateWrite]}>
      <Content />
    </RouteGuard>
  );
}

function Content() {
  const { session } = useAuth();
  const operator = session?.user.username ?? "";
  const { toast } = useToast();

  const [histSource, setHistSource] = React.useState("USD");
  const [histTarget, setHistTarget] = React.useState("EUR");
  const [histType, setHistType] = React.useState<RateType>("SPOT");
  const [histStart, setHistStart] = React.useState(
    () => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
  );
  const [histEnd, setHistEnd] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [histRows, setHistRows] = React.useState<ExchangeRateResponse[] | null>(null);
  const [histLoading, setHistLoading] = React.useState(false);

  const [editOpen, setEditOpen] = React.useState(false);
  const [editRow, setEditRow] = React.useState<ExchangeRateResponse | null>(null);
  const [editForm, setEditForm] = React.useState<ExchangeRateRequestBody | null>(null);
  const [saving, setSaving] = React.useState(false);

  const [deleteRow, setDeleteRow] = React.useState<ExchangeRateResponse | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const loadHistory = async () => {
    setHistLoading(true);
    setHistRows(null);
    try {
      const rows = await exchangeApi.getRatesHistory({
        sourceCurrency: histSource.trim().toUpperCase(),
        targetCurrency: histTarget.trim().toUpperCase(),
        startDate: histStart,
        endDate: histEnd,
        rateType: histType,
      });
      setHistRows(rows);
    } catch (e) {
      toast({ variant: "destructive", title: "History failed", description: describeApiError(e) });
    } finally {
      setHistLoading(false);
    }
  };

  const openEdit = (row: ExchangeRateResponse) => {
    setEditRow(row);
    setEditForm({
      sourceCurrency: row.sourceCurrency,
      targetCurrency: row.targetCurrency,
      rate: row.rate,
      bidRate: row.bidRate ?? undefined,
      askRate: row.askRate ?? undefined,
      rateDate: row.rateDate.slice(0, 10),
      rateType: row.rateType,
    });
    setEditOpen(true);
  };

  const onSaveEdit = async () => {
    if (!editRow || !editForm || !operator) return;
    setSaving(true);
    try {
      await exchangeApi.updateRate(editRow.id, { ...editForm, updatedBy: operator }, operator);
      toast({ title: "Exchange rate updated" });
      setEditOpen(false);
      void loadHistory();
    } catch (e) {
      toast({ variant: "destructive", title: "Update failed", description: describeApiError(e) });
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!deleteRow || !operator) return;
    try {
      await exchangeApi.deleteRate(deleteRow.id, operator);
      toast({ title: "Exchange rate deleted" });
      setDeleteOpen(false);
      setDeleteRow(null);
      void loadHistory();
    } catch (e) {
      toast({ variant: "destructive", title: "Delete failed", description: describeApiError(e) });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rate history"
        description="GET /api/v1/exchange/rates/history — list rows in a date range; update or delete by row id (admin)."
      />
      <Card>
        <CardHeader>
          <CardTitle>Query</CardTitle>
          <CardDescription>Load published rates for a currency pair, then correct or remove rows.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase text-muted-foreground">Source</Label>
              <Input value={histSource} onChange={(e) => setHistSource(e.target.value)} className="w-24 uppercase" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase text-muted-foreground">Target</Label>
              <Input value={histTarget} onChange={(e) => setHistTarget(e.target.value)} className="w-24 uppercase" />
            </div>
            <RateTypeSelect value={histType} onChange={setHistType} label="Rate type" />
            <div className="space-y-1.5">
              <Label className="text-xs uppercase text-muted-foreground">Start</Label>
              <Input type="date" value={histStart} onChange={(e) => setHistStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase text-muted-foreground">End</Label>
              <Input type="date" value={histEnd} onChange={(e) => setHistEnd(e.target.value)} />
            </div>
            <Button type="button" onClick={loadHistory} disabled={histLoading}>
              {histLoading ? "Loading…" : "Load history"}
            </Button>
          </div>

          {histRows && histRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rows in this range.</p>
          ) : null}
          {histRows && histRows.length > 0 ? (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Mid</TableHead>
                    <TableHead className="text-right">Bid</TableHead>
                    <TableHead className="text-right">Ask</TableHead>
                    <TableHead className="w-[100px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {histRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.rateDate}</TableCell>
                      <TableCell>{row.rateType}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{formatExchangeNum(row.rate)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {formatExchangeNum(row.bidRate ?? undefined)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {formatExchangeNum(row.askRate ?? undefined)}
                      </TableCell>
                      <TableCell className="space-x-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label="Edit"
                          onClick={() => openEdit(row)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label="Delete"
                          onClick={() => {
                            setDeleteRow(row);
                            setDeleteOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit exchange rate</DialogTitle>
            <DialogDescription>
              Corrects the record via PUT; natural key must remain unique across rows.
            </DialogDescription>
          </DialogHeader>
          {editForm ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Source</Label>
                <Input
                  value={editForm.sourceCurrency}
                  onChange={(e) => setEditForm((f) => (f ? { ...f, sourceCurrency: e.target.value } : f))}
                  className="uppercase"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Target</Label>
                <Input
                  value={editForm.targetCurrency}
                  onChange={(e) => setEditForm((f) => (f ? { ...f, targetCurrency: e.target.value } : f))}
                  className="uppercase"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Mid rate</Label>
                <Input
                  type="number"
                  step="any"
                  value={editForm.rate}
                  onChange={(e) =>
                    setEditForm((f) =>
                      f ? { ...f, rate: Number.parseFloat(e.target.value) || 0 } : f,
                    )
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Bid</Label>
                <Input
                  type="number"
                  step="any"
                  value={editForm.bidRate ?? ""}
                  onChange={(e) =>
                    setEditForm((f) =>
                      f
                        ? {
                            ...f,
                            bidRate: e.target.value ? Number.parseFloat(e.target.value) : undefined,
                          }
                        : f,
                    )
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Ask</Label>
                <Input
                  type="number"
                  step="any"
                  value={editForm.askRate ?? ""}
                  onChange={(e) =>
                    setEditForm((f) =>
                      f
                        ? {
                            ...f,
                            askRate: e.target.value ? Number.parseFloat(e.target.value) : undefined,
                          }
                        : f,
                    )
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Rate date</Label>
                <Input
                  type="date"
                  value={editForm.rateDate}
                  onChange={(e) => setEditForm((f) => (f ? { ...f, rateDate: e.target.value } : f))}
                />
              </div>
              <div className="sm:col-span-2">
                <RateTypeSelect
                  value={editForm.rateType}
                  onChange={(rateType) => setEditForm((f) => (f ? { ...f, rateType } : f))}
                  label="Rate type"
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={saving || !operator} onClick={onSaveEdit}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmAction
        open={deleteOpen}
        onOpenChange={(o) => {
          setDeleteOpen(o);
          if (!o) setDeleteRow(null);
        }}
        title="Delete exchange rate?"
        description="Permanently removes the rate row (DELETE by id). Prefer editing unless the publication was erroneous."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          await onDelete();
        }}
      />
    </div>
  );
}
