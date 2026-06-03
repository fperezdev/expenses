import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Save } from "lucide-react";
import { getDB } from "@/lib/db";
import { getDateRange, formatearMoneda, getMonthKey } from "@/lib/utils";
import type { Budget, Period } from "@/lib/types";
import PeriodSelector from "@/components/PeriodSelector";
import BudgetBar from "@/components/BudgetBar";

export default function BudgetPage() {
  const [period, setPeriod] = useState<Period>("month");
  const [date, setDate] = useState(new Date());
  const [budget, setBudget] = useState<Budget | null>(null);
  const [budgetInput, setBudgetInput] = useState("");
  const [spent, setSpent] = useState(0);

  const monthKey = getMonthKey(date);

  const loadData = useCallback(async () => {
    try {
      const db = getDB();

      const budRow = await db.selectObject(
        "SELECT id, month, amount, created_at FROM budgets WHERE month=?",
        [monthKey]
      ) as unknown as Budget | undefined;

      setBudget(budRow || null);
      setBudgetInput(budRow ? budRow.amount.toString() : "");

      const range = getDateRange("month", date);
      const total = await db.selectValue(
        "SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE date >= ? AND date <= ?",
        [range.start, range.end]
      );
      setSpent(Number(total) || 0);
    } catch {}
  }, [monthKey, date]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    const amount = parseFloat(budgetInput);
    if (!amount || amount <= 0) return;

    try {
      const db = getDB();
      if (budget) {
        await db.exec({ sql: "UPDATE budgets SET amount=? WHERE id=?", bind: [amount, budget.id] });
      } else {
        const id = crypto.randomUUID();
        await db.exec({
          sql: "INSERT INTO budgets(id, month, amount) VALUES(?,?,?)",
          bind: [id, monthKey, amount],
        });
      }
      await loadData();
    } catch {}
  };

  return (
    <div className="space-y-5">
      <Helmet>
        <title>Expenses - Presupuesto</title>
      </Helmet>

      <h1 className="text-xl font-bold">Presupuesto</h1>

      <PeriodSelector
        period={period}
        onPeriodChange={setPeriod}
        date={date}
        onDateChange={setDate}
        hideToggle
      />

      {budget ? (
        <BudgetBar spent={spent} budget={budget.amount} />
      ) : (
        <div className="py-8 text-center text-gray-400">
          <p>No hay presupuesto para este mes</p>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <p className="text-sm font-medium text-gray-500">
          {budget ? "Actualizar presupuesto" : "Fijar presupuesto"}
        </p>
        <div className="mt-2 flex gap-2">
          <input
            type="number"
            value={budgetInput}
            onChange={(e) => setBudgetInput(e.target.value)}
            placeholder="Monto"
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800"
          />
          <button
            onClick={handleSave}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-medium text-white hover:bg-indigo-700"
          >
            <Save size={16} />
            Guardar
          </button>
        </div>
      </div>

      {budget && (
        <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <p className="text-sm text-gray-500">
            Gastado: {formatearMoneda(spent)} de {formatearMoneda(budget.amount)}
          </p>
        </div>
      )}

      <div className="h-20" />
    </div>
  );
}
