import { memo } from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, PlusCircle, Settings } from "lucide-react";

const tabs = [
  { to: "/", label: "Inicio", icon: LayoutDashboard },
  { to: "/add", label: "Nuevo", icon: PlusCircle },
  { to: "/settings", label: "Ajustes", icon: Settings },
];

const BottomNav = memo(function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom,0px)] dark:border-gray-800 dark:bg-gray-900">
      <div className="flex h-16 items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === "/"}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 px-2 py-1 min-w-[64px] ${isActive ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400"}`
              }
            >
              <Icon size={22} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
});

export default BottomNav;
