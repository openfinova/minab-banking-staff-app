"use client";

import * as React from "react";
import { DateTimeInput } from "@/components/ui/datetime-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DATE_RANGE_PRESET_OPTIONS,
  inferDatetimeRangePreset,
  resolveDatetimeRangePreset,
  type DateRangePreset,
} from "@/lib/date-range-presets";
import { cn } from "@/lib/utils";

export interface DateTimeRangeFilterProps {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
  periodLabel?: string;
  fromLabel?: string;
  toLabel?: string;
  className?: string;
}

export function DateTimeRangeFilter({
  from,
  to,
  onChange,
  periodLabel = "Period",
  fromLabel = "From",
  toLabel = "To",
  className,
}: DateTimeRangeFilterProps) {
  const [preset, setPreset] = React.useState<DateRangePreset>(() => inferDatetimeRangePreset(from, to));

  React.useEffect(() => {
    setPreset(inferDatetimeRangePreset(from, to));
  }, [from, to]);

  const onPresetChange = (value: string) => {
    if (value === "custom") {
      setPreset("custom");
      return;
    }
    const nextPreset = value as Exclude<DateRangePreset, "custom">;
    setPreset(nextPreset);
    onChange(resolveDatetimeRangePreset(nextPreset));
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid gap-1.5">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">{periodLabel}</Label>
        <Select value={preset} onValueChange={onPresetChange}>
          <SelectTrigger className="w-full max-w-[11rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGE_PRESET_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {preset === "custom" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">{fromLabel}</Label>
            <DateTimeInput
              value={from}
              onChange={(value) => {
                setPreset("custom");
                onChange({ from: value, to });
              }}
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">{toLabel}</Label>
            <DateTimeInput
              value={to}
              onChange={(value) => {
                setPreset("custom");
                onChange({ from, to: value });
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
