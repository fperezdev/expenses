import { Hono } from "hono";
import { authMiddleware } from "./middleware";
import type { SyncPayload, SyncResponse } from "@expenses/shared";

type Bindings = {
  DB: D1Database;
};

type Variables = {
  userId: string;
};

const sync = new Hono<{ Bindings: Bindings; Variables: Variables }>();

sync.use("*", authMiddleware);

const TABLES = ["categories", "payment_methods", "budgets", "expenses"] as const;

const TABLE_COLUMNS: Record<string, string[]> = {
  categories: ["id", "name", "color", "icon", "created_at", "updated_at", "deleted_at"],
  payment_methods: ["id", "name", "icon", "created_at", "updated_at", "deleted_at"],
  budgets: ["id", "month", "amount", "created_at", "updated_at", "deleted_at"],
  expenses: ["id", "amount", "concept", "description", "recurring_months", "category_id", "payment_method_id", "date", "created_at", "updated_at", "deleted_at"],
};

function mapRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (k === "user_id") continue;
    out[k] = v;
  }
  return out;
}

// POST /api/sync
sync.post("/", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<SyncPayload>();

  const statements: D1PreparedStatement[] = [];

  // 0. Full replace: delete all user data first
  if (body.full_replace) {
    for (const table of TABLES) {
      statements.push(
        c.env.DB.prepare(`DELETE FROM ${table} WHERE user_id = ?`).bind(userId)
      );
    }
  }

  // 1. Upsert incoming changes from client
  for (const table of TABLES) {
    const records = (body as unknown as Record<string, Record<string, unknown>[]>)[table];
    if (!records || records.length === 0) continue;
    const allowedCols = TABLE_COLUMNS[table];

    for (const record of records) {
      // Check if server has newer version
      const existing = await c.env.DB.prepare(
        `SELECT updated_at FROM ${table} WHERE id = ? AND user_id = ?`
      ).bind(record.id as string, userId).first<{ updated_at: string }>();

      if (!existing || (record.updated_at as string) > existing.updated_at) {
        const cols = Object.keys(record).filter(c => allowedCols.includes(c));
        const values = cols.map(c => record[c]);
        const placeholders = cols.map(() => "?").join(", ");
        const colList = cols.join(", ");

        const setClause = cols
          .filter(c => c !== "id" && c !== "user_id")
          .map(c => `${c} = excluded.${c}`)
          .join(", ");

        statements.push(
          c.env.DB.prepare(
            `INSERT INTO ${table} (${colList}, user_id) VALUES (${placeholders}, ?)
             ON CONFLICT(id, user_id) DO UPDATE SET ${setClause}`
          ).bind(...values, userId)
        );
      }
    }
  }

  // Execute batch (in transaction)
  if (statements.length > 0) {
    await c.env.DB.batch(statements);
  }

  // 2. Generate server timestamp AFTER all upserts (SQLite format for consistency)
  const nowResult = await c.env.DB.prepare("SELECT datetime('now') as now").first<{ now: string }>();
  const serverNow = nowResult?.now || new Date().toISOString().replace('T', ' ').slice(0, 19);

  // 3. Return server changes since client's last_sync_ts
  const response: SyncResponse = {
    server_ts: serverNow,
    expenses: [],
    categories: [],
    payment_methods: [],
    budgets: [],
  };

  for (const table of TABLES) {
    const allowedCols = TABLE_COLUMNS[table];
    const colList = allowedCols.join(", ");
    const result = await c.env.DB.prepare(
      `SELECT ${colList} FROM ${table} WHERE user_id = ? AND updated_at > ?`
    ).bind(userId, body.last_sync_ts).all();

    (response as unknown as Record<string, unknown[]>)[table] = result.results.map(mapRow);
  }

  return c.json(response);
});

export { sync };
