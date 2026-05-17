"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { customersApi } from "@/lib/api/modules/customers";
import { accountsApi } from "@/lib/api/modules/accounts";
import { transactionsApi } from "@/lib/api/modules/transaction-processing";
import type { TransactionResponse } from "@/lib/api/modules/transaction-processing";
import type { CustomerResponse } from "@/lib/api/modules/customers";
import type { AccountResponse } from "@/lib/api/modules/accounts";
import { describeApiError } from "@/lib/api/errors";

const UUID_RX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function GlobalSearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const [raw, setRaw] = React.useState("");
  const q = raw.trim();

  React.useEffect(() => {
    if (!open) setRaw("");
  }, [open]);

  const taxPref = /^tax(?:id)?\s*:/i;
  let taxLookup: string | null = null;
  let inner = q;
  if (taxPref.test(q)) {
    taxLookup = q.replace(taxPref, "").trim();
    inner = "";
  }

  const customerSearch = useQuery({
    queryKey: ["global-search", "cust", inner],
    queryFn: () =>
      inner.length >= 2
        ? customersApi.list({ q: inner, page: 0, size: 15 })
        : Promise.resolve(undefined),
    enabled: open && Boolean(inner) && inner.length >= 2 && !taxLookup && !UUID_RX.test(inner),
  });

  const customerTaxId = useQuery({
    queryKey: ["global-search", "cust-tax", taxLookup],
    queryFn: () => customersApi.getByTaxId(taxLookup!),
    enabled: open && Boolean(taxLookup && taxLookup.length >= 3),
    retry: false,
  });

  const accountById = useQuery({
    queryKey: ["global-search", "acct", inner],
    queryFn: () => accountsApi.get(inner),
    enabled: open && UUID_RX.test(inner),
    retry: false,
  });

  const accountByNumberOrIban = useQuery({
    queryKey: ["global-search", "acct-num", inner],
    queryFn: async () => {
      if (/^[A-Z]{2}[0-9]/i.test(inner)) {
        return accountsApi.getByIban(inner);
      }
      return accountsApi.getByNumber(inner.replace(/\s+/g, ""));
    },
    enabled: open && Boolean(inner) && inner.length >= 8 && inner.length <= 42 && !UUID_RX.test(inner) && !taxLookup,
    retry: false,
  });

  const txSearch = useQuery({
    queryKey: ["global-search", "tp", inner],
    queryFn: () =>
      transactionsApi.list({
        reference: inner,
        page: 0,
        size: 15,
        sort: "createdAt,desc",
      }),
    enabled: open && Boolean(inner) && inner.length >= 3 && UUID_RX.test(inner) === false,
    retry: false,
  });

  const txDetail = useQuery({
    queryKey: ["global-search", "tp-id", inner],
    queryFn: () => transactionsApi.get(inner),
    enabled: open && UUID_RX.test(inner),
    retry: false,
  });

  const customers = customerSearch.data?.content ?? [];
  let taxCust: CustomerResponse | undefined =
    customerTaxId.data && !customerTaxId.isError ? customerTaxId.data : undefined;
  let acct: AccountResponse | undefined;
  if (accountById.data && !accountById.isError) acct = accountById.data;
  else if (accountByNumberOrIban.data && !accountByNumberOrIban.isError) acct = accountByNumberOrIban.data;

  const txRows: TransactionResponse[] =
    txDetail.data && !txDetail.isError
      ? [txDetail.data]
      : txSearch.data?.content && !txSearch.isError
        ? txSearch.data.content
        : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Workspace search</DialogTitle>
          <DialogDescription>
            Customers (name or reference), UUID for account/transactions/GL, domestic account numbers, IBAN, or reference
            substrings—plus <Badge variant="muted">taxid:…</Badge> for sanctioned tax-id lookups.
          </DialogDescription>
        </DialogHeader>
        <Input
          autoFocus
          placeholder="Try a name fragment, UUID, IBAN, or taxid:xxxxxxxx"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && UUID_RX.test(q)) {
              e.preventDefault();
              router.push(`/transaction-processing/transactions?q=${encodeURIComponent(q)}`);
              onOpenChange(false);
            }
          }}
          aria-label="Workspace search query"
          className="font-mono text-sm"
        />
        {!q ? (
          <p className="text-xs text-muted-foreground">Press Ctrl+K or Cmd+K anytime to reopen.</p>
        ) : (
          <div className="space-y-5 text-sm">
            {taxLookup ? (
              <section>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Customer (tax identifier)
                </h3>
                {customerTaxId.isLoading ? (
                  <p className="text-xs text-muted-foreground">Looking up…</p>
                ) : customerTaxId.isError ? (
                  <p className="text-xs text-destructive">{describeApiError(customerTaxId.error)}</p>
                ) : taxCust ? (
                  <SearchLink href={`/customers/${taxCust.id}`} meta={taxCust.customerNumber}>
                    {taxCust.businessName ??
                      (`${taxCust.firstName ?? ""} ${taxCust.lastName ?? ""}`.trim() || "Customer")}
                  </SearchLink>
                ) : null}
              </section>
            ) : null}

            {inner.length >= 2 && UUID_RX.test(inner) ? (
              <section>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Resolved by UUID
                </h3>
                <div className="flex flex-wrap gap-2">
                  <ButtonLink href={`/customers/${inner}`}>Open as customer id</ButtonLink>
                  <ButtonLink href={`/accounts/${inner}`}>Open as account id</ButtonLink>
                  <ButtonLink href={`/transaction-processing/transactions/${inner}`}>
                    Open as payment id
                  </ButtonLink>
                </div>
              </section>
            ) : null}

            {acct ? (
              <section>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Matching account
                </h3>
                <SearchLink href={`/accounts/${acct.id}`} meta={acct.accountNumber}>
                  {acct.displayName ?? acct.accountNumber}{" "}
                  <Badge variant="outline" className="ml-2">
                    {acct.status}
                  </Badge>
                </SearchLink>
              </section>
            ) : UUID_RX.test(inner) && accountById.isError ? (
              <ResolvedNone label="No account matched that UUID." />
            ) : null}

            {!UUID_RX.test(inner) && inner.length >= 8 && inner.length <= 42 && accountByNumberOrIban.isError ? (
              <ResolvedNone label="No account matched number/IBAN — try Directory filters." />
            ) : null}

            {customers.length ? (
              <section>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Customers
                </h3>
                <ul className="space-y-2">
                  {customers.map((c) => (
                    <li key={c.id}>
                      <SearchLink href={`/customers/${c.id}`} meta={c.customerNumber}>
                        {c.businessName ??
                          (`${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "(no primary name)")}
                      </SearchLink>
                    </li>
                  ))}
                </ul>
              </section>
            ) : customerSearch.isError ? (
              <p className="text-xs text-destructive">{describeApiError(customerSearch.error)}</p>
            ) : null}

            {txRows.length ? (
              <section>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Payments / transfers
                </h3>
                <ul className="space-y-2">
                  {txRows.slice(0, 10).map((tx) =>
                    tx.id ? (
                      <li key={tx.id}>
                        <SearchLink href={`/transaction-processing/transactions/${tx.id}`} meta={tx.status}>
                          {(tx.amount != null ? String(tx.amount) : "—")} {tx.currency ?? ""}{" "}
                          {tx.type ? ` (${tx.type})` : ""}
                          {tx.description ? ` — ${tx.description.slice(0, 60)}` : ""}
                        </SearchLink>
                      </li>
                    ) : null,
                  )}
                </ul>
                {UUID_RX.test(inner) === false && inner.length >= 3 ? (
                  <ButtonLink href={`/transaction-processing/transactions?reference=${encodeURIComponent(inner)}`}>
                    Open Transaction search filtered
                  </ButtonLink>
                ) : null}
              </section>
            ) : txSearch.isError || txDetail.isError ? (
              <ResolvedNone label="No payment matches this token." />
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SearchLink({
  href,
  children,
  meta,
}: {
  href: string;
  children: React.ReactNode;
  meta?: string;
}) {
  return (
    <Link href={href} className="block rounded-md border bg-card px-2 py-1.5 hover:bg-muted">
      <div className="font-medium">{children}</div>
      {meta ? <div className="font-mono text-[11px] text-muted-foreground">{meta}</div> : null}
    </Link>
  );
}

function ButtonLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-md border px-3 py-1 text-xs font-medium hover:bg-muted"
    >
      {children}
    </Link>
  );
}

function ResolvedNone({ label }: { label: string }) {
  return <p className="text-xs text-muted-foreground">{label}</p>;
}
