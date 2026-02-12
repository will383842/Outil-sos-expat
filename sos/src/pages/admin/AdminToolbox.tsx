import React from "react";
import { useTranslation } from "../../hooks/useTranslation";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import { Bot, Database, ExternalLink, Link2, Mail, Send, Server, Settings, Users, Wrench } from "lucide-react";

const BACKLINK_ENGINE_URL = "https://backlinks.sos-expat.com";
const MAILWIZZ_FRONTEND_URL = "https://mail.sos-expat.com";
const MAILWIZZ_BACKEND_URL = "https://mail.sos-expat.com/backend";
const MULTI_DASHBOARD_URL = "https://multi.sos-expat.com";
const IA_TOOL_URL = "https://ia.sos-expat.com";
const SCRAPER_PRO_URL = "https://scraper.sos-expat.com";
const EMAIL_ENGINE_URL = "https://engine.sos-expat.com";

interface ToolCard {
  id: string;
  titleKey: string;
  descriptionKey: string;
  url: string;
  icon: React.ReactNode;
  color: string;
  status: "live" | "coming-soon";
  internalRoute?: string;
}

const tools: ToolCard[] = [
  {
    id: "telegram-marketing",
    titleKey: "admin.toolbox.telegramMarketing",
    descriptionKey: "admin.toolbox.telegramMarketing.description",
    url: "",
    icon: <Send className="h-8 w-8" />,
    color: "bg-sky-600",
    status: "live",
    internalRoute: "/admin/toolbox/telegram",
  },
  {
    id: "backlink-engine",
    titleKey: "admin.toolbox.backlinkEngine",
    descriptionKey: "admin.toolbox.backlinkEngine.description",
    url: BACKLINK_ENGINE_URL,
    icon: <Link2 className="h-8 w-8" />,
    color: "bg-blue-600",
    status: "live",
  },
  {
    id: "mailwizz-frontend",
    titleKey: "admin.toolbox.mailwizzFrontend",
    descriptionKey: "admin.toolbox.mailwizzFrontend.description",
    url: MAILWIZZ_FRONTEND_URL,
    icon: <Mail className="h-8 w-8" />,
    color: "bg-emerald-600",
    status: "live",
  },
  {
    id: "mailwizz-backend",
    titleKey: "admin.toolbox.mailwizzBackend",
    descriptionKey: "admin.toolbox.mailwizzBackend.description",
    url: MAILWIZZ_BACKEND_URL,
    icon: <Settings className="h-8 w-8" />,
    color: "bg-orange-600",
    status: "live",
  },
  {
    id: "multi-dashboard",
    titleKey: "admin.toolbox.multiDashboard",
    descriptionKey: "admin.toolbox.multiDashboard.description",
    url: MULTI_DASHBOARD_URL,
    icon: <Users className="h-8 w-8" />,
    color: "bg-purple-600",
    status: "live",
  },
  {
    id: "ia-tool",
    titleKey: "admin.toolbox.iaTool",
    descriptionKey: "admin.toolbox.iaTool.description",
    url: IA_TOOL_URL,
    icon: <Bot className="h-8 w-8" />,
    color: "bg-indigo-600",
    status: "live",
  },
  {
    id: "scraper-pro",
    titleKey: "admin.toolbox.scraperPro",
    descriptionKey: "admin.toolbox.scraperPro.description",
    url: SCRAPER_PRO_URL,
    icon: <Database className="h-8 w-8" />,
    color: "bg-rose-600",
    status: "live",
  },
  {
    id: "email-engine-cold",
    titleKey: "admin.toolbox.emailEngineCold",
    descriptionKey: "admin.toolbox.emailEngineCold.description",
    url: EMAIL_ENGINE_URL,
    icon: <Server className="h-8 w-8" />,
    color: "bg-cyan-700",
    status: "live",
  },
];

const AdminToolbox: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleClick = (tool: ToolCard, e: React.MouseEvent) => {
    if (tool.internalRoute) {
      e.preventDefault();
      navigate(tool.internalRoute);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Wrench className="h-7 w-7 text-gray-700" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t("admin.toolbox.title")}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {t("admin.toolbox.subtitle")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <a
              key={tool.id}
              href={tool.internalRoute || tool.url}
              target={tool.internalRoute ? undefined : "_blank"}
              rel={tool.internalRoute ? undefined : "noopener noreferrer"}
              onClick={(e) => handleClick(tool, e)}
              className="group block bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 overflow-hidden"
            >
              <div className={`${tool.color} p-4 flex items-center justify-between`}>
                <div className="text-white">{tool.icon}</div>
                {tool.status === "live" ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-white bg-white/20 rounded-full px-2 py-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-300 animate-pulse" />
                    Live
                  </span>
                ) : (
                  <span className="text-xs font-medium text-white/70 bg-white/10 rounded-full px-2 py-0.5">
                    Coming soon
                  </span>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {t(tool.titleKey)}
                  </h3>
                  <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {t(tool.descriptionKey)}
                </p>
                <div className="mt-3 text-xs text-gray-400 truncate">
                  {tool.internalRoute || tool.url}
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminToolbox;
