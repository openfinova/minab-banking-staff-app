"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Can } from "@/components/rbac/can";
import { RouteGuard } from "@/components/rbac/route-guard";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";
import {
  feesApi,
  type CreateFeeRuleRequest,
  type UpdateFeeRuleRequest,
} from "@/lib/api/modules/transaction-processing";
import { Permissions } from "@/lib/rbac/permissions";

const TX_TYPES = ["P2P", "TRANSFER", "CASH_IN", "CASH_OUT", "BILL_PAYMENT", "MERCHANT_PURCHASE", "REFUND"];
const TIERS = ["BASIC", "PREMIUM", "VIP", "ENTERPRISE"];
const FEE_TYPES = ["FIXED_AMOUNT", "PERCENTAGE", "TIERED", "MINIMUM", "MAXIMUM"];

export default function FeeRulesPage() {
  return (
    <RouteGuard permissions={[Permissions.FeeRead]}>
      <FeeRulesContent />
    </RouteGuard>
  );
}

function FeeRulesContent() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["fee-rules"],
    queryFn: () => feesApi.rules(),
  });

  const remove = useMutation({
    mutationFn: (id: string) => feesApi.deleteRule(id),
    onSuccess: () => {
      toast({ title: "Rule deleted" });
      void qc.invalidateQueries({ queryKey: ["fee-rules"] });
    },
    onError: (e) =>
      toast({ variant: "destructive", title: "Delete failed", description: describeApiError(e) }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fee rules"
        description="GET/POST/PUT/DELETE /api/v1/fees/rules — mutations require admin:config:write."
        actions={
          <Can permissions={[Permissions.AdminConfigWrite]}>
            <CreateRuleDialog
              onDone={() => void qc.invalidateQueries({ queryKey: ["fee-rules"] })}
            />
          </Can>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Active rules</CardTitle>
        </CardHeader>
        <CardContent>
          {list.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : list.data?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Id</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Fee type</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.id?.slice(0, 8)}…</TableCell>
                    <TableCell>{r.transactionType}</TableCell>
                    <TableCell>{r.customerTier}</TableCell>
                    <TableCell>{r.feeType}</TableCell>
                    <TableCell>{r.isActive ? "yes" : "no"}</TableCell>
                    <TableCell className="text-right">
                      <Can permissions={[Permissions.AdminConfigWrite]}>
                        <EditRuleDialog
                          ruleId={r.id!}
                          onDone={() => void qc.invalidateQueries({ queryKey: ["fee-rules"] })}
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="ml-2"
                          onClick={() => {
                            if (r.id && confirm("Delete this rule?")) remove.mutate(r.id);
                          }}
                        >
                          Delete
                        </Button>
                      </Can>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No rules</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CreateRuleDialog({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [transactionType, setTxn] = React.useState("P2P");
  const [customerTier, setTier] = React.useState("BASIC");
  const [feeType, setFeeType] = React.useState("FIXED_AMOUNT");
  const [fixedAmount, setFixed] = React.useState("");
  const [percentageRate, setPct] = React.useState("");
  const [minFee, setMin] = React.useState("");
  const [maxFee, setMax] = React.useState("");
  const [pending, setPending] = React.useState(false);

  const submit = async () => {
    setPending(true);
    try {
      const body: CreateFeeRuleRequest = {
        transactionType,
        customerTier,
        feeType,
        fixedAmount: fixedAmount.trim() ? Number(fixedAmount) : undefined,
        percentageRate: percentageRate.trim() ? Number(percentageRate) : undefined,
        minFee: minFee.trim() ? Number(minFee) : undefined,
        maxFee: maxFee.trim() ? Number(maxFee) : undefined,
      };
      await feesApi.createRule(body);
      toast({ title: "Rule created" });
      setOpen(false);
      onDone();
    } catch (e) {
      toast({ variant: "destructive", title: "Failed", description: describeApiError(e) });
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New rule</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create fee rule</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label>Transaction type</Label>
            <Select value={transactionType} onValueChange={setTxn}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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
            <Select value={customerTier} onValueChange={setTier}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIERS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Fee type</Label>
            <Select value={feeType} onValueChange={setFeeType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FEE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Fixed</Label>
              <Input value={fixedAmount} onChange={(e) => setFixed(e.target.value)} />
            </div>
            <div>
              <Label>% rate</Label>
              <Input value={percentageRate} onChange={(e) => setPct(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Min fee</Label>
              <Input value={minFee} onChange={(e) => setMin(e.target.value)} />
            </div>
            <div>
              <Label>Max fee</Label>
              <Input value={maxFee} onChange={(e) => setMax(e.target.value)} />
            </div>
          </div>
          <Button type="button" disabled={pending} onClick={() => void submit()}>
            Create
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditRuleDialog({ ruleId, onDone }: { ruleId: string; onDone: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [fixedAmount, setFixed] = React.useState("");
  const [percentageRate, setPct] = React.useState("");
  const [minFee, setMin] = React.useState("");
  const [maxFee, setMax] = React.useState("");
  const [isActive, setActive] = React.useState("true");
  const [pending, setPending] = React.useState(false);

  const submit = async () => {
    setPending(true);
    try {
      const body: UpdateFeeRuleRequest = {
        fixedAmount: fixedAmount.trim() ? Number(fixedAmount) : undefined,
        percentageRate: percentageRate.trim() ? Number(percentageRate) : undefined,
        minFee: minFee.trim() ? Number(minFee) : undefined,
        maxFee: maxFee.trim() ? Number(maxFee) : undefined,
        isActive: isActive === "true",
      };
      await feesApi.updateRule(ruleId, body);
      toast({ title: "Rule updated" });
      setOpen(false);
      onDone();
    } catch (e) {
      toast({ variant: "destructive", title: "Failed", description: describeApiError(e) });
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update rule</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Fixed</Label>
              <Input value={fixedAmount} onChange={(e) => setFixed(e.target.value)} />
            </div>
            <div>
              <Label>% rate</Label>
              <Input value={percentageRate} onChange={(e) => setPct(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Min fee</Label>
              <Input value={minFee} onChange={(e) => setMin(e.target.value)} />
            </div>
            <div>
              <Label>Max fee</Label>
              <Input value={maxFee} onChange={(e) => setMax(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Active</Label>
            <Select value={isActive} onValueChange={setActive}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">true</SelectItem>
                <SelectItem value="false">false</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="button" disabled={pending} onClick={() => void submit()}>
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
