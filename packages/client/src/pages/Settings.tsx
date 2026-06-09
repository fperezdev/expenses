import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Sun,
  Moon,
  Monitor,
  Download,
  Upload,
  ShieldCheck,
  Tag,
  CreditCard,
  Database,
  Save,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { getDB, getCurrentPath, changeDBPath } from "@/lib/db";
import { getMonthKey } from "@/lib/utils";
import { exportAllToCSV, downloadCSV } from "@/lib/export";
import { parseCSVPreview, importFromCSV } from "@/lib/import";
import { performBackupDownload, isBackupEnabled, getBackupInfo } from "@/lib/backup";
import {
  isLoggedIn, clearAuth,
  login, register,
  updateProfile, getUserTimezone,
} from "@/lib/sync";
import type { ThemeMode, Expense, Category, PaymentMethod, Budget } from "@/lib/types";

const themeOptions: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

export default function Settings() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme, setTheme } = useTheme();
  const [dbPath, setDbPath] = useState(getCurrentPath());
  const [pathInput, setPathInput] = useState(getCurrentPath());
  const [pathChanged, setPathChanged] = useState(false);
  const [importPreview, setImportPreview] = useState<{
    categories: number;
    paymentMethods: number;
    budgets: number;
    expenses: number;
  } | null>(null);
  const [importCSV, setImportCSV] = useState("");
  const [importing, setImporting] = useState(false);
  const [showConfirmImport, setShowConfirmImport] = useState(false);

  const [backupEnabled, setBackupEnabled] = useState(isBackupEnabled);
  const [backupInterval, setBackupInterval] = useState(() => {
    try {
      const h = localStorage.getItem("backup_interval_hours");
      return h || "24";
    } catch {
      return "24";
    }
  });
  const [backupInfo, setBackupInfo] = useState(getBackupInfo);
  const [backingUp, setBackingUp] = useState(false);

  // ─── Cloud Sync state ───
  const [loggedIn, setLoggedIn] = useState(isLoggedIn());
  const [timezone, setTimezone] = useState(() => getUserTimezone());
  const [budgetAmount, setBudgetAmount] = useState("");
  const [savingBudget, setSavingBudget] = useState(false);

  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [tzFeedback, setTzFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    setDbPath(getCurrentPath());
    setPathInput(getCurrentPath());
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const db = getDB();
        const mk = getMonthKey(new Date());
        const row = await db.selectObject(
          "SELECT amount FROM budgets WHERE month=? AND deleted_at IS NULL",
          [mk]
        ) as unknown as { amount: number } | undefined;
        if (row) setBudgetAmount(row.amount.toString());
      } catch {}
    })();
  }, []);

  const handleBudgetSave = async () => {
    const amount = parseFloat(budgetAmount);
    if (!amount || amount <= 0) return;
    setSavingBudget(true);
    try {
      const db = getDB();
      const mk = getMonthKey(new Date());
      const existing = await db.selectObject(
        "SELECT id FROM budgets WHERE month=? AND deleted_at IS NULL",
        [mk]
      ) as unknown as { id: string } | undefined;
      if (existing) {
        await db.exec({ sql: "UPDATE budgets SET amount=?, updated_at=datetime('now') WHERE id=?", bind: [amount, existing.id] });
      } else {
        await db.exec({
          sql: "INSERT INTO budgets(id, month, amount) VALUES(?,?,?)",
          bind: [crypto.randomUUID(), mk, amount],
        });
      }
    } catch {} finally {
      setSavingBudget(false);
    }
  };

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
      const expenses = (await db.selectObjects(
        "SELECT * FROM expenses WHERE deleted_at IS NULL ORDER BY date DESC"
      )) as unknown as Expense[];
      const categories = (await db.selectObjects(
        "SELECT * FROM categories WHERE deleted_at IS NULL ORDER BY name"
      )) as unknown as Category[];
      const paymentMethods = (await db.selectObjects(
        "SELECT * FROM payment_methods WHERE deleted_at IS NULL ORDER BY name"
      )) as unknown as PaymentMethod[];
      const budgets = (await db.selectObjects(
        "SELECT * FROM budgets WHERE deleted_at IS NULL ORDER BY month DESC"
      )) as unknown as Budget[];

      const csv = exportAllToCSV(expenses, categories, paymentMethods, budgets);
      downloadCSV(csv, `expenses-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (err) {
      alert("Error al exportar: " + (err as Error).message);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const preview = parseCSVPreview(text);
      setImportCSV(text);
      setImportPreview(preview);
      setShowConfirmImport(true);
    };
    reader.onerror = () => alert("Error al leer el archivo");
    reader.readAsText(file);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleConfirmImport = async (mode: "replace" | "merge") => {
    setShowConfirmImport(false);
    setImporting(true);
    try {
      const result = await importFromCSV(importCSV, mode);
      alert(
        `Importado: ${result.categories} categorias, ${result.paymentMethods} metodos de pago, ${result.budgets} presupuestos, ${result.expenses} gastos.`
      );
      setImportPreview(null);
      setImportCSV("");
      navigate("/");
    } catch (err) {
      alert("Error al importar: " + (err as Error).message);
    } finally {
      setImporting(false);
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

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <p className="mb-3 text-sm font-medium text-gray-500">Presupuesto mensual</p>
        <div className="flex gap-2">
          <input
            type="number"
            value={budgetAmount}
            onChange={(e) => setBudgetAmount(e.target.value)}
            placeholder="Monto"
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800"
          />
          <button
            onClick={handleBudgetSave}
            disabled={savingBudget}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            <Save size={16} />
            {savingBudget ? "Guardando..." : "Guardar"}
          </button>
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

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={importing}
        className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left hover:bg-gray-50 disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
      >
        <Upload size={20} className="text-gray-400" />
        <span className="flex-1 text-sm">
          {importing ? "Importando..." : "Importar CSV"}
        </span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <ShieldCheck size={20} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-500">
            Backup automatico
          </span>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Al abrir la app te avisa si toca descargar el backup. El CSV se guarda en tu dispositivo.
        </p>

        <label className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              const next = !backupEnabled;
              setBackupEnabled(next);
              try {
                localStorage.setItem("backup_enabled", String(next));
              } catch {}
            }}
            className={`flex h-6 w-11 items-center rounded-full transition-colors ${
              backupEnabled ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                backupEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
          <span className="text-sm font-medium">
            {backupEnabled ? "Activado" : "Desactivado"}
          </span>
        </label>

        {backupEnabled && (
          <>
            <div className="mt-3">
              <label className="text-xs font-medium text-gray-500">
                Intervalo (horas)
              </label>
              <input
                type="number"
                min="1"
                max="720"
                value={backupInterval}
                onChange={(e) => {
                  setBackupInterval(e.target.value);
                  try {
                    localStorage.setItem("backup_interval_hours", e.target.value);
                  } catch {}
                }}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800"
              />
            </div>

            {backupInfo.lastBackupTs > 0 && (
              <p className="mt-2 text-xs text-gray-400">
                Ultimo backup:{" "}
                {new Date(backupInfo.lastBackupTs).toLocaleString("es-CL")}
              </p>
            )}

            <button
              onClick={async () => {
                setBackingUp(true);
                const ok = await performBackupDownload();
                setBackingUp(false);
                setBackupInfo(getBackupInfo());
                alert(
                  ok
                    ? "Backup descargado."
                    : "Error al generar el backup."
                );
              }}
              disabled={backingUp}
              className="mt-3 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {backingUp ? "Descargando..." : "Hacer backup ahora"}
            </button>
          </>
        )}
      </div>

      {/* ─── Cloud Sync ─── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="font-semibold">Sincronizacion en la nube</h3>
        <p className="mt-1 text-xs text-gray-400">
          Guarda tus datos en la nube y accede desde varios dispositivos.
        </p>

        {/* Auth section */}
        <div className="mt-4">
          {loggedIn ? (
            <div>
              <p className="text-sm text-green-600 dark:text-green-400">
                Conectado como usuario
              </p>
              <button
                onClick={() => { clearAuth(); setLoggedIn(false); }}
                className="mt-2 text-sm text-red-500 hover:underline"
              >
                Cerrar sesion
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Toggle login/register */}
              <div className="flex rounded-lg bg-gray-100 p-0.5 dark:bg-gray-800">
                <button
                  onClick={() => setAuthMode("login")}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs transition-colors ${
                    authMode === "login"
                      ? "bg-white text-indigo-600 shadow-sm dark:bg-gray-700 dark:text-indigo-400"
                      : "text-gray-500"
                  }`}
                >
                  Iniciar sesion
                </button>
                <button
                  onClick={() => setAuthMode("register")}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs transition-colors ${
                    authMode === "register"
                      ? "bg-white text-indigo-600 shadow-sm dark:bg-gray-700 dark:text-indigo-400"
                      : "text-gray-500"
                  }`}
                >
                  Registrarse
                </button>
              </div>

              <input
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-800"
              />
              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="Contrasena"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-800"
              />

              {authError && (
                <p className="text-xs text-red-500">{authError}</p>
              )}

              <button
                onClick={async () => {
                  setAuthError("");
                  const fn = authMode === "login" ? login : register;
                  const result = await fn(authEmail, authPassword);
                  if (result.ok) {
                    setLoggedIn(true);
                    setAuthEmail("");
                    setAuthPassword("");
                  } else {
                    setAuthError(result.error || "Error");
                  }
                }}
                disabled={!authEmail || !authPassword}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {authMode === "login" ? "Iniciar sesion" : "Crear cuenta"}
              </button>
            </div>
          )}
        </div>

        {/* Timezone selector */}
        {loggedIn && (
          <div className="mt-4 space-y-2 border-t border-gray-100 pt-4 dark:border-gray-800">
            <label className="text-sm text-gray-500 dark:text-gray-400">Zona horaria</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700"
            >
              <option value="">Automatica (navegador)</option>
              <option value="America/Santiago">America/Santiago</option>
              <option value="America/Buenos_Aires">America/Buenos_Aires</option>
              <option value="America/Lima">America/Lima</option>
              <option value="America/Bogota">America/Bogota</option>
              <option value="America/Mexico_City">America/Mexico_City</option>
              <option value="America/New_York">America/New_York</option>
              <option value="Europe/Madrid">Europe/Madrid</option>
              <option value="UTC">UTC</option>
            </select>
            <button
              onClick={async () => {
                const success = await updateProfile({ timezone });
                if (success) {
                  setTzFeedback({ type: "success", message: "Zona horaria guardada" });
                } else {
                  setTzFeedback({ type: "error", message: "Error al guardar la zona horaria" });
                }
                setTimeout(() => {
                  setTzFeedback(null);
                }, 5000);
              }}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Guardar zona horaria
            </button>
            {tzFeedback && (
              <p className={`mt-2 text-xs ${tzFeedback.type === "success" ? "text-green-600" : "text-red-500"}`}>
                {tzFeedback.message}
              </p>
            )}
          </div>
        )}
      </div>

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

      {showConfirmImport && importPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-500/20">
              <Upload size={24} className="text-yellow-500" />
            </div>
            <h3 className="text-center text-lg font-semibold">Importar datos</h3>
            <p className="mt-2 text-center text-sm text-gray-500">
              Se encontraron: {importPreview.categories} categorias,{" "}
              {importPreview.paymentMethods} metodos de pago,{" "}
              {importPreview.budgets} presupuestos, {importPreview.expenses}{" "}
              gastos.
            </p>
            <p className="mt-1 text-center text-xs text-gray-400">
              Elegi como aplicar los datos:
            </p>
            <div className="mt-5 space-y-2">
              <button
                onClick={() => handleConfirmImport("replace")}
                className="w-full rounded-xl bg-red-500 py-2.5 text-sm font-medium text-white"
              >
                Reemplazar todo (borra datos actuales)
              </button>
              <button
                onClick={() => handleConfirmImport("merge")}
                className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-medium text-white"
              >
                Agregar a lo existente (sin borrar)
              </button>
            </div>
            <button
              onClick={() => {
                setShowConfirmImport(false);
                setImportPreview(null);
                setImportCSV("");
              }}
              className="mt-2 w-full rounded-xl border border-gray-300 py-2.5 text-sm font-medium dark:border-gray-600"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="h-20" />
    </div>
  );
}
