import { Trash2, AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  variant?: "danger" | "warning";
}

export default function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Eliminar",
  variant = "danger",
}: Props) {
  if (!open) return null;

  const isDanger = variant === "danger";
  const Icon = isDanger ? Trash2 : AlertTriangle;
  const bgClass = isDanger
    ? "bg-red-100 dark:bg-red-500/20"
    : "bg-yellow-100 dark:bg-yellow-500/20";
  const iconClass = isDanger ? "text-red-500" : "text-yellow-500";
  const btnClass = isDanger
    ? "bg-red-500"
    : "bg-indigo-600";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
        <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${bgClass}`}>
          <Icon size={24} className={iconClass} />
        </div>
        <h3 className="text-center text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-center text-sm text-gray-500">{message}</p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-gray-300 py-2.5 text-sm font-medium dark:border-gray-600"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 rounded-xl py-2.5 text-sm font-medium text-white ${btnClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
