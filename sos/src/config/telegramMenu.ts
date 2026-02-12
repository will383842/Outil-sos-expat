// src/config/telegramMenu.ts - Menu Navigation Telegram Marketing Tool
import {
  LayoutDashboard,
  Zap,
  List,
  PlusCircle,
  Users,
  Megaphone,
  Send,
  FileText,
  Image,
  UserCheck,
  Tags,
  FolderOpen,
  Activity,
  Inbox,
  FileSpreadsheet,
  BarChart3,
  Settings,
  Bot,
  Sliders,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type TelegramMenuItem = {
  id: string;
  labelKey: string;
  path?: string;
  children?: TelegramMenuItem[];
  icon?: LucideIcon;
  badge?: string;
  descriptionKey?: string;
};

export const telegramMenuTree: TelegramMenuItem[] = [
  // ===== 📊 DASHBOARD (Vue d'ensemble) =====
  {
    id: "dashboard",
    labelKey: "telegram.menu.dashboard",
    path: "/admin/toolbox/telegram/dashboard",
    icon: LayoutDashboard,
    descriptionKey: "telegram.menu.dashboard.description",
  },

  // ===== ⚡ AUTOMATIONS (Workflows automatisés) =====
  {
    id: "automations",
    labelKey: "telegram.menu.automations",
    icon: Zap,
    descriptionKey: "telegram.menu.automations.description",
    children: [
      {
        id: "automations-list",
        labelKey: "telegram.menu.automationsList",
        path: "/admin/toolbox/telegram/automations",
        icon: List,
        descriptionKey: "telegram.menu.automationsList.description",
      },
      {
        id: "automations-create",
        labelKey: "telegram.menu.automationsCreate",
        path: "/admin/toolbox/telegram/automations/create",
        icon: PlusCircle,
        descriptionKey: "telegram.menu.automationsCreate.description",
      },
      {
        id: "automations-enrollments",
        labelKey: "telegram.menu.automationsEnrollments",
        path: "/admin/toolbox/telegram/automations/enrollments",
        icon: Users,
        descriptionKey: "telegram.menu.automationsEnrollments.description",
      },
    ],
  },

  // ===== 📣 CAMPAGNES (Broadcasts ponctuels) =====
  {
    id: "campaigns",
    labelKey: "telegram.menu.campaigns",
    icon: Megaphone,
    descriptionKey: "telegram.menu.campaigns.description",
    children: [
      {
        id: "campaigns-list",
        labelKey: "telegram.menu.campaignsList",
        path: "/admin/toolbox/telegram/campaigns",
        icon: List,
        descriptionKey: "telegram.menu.campaignsList.description",
      },
      {
        id: "campaigns-create",
        labelKey: "telegram.menu.campaignsCreate",
        path: "/admin/toolbox/telegram/campaigns/create",
        icon: Send,
        descriptionKey: "telegram.menu.campaignsCreate.description",
      },
    ],
  },

  // ===== 📄 CONTENU (Templates & Médias) =====
  {
    id: "content",
    labelKey: "telegram.menu.content",
    icon: FileText,
    descriptionKey: "telegram.menu.content.description",
    children: [
      {
        id: "content-templates",
        labelKey: "telegram.menu.contentTemplates",
        path: "/admin/toolbox/telegram/templates",
        icon: FileText,
        descriptionKey: "telegram.menu.contentTemplates.description",
      },
      {
        id: "content-media",
        labelKey: "telegram.menu.contentMedia",
        path: "/admin/toolbox/telegram/media",
        icon: Image,
        descriptionKey: "telegram.menu.contentMedia.description",
      },
    ],
  },

  // ===== 👥 ABONNÉS (Gestion audience) =====
  {
    id: "subscribers",
    labelKey: "telegram.menu.subscribers",
    icon: UserCheck,
    descriptionKey: "telegram.menu.subscribers.description",
    children: [
      {
        id: "subscribers-list",
        labelKey: "telegram.menu.subscribersList",
        path: "/admin/toolbox/telegram/subscribers",
        icon: Users,
        descriptionKey: "telegram.menu.subscribersList.description",
      },
      {
        id: "subscribers-segments",
        labelKey: "telegram.menu.subscribersSegments",
        path: "/admin/toolbox/telegram/segments",
        icon: FolderOpen,
        descriptionKey: "telegram.menu.subscribersSegments.description",
      },
      {
        id: "subscribers-tags",
        labelKey: "telegram.menu.subscribersTags",
        path: "/admin/toolbox/telegram/tags",
        icon: Tags,
        descriptionKey: "telegram.menu.subscribersTags.description",
      },
    ],
  },

  // ===== 📊 MONITORING (Queue, Logs, Analytics) =====
  {
    id: "monitoring",
    labelKey: "telegram.menu.monitoring",
    icon: Activity,
    descriptionKey: "telegram.menu.monitoring.description",
    children: [
      {
        id: "monitoring-queue",
        labelKey: "telegram.menu.monitoringQueue",
        path: "/admin/toolbox/telegram/queue",
        icon: Inbox,
        badge: "LIVE",
        descriptionKey: "telegram.menu.monitoringQueue.description",
      },
      {
        id: "monitoring-logs",
        labelKey: "telegram.menu.monitoringLogs",
        path: "/admin/toolbox/telegram/logs",
        icon: FileSpreadsheet,
        descriptionKey: "telegram.menu.monitoringLogs.description",
      },
      {
        id: "monitoring-analytics",
        labelKey: "telegram.menu.monitoringAnalytics",
        path: "/admin/toolbox/telegram/analytics",
        icon: BarChart3,
        descriptionKey: "telegram.menu.monitoringAnalytics.description",
      },
    ],
  },

  // ===== ⚙️ CONFIGURATION (Bot & Général) =====
  {
    id: "config",
    labelKey: "telegram.menu.config",
    icon: Settings,
    descriptionKey: "telegram.menu.config.description",
    children: [
      {
        id: "config-bot",
        labelKey: "telegram.menu.configBot",
        path: "/admin/toolbox/telegram/config/bot",
        icon: Bot,
        descriptionKey: "telegram.menu.configBot.description",
      },
      {
        id: "config-general",
        labelKey: "telegram.menu.configGeneral",
        path: "/admin/toolbox/telegram/config/general",
        icon: Sliders,
        descriptionKey: "telegram.menu.configGeneral.description",
      },
    ],
  },
];

// ===== FONCTIONS UTILITAIRES =====

/**
 * Trouve un élément de menu par son ID (recherche récursive)
 */
export function findTelegramMenuItemById(
  id: string,
  items: TelegramMenuItem[] = telegramMenuTree
): TelegramMenuItem | null {
  for (const item of items) {
    if (item.id === id) {
      return item;
    }
    if (item.children) {
      const found = findTelegramMenuItemById(id, item.children);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Récupère tous les paths du menu (utile pour la validation des routes)
 */
export function getAllTelegramMenuPaths(
  items: TelegramMenuItem[] = telegramMenuTree
): string[] {
  const paths: string[] = [];

  function traverse(menuItems: TelegramMenuItem[]) {
    for (const item of menuItems) {
      if (item.path) {
        paths.push(item.path);
      }
      if (item.children) {
        traverse(item.children);
      }
    }
  }

  traverse(items);
  return paths;
}

/**
 * Construit le breadcrumb pour un path donné
 */
export function buildTelegramBreadcrumb(
  path: string,
  items: TelegramMenuItem[] = telegramMenuTree
): TelegramMenuItem[] {
  const breadcrumb: TelegramMenuItem[] = [];

  function findPath(
    menuItems: TelegramMenuItem[],
    currentPath: TelegramMenuItem[]
  ): boolean {
    for (const item of menuItems) {
      const newPath = [...currentPath, item];

      if (item.path === path) {
        breadcrumb.push(...newPath);
        return true;
      }

      if (item.children && findPath(item.children, newPath)) {
        return true;
      }
    }
    return false;
  }

  findPath(items, []);
  return breadcrumb;
}

/**
 * Récupère les badges dynamiques (à connecter avec le state)
 */
export function getTelegramMenuBadges(): Record<string, string> {
  return {
    "monitoring-queue": "LIVE", // Messages en queue
  };
}

/**
 * Applique les badges dynamiques au menu
 */
export function applyBadgesToTelegramMenu(
  items: TelegramMenuItem[] = telegramMenuTree
): TelegramMenuItem[] {
  const badges = getTelegramMenuBadges();

  return items.map((item) => ({
    ...item,
    badge: badges[item.id] || item.badge,
    children: item.children
      ? applyBadgesToTelegramMenu(item.children)
      : undefined,
  }));
}

/**
 * Obtient le menu final avec badges
 */
export function getFinalTelegramMenu(): TelegramMenuItem[] {
  return applyBadgesToTelegramMenu(telegramMenuTree);
}

// Export par défaut
export default telegramMenuTree;
