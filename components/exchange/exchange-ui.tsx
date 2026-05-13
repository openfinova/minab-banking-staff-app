"use client";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RateType } from "@/lib/api/modules/exchange";

export const RATE_TYPES: readonly RateType[] = ["SPOT", "EOD", "AVG_MONTH", "OFFICIAL"];

export function RateTypeSelect({
  id,
  label,
  value,
  onChange,
  className,
}: {
  id?: string;
  label?: string;
  value: RateType;
  onChange: (v: RateType) => void;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? (
        <Label htmlFor={id} className="text-xs uppercase text-muted-foreground">
          {label}
        </Label>
      ) : null}
      <Select value={value} onValueChange={(v) => onChange(v as RateType)}>
        <SelectTrigger id={id} className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {RATE_TYPES.map((rt) => (
            <SelectItem key={rt} value={rt}>
              {rt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function formatExchangeNum(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return String(n);
}
