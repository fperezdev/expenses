import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Repeat } from "lucide-react";
import { getDB } from "@/lib/db";
import { adjustDayToValidMonth } from "@/lib/utils";
import AmountInput from "./AmountInput";
import CategoryPicker from "./CategoryPicker";
import PaymentMethodPicker from "./PaymentMethodPicker";
import type { Expense } from "@/lib/types";

interface Props {
  expense?: Expense;
}

export default function ExpenseForm({ expense }: Props) {
  const navigate = useNavigate();

  const [amount, setAmount] = useState(expense?.amount?.toString() || "");
  const [concept, setConcept] = useState(expense?.concept || "");
  const [description, setDescription] = useState(expense?.description || "");
  const [categoryId, setCategoryId] = useState<string | null>(
    expense?.category_id || null
  );
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(
    expense?.payment_method_id || null
  );
  const [date, setDate] = useState(
    expense?.date || new Date().toISOString().slice(0, 10)
  );
  const [recurring, setRecurring] = useState(
    (expense?.recurring_months || 0) > 0
  );
  const [repeatMonths, setRepeatMonths] = useState(
    expense?.recurring_months || 12
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError("El importe debe ser mayor que 0");
      return;
    }
    if (!concept.trim()) {
      setError("El concepto es obligatorio");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const db = getDB();
      const now = new Date().toISOString();

      if (expense) {
        await db.exec({
          sql: `UPDATE expenses SET amount=?, concept=?, description=?, category_id=?, payment_method_id=?, date=? WHERE id=?`,
          bind: [
            numAmount,
            concept.trim(),
            description.trim(),
            categoryId,
            paymentMethodId,
            date,
            expense.id,
          ],
        });
      } else {
        const id = crypto.randomUUID();
        await db.exec({
          sql: `INSERT INTO expenses(id, amount, concept, description, recurring_months, category_id, payment_method_id, date, created_at) VALUES(?,?,?,?,?,?,?,?,?)`,
          bind: [
            id,
            numAmount,
            concept.trim(),
            description.trim(),
            recurring ? repeatMonths : 0,
            categoryId,
            paymentMethodId,
            date,
            now,
          ],
        });

        if (recurring && repeatMonths > 1) {
          const baseDate = new Date(date + "T00:00:00");
          for (let i = 1; i < repeatMonths; i++) {
            const futureDate = new Date(
              baseDate.getFullYear(),
              baseDate.getMonth() + i,
              baseDate.getDate()
            );
            const adjustedDate = adjustDayToValidMonth(
              futureDate.getFullYear(),
              futureDate.getMonth(),
              baseDate.getDate()
            );

            const existing = await db.selectValue(
              "SELECT COUNT(*) FROM expenses WHERE concept=? AND category_id=? AND date=?",
              [concept.trim(), categoryId, adjustedDate]
            );
            if (existing && Number(existing) > 0) continue;

            await db.exec({
              sql: `INSERT INTO expenses(id, amount, concept, description, recurring_months, category_id, payment_method_id, date, created_at) VALUES(?,?,?,?,?,?,?,?,?)`,
              bind: [
                crypto.randomUUID(),
                numAmount,
                concept.trim(),
                description.trim(),
                0,
                categoryId,
                paymentMethodId,
                adjustedDate,
                now,
              ],
            });
          }
        }
      }

      navigate("/");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSave();
      }}
      className="space-y-5"
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-1"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">
          {expense ? "Editar gasto" : "Nuevo gasto"}
        </h1>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      <div>
        <label className="text-sm font-medium text-gray-500">Importe</label>
        <AmountInput value={amount} onChange={setAmount} />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-500">Concepto</label>
        <input
          type="text"
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          placeholder="Ej: Compra supermercado"
          className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-500">
          Descripcion (opcional)
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detalles adicionales..."
          className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-500">Categoria</label>
        <CategoryPicker selectedId={categoryId} onSelect={setCategoryId} />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-500">
          Metodo de pago
        </label>
        <PaymentMethodPicker
          selectedId={paymentMethodId}
          onSelect={setPaymentMethodId}
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-500">Fecha</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800"
        />
      </div>

      {!expense && (
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setRecurring(!recurring)}
              className={`flex h-6 w-11 items-center rounded-full transition-colors ${
                recurring ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                  recurring ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className="flex items-center gap-1.5 text-sm font-medium text-gray-500">
              <Repeat size={14} />
              Recurrente
            </span>
          </label>

          {recurring && (
            <div>
              <label className="text-sm font-medium text-gray-500">
                Repetir por (meses)
              </label>
              <input
                type="number"
                min={1}
                max={12}
                value={repeatMonths}
                onChange={(e) =>
                  setRepeatMonths(parseInt(e.target.value) || 1)
                }
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800"
              />
            </div>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
      >
        <Save size={18} />
        {saving
          ? "Guardando..."
          : expense
            ? "Actualizar gasto"
            : "Guardar gasto"}
      </button>
    </form>
  );
}
