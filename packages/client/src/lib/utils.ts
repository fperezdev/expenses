import type {
  Period,
  DateRange,
  CategoryTotal,
  PeriodSummary,
  Category,
  Budget,
} from "./types";

export function formatearMoneda(amount: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getDateRange(period: Period, referenceDate: Date): DateRange {
  const d = new Date(referenceDate);
  let start: Date;
  let end: Date;

  if (period === "month") {
    start = new Date(d.getFullYear(), d.getMonth(), 1);
    end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
  } else {
    start = new Date(d.getFullYear(), 0, 1);
    end = new Date(d.getFullYear(), 11, 31, 23, 59, 59);
  }

  return {
    start: toDateString(start),
    end: toDateString(end),
  };
}

export function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

export function getPeriodLabel(period: Period, date: Date): string {
  if (period === "month") {
    return date.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  }
  return date.getFullYear().toString();
}

export function navigatePeriod(
  period: Period,
  current: Date,
  direction: -1 | 1
): Date {
  const d = new Date(current);
  if (period === "month") {
    d.setMonth(d.getMonth() + direction);
  } else {
    d.setFullYear(d.getFullYear() + direction);
  }
  return d;
}

export function groupByDate<T>(
  items: T[],
  keyFn: (item: T) => string
): Map<string, T[]> {
  return items.reduce((map, item) => {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
    return map;
  }, new Map<string, T[]>());
}

export function calculateSummary(
  expenses: { amount: number; category_id: string | null }[],
  categories: Category[],
  budget: Budget | null
): PeriodSummary {
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  const catTotals = new Map<string, number>();
  expenses.forEach((e) => {
    if (e.category_id) {
      catTotals.set(
        e.category_id,
        (catTotals.get(e.category_id) || 0) + e.amount
      );
    }
  });

  const byCategory: CategoryTotal[] = [...catTotals.entries()]
    .map(([catId, catTotal]) => {
      const cat = categories.find((c) => c.id === catId) || {
        id: catId,
        name: "Sin categoria",
        color: "#9ca3af",
        icon: "",
        created_at: "",
        updated_at: "",
        deleted_at: null,
      } as Category;
      return {
        category: cat,
        total: catTotal,
        percentage: total > 0 ? (catTotal / total) * 100 : 0,
      };
    })
    .sort((a, b) => b.total - a.total);

  const remaining = budget ? budget.amount - total : null;
  const isOverBudget = remaining !== null && remaining < 0;

  return { total, byCategory, budget, remaining, isOverBudget };
}

export const CATEGORY_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#6b7280",
];

export function getNextColor(usedColors: Set<string>): string {
  return (
    CATEGORY_COLORS.find((c) => !usedColors.has(c)) || CATEGORY_COLORS[0]
  );
}

export function adjustDayToValidMonth(
  year: number,
  month: number,
  day: number
): string {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const validDay = Math.min(day, lastDay);
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(validDay).padStart(2, "0")}`;
}
