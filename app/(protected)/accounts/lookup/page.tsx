"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { RouteGuard } from "@/components/rbac/route-guard";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/data/status-badge";
import { describeApiError } from "@/lib/api/errors";
import { accountsApi, type AccountResponse } from "@/lib/api/modules/accounts";
import { Permissions } from "@/lib/rbac/permissions";

export default function AccountLookupPage() {
  return (
    <RouteGuard permissions={[Permissions.AccountRead]}>
      <AccountLookupContent />
    </RouteGuard>
  );
}

function AccountLookupContent() {
  const [byId, setById] = React.useState("");
  const [byNumber, setByNumber] = React.useState("");
  const [byIban, setByIban] = React.useState("");

  const qId = useMutation({ mutationFn: () => accountsApi.get(byId.trim()) });
  const qNum = useMutation({ mutationFn: () => accountsApi.getByNumber(byNumber) });
  const qIban = useMutation({ mutationFn: () => accountsApi.getByIban(byIban) });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account lookup"
        description="Resolve an account from its UUID, domestic number, or IBAN before opening the profile."
      />

      <Card>
        <CardHeader>
          <CardTitle>Search</CardTitle>
          <CardDescription>Each tab exercises a different resolver so support teams can match any identifier they hold.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="id" className="w-full">
            <TabsList className="grid w-full max-w-lg grid-cols-3">
              <TabsTrigger value="id">By id</TabsTrigger>
              <TabsTrigger value="number">By number</TabsTrigger>
              <TabsTrigger value="iban">By IBAN</TabsTrigger>
            </TabsList>

            <TabsContent value="id" className="space-y-4 pt-4">
              <div className="grid max-w-lg gap-2">
                <Label htmlFor="aid">Account id (UUID)</Label>
                <Input id="aid" value={byId} onChange={(e) => setById(e.target.value)} autoComplete="off" />
              </div>
              <Button
                type="button"
                onClick={() => {
                  if (!byId.trim()) return;
                  qId.mutate();
                }}
                disabled={qId.isPending || !byId.trim()}
              >
                {qId.isPending ? "Loading…" : "Lookup"}
              </Button>
              {qId.isError ? (
                <p className="text-sm text-destructive">{describeApiError(qId.error)}</p>
              ) : null}
              {qId.data ? <AccountLookupResult a={qId.data} /> : null}
            </TabsContent>

            <TabsContent value="number" className="space-y-4 pt-4">
              <div className="grid max-w-lg gap-2">
                <Label htmlFor="anum">Account number</Label>
                <Input id="anum" value={byNumber} onChange={(e) => setByNumber(e.target.value)} />
              </div>
              <Button
                type="button"
                onClick={() => {
                  if (!byNumber.trim()) return;
                  qNum.mutate();
                }}
                disabled={qNum.isPending || !byNumber.trim()}
              >
                {qNum.isPending ? "Loading…" : "Lookup"}
              </Button>
              {qNum.isError ? (
                <p className="text-sm text-destructive">{describeApiError(qNum.error)}</p>
              ) : null}
              {qNum.data ? <AccountLookupResult a={qNum.data} /> : null}
            </TabsContent>

            <TabsContent value="iban" className="space-y-4 pt-4">
              <div className="grid max-w-lg gap-2">
                <Label htmlFor="aiban">IBAN</Label>
                <Input id="aiban" value={byIban} onChange={(e) => setByIban(e.target.value)} />
              </div>
              <Button
                type="button"
                onClick={() => {
                  if (!byIban.trim()) return;
                  qIban.mutate();
                }}
                disabled={qIban.isPending || !byIban.trim()}
              >
                {qIban.isPending ? "Loading…" : "Lookup"}
              </Button>
              {qIban.isError ? (
                <p className="text-sm text-destructive">{describeApiError(qIban.error)}</p>
              ) : null}
              {qIban.data ? <AccountLookupResult a={qIban.data} /> : null}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function AccountLookupResult({ a }: { a: AccountResponse }) {
  return (
    <div className="rounded-md border bg-card p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">{a.displayName ?? a.accountNumber}</p>
          <p className="font-mono text-xs text-muted-foreground">{a.accountNumber}</p>
          {a.iban ? <p className="font-mono text-xs text-muted-foreground">{a.iban}</p> : null}
        </div>
        <Button variant="secondary" size="sm" asChild>
          <Link href={`/accounts/${a.id}`}>Open record</Link>
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusBadge status={a.status} />
        <span className="text-xs text-muted-foreground">{a.productType}</span>
        <span className="text-xs text-muted-foreground">{a.currency}</span>
      </div>
    </div>
  );
}
