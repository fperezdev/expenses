import { Pencil, Trash2, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { formatearMoneda, groupByDate } from "@/lib/utils";
import type { Expense } from "@/lib/types";

interface Props {
  expenses: Expense[];
  onDelete: (id: string) => void;
}

export default function ExpenseList({ expenses, onDelete }: Props) {
  const grouped = groupByDate(expenses, (e) => e.date);
  const sortedDates = [...grouped.keys()].sort((a, b) => b.localeCompare(a));

  if (sortedDates.length === 0) {
    return (
      <div className="py-12 text-center text-gray-400">
        <p className="text-lg">Sin gastos en este periodo</p>
        <p className="mt-1 text-sm">Anade tu primer gasto</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedDates.map((date) => (
        <div key={date}>
          <h3 className="sticky top-0 bg-gray-50 py-1 text-xs font-semibold uppercase text-gray-400 dark:bg-gray-950">
            {new Date(date + "T00:00:00").toLocaleDateString("es-ES", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </h3>
          <div className="space-y-1.5">
            {grouped.get(date)!.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  <ArrowUpRight size={18} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {expense.concept}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2">
                    {expense.category && (
                      <span className="flex items-center gap-1 text-[10px] text-gray-400">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{
                            backgroundColor:
                              expense.category?.color || "#9ca3af",
                          }}
                        />
                        {expense.category.name}
                      </span>
                    )}
                    {expense.payment_method && (
                      <span className="text-[10px] text-gray-400">
                        {expense.payment_method.name}
                      </span>
                    )}
                  </div>
                </div>

                <p className="whitespace-nowrap text-sm font-bold tabular-nums">
                  {formatearMoneda(expense.amount)}
                </p>

                <div className="flex items-center gap-1">
                  <Link
                    to={`/edit/${expense.id}`}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-indigo-600 dark:hover:bg-gray-800"
                  >
                    <Pencil size={15} />
                  </Link>
                  <button
                    onClick={() => onDelete(expense.id)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-500 dark:hover:bg-gray-800"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
