import { describe, it, expect } from "vitest";
import { parseCSVPreview } from "../import";

describe("parseCSVPreview", () => {
  it("returns all zero counts for empty CSV", () => {
    const result = parseCSVPreview("");
    expect(result).toEqual({
      categories: 0,
      paymentMethods: 0,
      budgets: 0,
      expenses: 0,
    });
  });

  it("counts rows in EXPENSES section only, ignoring others", () => {
    const csv = `# SECTION: EXPENSES
id,amount,concept,description,recurring_months,category_id,payment_method_id,date,created_at,updated_at,deleted_at
exp1,100,Lunch,,0,abc123,,2026-01-15,2026-01-15 00:00:00,2026-01-15 00:00:00,
exp2,50,Coffee,,0,def456,,2026-01-16,2026-01-16 00:00:00,2026-01-16 00:00:00,`;

    const result = parseCSVPreview(csv);
    expect(result).toEqual({
      categories: 0,
      paymentMethods: 0,
      budgets: 0,
      expenses: 2,
    });
  });

  it("counts rows correctly across all sections", () => {
    const csv = `# SECTION: CATEGORIES
id,name,color,icon,created_at,updated_at,deleted_at
abc123,Food,#ff0000,🍔,2026-01-01 00:00:00,2026-01-01 00:00:00,
def456,Transport,#00ff00,🚗,2026-01-01 00:00:00,2026-01-01 00:00:00,

# SECTION: PAYMENT_METHODS
id,name,icon,created_at,updated_at,deleted_at
pm1,Cash,💵,2026-01-01 00:00:00,2026-01-01 00:00:00,

# SECTION: BUDGETS
id,month,amount,created_at,updated_at,deleted_at
b1,2026-01,1000,2026-01-01 00:00:00,2026-01-01 00:00:00,
b2,2026-02,1200,2026-02-01 00:00:00,2026-02-01 00:00:00,

# SECTION: EXPENSES
id,amount,concept,description,recurring_months,category_id,payment_method_id,date,created_at,updated_at,deleted_at
exp1,100,Lunch,,0,abc123,pm1,2026-01-15,2026-01-15 00:00:00,2026-01-15 00:00:00,
exp2,50,Coffee,,0,def456,,2026-01-16,2026-01-16 00:00:00,2026-01-16 00:00:00,
exp3,200,Dinner,,0,abc123,pm1,2026-01-17,2026-01-17 00:00:00,2026-01-17 00:00:00,`;

    const result = parseCSVPreview(csv);
    expect(result).toEqual({
      categories: 2,
      paymentMethods: 1,
      budgets: 2,
      expenses: 3,
    });
  });

  it("ignores blank lines interspersed within sections", () => {
    const csv = `
# SECTION: CATEGORIES
id,name,color,icon,created_at,updated_at,deleted_at

abc123,Food,#ff0000,🍔,2026-01-01 00:00:00,2026-01-01 00:00:00,


# SECTION: EXPENSES
id,amount,concept,description,recurring_months,category_id,payment_method_id,date,created_at,updated_at,deleted_at

exp1,100,Lunch,,0,abc123,,2026-01-15,2026-01-15 00:00:00,2026-01-15 00:00:00,


exp2,50,Coffee,,0,abc123,,2026-01-16,2026-01-16 00:00:00,2026-01-16 00:00:00,

`;

    const result = parseCSVPreview(csv);
    expect(result).toEqual({
      categories: 1,
      paymentMethods: 0,
      budgets: 0,
      expenses: 2,
    });
  });
});
