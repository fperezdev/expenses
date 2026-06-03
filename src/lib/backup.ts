import { getDB } from "./db";
import { exportAllToCSV, downloadCSV } from "./export";
import type { Expense, Category, PaymentMethod, Budget } from "./types";

const BACKUP_TS_KEY = "backup_last_ts";

function getBackupIntervalMs(): number {
  try {
    const hours = parseFloat(
      localStorage.getItem("backup_interval_hours") || "24"
    );
    if (isNaN(hours) || hours <= 0) return 24 * 60 * 60 * 1000;
    return hours * 60 * 60 * 1000;
  } catch {
    return 24 * 60 * 60 * 1000;
  }
}

function getLastBackupTs(): number {
  try {
    const ts = localStorage.getItem(BACKUP_TS_KEY);
    return ts ? parseInt(ts, 10) : 0;
  } catch {
    return 0;
  }
}

function setLastBackupTs(ts: number): void {
  try {
    localStorage.setItem(BACKUP_TS_KEY, ts.toString());
  } catch {}
}

export function isBackupEnabled(): boolean {
  try {
    return localStorage.getItem("backup_enabled") === "true";
  } catch {
    return false;
  }
}

export function isBackupDue(): boolean {
  if (!isBackupEnabled()) return false;
  const last = getLastBackupTs();
  if (last === 0) return true;
  return Date.now() - last > getBackupIntervalMs();
}

export function getBackupInfo(): {
  enabled: boolean;
  due: boolean;
  intervalHours: number;
  lastBackupTs: number;
} {
  return {
    enabled: isBackupEnabled(),
    due: isBackupDue(),
    intervalHours: Math.round(getBackupIntervalMs() / (60 * 60 * 1000)),
    lastBackupTs: getLastBackupTs(),
  };
}

async function generateBackupCSV(): Promise<string> {
  const db = getDB();
  const expenses = (await db.selectObjects(
    "SELECT * FROM expenses ORDER BY date DESC"
  )) as unknown as Expense[];
  const categories = (await db.selectObjects(
    "SELECT * FROM categories ORDER BY name"
  )) as unknown as Category[];
  const paymentMethods = (await db.selectObjects(
    "SELECT * FROM payment_methods ORDER BY name"
  )) as unknown as PaymentMethod[];
  const budgets = (await db.selectObjects(
    "SELECT * FROM budgets ORDER BY month DESC"
  )) as unknown as Budget[];

  return exportAllToCSV(expenses, categories, paymentMethods, budgets);
}

export async function performBackupDownload(): Promise<boolean> {
  try {
    const csv = await generateBackupCSV();
    const filename = `expenses-backup-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCSV(csv, filename);

    const now = Date.now();
    setLastBackupTs(now);
    return true;
  } catch (err) {
    console.error("[Backup] Download failed:", err);
    return false;
  }
}
