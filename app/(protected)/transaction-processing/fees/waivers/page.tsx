"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Can } from "@/components/rbac/can";
import { RouteGuard } from "@/components/rbac/route-guard";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";
import {
  feesApi,
  type CreateFeeWaiverRequest,
} from "@/lib/api/modules/transaction-processing";
import { Permissions } from "@/lib/rbac/permissions";
import { AccountResolveField } from "@/components/accounts/account-resolve-field";

const TX_ANY = "__any__";
const TX_TYPES = [
  "P2P",
  "TRANSFER",
  "CASH_IN",
  "DEPOSIT",
  "CASH_OUT",
  "BILL_PAYMENT",
  "MERCHANT_PURCHASE",
  "REFUND",
];
const TIERS = ["BASIC", "PREMIUM", "VIP", "ENTERPRISE"];

function datetimeLocalToIso(value: string): string | undefined {
  const v = value.trim();
  if (!v) return undefined;
  return v.length === 16 ? `${v}:00` : v;
}

function parseOptionalJsonObject(raw: string, label: string): Record<string, unknown> | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  try {
    const parsed = JSON.parse(t) as unknown;
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(`${label} must be a JSON object`);
    }
    return parsed as Record<string, unknown>;
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new Error(`${label}: invalid JSON`);
    }
    throw e;
  }
}

function formatTs(s?: string): string {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString();
}

export default function FeeWaiversPage() {
  return (
    <RouteGuard permissions={[Permissions.FeeRead]}>
      <FeeWaiversContent />
    </RouteGuard>
  );
}

function FeeWaiversContent() {
  const { toast } = useToast();
  const qc = useQueryClient();
  /** Stored in the fee service as `account_id` (API path still says /customer/:id). */
  const [waiverScopeId, setWaiverScopeId] = React.useState("");

  const [waiverName, setWaiverName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [transactionType, setTransactionType] = React.useState("");
  const [customerTier, setCustomerTier] = React.useState("");
  const [campaignCode, setCampaignCode] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [isGlobal, setIsGlobal] = React.useState(false);
  const [effectiveFrom, setEffectiveFrom] = React.useState("");
  const [effectiveTo, setEffectiveTo] = React.useState("");
  const [maxUsageCount, setMaxUsageCount] = React.useState("");
  const [conditionsJson, setConditionsJson] = React.useState("");
  const [metadataJson, setMetadataJson] = React.useState("");
  const [chMobile, setChMobile] = React.useState(false);
  const [chBranch, setChBranch] = React.useState(false);
  const [chInternet, setChInternet] = React.useState(false);
  const [chAtm, setChAtm] = React.useState(false);
  const [structuredMinAmount, setStructuredMinAmount] = React.useState("");
  const [structuredCountry, setStructuredCountry] = React.useState("");
  const [showAdvConditions, setShowAdvConditions] = React.useState(false);

  const list = useQuery({
    queryKey: ["fee-waivers", waiverScopeId],
    queryFn: () => feesApi.waiversByCustomer(waiverScopeId.trim()),
    enabled: waiverScopeId.trim().length > 0,
  });

  const create = useMutation({
    mutationFn: async () => {
      let conditions: Record<string, unknown> | undefined;
      let metadata: Record<string, unknown> | undefined;
      try {
        metadata = parseOptionalJsonObject(metadataJson, "Metadata");

        const structured: Record<string, unknown> = {};
        const channels: string[] = [];
        if (chMobile) channels.push("MOBILE");
        if (chBranch) channels.push("BRANCH");
        if (chInternet) channels.push("INTERNET");
        if (chAtm) channels.push("ATM");
        if (channels.length) structured.channels = channels;

        const minAmt = structuredMinAmount.trim();
        if (minAmt) {
          const n = Number(minAmt);
          if (Number.isNaN(n) || n < 0) {
            throw new Error("Minimum ticket amount must be a non-negative number.");
          }
          structured.minTransactionAmount = n;
        }

        const cc = structuredCountry.trim().toUpperCase();
        if (cc) structured.countryCode = cc;

        let merged: Record<string, unknown> = { ...structured };
        if (showAdvConditions && conditionsJson.trim()) {
          const adv = parseOptionalJsonObject(conditionsJson, "Conditions");
          merged = { ...merged, ...adv };
        }
        conditions = Object.keys(merged).length ? merged : undefined;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Invalid JSON";
        throw new Error(msg);
      }

      let maxUsage: number | undefined;
      if (maxUsageCount.trim()) {
        maxUsage = Number.parseInt(maxUsageCount.trim(), 10);
        if (Number.isNaN(maxUsage) || maxUsage < 1) {
          throw new Error("Max usage must be a positive integer (or leave blank for unlimited).");
        }
      }

      const body: CreateFeeWaiverRequest = {
        customerId: waiverScopeId.trim(),
        waiverName: waiverName.trim() || undefined,
        description: description.trim() || undefined,
        isActive,
        isGlobal,
        transactionType: transactionType || undefined,
        customerTier: customerTier || undefined,
        campaignCode: campaignCode.trim() || undefined,
        effectiveFrom: datetimeLocalToIso(effectiveFrom),
        effectiveTo: datetimeLocalToIso(effectiveTo),
        maxUsageCount: maxUsage,
      };
      if (conditions !== undefined) body.conditions = conditions;
      if (metadata !== undefined) body.metadata = metadata;

      return feesApi.createWaiver(body);
    },
    onSuccess: () => {
      toast({ title: "Waiver created" });
      void qc.invalidateQueries({ queryKey: ["fee-waivers", waiverScopeId] });
    },
    onError: (e: unknown) =>
      toast({
        variant: "destructive",
        title: "Failed",
        description: e instanceof Error ? e.message : describeApiError(e),
      }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fee waivers"
        description="Issue tariff relief for a single account. Structured rules cover most channel and amount policies; fall back to advanced JSON only when product control requires it."
      />
      <Card>
        <CardHeader>
          <CardTitle>Lookup</CardTitle>
          <CardDescription>
            Search for the servicing account (number, IBAN, or customer linkage), then review active waivers tied to
            that account id in the fee service.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <AccountResolveField
            instanceId="fee-waiver-scope"
            label="Account"
            value={waiverScopeId}
            onChange={(id) => setWaiverScopeId(id)}
          />
          <Button type="button" onClick={() => void list.refetch()} disabled={!waiverScopeId.trim()}>
            Load waivers
          </Button>
        </CardContent>
      </Card>

      <Can permissions={[Permissions.AdminConfigWrite]}>
        <Card>
          <CardHeader>
            <CardTitle>Create waiver</CardTitle>
            <CardDescription>
              Only <span className="font-medium">Account</span> above is required for scope. Waiver name defaults
              on the server if omitted. Effective start defaults to now when left blank.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="waiver-name">Waiver name</Label>
                <Input
                  id="waiver-name"
                  value={waiverName}
                  onChange={(e) => setWaiverName(e.target.value)}
                  placeholder="e.g. Q2 ATM fee promo"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="waiver-campaign">Campaign code</Label>
                <Input
                  id="waiver-campaign"
                  value={campaignCode}
                  onChange={(e) => setCampaignCode(e.target.value)}
                  placeholder="Optional promo / campaign id"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="waiver-description">Description</Label>
              <Textarea
                id="waiver-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Internal notes or customer-facing text"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Transaction type</Label>
                <Select
                  value={transactionType || TX_ANY}
                  onValueChange={(v) => setTransactionType(v === TX_ANY ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TX_ANY}>Any transaction type</SelectItem>
                    {TX_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Customer tier</Label>
                <Select
                  value={customerTier || TX_ANY}
                  onValueChange={(v) => setCustomerTier(v === TX_ANY ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TX_ANY}>Any customer tier</SelectItem>
                    {TIERS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="waiver-from">Effective from</Label>
                <Input
                  id="waiver-from"
                  type="datetime-local"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Leave blank to use server default (now).</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="waiver-to">Effective to</Label>
                <Input
                  id="waiver-to"
                  type="datetime-local"
                  value={effectiveTo}
                  onChange={(e) => setEffectiveTo(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="waiver-max-use">Max usage count</Label>
                <Input
                  id="waiver-max-use"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  placeholder="Unlimited when blank"
                  value={maxUsageCount}
                  onChange={(e) => setMaxUsageCount(e.target.value)}
                />
              </div>
              <div className="flex flex-col justify-end gap-3 pb-1">
                <div className="flex items-center gap-2">
                  <Checkbox id="waiver-active" checked={isActive} onCheckedChange={(c) => setIsActive(c === true)} />
                  <Label htmlFor="waiver-active" className="font-normal">
                    Active
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="waiver-global" checked={isGlobal} onCheckedChange={(c) => setIsGlobal(c === true)} />
                  <Label htmlFor="waiver-global" className="font-normal">
                    Global waiver (bank-wide)
                  </Label>
                </div>
              </div>
            </div>
            <div className="space-y-4 rounded-md border p-4">
              <div>
                <Label className="text-sm font-medium">Servicing channels</Label>
                <p className="text-xs text-muted-foreground">
                  Limits the waiver to specific delivery rails when the tariff engine honours channel metadata.
                </p>
                <div className="mt-2 flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={chMobile} onCheckedChange={(c) => setChMobile(c === true)} />
                    Mobile
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={chBranch} onCheckedChange={(c) => setChBranch(c === true)} />
                    Branch
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={chInternet} onCheckedChange={(c) => setChInternet(c === true)} />
                    Internet
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={chAtm} onCheckedChange={(c) => setChAtm(c === true)} />
                    ATM
                  </label>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="waiver-min-txn">Minimum ticket amount</Label>
                  <Input
                    id="waiver-min-txn"
                    inputMode="decimal"
                    placeholder="Optional threshold"
                    value={structuredMinAmount}
                    onChange={(e) => setStructuredMinAmount(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Applies where the billing engine evaluates amount bands.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="waiver-country">Customer / booking country (ISO)</Label>
                  <Input
                    id="waiver-country"
                    maxLength={2}
                    placeholder="e.g. US"
                    value={structuredCountry}
                    onChange={(e) => setStructuredCountry(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="waiver-adv-cond"
                  checked={showAdvConditions}
                  onCheckedChange={(c) => setShowAdvConditions(c === true)}
                />
                <Label htmlFor="waiver-adv-cond" className="font-normal">
                  Advanced JSON (merge over structured fields)
                </Label>
              </div>
              {showAdvConditions ? (
                <div className="space-y-1.5">
                  <Label htmlFor="waiver-conditions">Conditions JSON</Label>
                  <Textarea
                    id="waiver-conditions"
                    value={conditionsJson}
                    onChange={(e) => setConditionsJson(e.target.value)}
                    rows={4}
                    className="font-mono text-xs"
                    placeholder='e.g. { "channel": "ATM" }'
                  />
                </div>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="waiver-metadata">Metadata (JSON object)</Label>
              <Textarea
                id="waiver-metadata"
                value={metadataJson}
                onChange={(e) => setMetadataJson(e.target.value)}
                rows={3}
                className="font-mono text-xs"
                placeholder='e.g. { "ticketId": "INC-123" }'
              />
            </div>
            <Button
              type="button"
              disabled={!waiverScopeId.trim() || create.isPending}
              onClick={() => create.mutate()}
            >
              Create
            </Button>
          </CardContent>
        </Card>
      </Can>

      <Card>
        <CardHeader>
          <CardTitle>Waivers</CardTitle>
        </CardHeader>
        <CardContent>
          {list.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : list.data?.length ? (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Id</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead className="whitespace-nowrap">Active</TableHead>
                    <TableHead className="whitespace-nowrap">Global</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead className="whitespace-nowrap">From</TableHead>
                    <TableHead className="whitespace-nowrap">To</TableHead>
                    <TableHead className="whitespace-nowrap">Max use</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.data.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-mono text-xs whitespace-nowrap">{w.id}</TableCell>
                      <TableCell>{w.waiverName ?? w.reason ?? "—"}</TableCell>
                      <TableCell className="text-xs">{w.transactionType ?? "—"}</TableCell>
                      <TableCell className="text-xs">{w.customerTier ?? "—"}</TableCell>
                      <TableCell>{w.isActive === false ? "No" : "Yes"}</TableCell>
                      <TableCell>{w.isGlobal ? "Yes" : "No"}</TableCell>
                      <TableCell className="text-xs">{w.campaignCode ?? "—"}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{formatTs(w.effectiveFrom)}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{formatTs(w.effectiveTo)}</TableCell>
                      <TableCell>{w.maxUsageCount ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {waiverScopeId.trim() ? "No waivers for this account." : "Resolve an account and load waivers."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
