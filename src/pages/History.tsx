import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { getDB } from "@/lib/db";
import { getDateRange } from "@/lib/utils";
import type { Expense, Period } from "@/lib/types";
import PeriodSelector from "@/components/PeriodSelector";
import ExpenseList from "@/components/ExpenseList";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function History() {
  const [period, setPeriod] = useState<Period>("month");
  const [date, setDate] = useState(new Date());
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const db = getDB();
      const range = getDateRange(period, date);

      const rows = await db.selectObjects(
        `SELECT e.*, c.name as cat_name, c.color as cat_color,
                p.name as pm_name, p.icon as pm_icon
         FROM expenses e
         LEFT JOIN categories c ON e.category_id = c.id
         LEFT JOIN payment_methods p ON e.payment_method_id = p.id
         WHERE e.date >= ? AND e.date <= ?
         ORDER BY e.date DESC, e.created_at DESC`,
        [range.start, range.end]
      ) as unknown as Record<string, unknown>[];

      const mapped: Expense[] = rows.map((r) => ({
        id: r.id as string,
        amount: r.amount as number,
        concept: r.concept as string,
        description: (r.description as string) || "",
        recurring_months: (r.recurring_months as number) || 0,
        category_id: r.category_id as string | null,
        payment_method_id: r.payment_method_id as string | null,
        date: r.date as string,
        created_at: r.created_at as string,
        category: r.cat_name
          ? {
              id: r.category_id as string,
              name: r.cat_name as string,
              color: r.cat_color as string,
              icon: "",
              created_at: "",
            }
          : null,
        payment_method: r.pm_name
          ? {
              id: r.payment_method_id as string,
              name: r.pm_name as string,
              icon: (r.pm_icon as string) || "",
              created_at: "",
            }
          : null,
      }));

      setExpenses(mapped);
    } catch {}
  }, [period, date]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const db = getDB();
      await db.exec({ sql: "DELETE FROM expenses WHERE id=?", bind: [deleteId] });
      setDeleteId(null);
      await loadData();
    } catch {}
  };

  return (
    <div className="space-y-5">
      <Helmet>
        <title>Expenses - Historial</title>
      </Helmet>

      <h1 className="text-xl font-bold">Historial</h1>
      <PeriodSelector
        period={period}
        onPeriodChange={setPeriod}
        date={date}
        onDateChange={setDate}
      />

      <ExpenseList expenses={expenses} onDelete={setDeleteId} />

      <ConfirmDialog
        open={!!deleteId}
        title="Eliminar gasto"
        message="Esta accion no se puede deshacer."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      <div className="h-20" />
    </div>
  );
}
