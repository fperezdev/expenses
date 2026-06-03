import { formatearMoneda } from "@/lib/utils";

interface Props {
  spent: number;
  budget: number;
}

export default function BudgetBar({ spent, budget }: Props) {
  const pct = Math.min((spent / budget) * 100, 100);
  const isOver = spent > budget;
  const barColor =
    pct < 80
      ? "bg-emerald-500"
      : pct < 100
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">Presupuesto</span>
        <span className="font-medium">
          {formatearMoneda(spent)} / {formatearMoneda(budget)}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${isOver ? 100 : pct}%` }}
        />
      </div>
      <div className="text-right">
        <span
          className={`text-xs font-semibold ${isOver ? "text-red-500" : "text-gray-500"}`}
        >
          {isOver ? "Excedido" : `${pct.toFixed(0)}%`}
        </span>
      </div>
    </div>
  );
}
