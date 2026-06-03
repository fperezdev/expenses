import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Sun,
  Moon,
  Monitor,
  Download,
  Tag,
  CreditCard,
  Database,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { getDB, getCurrentPath, changeDBPath } from "@/lib/db";
import { exportToCSV, downloadCSV } from "@/lib/export";
import type { ThemeMode } from "@/lib/types";

const themeOptions: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const [dbPath, setDbPath] = useState(getCurrentPath());
  const [pathInput, setPathInput] = useState(getCurrentPath());
  const [pathChanged, setPathChanged] = useState(false);

  useEffect(() => {
    setDbPath(getCurrentPath());
    setPathInput(getCurrentPath());
  }, []);

  const handlePathChange = async () => {
    const trimmed = pathInput.trim();
    if (!trimmed || trimmed === dbPath) return;
    await changeDBPath(trimmed);
    setDbPath(trimmed);
    setPathChanged(false);
  };

  const handleExport = async () => {
    try {
      const db = getDB();
      const expenses = await db.selectObjects(
        `SELECT * FROM expenses ORDER BY date DESC`
      ) as unknown as Record<string, unknown>[];
      const categories = await db.selectObjects(
        `SELECT id, name FROM categories`
      ) as unknown as { id: string; name: string }[];
      const paymentMethods = await db.selectObjects(
        `SELECT id, name FROM payment_methods`
      ) as unknown as { id: string; name: string }[];

      const csv = exportToCSV(
        expenses.map((e) => ({
          id: e.id as string,
          amount: e.amount as number,
          concept: e.concept as string,
          description: (e.description as string) || "",
          recurring_months: (e.recurring_months as number) || 0,
          category_id: e.category_id as string | null,
          payment_method_id: e.payment_method_id as string | null,
          date: e.date as string,
          created_at: e.created_at as string,
        })),
        categories.map((c) => ({
          id: c.id,
          name: c.name,
          color: "",
          icon: "",
          created_at: "",
        })),
        paymentMethods.map((p) => ({
          id: p.id,
          name: p.name,
          icon: "",
          created_at: "",
        }))
      );
      downloadCSV(csv, `expenses-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (err) {
      alert("Error al exportar: " + (err as Error).message);
    }
  };

  return (
    <div className="space-y-5">
      <Helmet>
        <title>Expenses - Ajustes</title>
      </Helmet>

      <h1 className="text-xl font-bold">Ajustes</h1>

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <p className="mb-3 text-sm font-medium text-gray-500">Tema</p>
        <div className="flex rounded-lg bg-gray-100 p-0.5 dark:bg-gray-800">
          {themeOptions.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-xs font-semibold transition-colors ${
                  theme === opt.value
                    ? "bg-white text-indigo-600 shadow-sm dark:bg-gray-700 dark:text-indigo-400"
                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                <Icon size={14} />
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Link
          to="/categories"
          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
        >
          <Tag size={20} className="text-gray-400" />
          <span className="flex-1 text-sm">Categorias</span>
        </Link>
        <Link
          to="/payment-methods"
          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
        >
          <CreditCard size={20} className="text-gray-400" />
          <span className="flex-1 text-sm">Metodos de pago</span>
        </Link>
      </div>

      <button
        onClick={handleExport}
        className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
      >
        <Download size={20} className="text-gray-400" />
        <span className="flex-1 text-sm">Exportar CSV</span>
      </button>

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <Database size={20} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-500">
            Archivo SQLite
          </span>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Path actual en OPFS: {dbPath}
        </p>
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={pathInput}
            onChange={(e) => {
              setPathInput(e.target.value);
              setPathChanged(e.target.value.trim() !== dbPath);
            }}
            placeholder="expenses.db"
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800"
          />
          <button
            onClick={handlePathChange}
            disabled={!pathChanged}
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Cambiar
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Al cambiar el path se crea una base de datos nueva. Los datos no se
          migran automaticamente.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <p className="text-sm font-medium text-gray-500">Expenses</p>
        <p className="mt-1 text-xs text-gray-400">v1.0.0</p>
        <p className="text-xs text-gray-400">
          Control de gastos personal. React + SQLite + PWA.
        </p>
      </div>

      <div className="h-20" />
    </div>
  );
}
