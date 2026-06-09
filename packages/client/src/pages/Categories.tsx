import { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { getDB } from "@/lib/db";
import { getNextColor } from "@/lib/utils";
import type { Category } from "@/lib/types";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    try {
      const db = getDB();
      const rows = await db.selectObjects(
        "SELECT id, name, color, icon, created_at FROM categories WHERE deleted_at IS NULL ORDER BY name"
      ) as unknown as Category[];
      setCategories(rows);
    } catch {}
  };

  useEffect(() => {
    load();
  }, []);

  const usedColors = useMemo(() => new Set(categories.map((c) => c.color)), [categories]);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      const db = getDB();
      const id = crypto.randomUUID();
      const color = getNextColor(usedColors);
      await db.exec({ sql: "INSERT INTO categories(id, name, color) VALUES(?,?,?)", bind: [id, name, color] });
      setNewName("");
      await load();
    } catch {}
  };

  const handleUpdate = async (id: string) => {
    const name = editName.trim();
    if (!name) return;
    try {
      const db = getDB();
      await db.exec({ sql: "UPDATE categories SET name=?, updated_at=datetime('now') WHERE id=?", bind: [name, id] });
      setEditing(null);
      await load();
    } catch {}
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const db = getDB();
      await db.exec({ sql: "UPDATE categories SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id=?", bind: [deleteId] });
      setDeleteId(null);
      await load();
    } catch {}
  };

  return (
    <div className="space-y-5">
      <Helmet>
        <title>Expenses - Categorias</title>
      </Helmet>

      <h1 className="text-xl font-bold">Categorias</h1>

      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Nueva categoria"
          className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800"
        />
        <button
          onClick={handleAdd}
          className="rounded-xl bg-indigo-600 p-3 text-white hover:bg-indigo-700"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="space-y-1">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
          >
            <span
              className="inline-block h-4 w-4 rounded-full"
              style={{ backgroundColor: cat.color }}
            />

            {editing === cat.id ? (
              <>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleUpdate(cat.id)}
                  className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800"
                  autoFocus
                />
                <button
                  onClick={() => handleUpdate(cat.id)}
                  className="rounded-lg p-1.5 text-emerald-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => setEditing(null)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X size={16} />
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm">{cat.name}</span>
                <button
                  onClick={() => {
                    setEditing(cat.id);
                    setEditName(cat.name);
                  }}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-indigo-600 dark:hover:bg-gray-800"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => setDeleteId(cat.id)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-500 dark:hover:bg-gray-800"
                >
                  <Trash2 size={15} />
                </button>
              </>
            )}
          </div>
        ))}

        {categories.length === 0 && (
          <div className="py-12 text-center text-gray-400">
            <p>Sin categorias</p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="Eliminar categoria"
        message="Los gastos con esta categoria quedaran sin categoria."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      <div className="h-20" />
    </div>
  );
}
