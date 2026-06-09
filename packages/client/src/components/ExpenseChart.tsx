import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import type { ExpenseWithJoins } from "@/lib/types";
import { formatearMoneda } from "@/lib/utils";

const MONTH_NAMES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];
const OTHER_COLOR = "#9ca3af";

interface Props {
  expenses: ExpenseWithJoins[];
  yearExpenses: ExpenseWithJoins[];
  referenceDate: Date;
}

export default function ExpenseChart({
  expenses,
  yearExpenses,
  referenceDate,
}: Props) {
  const pieCategory = useMemo(() => {
    const grouped = new Map<
      string,
      { name: string; value: number; color: string }
    >();
    expenses.forEach((e) => {
      const name = e.category?.name || "Sin categoria";
      const color = e.category?.color || OTHER_COLOR;
      if (!grouped.has(name)) {
        grouped.set(name, { name, value: 0, color });
      }
      grouped.get(name)!.value += e.amount;
    });
    return [...grouped.values()].sort((a, b) => b.value - a.value);
  }, [expenses]);

  const yearCatData = useMemo(() => {
    const catTotals = new Map<
      string,
      { name: string; color: string; total: number }
    >();
    yearExpenses.forEach((e) => {
      const name = e.category?.name || "Sin categoria";
      const color = e.category?.color || OTHER_COLOR;
      if (!catTotals.has(name)) {
        catTotals.set(name, { name, color, total: 0 });
      }
      catTotals.get(name)!.total += e.amount;
    });
    const sorted = [...catTotals.values()]
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
    const topNames = new Set(sorted.map((c) => c.name));
    const hasOthers = catTotals.size > 5;

    const year = referenceDate.getFullYear();
    const data = MONTH_NAMES.map((label, m) => {
      const key = `${year}-${String(m + 1).padStart(2, "0")}`;
      const row: Record<string, string | number> = { label };
      sorted.forEach((cat) => {
        row[cat.name] = 0;
      });
      if (hasOthers) row["Otros"] = 0;

      yearExpenses.forEach((e) => {
        if (e.date.slice(0, 7) !== key) return;
        const catName = e.category?.name || "Sin categoria";
        if (topNames.has(catName)) {
          (row[catName] as number) += e.amount;
        } else if (hasOthers) {
          (row["Otros"] as number) += e.amount;
        }
      });
      return row;
    });

    const colors: Record<string, string> = {};
    sorted.forEach((c) => {
      colors[c.name] = c.color;
    });
    if (hasOthers) colors["Otros"] = OTHER_COLOR;

    return { data, colors };
  }, [yearExpenses, referenceDate]);

  const hasData = expenses.length > 0 || yearExpenses.length > 0;

  if (!hasData) {
    return (
      <div className="py-8 text-center text-gray-400">
        Sin datos para graficar
      </div>
    );
  }

  const lineKeys = Object.keys(yearCatData.data[0] || {}).filter(
    (k) => k !== "label"
  );

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-center text-xs font-medium text-gray-500">
          Por categoria (mes)
        </p>
        <div className="h-56 w-full min-w-0">
          <ResponsiveContainer
            width="100%"
            height="100%"
            initialDimension={{ width: 100, height: 100 }}
          >
            <PieChart>
              <Pie
                data={pieCategory}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={70}
                label={((entry: Record<string, unknown>) =>
                  `${entry.name ?? ""} ${(Number(entry.percent) * 100).toFixed(0)}%`) as unknown as never}
              >
                {pieCategory.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => formatearMoneda(Number(value))}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-center text-xs font-medium text-gray-500">
          Evolucion por categoria (ano)
        </p>
        <div className="h-64 w-full min-w-0">
          <ResponsiveContainer
            width="100%"
            height="100%"
            initialDimension={{ width: 100, height: 100 }}
          >
            <LineChart data={yearCatData.data}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => formatearMoneda(Number(v))}
              />
              <Tooltip formatter={(value) => formatearMoneda(Number(value))} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {lineKeys.map((key) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={yearCatData.colors[key] || OTHER_COLOR}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
