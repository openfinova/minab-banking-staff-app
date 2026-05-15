"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { describeApiError } from "@/lib/api/errors";
import { loanProductsApi, type LoanProductResponse } from "@/lib/api/modules/loans";

export function LoanProductPicker({
  value,
  onChange,
  id = "loan-product-picker",
  label = "Loan product",
}: {
  value: string;
  onChange: (productId: string, product?: LoanProductResponse) => void;
  id?: string;
  label?: string;
}) {
  const q = useQuery({
    queryKey: ["loans", "products", "active"],
    queryFn: () => loanProductsApi.listActive(),
  });

  const byId = React.useMemo(() => {
    const m = new Map<string, LoanProductResponse>();
    for (const p of q.data ?? []) m.set(p.id, p);
    return m;
  }, [q.data]);

  if (q.isLoading) return <Skeleton className="h-10 w-full max-w-md" />;
  if (q.isError) return <p className="text-sm text-destructive">{describeApiError(q.error)}</p>;

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={value || "__none__"}
        onValueChange={(v) => {
          const idVal = v === "__none__" ? "" : v;
          onChange(idVal, idVal ? byId.get(idVal) : undefined);
        }}
      >
        <SelectTrigger id={id}>
          <SelectValue placeholder="Select product" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">—</SelectItem>
          {(q.data ?? []).map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.productCode} — {p.productName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
