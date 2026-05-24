"use client";

import * as React from "react";
import { format, isValid, parse } from "date-fns";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type DateTimeInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type" | "value" | "onChange"
> & {
  /** Local datetime `yyyy-MM-ddTHH:mm`, ISO timestamp, or empty */
  value: string;
  onChange: (localDateTime: string) => void;
};

const DISPLAY_PATTERNS = [
  "dd/MM/yyyy HH:mm",
  "d/M/yyyy H:mm",
  "dd/M/yyyy HH:mm",
  "d/MM/yyyy H:mm",
] as const;

const WIRE_FORMAT = "yyyy-MM-dd'T'HH:mm";

function parseStoredValue(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
    const d = parse(trimmed, WIRE_FORMAT, new Date());
    return isValid(d) ? d : null;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(trimmed)) {
    const d = parse(trimmed.slice(0, 19), "yyyy-MM-dd'T'HH:mm:ss", new Date());
    if (isValid(d)) return d;
  }
  const d = new Date(trimmed);
  return isValid(d) ? d : null;
}

function toWireFormat(d: Date): string {
  return format(d, WIRE_FORMAT);
}

function isoToDisplay(iso: string): string {
  const d = parseStoredValue(iso);
  return d ? format(d, "dd/MM/yyyy HH:mm") : "";
}

type ParseResult =
  | { kind: "empty" }
  | { kind: "wire"; value: string }
  | { kind: "invalid" };

function parseUserInput(trimmed: string): ParseResult {
  if (!trimmed) return { kind: "empty" };
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    const d = parseStoredValue(trimmed);
    return d ? { kind: "wire", value: toWireFormat(d) } : { kind: "invalid" };
  }
  for (const pattern of DISPLAY_PATTERNS) {
    const d = parse(trimmed, pattern, new Date());
    if (isValid(d)) return { kind: "wire", value: toWireFormat(d) };
  }
  return { kind: "invalid" };
}

const COMPLETE_DDMMYYYY_HHMM = /^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}$/;

/**
 * Datetime entry as plain text in **DD/MM/YYYY HH:mm** (day first, 24-hour clock).
 * Avoids browser `type="datetime-local"` locale ordering issues.
 * Value/onChange use local **`yyyy-MM-ddTHH:mm`** (same wire shape as datetime-local).
 */
const DateTimeInput = React.forwardRef<HTMLInputElement, DateTimeInputProps>(
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
        if (result.kind === "wire") {
          setError(null);
          onChange(result.value);
          const d = parseStoredValue(result.value);
          setDraft(d ? format(d, "dd/MM/yyyy HH:mm") : trimmed);
          return;
        }
        setError("Use a valid datetime (DD/MM/YYYY HH:mm)");
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
          placeholder="DD/MM/YYYY HH:mm"
          title="Day / month / year and 24-hour time (DD/MM/YYYY HH:mm)"
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
            if (COMPLETE_DDMMYYYY_HHMM.test(v.trim())) {
              const result = parseUserInput(v.trim());
              if (result.kind === "wire") {
                onChange(result.value);
                const d = parseStoredValue(result.value);
                if (d) setDraft(format(d, "dd/MM/yyyy HH:mm"));
              } else {
                setError("Use a valid datetime (DD/MM/YYYY HH:mm)");
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
DateTimeInput.displayName = "DateTimeInput";

export { DateTimeInput };
