let worker: Worker | null = null;
let callId = 0;
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
let dbPath: string = "";

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("../workers/db.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (e: MessageEvent) => {
      const { id, result, error } = e.data;
      const p = pending.get(id);
      if (!p) return;
      pending.delete(id);
      if (error) p.reject(new Error(error));
      else p.resolve(result);
    };
  }
  return worker;
}

function call(method: string, params?: Record<string, unknown>): Promise<unknown> {
  const w = getWorker();
  return new Promise((resolve, reject) => {
    const id = ++callId;
    pending.set(id, { resolve, reject });
    w.postMessage({ id, method, params });
  });
}

function getStoredPath(): string {
  return "expenses-fperez.db";
}

export async function initDB(filename?: string): Promise<void> {
  if (dbPath) return;
  const path = filename || getStoredPath();
  dbPath = path;
  await call("open", { path: dbPath });
}

export async function closeDB(): Promise<void> {
  await call("close");
}

export interface DBHandle {
  exec(sql: string | { sql: string; bind?: unknown[] }): Promise<void>;
  selectValue(sql: string, bind?: unknown[]): Promise<unknown>;
  selectValues(sql: string, bind?: unknown[]): Promise<unknown[]>;
  selectObject(sql: string, bind?: unknown[]): Promise<Record<string, unknown> | undefined>;
  selectObjects(sql: string, bind?: unknown[]): Promise<Record<string, unknown>[]>;
}

function makeDBHandle(): DBHandle {
  return {
    async exec(
      arg1: string | { sql: string; bind?: unknown[] }
    ): Promise<void> {
      if (typeof arg1 === "object") {
        await call("exec", { sql: arg1.sql, bind: arg1.bind as unknown[] });
      } else {
        await call("exec", { sql: arg1 });
      }
    },

    async selectValue(
      sql: string,
      bind?: unknown[]
    ): Promise<unknown> {
      return call("selectValue", { sql, bind });
    },

    async selectValues(
      sql: string,
      bind?: unknown[]
    ): Promise<unknown[]> {
      return call("selectValues", { sql, bind }) as Promise<unknown[]>;
    },

    async selectObject(
      sql: string,
      bind?: unknown[]
    ): Promise<Record<string, unknown> | undefined> {
      return call("selectObject", { sql, bind }) as Promise<
        Record<string, unknown> | undefined
      >;
    },

    async selectObjects(
      sql: string,
      bind?: unknown[]
    ): Promise<Record<string, unknown>[]> {
      return call("selectObjects", { sql, bind }) as Promise<
        Record<string, unknown>[]
      >;
    },
  };
}

export function getDB(): DBHandle {
  if (!worker) {
    throw new Error("DB not initialized. Call initDB() first.");
  }
  return makeDBHandle();
}
