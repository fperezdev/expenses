import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { getDB } from "@/lib/db";
import { getDateRange, mapRowToExpense } from "@/lib/utils";
import type { ExpenseWithJoins, Period } from "@/lib/types";
import PeriodSelector from "@/components/PeriodSelector";
import ExpenseList from "@/components/ExpenseList";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function History() {
  const [period, setPeriod] = useState<Period>("month");
  const [date, setDate] = useState(new Date());
  const [expenses, setExpenses] = useState<ExpenseWithJoins[]>([]);
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
         WHERE e.date >= ? AND e.date <= ? AND e.deleted_at IS NULL
         ORDER BY e.date DESC, e.created_at DESC`,
        [range.start, range.end]
      ) as unknown as Record<string, unknown>[];

      setExpenses(rows.map(mapRowToExpense));
    } catch {}
  }, [period, date]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const db = getDB();
      await db.exec({ sql: "UPDATE expenses SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id=?", bind: [deleteId] });
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
