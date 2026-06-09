// ========== UI types ==========
export type Period = "month" | "year";
export type ViewMode = "list" | "chart";
export type ThemeMode = "light" | "dark" | "system";

// ========== Entidades existentes ==========
export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Budget {
  id: string;
  month: string;
  amount: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
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
  updated_at: string;
  deleted_at: string | null;
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

// ========== Auth ==========
export interface User {
  id: string;
  email: string;
  timezone: string;
  created_at: string;
}

export interface AuthRequest {
  email: string;
  password: string;
  timezone?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// ========== Sync ==========
export interface SyncPayload {
  last_sync_ts: string;
  expenses: Expense[];
  categories: Category[];
  payment_methods: PaymentMethod[];
  budgets: Budget[];
}

export interface SyncResponse {
  server_ts: string;
  expenses: Expense[];
  categories: Category[];
  payment_methods: PaymentMethod[];
  budgets: Budget[];
}

// ========== API error ==========
export interface ApiError {
  error: string;
  code: string;
}
