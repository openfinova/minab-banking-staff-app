"use client";

import * as React from "react";
import { DateInput } from "@/components/ui/date-input";
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
  inferDateRangePreset,
  resolveDateRangePreset,
  type DateRangePreset,
} from "@/lib/date-range-presets";
import { cn } from "@/lib/utils";

export interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onChange: (range: { startDate: string; endDate: string }) => void;
  periodLabel?: string;
  startLabel?: string;
  endLabel?: string;
  className?: string;
  startInputClassName?: string;
  endInputClassName?: string;
}

export function DateRangeFilter({
  startDate,
  endDate,
  onChange,
  periodLabel = "Period",
  startLabel = "Start",
  endLabel = "End",
  className,
  startInputClassName,
  endInputClassName,
}: DateRangeFilterProps) {
  const [preset, setPreset] = React.useState<DateRangePreset>(() =>
    inferDateRangePreset(startDate, endDate),
  );

  React.useEffect(() => {
    setPreset(inferDateRangePreset(startDate, endDate));
  }, [startDate, endDate]);

  const onPresetChange = (value: string) => {
    if (value === "custom") {
      setPreset("custom");
      return;
    }
    const nextPreset = value as Exclude<DateRangePreset, "custom">;
    setPreset(nextPreset);
    onChange(resolveDateRangePreset(nextPreset));
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
        <div className="grid gap-3 sm:grid-cols-2 sm:max-w-md">
          <div className="grid gap-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">{startLabel}</Label>
            <DateInput
              className={startInputClassName}
              value={startDate}
              onChange={(value) => {
                setPreset("custom");
                onChange({ startDate: value, endDate });
              }}
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">{endLabel}</Label>
            <DateInput
              className={endInputClassName}
              value={endDate}
              onChange={(value) => {
                setPreset("custom");
                onChange({ startDate, endDate: value });
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
