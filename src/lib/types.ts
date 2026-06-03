export type Period = "month" | "year";
export type ViewMode = "list" | "chart";
export type ThemeMode = "light" | "dark" | "system";

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  created_at: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  created_at: string;
}

export interface Expense {
  id: string;
  amount: number;
  concept: string;
  description: string;
  recurring_months: number;
  category_id: string | null;
  payment_method_id: string | null;
  date: string;
  created_at: string;
  category?: Category | null;
  payment_method?: PaymentMethod | null;
}

export interface Budget {
  id: string;
  month: string;
  amount: number;
  created_at: string;
}

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
