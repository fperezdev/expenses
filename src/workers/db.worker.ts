import sqlite3InitModule from "@sqlite.org/sqlite-wasm";
import type { Database, Sqlite3Static } from "@sqlite.org/sqlite-wasm";

let sqlite3: Sqlite3Static | null = null;
let db: Database | null = null;

async function init(): Promise<void> {
  if (sqlite3) return;
  sqlite3 = await sqlite3InitModule();
}

function getDb(): Database {
  if (!db) throw new Error("DB not open");
  return db;
}

function runMigrations(database: Database): void {
  database.exec("PRAGMA journal_mode=WAL");
  database.exec("PRAGMA foreign_keys=ON");

  database.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT DEFAULT (datetime('now'))
    )
  `);

  const applied = new Set<string>(
    database.selectValues("SELECT name FROM _migrations").map((r) => String(r))
  );

  const migrations: [string, string][] = [
    [
      "001_initial",
      `CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        icon TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS payment_methods (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS budgets (
        id TEXT PRIMARY KEY,
        month TEXT NOT NULL UNIQUE,
        amount REAL NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        amount REAL NOT NULL,
        concept TEXT NOT NULL,
        description TEXT DEFAULT '',
        recurring_months INTEGER DEFAULT 0,
        category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
        payment_method_id TEXT REFERENCES payment_methods(id) ON DELETE SET NULL,
        date TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
      CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
      CREATE INDEX IF NOT EXISTS idx_budgets_month ON budgets(month);`,
    ],
  ];

  for (const [name, sql] of migrations) {
    if (!applied.has(name)) {
      database.exec(sql);
      database.exec({
        sql: "INSERT INTO _migrations(name) VALUES(?)",
        bind: [name],
      });
    }
  }
}

self.onmessage = async (e: MessageEvent) => {
  const { id, method, params } = e.data;

  try {
    await init();

    switch (method) {
      case "open": {
        if (db) db.close();
        db = new sqlite3!.oo1.OpfsDb(params.path, "ct");
        runMigrations(db);
        self.postMessage({ id, result: null });
        break;
      }

      case "getPath": {
        self.postMessage({ id, result: params.path });
        break;
      }

      case "exec": {
        const d = getDb();
        if (params.bind !== undefined) {
          d.exec({ sql: params.sql, bind: params.bind });
        } else {
          d.exec(params.sql);
        }
        self.postMessage({ id, result: null });
        break;
      }

      case "selectValue": {
        const d = getDb();
        const val = d.selectValue(params.sql, params.bind);
        self.postMessage({ id, result: val });
        break;
      }

      case "selectValues": {
        const d = getDb();
        const vals = d.selectValues(params.sql, params.bind);
        self.postMessage({ id, result: vals });
        break;
      }

      case "selectObject": {
        const d = getDb();
        const obj = d.selectObject(params.sql, params.bind);
        self.postMessage({ id, result: obj });
        break;
      }

      case "selectObjects": {
        const d = getDb();
        const objs = d.selectObjects(params.sql, params.bind);
        self.postMessage({ id, result: objs });
        break;
      }

      case "close": {
        if (db) {
          db.close();
          db = null;
        }
        self.postMessage({ id, result: null });
        break;
      }

      default:
        throw new Error(`Unknown method: ${method}`);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    self.postMessage({ id, error: message });
  }
};
