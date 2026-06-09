import { memo } from "react";
import { formatearMoneda } from "@/lib/utils";

interface Props {
  total: number;
  budgetAmount: number | null;
  spent: number;
}

const SummaryCards = memo(function SummaryCards({ total, budgetAmount, spent }: Props) {
  const remaining = budgetAmount != null ? budgetAmount - spent : null;
  const isOverBudget = remaining != null && remaining < 0;

  const cards = [
    {
      label: "Total",
      value: total,
      color: "border-indigo-500",
      bg: "bg-indigo-50 dark:bg-indigo-500/10",
    },
    {
      label: "Presupuesto",
      value: remaining !== null ? Math.abs(remaining) : 0,
      color: isOverBudget ? "border-red-500" : "border-emerald-500",
      bg: isOverBudget
        ? "bg-red-50 dark:bg-red-500/10"
        : "bg-emerald-50 dark:bg-emerald-500/10",
      prefix: isOverBudget
        ? "-"
        : remaining !== null
          ? ""
          : "-",
      suffix: remaining !== null
        ? isOverBudget
          ? " sobre"
          : " rest."
        : "",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-xl border-l-4 ${card.color} ${card.bg} p-3`}
        >
          <p className="text-[11px] font-medium uppercase text-gray-500 dark:text-gray-400">
            {card.label}
          </p>
          <p className="mt-0.5 text-lg font-bold">
            {card.prefix}
            {formatearMoneda(card.value)}
            {card.suffix}
          </p>
        </div>
      ))}
    </div>
  );
});

export default SummaryCards;
