import { describe, expect, it } from "vitest";
import {
  inferDateRangePreset,
  inferDatetimeRangePreset,
  resolveDateRangePreset,
  resolveDatetimeRangePreset,
} from "@/lib/date-range-presets";

/** Saturday 23 May 2026 — this week Mon 18 – Sat 23; last week Mon 11 – Sun 17. */
const ref = new Date("2026-05-23T12:00:00");

describe("date-range-presets", () => {
  it("resolves today and yesterday", () => {
    expect(resolveDateRangePreset("today", ref)).toEqual({
      startDate: "2026-05-23",
      endDate: "2026-05-23",
    });
    expect(resolveDateRangePreset("yesterday", ref)).toEqual({
      startDate: "2026-05-22",
      endDate: "2026-05-22",
    });
  });

  it("resolves calendar week windows (Monday start)", () => {
    expect(resolveDateRangePreset("thisWeek", ref)).toEqual({
      startDate: "2026-05-18",
      endDate: "2026-05-23",
    });
    expect(resolveDateRangePreset("lastWeek", ref)).toEqual({
      startDate: "2026-05-11",
      endDate: "2026-05-17",
    });
  });

  it("resolves calendar month windows", () => {
    expect(resolveDateRangePreset("thisMonth", ref)).toEqual({
      startDate: "2026-05-01",
      endDate: "2026-05-23",
    });
    expect(resolveDateRangePreset("lastMonth", ref)).toEqual({
      startDate: "2026-04-01",
      endDate: "2026-04-30",
    });
  });

  it("infers preset from matching ranges", () => {
    const today = resolveDateRangePreset("today", ref);
    expect(inferDateRangePreset(today.startDate, today.endDate, ref)).toBe("today");
    expect(inferDateRangePreset("2026-01-01", "2026-01-15", ref)).toBe("custom");
  });

  it("resolves datetime presets with day bounds", () => {
    expect(resolveDatetimeRangePreset("today", ref)).toEqual({
      from: "2026-05-23T00:00",
      to: "2026-05-23T23:59",
    });
    const lastMonth = resolveDatetimeRangePreset("lastMonth", ref);
    expect(inferDatetimeRangePreset(lastMonth.from, lastMonth.to, ref)).toBe("lastMonth");
  });
});
