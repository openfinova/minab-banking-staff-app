import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatDate(value: string | Date | undefined | null, opts?: Intl.DateTimeFormatOptions): string {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, opts ?? { dateStyle: "medium" }).format(date);
}

export function formatDateTime(value: string | Date | undefined | null): string {
  return formatDate(value, { dateStyle: "medium", timeStyle: "short" });
}

export function formatNumber(value: number | undefined | null, opts?: Intl.NumberFormatOptions): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat(undefined, opts).format(value);
}

export function formatCurrency(value: number | undefined | null, currency = "USD"): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value);
}

export function safeJson<T>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function truncate(value: string, max = 60): string {
  if (!value) return "";
  return value.length > max ? `${value.slice(0, max - 1)}\u2026` : value;
}
