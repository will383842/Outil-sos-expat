import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "../../hooks/useTranslation";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
import { useAuth } from "../../contexts/useAuth";
import AdminLayout from "../../components/admin/AdminLayout";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Bot, Briefcase, Database, ExternalLink, Flame, GripVertical, Link2, Mail, MessageSquare, Send, Server, Settings, Target, Users, UserSearch, Wrench } from "lucide-react";

const BACKLINK_ENGINE_URL = "https://backlinks.life-expat.com";
const MAILWIZZ_FRONTEND_URL = "https://mail.sos-expat.com";
const MAILWIZZ_BACKEND_URL = "https://mail.sos-expat.com/backend";
const MULTI_DASHBOARD_URL = "https://multi.sos-expat.com";
const IA_TOOL_URL = "https://ia.sos-expat.com";
const SCRAPER_PRO_URL = "https://scraper.providers-expat.com";
const EMAIL_ENGINE_URL = "https://engine.sos-expat.com";
const MOTIVATION_ENGINE_URL = "https://motivation.life-expat.com/admin";
const JOB_ADS_TRACKER_URL = "https://sos-expat.com/tools/job-tracker.html";
const INFLUENCEURS_TRACKER_URL = "https://influenceurs.life-expat.com";
const WHATSAPP_CAMPAIGNS_URL = "https://whatsapp.life-expat.com";
const CONVERSION_ENGINE_URL = "https://conversion.life-expat.com/admin/login";

const STORAGE_KEY = "admin-toolbox-order";

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

const defaultTools: ToolCard[] = [
  {
    id: "telegram-marketing",
    titleKey: "Telegram Marketing",
    descriptionKey: "Campagnes, templates, abonnés et monitoring",
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
  {
    id: "motivation-engine",
    titleKey: "admin.toolbox.motivationEngine",
    descriptionKey: "admin.toolbox.motivationEngine.description",
    url: MOTIVATION_ENGINE_URL,
    icon: <Flame className="h-8 w-8" />,
    color: "bg-amber-600",
    status: "live",
  },
  {
    id: "job-ads-tracker",
    titleKey: "Gestion Annonces Emploi",
    descriptionKey: "Suivi des offres d'emploi, couverture pays, sites, statistiques et analytics",
    url: JOB_ADS_TRACKER_URL,
    icon: <Briefcase className="h-8 w-8" />,
    color: "bg-teal-600",
    status: "live",
  },
  {
    id: "influenceurs-tracker",
    titleKey: "Influenceurs Tracker",
    descriptionKey: "Suivi et gestion des influenceurs, contacts, rappels et statistiques",
    url: INFLUENCEURS_TRACKER_URL,
    icon: <UserSearch className="h-8 w-8" />,
    color: "bg-pink-600",
    status: "live",
  },
  {
    id: "whatsapp-campaigns",
    titleKey: "WhatsApp Campaigns",
    descriptionKey: "Campagnes WhatsApp multilingues, séries programmées et suivi d'envois",
    url: WHATSAPP_CAMPAIGNS_URL,
    icon: <MessageSquare className="h-8 w-8" />,
    color: "bg-green-700",
    status: "live",
  },
  {
    id: "conversion-engine",
    titleKey: "Motivation Prospects Conversion",
    descriptionKey: "Import prospects emploi, séquences email automatisées, conversion en chatters SOS-Expat",
    url: CONVERSION_ENGINE_URL,
    icon: <Target className="h-8 w-8" />,
    color: "bg-violet-600",
    status: "live",
  },
];

function getOrderedTools(): ToolCard[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const order: string[] = JSON.parse(saved);
      const toolMap = new Map(defaultTools.map((t) => [t.id, t]));
      const ordered: ToolCard[] = [];
      for (const id of order) {
        const tool = toolMap.get(id);
        if (tool) {
          ordered.push(tool);
          toolMap.delete(id);
        }
      }
      // Append any new tools not in saved order
      for (const tool of toolMap.values()) {
        ordered.push(tool);
      }
      return ordered;
    }
  } catch {
    // ignore
  }
  return defaultTools;
}

interface SortableToolCardProps {
  tool: ToolCard;
  onClick: (tool: ToolCard, e: React.MouseEvent) => void;
  t: (key: string) => string;
}

const SortableToolCard: React.FC<SortableToolCardProps> = ({ tool, onClick, t }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tool.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 z-10 p-1.5 rounded-md bg-white/30 hover:bg-white/50 text-white cursor-grab active:cursor-grabbing transition-colors"
        title="Glisser pour réorganiser"
        onClick={(e) => e.preventDefault()}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <a
        href={tool.internalRoute || tool.url}
        target={tool.internalRoute ? undefined : "_blank"}
        rel={tool.internalRoute ? undefined : "noopener noreferrer"}
        onClick={(e) => onClick(tool, e)}
        className={`group block bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 overflow-hidden ${
          isDragging ? "shadow-xl ring-2 ring-blue-400" : ""
        }`}
      >
        <div className={`${tool.color} p-4 flex items-center justify-between`}>
          <div className="text-white">{tool.icon}</div>
          {tool.status === "live" ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-white bg-white/20 rounded-full px-2 py-0.5 mr-8">
              <span className="h-1.5 w-1.5 rounded-full bg-green-300 animate-pulse" />
              Live
            </span>
          ) : (
            <span className="text-xs font-medium text-white/70 bg-white/10 rounded-full px-2 py-0.5 mr-8">
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
    </div>
  );
};

function applyOrder(order: string[]): ToolCard[] {
  const toolMap = new Map(defaultTools.map((t) => [t.id, t]));
  const ordered: ToolCard[] = [];
  for (const id of order) {
    const tool = toolMap.get(id);
    if (tool) {
      ordered.push(tool);
      toolMap.delete(id);
    }
  }
  for (const tool of toolMap.values()) {
    ordered.push(tool);
  }
  return ordered;
}

const FIRESTORE_DOC = "toolbox_order";

const AdminToolbox: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tools, setTools] = useState<ToolCard[]>(getOrderedTools);
  const isInitialLoad = useRef(true);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  // Load order from Firestore on mount
  useEffect(() => {
    const loadFromFirestore = async () => {
      try {
        const snap = await getDoc(doc(db, "admin_config", FIRESTORE_DOC));
        if (snap.exists()) {
          const data = snap.data();
          const order: string[] = data.order || [];
          if (order.length > 0) {
            const ordered = applyOrder(order);
            setTools(ordered);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
          }
        }
      } catch {
        // Firestore failed, keep localStorage order
      } finally {
        isInitialLoad.current = false;
      }
    };
    loadFromFirestore();
  }, []);

  const saveOrder = useCallback((order: string[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
    setDoc(doc(db, "admin_config", FIRESTORE_DOC), {
      order,
      updatedAt: new Date().toISOString(),
      updatedBy: user?.uid || "unknown",
    }).catch(() => {
      // Silent fail for Firestore save
    });
  }, [user?.uid]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setTools((prev) => {
        const oldIndex = prev.findIndex((t) => t.id === active.id);
        const newIndex = prev.findIndex((t) => t.id === over.id);
        const newTools = arrayMove(prev, oldIndex, newIndex);
        saveOrder(newTools.map((t) => t.id));
        return newTools;
      });
    }
  };

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

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={tools.map((t) => t.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tools.map((tool) => (
                <SortableToolCard
                  key={tool.id}
                  tool={tool}
                  onClick={handleClick}
                  t={t}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </AdminLayout>
  );
};

export default AdminToolbox;
