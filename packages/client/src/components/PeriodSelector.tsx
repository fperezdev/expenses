import { memo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Period } from "@/lib/types";
import { getPeriodLabel, navigatePeriod } from "@/lib/utils";

interface Props {
  period: Period;
  onPeriodChange: (p: Period) => void;
  date: Date;
  onDateChange: (d: Date) => void;
  hideToggle?: boolean;
}

const periodOptions: { value: Period; label: string }[] = [
  { value: "month", label: "MES" },
  { value: "year", label: "ANO" },
];

const PeriodSelector = memo(function PeriodSelector({
  period,
  onPeriodChange,
  date,
  onDateChange,
  hideToggle,
}: Props) {
  return (
    <div className="space-y-2">
      {!hideToggle && (
        <div className="flex rounded-lg bg-gray-100 p-0.5 dark:bg-gray-800">
          {periodOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onPeriodChange(opt.value)}
              className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
                period === opt.value
                  ? "bg-white text-indigo-600 shadow-sm dark:bg-gray-700 dark:text-indigo-400"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={() => onDateChange(navigatePeriod(period, date, -1))}
          className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-sm font-medium capitalize">
          {getPeriodLabel(period, date)}
        </span>
        <button
          onClick={() => onDateChange(navigatePeriod(period, date, 1))}
          className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
});

export default PeriodSelector;
