import { useState, useEffect } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { getDB } from "@/lib/db";
import type { PaymentMethod } from "@/lib/types";

interface Props {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export default function PaymentMethodPicker({ selectedId, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);

  const load = async () => {
    try {
      const db = getDB();
      const rows = await db.selectObjects(
        "SELECT id, name, icon, created_at FROM payment_methods WHERE deleted_at IS NULL ORDER BY name"
      ) as unknown as PaymentMethod[];
      setMethods(rows);
    } catch {}
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open]);

  const selected = methods.find((m) => m.id === selectedId);

  return (
    <div className="relative mt-1">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800"
      >
        {selected ? (
          <span className="text-sm">{selected.name}</span>
        ) : (
          <span className="text-sm text-gray-400">
            Seleccionar metodo de pago
          </span>
        )}
        <ChevronDown size={18} className="text-gray-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <button
              type="button"
              onClick={() => {
                onSelect(null);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Sin metodo
            </button>
            {methods.map((pm) => (
              <button
                key={pm.id}
                type="button"
                onClick={() => {
                  onSelect(pm.id);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {pm.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                window.location.hash = "#/payment-methods";
              }}
              className="flex w-full items-center gap-2 border-t border-gray-100 px-4 py-2.5 text-sm text-indigo-600 hover:bg-gray-50 dark:border-gray-700 dark:text-indigo-400 dark:hover:bg-gray-700"
            >
              <Plus size={14} />
              Gestionar metodos
            </button>
          </div>
        </>
      )}
    </div>
  );
}
