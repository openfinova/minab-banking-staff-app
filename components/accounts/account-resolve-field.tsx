"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/data/status-badge";
import { Can } from "@/components/rbac/can";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";
import { accountsApi, type AccountResponse } from "@/lib/api/modules/accounts";
import { customersApi, type CustomerResponse } from "@/lib/api/modules/customers";
import { Permissions } from "@/lib/rbac/permissions";
import { cn } from "@/lib/utils";

function customerLabel(c: CustomerResponse) {
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
  if (name) return `${name} (${c.customerNumber})`;
  if (c.businessName) return `${c.businessName} (${c.customerNumber})`;
  return c.customerNumber;
}

export interface AccountResolveFieldProps {
  /** Prefix for stable `id` / `htmlFor` when multiple fields are on the page */
  instanceId: string;
  /** Resolved account UUID */
  value: string;
  onChange: (accountId: string, account: AccountResponse | null) => void;
  label?: string;
  compact?: boolean;
  /** Resolved account card with Open link + Clear */
  showSummary?: boolean;
  showCustomerTab?: boolean;
  showSuccessToast?: boolean;
  className?: string;
}

export function AccountResolveField({
  instanceId,
  value,
  onChange,
  label,
  compact = false,
  showSummary = true,
  showCustomerTab = true,
  showSuccessToast = true,
  className,
}: AccountResolveFieldProps) {
  const { toast } = useToast();
  const [lastResolved, setLastResolved] = React.useState<AccountResponse | null>(null);
  const [byAccountId, setByAccountId] = React.useState("");
  const [byNumber, setByNumber] = React.useState("");
  const [byIban, setByIban] = React.useState("");
  const [customerQ, setCustomerQ] = React.useState("");
  const [customerHits, setCustomerHits] = React.useState<CustomerResponse[] | null>(null);
  const [accountsForCustomer, setAccountsForCustomer] = React.useState<AccountResponse[] | null>(null);

  React.useEffect(() => {
    if (!value.trim()) {
      setLastResolved(null);
    }
  }, [value]);

  const pick = React.useCallback(
    (a: AccountResponse, mode: "resolve" | "pick-list" = "resolve") => {
      setLastResolved(a);
      setAccountsForCustomer(null);
      setCustomerHits(null);
      onChange(a.id, a);
      if (!showSuccessToast) return;
      toast({ title: mode === "pick-list" ? "Account selected" : "Account resolved" });
    },
    [onChange, showSuccessToast, toast],
  );

  const clear = React.useCallback(() => {
    setLastResolved(null);
    setCustomerHits(null);
    setAccountsForCustomer(null);
    onChange("", null);
  }, [onChange]);

  const qAccountById = useMutation({
    mutationFn: () => accountsApi.get(byAccountId.trim()),
    onSuccess: (a) => pick(a),
    onError: (e) =>
      toast({ variant: "destructive", title: "Lookup failed", description: describeApiError(e) }),
  });

  const qAccountByNumber = useMutation({
    mutationFn: () => accountsApi.getByNumber(byNumber.trim()),
    onSuccess: (a) => pick(a),
    onError: (e) =>
      toast({ variant: "destructive", title: "Lookup failed", description: describeApiError(e) }),
  });

  const qAccountByIban = useMutation({
    mutationFn: () => accountsApi.getByIban(byIban.trim()),
    onSuccess: (a) => pick(a),
    onError: (e) =>
      toast({ variant: "destructive", title: "Lookup failed", description: describeApiError(e) }),
  });

  const searchCustomers = useMutation({
    mutationFn: () => customersApi.list({ q: customerQ.trim(), page: 0, size: 20 }),
    onSuccess: (pageRes) => {
      setCustomerHits(pageRes.content ?? []);
      setAccountsForCustomer(null);
      if (!pageRes.content?.length) toast({ title: "No customers matched" });
    },
    onError: (e) =>
      toast({ variant: "destructive", title: "Search failed", description: describeApiError(e) }),
  });

  const loadAccountsForCustomer = useMutation({
    mutationFn: async (c: CustomerResponse) => {
      const identity = c.linkedIdentityUserId?.trim();
      if (identity) {
        const byIdentity = await accountsApi.search({ primaryUserProfileId: identity, page: 0, size: 50 });
        if ((byIdentity.content?.length ?? 0) > 0) return byIdentity;
      }
      return accountsApi.search({ primaryUserProfileId: c.id, page: 0, size: 50 });
    },
    onSuccess: (pageRes) => {
      const rows = pageRes.content ?? [];
      setAccountsForCustomer(rows);
      if (rows.length === 1) {
        pick(rows[0]!);
        return;
      }
      if (!rows.length) {
        toast({
          variant: "destructive",
          title: "No accounts",
          description:
            "No accounts with this customer as primary holder. Accounts use the identity profile id " +
            "(linked user), not the customer record id — link identity on the customer profile if missing.",
        });
        return;
      }
      toast({ title: "Select an account", description: `${rows.length} accounts found.` });
    },
    onError: (e) =>
      toast({ variant: "destructive", title: "Failed to load accounts", description: describeApiError(e) }),
  });

  const summaryAccount = lastResolved ?? (value.trim() ? ({ id: value } as AccountResponse) : null);

  return (
    <div className={cn("space-y-2", className)}>
      {label ? <Label>{label}</Label> : null}
      <div className={cn("rounded-md border bg-card p-3", compact && "p-2")}>
        <Tabs defaultValue="id" className="w-full">
          <TabsList
            className={cn(
              "flex h-auto w-full flex-wrap gap-1",
              compact && "text-xs",
            )}
          >
            <TabsTrigger value="id" className={compact ? "text-xs px-2" : undefined}>
              Account id
            </TabsTrigger>
            <TabsTrigger value="number" className={compact ? "text-xs px-2" : undefined}>
              Number
            </TabsTrigger>
            <TabsTrigger value="iban" className={compact ? "text-xs px-2" : undefined}>
              IBAN
            </TabsTrigger>
            {showCustomerTab ? (
              <TabsTrigger value="customer" className={compact ? "text-xs px-2" : undefined}>
                Customer
              </TabsTrigger>
            ) : null}
          </TabsList>

          <TabsContent value="id" className={cn("space-y-2 pt-3", compact && "pt-2 space-y-1.5")}>
            <div className="grid max-w-lg gap-1.5">
              {!compact ? (
                <Label htmlFor={`${instanceId}-aid`} className="text-xs text-muted-foreground">
                  Account UUID
                </Label>
              ) : null}
              <Input
                id={`${instanceId}-aid`}
                value={byAccountId}
                onChange={(e) => setByAccountId(e.target.value)}
                autoComplete="off"
                placeholder="UUID"
                className={compact ? "h-8 text-sm" : undefined}
              />
            </div>
            <Button
              type="button"
              size={compact ? "sm" : "default"}
              onClick={() => {
                if (!byAccountId.trim()) return;
                qAccountById.mutate();
              }}
              disabled={qAccountById.isPending || !byAccountId.trim()}
            >
              {qAccountById.isPending ? "…" : "Resolve"}
            </Button>
          </TabsContent>

          <TabsContent value="number" className={cn("space-y-2 pt-3", compact && "pt-2 space-y-1.5")}>
            <Input
              id={`${instanceId}-anum`}
              value={byNumber}
              onChange={(e) => setByNumber(e.target.value)}
              placeholder="Account number"
              className={compact ? "h-8 text-sm" : undefined}
            />
            <Button
              type="button"
              size={compact ? "sm" : "default"}
              onClick={() => {
                if (!byNumber.trim()) return;
                qAccountByNumber.mutate();
              }}
              disabled={qAccountByNumber.isPending || !byNumber.trim()}
            >
              {qAccountByNumber.isPending ? "…" : "Resolve"}
            </Button>
          </TabsContent>

          <TabsContent value="iban" className={cn("space-y-2 pt-3", compact && "pt-2 space-y-1.5")}>
            <Input
              id={`${instanceId}-aiban`}
              value={byIban}
              onChange={(e) => setByIban(e.target.value)}
              placeholder="IBAN"
              className={compact ? "h-8 text-sm" : undefined}
            />
            <Button
              type="button"
              size={compact ? "sm" : "default"}
              onClick={() => {
                if (!byIban.trim()) return;
                qAccountByIban.mutate();
              }}
              disabled={qAccountByIban.isPending || !byIban.trim()}
            >
              {qAccountByIban.isPending ? "…" : "Resolve"}
            </Button>
          </TabsContent>

          {showCustomerTab ? (
            <TabsContent value="customer" className={cn("space-y-2 pt-3", compact && "pt-2 space-y-1.5")}>
              <Can
                permissions={[Permissions.CustomerRead]}
                fallback={
                  <p className="text-xs text-muted-foreground">
                    Needs <span className="font-mono">customer:read</span> to search by name, email, or phone.
                  </p>
                }
              >
                <div className="flex flex-wrap items-end gap-2">
                  <Input
                    id={`${instanceId}-cq`}
                    value={customerQ}
                    onChange={(e) => setCustomerQ(e.target.value)}
                    placeholder="Name, email, phone, #, customer UUID"
                    className={cn("min-w-[160px] flex-1", compact && "h-8 text-sm")}
                  />
                  <Button
                    type="button"
                    size={compact ? "sm" : "default"}
                    disabled={searchCustomers.isPending || !customerQ.trim()}
                    onClick={() => searchCustomers.mutate()}
                  >
                    {searchCustomers.isPending ? "…" : "Search"}
                  </Button>
                </div>
                {customerHits?.length ? (
                  <ul
                    className={cn(
                      "max-h-32 space-y-0.5 overflow-y-auto rounded border p-1.5 text-sm",
                      compact && "max-h-28 text-xs",
                    )}
                  >
                    {customerHits.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          className="w-full rounded px-2 py-0.5 text-left hover:bg-muted"
                          onClick={() => loadAccountsForCustomer.mutate(c)}
                          disabled={loadAccountsForCustomer.isPending}
                        >
                          {customerLabel(c)}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {accountsForCustomer && accountsForCustomer.length > 1 ? (
                  <ul
                    className={cn(
                      "max-h-36 space-y-0.5 overflow-y-auto rounded border p-1.5 text-sm",
                      compact && "max-h-32 text-xs",
                    )}
                  >
                    {accountsForCustomer.map((a) => (
                      <li key={a.id}>
                        <button
                          type="button"
                          className="flex w-full flex-col items-start rounded px-2 py-0.5 text-left hover:bg-muted"
                          onClick={() => pick(a, "pick-list")}
                        >
                          <span className="font-medium">{a.displayName ?? a.accountNumber}</span>
                          <span className="font-mono text-xs text-muted-foreground">{a.accountNumber}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Can>
            </TabsContent>
          ) : null}
        </Tabs>
      </div>

      {showSummary && summaryAccount && value.trim() === summaryAccount.id ? (
        <div
          className={cn(
            "flex flex-wrap items-start justify-between gap-2 rounded-md border bg-muted/30 p-2 text-sm",
            compact && "text-xs p-2",
          )}
        >
          <div className="min-w-0 space-y-0.5">
            {lastResolved ? (
              <>
                <p className="truncate font-medium">{lastResolved.displayName ?? lastResolved.accountNumber}</p>
                <p className="font-mono text-xs text-muted-foreground">{lastResolved.accountNumber}</p>
                {lastResolved.iban ? (
                  <p className="font-mono text-xs text-muted-foreground">{lastResolved.iban}</p>
                ) : null}
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <StatusBadge status={lastResolved.status} />
                  <span className="text-xs text-muted-foreground">{lastResolved.productType}</span>
                </div>
              </>
            ) : (
              <p className="font-mono text-xs text-muted-foreground">id {value}</p>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap gap-1">
            {lastResolved ? (
              <Button variant="secondary" size="sm" className={compact ? "h-7 text-xs" : undefined} asChild>
                <Link href={`/accounts/${lastResolved.id}`}>Open</Link>
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              type="button"
              className={compact ? "h-7 text-xs" : undefined}
              onClick={clear}
            >
              Clear
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
