import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { getDB } from "@/lib/db";
import { getDateRange, calculateSummary, mapRowToExpense } from "@/lib/utils";
import type { ExpenseWithJoins, Category, Budget, ViewMode, Period } from "@/lib/types";
import PeriodSelector from "@/components/PeriodSelector";
import SummaryCards from "@/components/SummaryCards";
import BudgetBar from "@/components/BudgetBar";
import ExpenseList from "@/components/ExpenseList";
import Spinner from "@/components/Spinner";
import ConfirmDialog from "@/components/ConfirmDialog";
import { ListFilter, PieChart } from "lucide-react";

const ExpenseChart = React.lazy(() => import("@/components/ExpenseChart"));

export default function Dashboard() {
  const [period, setPeriod] = useState<Period>("month");
  const [date, setDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [expenses, setExpenses] = useState<ExpenseWithJoins[]>([]);
  const [yearExpenses, setYearExpenses] = useState<ExpenseWithJoins[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const db = getDB();
      const range = getDateRange(period, date);
      const year = date.getFullYear();
      const yearRange = { start: `${year}-01-01`, end: `${year}-12-31` };
      const monthKey = `${year}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;

      const [expRows, yearRows, cats, budRow] = await Promise.all([
        db.selectObjects(
          `SELECT e.*, c.name as cat_name, c.color as cat_color,
                  p.name as pm_name, p.icon as pm_icon
           FROM expenses e
           LEFT JOIN categories c ON e.category_id = c.id
           LEFT JOIN payment_methods p ON e.payment_method_id = p.id
           WHERE e.date >= ? AND e.date <= ? AND e.deleted_at IS NULL
           ORDER BY e.date DESC, e.created_at DESC`,
          [range.start, range.end]
        ) as unknown as Record<string, unknown>[],
        db.selectObjects(
          `SELECT e.*, c.name as cat_name, c.color as cat_color,
                  p.name as pm_name, p.icon as pm_icon
           FROM expenses e
           LEFT JOIN categories c ON e.category_id = c.id
           LEFT JOIN payment_methods p ON e.payment_method_id = p.id
           WHERE e.date >= ? AND e.date <= ? AND e.deleted_at IS NULL
           ORDER BY e.date DESC, e.created_at DESC`,
          [yearRange.start, yearRange.end]
        ) as unknown as Record<string, unknown>[],
        db.selectObjects(
          "SELECT id, name, color, icon, created_at FROM categories WHERE deleted_at IS NULL ORDER BY name"
        ) as unknown as Category[],
        db.selectObject(
          "SELECT id, month, amount, created_at FROM budgets WHERE month=? AND deleted_at IS NULL",
          [monthKey]
        ) as unknown as Budget | undefined,
      ]);

      setExpenses(expRows.map(mapRowToExpense));
      setYearExpenses(yearRows.map(mapRowToExpense));
      setCategories(cats);
      setBudget(budRow || null);
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

  const filteredExpenses = useMemo(
    () =>
      categoryFilter
        ? expenses.filter((e) => e.category_id === categoryFilter)
        : expenses,
    [expenses, categoryFilter]
  );

  const summary = useMemo(
    () =>
      calculateSummary(
        expenses.map((e) => ({
          amount: e.amount,
          category_id: e.category_id,
        })),
        categories,
        budget
      ),
    [expenses, categories, budget]
  );

  const handlePeriodChange = useCallback((p: Period) => {
    setPeriod(p);
    setViewMode("list");
  }, []);


  return (
    <div className="space-y-5">
      <Helmet>
        <title>Expenses - Inicio</title>
      </Helmet>

      <PeriodSelector
        period={period}
        onPeriodChange={handlePeriodChange}
        date={date}
        onDateChange={setDate}
      />

      <SummaryCards
        total={summary.total}
        budgetAmount={budget?.amount ? (period === "year" ? budget.amount * 12 : budget.amount) : null}
        spent={summary.total}
      />

      {budget && <BudgetBar spent={summary.total} budget={period === "year" ? budget.amount * 12 : budget.amount} />}

      <div className="flex items-center justify-between">
        <div className="flex rounded-lg bg-gray-100 p-0.5 dark:bg-gray-800">
          <button
            onClick={() => setViewMode("list")}
            className={`rounded-md px-3 py-1.5 transition-colors ${
              viewMode === "list"
                ? "bg-white text-indigo-600 shadow-sm dark:bg-gray-700 dark:text-indigo-400"
                : "text-gray-500"
            }`}
          >
            <ListFilter size={16} />
          </button>
          <button
            onClick={() => setViewMode("chart")}
            className={`rounded-md px-3 py-1.5 transition-colors ${
              viewMode === "chart"
                ? "bg-white text-indigo-600 shadow-sm dark:bg-gray-700 dark:text-indigo-400"
                : "text-gray-500"
            }`}
          >
            <PieChart size={16} />
          </button>
        </div>

        {viewMode === "list" && categories.length > 0 && (
          <select
            value={categoryFilter || ""}
            onChange={(e) => setCategoryFilter(e.target.value || null)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {viewMode === "list" ? (
        <ExpenseList expenses={filteredExpenses} onDelete={setDeleteId} />
      ) : (
        <React.Suspense fallback={<Spinner />}>
          <ExpenseChart
            expenses={expenses}
            yearExpenses={yearExpenses}
            referenceDate={date}
          />
        </React.Suspense>
      )}

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
