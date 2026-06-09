import { useState } from "react";
import { Download } from "lucide-react";
import { performBackupDownload } from "@/lib/backup";
import { isSyncEnabled } from "@/lib/sync";

interface Props {
  visible: boolean;
}

export default function BackupBanner({ visible }: Props) {
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  // If sync is enabled, don't show the backup banner
  if (isSyncEnabled()) return null;

  if (!visible || done) return null;

  const handleDownload = async () => {
    setSaving(true);
    const ok = await performBackupDownload();
    setSaving(false);
    if (ok) setDone(true);
  };

  return (
    <div className="flex items-center justify-between gap-3 bg-indigo-50 px-4 py-3 text-sm dark:bg-indigo-500/10">
      <div className="flex items-center gap-2">
        <Download size={14} className="text-indigo-600 dark:text-indigo-400" />
        <span className="text-indigo-700 dark:text-indigo-300">
          Backup pendiente
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setDone(true)}
          className="text-xs text-gray-400"
        >
          Omitir
        </button>
        <button
          onClick={handleDownload}
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {saving ? "..." : "Descargar"}
        </button>
      </div>
    </div>
  );
}
