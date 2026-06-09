import type { Category, PaymentMethod, Budget, Expense } from "@expenses/shared";
export type { Category, PaymentMethod, Budget, Expense };

export interface ExpenseWithJoins extends Expense {
  category?: Category | null;
  payment_method?: PaymentMethod | null;
}

export type Period = "month" | "year";
export type ViewMode = "list" | "chart";
export type ThemeMode = "light" | "dark" | "system";

export interface ExpenseFormData {
  amount: number;
  concept: string;
  description: string;
  category_id: string | null;
  payment_method_id: string | null;
  date: string;
  recurring_months: number;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface CategoryTotal {
  category: Category;
  total: number;
  percentage: number;
}

export interface PeriodSummary {
  total: number;
  byCategory: CategoryTotal[];
  budget: Budget | null;
  remaining: number | null;
  isOverBudget: boolean;
}
