"use client";

import * as React from "react";
import { format, isValid, parse } from "date-fns";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type DateInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type" | "value" | "onChange"
> & {
  /** ISO date `yyyy-MM-dd` or empty */
  value: string;
  onChange: (isoDate: string) => void;
};

const DISPLAY_PATTERNS = ["dd/MM/yyyy", "d/M/yyyy", "dd/M/yyyy", "d/MM/yyyy"] as const;

function isoToDisplay(iso: string): string {
  const s = iso?.trim().slice(0, 10);
  if (!s || s.length < 10) return "";
  const d = parse(s, "yyyy-MM-dd", new Date());
  return isValid(d) ? format(d, "dd/MM/yyyy") : "";
}

type ParseResult =
  | { kind: "empty" }
  | { kind: "iso"; value: string }
  | { kind: "invalid" };

function parseUserInput(trimmed: string): ParseResult {
  if (!trimmed) return { kind: "empty" };
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = parse(trimmed, "yyyy-MM-dd", new Date());
    return isValid(d) ? { kind: "iso", value: trimmed } : { kind: "invalid" };
  }
  for (const pattern of DISPLAY_PATTERNS) {
    const d = parse(trimmed, pattern, new Date());
    if (isValid(d)) return { kind: "iso", value: format(d, "yyyy-MM-dd") };
  }
  return { kind: "invalid" };
}

const COMPLETE_DDMMYYYY = /^\d{1,2}\/\d{1,2}\/\d{4}$/;

/**
 * Date entry as plain text in **DD/MM/YYYY** (day first).
 * Avoids browser `type="date"` segment auto-advance and locale ordering issues.
 * Value/onChange use ISO **`yyyy-MM-dd`** for API and server payloads.
 */
const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ className, value, onChange, onBlur, disabled, id, ...props }, ref) => {
    const [draft, setDraft] = React.useState(() => isoToDisplay(value));
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
      setDraft(isoToDisplay(value));
    }, [value]);

    const flush = React.useCallback(
      (raw: string) => {
        const trimmed = raw.trim();
        const result = parseUserInput(trimmed);
        if (result.kind === "empty") {
          setError(null);
          onChange("");
          setDraft("");
          return;
        }
        if (result.kind === "iso") {
          setError(null);
          onChange(result.value);
          const d = parse(result.value, "yyyy-MM-dd", new Date());
          setDraft(isValid(d) ? format(d, "dd/MM/yyyy") : trimmed);
          return;
        }
        setError("Use a valid date (DD/MM/YYYY)");
      },
      [onChange],
    );

    return (
      <div className="w-full space-y-1">
        <Input
          ref={ref}
          id={id}
          type="text"
          inputMode="text"
          autoComplete="off"
          placeholder="DD/MM/YYYY"
          title="Day / month / year (DD/MM/YYYY)"
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          className={cn(className)}
          value={draft}
          onChange={(e) => {
            const v = e.target.value;
            setError(null);
            setDraft(v);
            if (!v.trim()) {
              onChange("");
              return;
            }
            if (COMPLETE_DDMMYYYY.test(v.trim())) {
              const result = parseUserInput(v.trim());
              if (result.kind === "iso") {
                onChange(result.value);
                const d = parse(result.value, "yyyy-MM-dd", new Date());
                if (isValid(d)) setDraft(format(d, "dd/MM/yyyy"));
              } else {
                setError("Use a valid date (DD/MM/YYYY)");
              }
            }
          }}
          onBlur={(e) => {
            flush(e.target.value);
            onBlur?.(e);
          }}
          {...props}
        />
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    );
  },
);
DateInput.displayName = "DateInput";

export { DateInput };
