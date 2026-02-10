import React from "react";
import { useTranslation } from "../../hooks/useTranslation";
import { ExternalLink, Link2, Wrench } from "lucide-react";

const BACKLINK_ENGINE_URL = "https://backlinks.sos-expat.com";

interface ToolCard {
  id: string;
  titleKey: string;
  descriptionKey: string;
  url: string;
  icon: React.ReactNode;
  color: string;
  status: "live" | "coming-soon";
}

const tools: ToolCard[] = [
  {
    id: "backlink-engine",
    titleKey: "admin.toolbox.backlinkEngine",
    descriptionKey: "admin.toolbox.backlinkEngine.description",
    url: BACKLINK_ENGINE_URL,
    icon: <Link2 className="h-8 w-8" />,
    color: "bg-blue-600",
    status: "live",
  },
];

const AdminToolbox: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
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
            href={tool.url}
            target="_blank"
            rel="noopener noreferrer"
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
                {tool.url}
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default AdminToolbox;
