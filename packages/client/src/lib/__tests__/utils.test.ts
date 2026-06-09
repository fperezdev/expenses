import { describe, it, expect } from "vitest";
import { toDateString, getDateRange, mapRowToExpense } from "../utils";

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

describe("mapRowToExpense", () => {
  it("maps a full row with category and payment_method", () => {
    const row = {
      id: "exp-1",
      amount: 5000,
      concept: "Supermercado",
      description: "Compra semanal",
      recurring_months: 0,
      category_id: "cat-1",
      payment_method_id: "pm-1",
      date: "2026-06-01",
      created_at: "2026-06-01T10:00:00Z",
      updated_at: "2026-06-01T10:00:00Z",
      deleted_at: null,
      cat_name: "Alimentacion",
      cat_color: "#6366f1",
      pm_name: "Debito",
      pm_icon: "credit-card",
    };

    const result = mapRowToExpense(row);

    expect(result.id).toBe("exp-1");
    expect(result.amount).toBe(5000);
    expect(result.concept).toBe("Supermercado");
    expect(result.category).toEqual({
      id: "cat-1",
      name: "Alimentacion",
      color: "#6366f1",
      icon: "",
      created_at: "",
      updated_at: "",
      deleted_at: null,
    });
    expect(result.payment_method).toEqual({
      id: "pm-1",
      name: "Debito",
      icon: "credit-card",
      created_at: "",
      updated_at: "",
      deleted_at: null,
    });
  });

  it("maps a row without category and payment_method", () => {
    const row = {
      id: "exp-2",
      amount: 3000,
      concept: "Cafe",
      description: "",
      recurring_months: 0,
      category_id: null,
      payment_method_id: null,
      date: "2026-06-02",
      created_at: "2026-06-02T08:00:00Z",
      updated_at: "2026-06-02T08:00:00Z",
      deleted_at: null,
      cat_name: null,
      cat_color: null,
      pm_name: null,
      pm_icon: null,
    };

    const result = mapRowToExpense(row);

    expect(result.id).toBe("exp-2");
    expect(result.category).toBeNull();
    expect(result.payment_method).toBeNull();
  });

  it("falls back updated_at to created_at when updated_at is missing", () => {
    const row = {
      id: "exp-3",
      amount: 1500,
      concept: "Taxi",
      description: null,
      recurring_months: null,
      category_id: null,
      payment_method_id: null,
      date: "2026-06-03",
      created_at: "2026-06-03T12:00:00Z",
      updated_at: null,
      deleted_at: null,
      cat_name: null,
      cat_color: null,
      pm_name: null,
      pm_icon: null,
    };

    const result = mapRowToExpense(row);

    expect(result.updated_at).toBe("2026-06-03T12:00:00Z");
    expect(result.description).toBe("");
    expect(result.recurring_months).toBe(0);
    expect(result.deleted_at).toBeNull();
  });
});
