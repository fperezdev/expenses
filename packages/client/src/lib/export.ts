import type { Expense, Category, PaymentMethod, Budget } from "./types";

const SECTION_MARKER = "# SECTION:";

function escapeCSV(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function section(name: string, headers: string[], rows: string[][]): string[] {
  return [
    `${SECTION_MARKER} ${name}`,
    headers.join(","),
    ...rows.map((row) => row.map(escapeCSV).join(",")),
  ];
}

export function exportAllToCSV(
  expenses: Expense[],
  categories: Category[],
  paymentMethods: PaymentMethod[],
  budgets: Budget[]
): string {
  const parts: string[] = [];

  parts.push(
    ...section(
      "CATEGORIES",
      ["id", "name", "color", "icon", "created_at", "updated_at", "deleted_at"],
      categories.map((c) => [c.id, c.name, c.color, c.icon || "", c.created_at, c.updated_at, c.deleted_at || ""])
    )
  );

  parts.push(
    ...section(
      "PAYMENT_METHODS",
      ["id", "name", "icon", "created_at", "updated_at", "deleted_at"],
      paymentMethods.map((p) => [p.id, p.name, p.icon || "", p.created_at, p.updated_at, p.deleted_at || ""])
    )
  );

  parts.push(
    ...section(
      "BUDGETS",
      ["id", "month", "amount", "created_at", "updated_at", "deleted_at"],
      budgets.map((b) => [b.id, b.month, b.amount.toString(), b.created_at, b.updated_at, b.deleted_at || ""])
    )
  );

  parts.push(
    ...section(
      "EXPENSES",
      [
        "id",
        "amount",
        "concept",
        "description",
        "recurring_months",
        "category_id",
        "payment_method_id",
        "date",
        "created_at",
        "updated_at",
        "deleted_at",
      ],
      expenses.map((e) => [
        e.id,
        e.amount.toString(),
        e.concept,
        e.description || "",
        e.recurring_months.toString(),
        e.category_id || "",
        e.payment_method_id || "",
        e.date,
        e.created_at,
        e.updated_at,
        e.deleted_at || "",
      ])
    )
  );

  return parts.join("\n");
}

export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
