import type { Expense, Category, PaymentMethod } from "./types";

export function exportToCSV(
  expenses: Expense[],
  categories: Category[],
  paymentMethods: PaymentMethod[]
): string {
  const headers = [
    "Fecha",
    "Concepto",
    "Importe",
    "Categoria",
    "Metodo de pago",
    "Descripcion",
  ];

  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const pmMap = new Map(paymentMethods.map((p) => [p.id, p.name]));

  const rows = expenses.map((e) => [
    e.date,
    e.concept,
    e.amount.toString(),
    e.category_id ? catMap.get(e.category_id) || "-" : "-",
    e.payment_method_id ? pmMap.get(e.payment_method_id) || "-" : "-",
    e.description || "",
  ]);

  const escapeCSV = (val: string) => {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  return [headers.join(","), ...rows.map((row) => row.map(escapeCSV).join(","))].join("\n");
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
