import {
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";

export type DateRangePreset =
  | "today"
  | "yesterday"
  | "thisWeek"
  | "lastWeek"
  | "thisMonth"
  | "lastMonth"
  | "custom";

/** Monday-start weeks (ISO), matching DD/MM/YYYY locale expectations. */
const WEEK_OPTS = { weekStartsOn: 1 as const };

export const DATE_RANGE_PRESET_OPTIONS: { value: Exclude<DateRangePreset, "custom">; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "thisWeek", label: "This week" },
  { value: "lastWeek", label: "Last week" },
  { value: "thisMonth", label: "This month" },
  { value: "lastMonth", label: "Last month" },
];

export function toIsoDate(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function resolveDateRangePreset(
  preset: Exclude<DateRangePreset, "custom">,
  referenceDate: Date = new Date(),
): { startDate: string; endDate: string } {
  const today = referenceDate;
  switch (preset) {
    case "today":
      return { startDate: toIsoDate(today), endDate: toIsoDate(today) };
    case "yesterday": {
      const yesterday = subDays(today, 1);
      return { startDate: toIsoDate(yesterday), endDate: toIsoDate(yesterday) };
    }
    case "thisWeek":
      return {
        startDate: toIsoDate(startOfWeek(today, WEEK_OPTS)),
        endDate: toIsoDate(today),
      };
    case "lastWeek": {
      const prevWeek = subWeeks(today, 1);
      return {
        startDate: toIsoDate(startOfWeek(prevWeek, WEEK_OPTS)),
        endDate: toIsoDate(endOfWeek(prevWeek, WEEK_OPTS)),
      };
    }
    case "thisMonth":
      return {
        startDate: toIsoDate(startOfMonth(today)),
        endDate: toIsoDate(today),
      };
    case "lastMonth": {
      const prevMonth = subMonths(today, 1);
      return {
        startDate: toIsoDate(startOfMonth(prevMonth)),
        endDate: toIsoDate(endOfMonth(prevMonth)),
      };
    }
  }
}

export function inferDateRangePreset(
  startDate: string,
  endDate: string,
  referenceDate: Date = new Date(),
): DateRangePreset {
  if (!startDate.trim() || !endDate.trim()) return "custom";
  for (const { value } of DATE_RANGE_PRESET_OPTIONS) {
    const range = resolveDateRangePreset(value, referenceDate);
    if (range.startDate === startDate && range.endDate === endDate) return value;
  }
  return "custom";
}

export function resolveDatetimeRangePreset(
  preset: Exclude<DateRangePreset, "custom">,
  referenceDate: Date = new Date(),
): { from: string; to: string } {
  const { startDate, endDate } = resolveDateRangePreset(preset, referenceDate);
  return {
    from: `${startDate}T00:00`,
    to: `${endDate}T23:59`,
  };
}

export function inferDatetimeRangePreset(
  from: string,
  to: string,
  referenceDate: Date = new Date(),
): DateRangePreset {
  if (!from.trim() || !to.trim()) return "custom";
  for (const { value } of DATE_RANGE_PRESET_OPTIONS) {
    const range = resolveDatetimeRangePreset(value, referenceDate);
    if (range.from === from && range.to === to) return value;
  }
  const fromDate = from.trim().slice(0, 10);
  const toDate = to.trim().slice(0, 10);
  return inferDateRangePreset(fromDate, toDate, referenceDate);
}
