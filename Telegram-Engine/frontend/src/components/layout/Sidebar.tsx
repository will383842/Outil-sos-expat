import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Megaphone,
  FileText,
  Activity,
  ScrollText,
  Users,
  Tag,
  Settings,
  Filter,
  Zap,
  Send,
  BarChart3,
  HeartPulse,
} from "lucide-react";

const navSections = [
  {
    labelKey: "nav.overview",
    items: [
      { to: "/", icon: LayoutDashboard, labelKey: "nav.dashboard" },
    ],
  },
  {
    labelKey: "nav.marketing",
    items: [
      { to: "/campaigns", icon: Megaphone, labelKey: "nav.campaigns" },
      { to: "/templates", icon: FileText, labelKey: "nav.templates" },
    ],
  },
  {
    labelKey: "nav.monitoring",
    items: [
      { to: "/analytics", icon: BarChart3, labelKey: "nav.analytics" },
      { to: "/queue", icon: Activity, labelKey: "nav.queue" },
      { to: "/health", icon: HeartPulse, labelKey: "nav.health" },
      { to: "/logs", icon: ScrollText, labelKey: "nav.logs" },
      { to: "/subscribers", icon: Users, labelKey: "nav.subscribers" },
      { to: "/tags", icon: Tag, labelKey: "nav.tags" },
    ],
  },
  {
    labelKey: "nav.configuration",
    items: [
      { to: "/settings", icon: Settings, labelKey: "nav.settings" },
    ],
  },
  {
    labelKey: "nav.advanced",
    items: [
      { to: "/segments", icon: Filter, labelKey: "nav.segments" },
      { to: "/automations", icon: Zap, labelKey: "nav.automations" },
    ],
  },
];

export default function Sidebar() {
  const { t } = useTranslation();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-200">
        <div className="w-9 h-9 rounded-lg bg-telegram-500 flex items-center justify-center">
          <Send className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">{t("app.title")}</h1>
          <p className="text-xs text-gray-500">{t("app.subtitle")}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {navSections.map((section) => (
          <div key={section.labelKey} className="mb-6">
            <p className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {t(section.labelKey)}
            </p>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-telegram-50 text-telegram-600"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`
                }
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {t(item.labelKey)}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
