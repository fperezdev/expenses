import { WifiOff } from "lucide-react";
import { useOnline } from "@/hooks/useOnline";

export default function OfflineIndicator() {
  const { isOnline } = useOnline();

  if (isOnline) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-yellow-50 px-4 py-2 text-sm text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400">
      <WifiOff size={14} />
      <span>Sin conexion</span>
    </div>
  );
}
