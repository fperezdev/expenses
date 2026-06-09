import { describe, it, expect } from "vitest";
import { toDateString, getDateRange } from "../utils";

describe("toDateString", () => {
  it("returns date in YYYY-MM-DD format using local time components", () => {
    // Noon dates: safe from UTC boundary issues in any timezone
    const date = new Date(2026, 0, 15, 12, 0, 0); // Jan 15, 2026 noon local
    expect(toDateString(date)).toBe("2026-01-15");
  });

  it("matches local getFullYear/getMonth/getDate output", () => {
    // Dec 31, 2026 at 23:59:59 local time.
    // In UTC-3 this is 2027-01-01 in UTC — the old toISOString() returned
    // "2027-01-01", causing expenses to leak into the wrong year range.
    // The fix uses getFullYear/getMonth/getDate → "2026-12-31".
    const date = new Date(2026, 11, 31, 23, 59, 59);
    const localYear = date.getFullYear();
    const localMonth = date.getMonth() + 1;
    const localDay = date.getDate();

    const result = toDateString(date);
    const expected = `${localYear}-${String(localMonth).padStart(2, "0")}-${String(localDay).padStart(2, "0")}`;

    expect(result).toBe(expected);
  });

  it("does not use toISOString — late December near midnight stays in same year", () => {
    // This is the exact regression case: Dec 31 near midnight in a negative TZ
    const date = new Date(2026, 11, 31, 23, 0, 0);
    expect(toDateString(date)).toBe("2026-12-31");
  });

  it("pads single-digit months and days with leading zero", () => {
    expect(toDateString(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(toDateString(new Date(2026, 10, 9))).toBe("2026-11-09");
  });
});

describe("getDateRange", () => {
  it('returns correct year range for 2026 (start: 2026-01-01, end: 2026-12-31)', () => {
    const ref = new Date(2026, 5, 15); // June 15, 2026
    const range = getDateRange("year", ref);
    expect(range.start).toBe("2026-01-01");
    expect(range.end).toBe("2026-12-31");
  });

  it("returns correct month range for March 2026", () => {
    const ref = new Date(2026, 2, 15); // March 15, 2026
    const range = getDateRange("month", ref);
    expect(range.start).toBe("2026-03-01");
    expect(range.end).toBe("2026-03-31");
  });

  it("handles February in a non-leap year (2026)", () => {
    const ref = new Date(2026, 1, 10); // Feb 10, 2026
    const range = getDateRange("month", ref);
    expect(range.start).toBe("2026-02-01");
    expect(range.end).toBe("2026-02-28");
  });

  it("handles December correctly — regression: end must be 12-31, not 01-01 next year", () => {
    const ref = new Date(2026, 11, 1); // Dec 1, 2026
    const range = getDateRange("month", ref);
    expect(range.start).toBe("2026-12-01");
    expect(range.end).toBe("2026-12-31");
  });

  it("year range works for any reference month inside the year", () => {
    // Edge: first month of the year
    expect(getDateRange("year", new Date(2026, 0, 1))).toEqual({
      start: "2026-01-01",
      end: "2026-12-31",
    });
    // Edge: last month of the year
    expect(getDateRange("year", new Date(2026, 11, 25))).toEqual({
      start: "2026-01-01",
      end: "2026-12-31",
    });
  });
});
