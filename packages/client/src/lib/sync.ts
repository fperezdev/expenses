import type { SyncPayload, SyncResponse, Expense, Category, PaymentMethod, Budget } from "@expenses/shared";
import { getDB } from "./db";

// ─── localStorage keys ───
const SYNC_ENABLED_KEY = "sync_enabled";
const SYNC_INTERVAL_HOURS_KEY = "sync_interval_hours";
const LAST_SYNC_TS_KEY = "sync_last_ts";
const AUTH_TOKEN_KEY = "auth_token";
const SERVER_URL_KEY = "server_url";

// Default server URL — same origin since PWA and API are one Worker
function getServerUrl(): string {
  return localStorage.getItem(SERVER_URL_KEY) || location.origin;
}

// ─── Auth ───
export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function setAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuth(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function isLoggedIn(): boolean {
  return !!getAuthToken();
}

// ─── Sync config ───
export function isSyncEnabled(): boolean {
  return localStorage.getItem(SYNC_ENABLED_KEY) === "true";
}

export function setSyncEnabled(enabled: boolean): void {
  localStorage.setItem(SYNC_ENABLED_KEY, String(enabled));
}

export function getSyncIntervalMs(): number {
  const hours = parseFloat(localStorage.getItem(SYNC_INTERVAL_HOURS_KEY) || "24");
  return (isNaN(hours) || hours <= 0 ? 24 : hours) * 60 * 60 * 1000;
}

export function setSyncIntervalHours(hours: number): void {
  localStorage.setItem(SYNC_INTERVAL_HOURS_KEY, String(hours));
}

// ─── Last sync timestamp ───
function getLastSyncTs(): string {
  return localStorage.getItem(LAST_SYNC_TS_KEY) || "1970-01-01 00:00:00";
}

function setLastSyncTs(ts: string): void {
  localStorage.setItem(LAST_SYNC_TS_KEY, ts);
}

// ─── Upsert helper ───
async function upsertLocal(
  db: ReturnType<typeof getDB>,
  table: string,
  records: Record<string, unknown>[]
): Promise<void> {
  if (!records.length) return;

  for (const record of records) {
    const cols = Object.keys(record).filter(c => c !== "user_id");
    const placeholders = cols.map(() => "?").join(", ");
    const colNames = cols.join(", ");

    const setClause = cols
      .filter((c) => c !== "id")
      .map((c) => `${c} = excluded.${c}`)
      .join(", ");

    await db.exec({
      sql: `INSERT INTO ${table} (${colNames}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${setClause}`,
      bind: cols.map((c) => record[c]),
    });
  }
}

// ─── Sync ───
export async function performSync(): Promise<{ ok: boolean; error?: string }> {
  const token = getAuthToken();

  if (!token) {
    return { ok: false, error: "Not logged in" };
  }

  try {
    const db = getDB();
    const lastSyncTs = getLastSyncTs();

    // 1. Gather local changes since last sync
    const localExpenses = await db.selectObjects(
      "SELECT * FROM expenses WHERE updated_at > ?",
      [lastSyncTs]
    ) as unknown as Expense[];

    const localCategories = await db.selectObjects(
      "SELECT * FROM categories WHERE updated_at > ?",
      [lastSyncTs]
    ) as unknown as Category[];

    const localPaymentMethods = await db.selectObjects(
      "SELECT * FROM payment_methods WHERE updated_at > ?",
      [lastSyncTs]
    ) as unknown as PaymentMethod[];

    const localBudgets = await db.selectObjects(
      "SELECT * FROM budgets WHERE updated_at > ?",
      [lastSyncTs]
    ) as unknown as Budget[];

    // 2. Send to server
    const payload: SyncPayload = {
      last_sync_ts: lastSyncTs,
      expenses: localExpenses,
      categories: localCategories,
      payment_methods: localPaymentMethods,
      budgets: localBudgets,
    };

    const res = await fetch(`${getServerUrl()}/api/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      return { ok: false, error: err.error || `HTTP ${res.status}` };
    }

    const data: SyncResponse = await res.json();

    // 3. Upsert server data locally
    await upsertLocal(db, "categories", data.categories as unknown as Record<string, unknown>[]);
    await upsertLocal(db, "payment_methods", data.payment_methods as unknown as Record<string, unknown>[]);
    await upsertLocal(db, "budgets", data.budgets as unknown as Record<string, unknown>[]);
    await upsertLocal(db, "expenses", data.expenses as unknown as Record<string, unknown>[]);

    // 4. Update last sync timestamp
    setLastSyncTs(data.server_ts);

    return { ok: true };
  } catch (err: any) {
    console.error("[Sync] Failed:", err);
    return { ok: false, error: err.message || "Sync failed" };
  }
}

// ─── Auth API ───
export async function login(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${getServerUrl()}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error || "Login failed" };
    }

    setAuthToken(data.token);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Network error" };
  }
}

export async function register(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${getServerUrl()}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error || "Registration failed" };
    }

    setAuthToken(data.token);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Network error" };
  }
}

// ─── Sync status ───
export function getSyncStatus(): {
  enabled: boolean;
  loggedIn: boolean;
  lastSyncTs: string;
  intervalHours: number;
} {
  return {
    enabled: isSyncEnabled(),
    loggedIn: isLoggedIn(),
    lastSyncTs: getLastSyncTs(),
    intervalHours: Math.round(getSyncIntervalMs() / (60 * 60 * 1000)),
  };
}
