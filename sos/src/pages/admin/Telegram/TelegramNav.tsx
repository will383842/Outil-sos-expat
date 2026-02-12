import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  LayoutDashboard,
  Megaphone,
  FileText,
  Users,
  Inbox,
  ScrollText,
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { path: "/admin/toolbox/telegram", label: "Dashboard", icon: LayoutDashboard },
  { path: "/admin/toolbox/telegram/campaigns", label: "Campagnes", icon: Megaphone },
  { path: "/admin/toolbox/telegram/templates", label: "Templates", icon: FileText },
  { path: "/admin/toolbox/telegram/subscribers", label: "Abonnés", icon: Users },
  { path: "/admin/toolbox/telegram/queue", label: "File d'attente", icon: Inbox },
  { path: "/admin/toolbox/telegram/logs", label: "Logs", icon: ScrollText },
  { path: "/admin/toolbox/telegram/config", label: "Configuration", icon: Settings },
];

const TelegramNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/admin/toolbox/telegram") {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="mb-6">
      {/* Back + Title */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate("/admin/toolbox")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Boîte à outils
        </button>
        <span className="text-gray-300">|</span>
        <h1 className="text-lg font-bold text-gray-900">Telegram Marketing</h1>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 overflow-x-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-all ${
                active
                  ? "bg-white text-sky-700 shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TelegramNav;
