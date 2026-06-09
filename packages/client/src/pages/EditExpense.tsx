import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { getDB } from "@/lib/db";
import type { Expense } from "@/lib/types";
import ExpenseForm from "@/components/ExpenseForm";
import Spinner from "@/components/Spinner";

export default function EditExpense() {
  const { id } = useParams<{ id: string }>();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const db = getDB();
        const row = await db.selectObject(
          `SELECT * FROM expenses WHERE id=? AND deleted_at IS NULL`,
          [id]
        ) as unknown as Expense | undefined;
        if (row) {
          setExpense(row);
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="py-20">
        <Spinner />
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="py-12 text-center text-gray-400">
        <p className="text-lg">Gasto no encontrado</p>
      </div>
    );
  }

  return (
    <div>
      <Helmet>
        <title>Expenses - Editar gasto</title>
      </Helmet>
      <ExpenseForm expense={expense} />
    </div>
  );
}
