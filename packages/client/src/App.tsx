import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import OfflineIndicator from "@/components/OfflineIndicator";
import BackupBanner from "@/components/BackupBanner";
import { initDB } from "@/lib/db";
import { isBackupDue } from "@/lib/backup";
import { isLoggedIn, performSync } from "@/lib/sync";
import Spinner from "@/components/Spinner";

const HIDE_NAV_ROUTES = ["/edit/"];

export default function AppLayout() {
  const location = useLocation();
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState("");
  const [backupDue, setBackupDue] = useState(false);

  useEffect(() => {
    initDB()
      .then(() => {
        setDbReady(true);
        setBackupDue(isBackupDue());
      })
      .catch((err) => setDbError((err as Error).message));
  }, []);

  // Sync on mount if logged in
  useEffect(() => {
    if (isLoggedIn()) {
      performSync().catch(() => {});
    }
  }, []);

  const showNav = !HIDE_NAV_ROUTES.some((r) => location.pathname.startsWith(r));

  if (!dbReady && !dbError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-sm text-gray-400">Cargando base de datos...</p>
        </div>
      </div>
    );
  }

  if (dbError) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-sm rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-500/10">
          <p className="font-semibold text-red-600 dark:text-red-400">
            Error al cargar la base de datos
          </p>
          <p className="mt-2 text-sm text-red-500">{dbError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-xl bg-red-600 px-5 py-2 text-sm font-medium text-white"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-lg pb-20">
      <OfflineIndicator />
      <BackupBanner visible={backupDue} />
      <main className="px-4 pt-4">
        <Outlet />
      </main>
      {showNav && <BottomNav />}
    </div>
  );
}
