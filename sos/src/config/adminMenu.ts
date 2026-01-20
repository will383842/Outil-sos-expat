// src/config/adminMenu.ts - VERSION MISE À JOUR AVEC NOUVELLE ORGANISATION
import {
  BarChart3,
  DollarSign,
  Users,
  Phone,
  Settings,
  TrendingUp,
  TrendingDown,
  Shield,
  ShieldAlert,
  Globe,
  FileText,
  Star,
  CreditCard,
  AlertCircle,
  UserCheck,
  MessageSquare,
  Bell,
  Megaphone,
  TestTube,
  PhoneCall,
  PhoneIncoming,
  PlayCircle,
  Percent,
  UsersIcon,
  Archive,
  Cog,
  HelpingHand,
  HelpCircle,
  Bot,
  Activity,
  Cpu,
  // Finance icons
  LayoutDashboard,
  Repeat,
  RotateCcw,
  AlertTriangle,
  Calculator,
  Receipt,
  Banknote,
  FileSpreadsheet,
  ArrowLeftRight,
  BookOpen,
  Scale,
  ArrowDownUp,
  // New icons for added pages
  ClipboardCheck,
  LogIn,
  PieChart,
  Cloud,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AdminMenuItem = {
  id: string;
  labelKey: string;
  path?: string;
  children?: AdminMenuItem[];
  icon?: LucideIcon;
  badge?: string;
  descriptionKey?: string;
};

export const adminMenuTree: AdminMenuItem[] = [
  // ===== TABLEAU DE BORD (Priorite 1 - Usage quotidien) =====
  {
    id: "dashboard",
    labelKey: "admin.menu.dashboard",
    path: "/admin/dashboard",
    icon: BarChart3,
    descriptionKey: "admin.menu.dashboard.description",
  },

  // ===== UTILISATEURS & PRESTATAIRES (Priorite 2 - Usage quotidien) =====
  {
    id: "users",
    labelKey: "admin.menu.users",
    icon: Users,
    descriptionKey: "admin.menu.users.description",
    children: [
      // Sous-section : TOUS LES UTILISATEURS
      {
        id: "all-users",
        labelKey: "admin.menu.allUsers",
        icon: UsersIcon,
        descriptionKey: "admin.menu.allUsers.description",
        children: [
          {
            id: "gestion-globale",
            labelKey: "admin.menu.globalManagement",
            path: "/admin/users/all",
            icon: UsersIcon,
            descriptionKey: "admin.menu.globalManagement.description",
          },
          {
            id: "clients",
            labelKey: "admin.menu.clients",
            path: "/admin/users/clients",
            icon: Users,
            descriptionKey: "admin.menu.clients.description",
          },
          {
            id: "prestataires-section",
            labelKey: "admin.menu.providers",
            icon: UserCheck,
            descriptionKey: "admin.menu.providers.description",
            children: [
              {
                id: "avocats",
                labelKey: "admin.menu.lawyers",
                path: "/admin/users/providers/lawyers",
                icon: Shield,
                descriptionKey: "admin.menu.lawyers.description",
              },
              {
                id: "expats",
                labelKey: "admin.menu.expats",
                path: "/admin/users/providers/expats",
                icon: Globe,
                descriptionKey: "admin.menu.expats.description",
              },
            ],
          },
        ],
      },
      // Sous-section : AAA PROFILES
      {
        id: "aaa-profiles",
        labelKey: "admin.menu.aaaProfiles",
        path: "/admin/aaaprofiles",
        icon: TestTube,
        descriptionKey: "admin.menu.aaaProfiles.description",
      },
      // Sous-section : VALIDATION AVOCATS
      {
        id: "validation-prestataires",
        labelKey: "admin.menu.providerValidation",
        path: "/admin/approvals/lawyers",
        icon: UserCheck,
        badge: "3",
        descriptionKey: "admin.menu.providerValidation.description",
      },
      // Sous-section : KYC PRESTATAIRES
      {
        id: "kyc-prestataires",
        labelKey: "admin.menu.kycProviders",
        path: "/admin/kyc/providers",
        icon: Shield,
        badge: "2",
        descriptionKey: "admin.menu.kycProviders.description",
      },
      // Sous-section : AVIS ET NOTATION
      {
        id: "avis-notation",
        labelKey: "admin.menu.reviews",
        path: "/admin/reviews",
        icon: Star,
        descriptionKey: "admin.menu.reviews.description",
      },
      // Sous-section : VALIDATION DES PROFILS
      {
        id: "profile-validation",
        labelKey: "admin.menu.profileValidation",
        path: "/admin/validation",
        icon: ClipboardCheck,
        badge: "pending",
        descriptionKey: "admin.menu.profileValidation.description",
      },
    ],
  },

  // ===== APPELS (Priorite 3 - Monitoring critique) =====
  {
    id: "calls",
    labelKey: "admin.menu.calls",
    icon: Phone,
    descriptionKey: "admin.menu.calls.description",
    children: [
      {
        id: "calls-monitor",
        labelKey: "admin.menu.realtimeMonitoring",
        path: "/admin/calls",
        icon: PhoneCall,
        badge: "LIVE",
        descriptionKey: "admin.menu.realtimeMonitoring.description",
      },
      {
        id: "calls-sessions",
        labelKey: "admin.menu.sessionsHistory",
        path: "/admin/calls/sessions",
        icon: PlayCircle,
        descriptionKey: "admin.menu.sessionsHistory.description",
      },
      {
        id: "calls-received",
        labelKey: "admin.menu.receivedCalls",
        path: "/admin/calls/received",
        icon: PhoneIncoming,
        badge: "NEW",
        descriptionKey: "admin.menu.receivedCalls.description",
      },
    ],
  },

  // ===== FINANCES (Priorite 4 - Business critique) =====
  {
    id: "finance",
    labelKey: "admin.menu.finance",
    icon: DollarSign,
    descriptionKey: "admin.menu.finance.description",
    children: [
      // Dashboard Financier
      {
        id: "finance-dashboard",
        labelKey: "admin.menu.financeDashboard",
        path: "/admin/finance/dashboard",
        icon: LayoutDashboard,
        descriptionKey: "admin.menu.financeDashboard.description",
      },
      // Sous-section : Transactions & Paiements
      {
        id: "finance-transactions",
        labelKey: "admin.menu.transactions",
        icon: CreditCard,
        descriptionKey: "admin.menu.transactions.description",
        children: [
          {
            id: "all-transactions",
            labelKey: "admin.menu.allTransactions",
            path: "/admin/finance/transactions",
            icon: CreditCard,
            descriptionKey: "admin.menu.allTransactions.description",
          },
          {
            id: "payments",
            labelKey: "admin.menu.callPayments",
            path: "/admin/finance/payments",
            icon: CreditCard,
            descriptionKey: "admin.menu.callPayments.description",
          },
          {
            id: "subscriptions",
            labelKey: "admin.menu.subscriptions",
            path: "/admin/finance/subscriptions",
            icon: Repeat,
            descriptionKey: "admin.menu.subscriptions.description",
          },
        ],
      },
      // Sous-section : Remboursements & Litiges
      {
        id: "finance-disputes-refunds",
        labelKey: "admin.menu.refundsDisputes",
        icon: AlertTriangle,
        descriptionKey: "admin.menu.refundsDisputes.description",
        children: [
          {
            id: "refunds",
            labelKey: "admin.menu.refunds",
            path: "/admin/finance/refunds",
            icon: RotateCcw,
            descriptionKey: "admin.menu.refunds.description",
          },
          {
            id: "disputes",
            labelKey: "admin.menu.disputes",
            path: "/admin/finance/disputes",
            icon: AlertCircle,
            badge: "2",
            descriptionKey: "admin.menu.disputes.description",
          },
        ],
      },
      // Sous-section : Comptabilite & Fiscalite
      {
        id: "finance-accounting",
        labelKey: "admin.menu.accountingTax",
        icon: Calculator,
        descriptionKey: "admin.menu.accountingTax.description",
        children: [
          {
            id: "invoices",
            labelKey: "admin.menu.invoices",
            path: "/admin/finance/invoices",
            icon: Receipt,
            descriptionKey: "admin.menu.invoices.description",
          },
          {
            id: "payouts",
            labelKey: "admin.menu.payouts",
            path: "/admin/finance/payouts",
            icon: Banknote,
            descriptionKey: "admin.menu.payouts.description",
          },
          {
            id: "escrow",
            labelKey: "admin.menu.escrow",
            path: "/admin/finance/escrow",
            icon: Shield,
            badge: "NEW",
            descriptionKey: "admin.menu.escrow.description",
          },
          {
            id: "taxes",
            labelKey: "admin.menu.taxes",
            path: "/admin/finance/taxes",
            icon: Calculator,
            descriptionKey: "admin.menu.taxes.description",
          },
          {
            id: "tax-filings",
            labelKey: "admin.menu.taxFilings",
            path: "/admin/finance/filings",
            icon: FileText,
            badge: "NEW",
            descriptionKey: "admin.menu.taxFilings.description",
          },
          {
            id: "thresholds",
            labelKey: "admin.menu.thresholds",
            path: "/admin/finance/thresholds",
            icon: Globe,
            badge: "NEW",
            descriptionKey: "admin.menu.thresholds.description",
          },
          {
            id: "reconciliation",
            labelKey: "admin.menu.reconciliation",
            path: "/admin/finance/reconciliation",
            icon: ArrowLeftRight,
            descriptionKey: "admin.menu.reconciliation.description",
          },
          {
            id: "ledger",
            labelKey: "admin.menu.ledger",
            path: "/admin/finance/ledger",
            icon: BookOpen,
            descriptionKey: "admin.menu.ledger.description",
          },
          {
            id: "balance-sheet",
            labelKey: "admin.menu.balanceSheet",
            path: "/admin/finance/balance-sheet",
            icon: Scale,
            badge: "NEW",
            descriptionKey: "admin.menu.balanceSheet.description",
          },
          {
            id: "profit-loss",
            labelKey: "admin.menu.profitLoss",
            path: "/admin/finance/profit-loss",
            icon: TrendingUp,
            badge: "NEW",
            descriptionKey: "admin.menu.profitLoss.description",
          },
          {
            id: "cash-flow",
            labelKey: "admin.menu.cashFlow",
            path: "/admin/finance/cash-flow",
            icon: ArrowDownUp,
            badge: "NEW",
            descriptionKey: "admin.menu.cashFlow.description",
          },
        ],
      },
      // Rapports & Exports
      {
        id: "finance-reports",
        labelKey: "admin.menu.financeReports",
        path: "/admin/finance/exports",
        icon: FileSpreadsheet,
        descriptionKey: "admin.menu.financeReports.description",
      },
      // Suivi des Couts Cloud
      {
        id: "cost-monitoring",
        labelKey: "admin.menu.costMonitoring",
        path: "/admin/finance/costs",
        icon: TrendingDown,
        descriptionKey: "admin.menu.costMonitoring.description",
      },
      // Google Cloud Platform Costs
      {
        id: "gcp-costs",
        labelKey: "admin.menu.gcpCosts",
        path: "/admin/finance/gcp-costs",
        icon: Cloud,
        badge: "NEW",
        descriptionKey: "admin.menu.gcpCosts.description",
      },
    ],
  },

  // ===== MARKETING & COMMUNICATIONS (Priorite 5) =====
  {
    id: "marketing",
    labelKey: "admin.menu.marketing",
    icon: Megaphone,
    descriptionKey: "admin.menu.marketing.description",
    children: [
      {
        id: "promo-codes",
        labelKey: "admin.menu.promoCodes",
        path: "/admin/coupons",
        icon: Percent,
        descriptionKey: "admin.menu.promoCodes.description",
      },
      {
        id: "trustpilot",
        labelKey: "admin.menu.trustpilot",
        path: "/admin/marketing/trustpilot",
        icon: Star,
        badge: "NEW",
        descriptionKey: "admin.menu.trustpilot.description",
      },
      {
        id: "ads-analytics",
        labelKey: "admin.menu.adsAnalytics",
        path: "/admin/marketing/ads-analytics",
        icon: TrendingUp,
        badge: "NEW",
        descriptionKey: "admin.menu.adsAnalytics.description",
      },
      {
        id: "meta-analytics",
        labelKey: "admin.menu.metaAnalytics",
        path: "/admin/marketing/meta-analytics",
        icon: Activity,
        badge: "NEW",
        descriptionKey: "admin.menu.metaAnalytics.description",
      },
      {
        id: "google-ads-analytics",
        labelKey: "admin.menu.googleAdsAnalytics",
        path: "/admin/marketing/google-ads-analytics",
        icon: BarChart3,
        badge: "NEW",
        descriptionKey: "admin.menu.googleAdsAnalytics.description",
      },
      {
        id: "notifications",
        labelKey: "admin.menu.notifications",
        path: "/admin/comms/notifications",
        icon: Bell,
        descriptionKey: "admin.menu.notifications.description",
      },
      {
        id: "Contacts",
        labelKey: "admin.menu.contactRequests",
        path: "/admin/contact-messages",
        icon: MessageSquare,
        descriptionKey: "admin.menu.contactRequests.description",
      },
      {
        id: "user-feedback",
        labelKey: "admin.menu.userFeedback",
        path: "/admin/feedback",
        icon: MessageSquare,
        badge: "NEW",
        descriptionKey: "admin.menu.userFeedback.description",
      },
    ],
  },

  // ===== 🏢 BUSINESS & PARTENARIATS (Priorité 6) =====
  // NOTE: Section entièrement placeholder - à activer quand implémentée
  // {
  //   id: "business",
  //   label: "Business & Partenariats",
  //   icon: Building,
  //   description: "Comptes entreprise et programmes partenaires",
  //   children: [
  //     // B2B Enterprise - pages placeholder
  //     {
  //       id: "b2b",
  //       label: "Comptes Entreprise (B2B)",
  //       icon: Briefcase,
  //       description: "Gestion des clients entreprise",
  //       children: [
  //         {
  //           id: "b2b-accounts",
  //           label: "Comptes",
  //           path: "/admin/b2b/accounts",
  //           icon: Building,
  //         },
  //         {
  //           id: "b2b-billing",
  //           label: "Facturation B2B",
  //           path: "/admin/b2b/billing",
  //           icon: CreditCardIcon,
  //         },
  //         {
  //           id: "b2b-invoices",
  //           label: "Factures",
  //           path: "/admin/b2b/invoices",
  //           icon: Receipt,
  //         },
  //       ],
  //     },
  //     // Programme d'affiliation - pages placeholder
  //     {
  //       id: "affiliation",
  //       label: "Programme Affiliation",
  //       icon: Handshake,
  //       description: "Affiliés et ambassadeurs",
  //       children: [
  //         {
  //           id: "affiliates-list",
  //           label: "Affiliés",
  //           path: "/admin/affiliates",
  //           icon: UserPlus,
  //         },
  //         {
  //           id: "ambassadors",
  //           label: "Ambassadeurs",
  //           path: "/admin/ambassadors",
  //           icon: Award,
  //         },
  //       ],
  //     },
  //   ],
  // },

  // ===== ANALYTICS & RAPPORTS (Priorite 7) =====
  {
    id: "analytics",
    labelKey: "admin.menu.analytics",
    icon: TrendingUp,
    descriptionKey: "admin.menu.analytics.description",
    children: [
      // Analytics centralises - Prominent entry
      {
        id: "unified-analytics",
        labelKey: "admin.menu.unifiedAnalytics",
        path: "/admin/analytics/unified",
        icon: PieChart,
        badge: "NEW",
        descriptionKey: "admin.menu.unifiedAnalytics.description",
      },
      // Sous-section : STATISTIQUES
      {
        id: "statistics",
        labelKey: "admin.menu.statistics",
        icon: BarChart3,
        descriptionKey: "admin.menu.statistics.description",
        children: [
          {
            id: "country-stats",
            labelKey: "admin.menu.countryStats",
            path: "/admin/reports/country-stats",
            icon: Globe,
            descriptionKey: "admin.menu.countryStats.description",
          },
        ],
      },
      // Sous-section : ERREURS, HACKS, ALERTES
      {
        id: "errors-security",
        labelKey: "admin.menu.errorsSecurity",
        icon: Shield,
        descriptionKey: "admin.menu.errorsSecurity.description",
        children: [
          {
            id: "error-logs",
            labelKey: "admin.menu.errorLogs",
            path: "/admin/reports/error-logs",
            icon: AlertCircle,
            descriptionKey: "admin.menu.errorLogs.description",
          },
          {
            id: "security-alerts",
            labelKey: "admin.menu.securityAlerts",
            path: "/admin/security/alerts",
            icon: ShieldAlert,
            badge: "LIVE",
            descriptionKey: "admin.menu.securityAlerts.description",
          },
        ],
      },
    ],
  },

  // ===== ADMINISTRATION SYSTEME (Priorite 8 - Usage occasionnel) =====
  {
    id: "admin-system",
    labelKey: "admin.menu.adminSystem",
    icon: Settings,
    descriptionKey: "admin.menu.adminSystem.description",
    children: [
      {
        id: "pricing-management",
        labelKey: "admin.menu.pricingManagement",
        path: "/admin/pricing",
        icon: DollarSign,
        descriptionKey: "admin.menu.pricingManagement.description",
      },
      {
        id: "countries-management",
        labelKey: "admin.menu.countriesManagement",
        path: "/admin/countries",
        icon: Globe,
        descriptionKey: "admin.menu.countriesManagement.description",
      },
      {
        id: "legal-documents",
        labelKey: "admin.menu.legalDocuments",
        path: "/admin/documents",
        icon: FileText,
        descriptionKey: "admin.menu.legalDocuments.description",
      },
      {
        id: "help-center",
        labelKey: "admin.menu.helpCenter",
        path: "/admin/help/center",
        icon: HelpingHand,
        descriptionKey: "admin.menu.helpCenter.description",
      },
      {
        id: "faqs-management",
        labelKey: "admin.menu.faqs",
        path: "/admin/cms/faqs",
        icon: HelpCircle,
        descriptionKey: "admin.menu.faqs.description",
      },
      {
        id: "ia-management",
        labelKey: "admin.menu.iaManagement",
        path: "/admin/ia",
        icon: Bot,
        descriptionKey: "admin.menu.iaManagement.description",
      },
      {
        id: "system-maintenance",
        labelKey: "admin.menu.systemMaintenance",
        icon: Cog,
        descriptionKey: "admin.menu.systemMaintenance.description",
        children: [
          {
            id: "system-settings",
            labelKey: "admin.menu.systemSettings",
            path: "/admin/settings",
            icon: Cog,
            descriptionKey: "admin.menu.systemSettings.description",
          },
          {
            id: "system-backups",
            labelKey: "admin.menu.backups",
            path: "/admin/backups",
            icon: Archive,
            descriptionKey: "admin.menu.backups.description",
          },
          {
            id: "system-health",
            labelKey: "admin.menu.systemHealth",
            path: "/admin/system-health",
            icon: Activity,
            descriptionKey: "admin.menu.systemHealth.description",
          },
          {
            id: "agent-monitoring",
            labelKey: "admin.menu.agentMonitoring",
            path: "/admin/monitoring/agents",
            icon: Cpu,
            descriptionKey: "admin.menu.agentMonitoring.description",
          },
          {
            id: "functional-monitoring",
            labelKey: "admin.menu.functionalMonitoring",
            path: "/admin/monitoring/functional",
            icon: Activity,
            badge: "NEW",
            descriptionKey: "admin.menu.functionalMonitoring.description",
          },
          {
            id: "connection-logs",
            labelKey: "admin.menu.connectionLogs",
            path: "/admin/connection-logs",
            icon: LogIn,
            descriptionKey: "admin.menu.connectionLogs.description",
          },
        ],
      },
    ],
  },
  // // ===== 🌐 DASHBOARD LINGUISTIQUE (Priorité 9) =====
  // {
  //   id: 'language-dashboard',
  //   label: 'tableau de bord linguistique',
  //   path: '/admin/language/dashboard',
  //   icon: Globe2,
  //   description: 'Vue d\'ensemble et KPIs en temps réel'
  // },
];

// ===== FONCTIONS UTILITAIRES AMÉLIORÉES =====

/**
 * Trouve un élément de menu par son ID (recherche récursive)
 */
export function findMenuItemById(
  id: string,
  items: AdminMenuItem[] = adminMenuTree
): AdminMenuItem | null {
  for (const item of items) {
    if (item.id === id) {
      return item;
    }
    if (item.children) {
      const found = findMenuItemById(id, item.children);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Récupère tous les paths du menu (utile pour la validation des routes)
 */
export function getAllMenuPaths(
  items: AdminMenuItem[] = adminMenuTree
): string[] {
  const paths: string[] = [];

  function traverse(menuItems: AdminMenuItem[]) {
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
export function buildBreadcrumb(
  path: string,
  items: AdminMenuItem[] = adminMenuTree
): AdminMenuItem[] {
  const breadcrumb: AdminMenuItem[] = [];

  function findPath(
    menuItems: AdminMenuItem[],
    currentPath: AdminMenuItem[]
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
 * Récupère les badges dynamiques (à connecter avec votre state management)
 */
export function getMenuBadges(): Record<string, string> {
  // Cette fonction devrait être connectée à votre store Redux/Zustand
  // ou récupérer les données depuis une API
  return {
    "validation-avocats": "3", // 3 validations d'avocats en attente
    "kyc-prestataires": "2", // 2 KYC de prestataires en attente
    "calls-monitor": "LIVE", // Appels en cours
    disputes: "2", // 2 litiges à traiter
    campaigns: "NEW", // Nouvelle fonctionnalité
  };
}

/**
 * Vérifie les permissions d'accès (extensible pour différents rôles)
 */
export function hasMenuAccess(
  menuItem: AdminMenuItem,
  userRole: string = "admin"
): boolean {
  // Permissions granulaires par rôle
  const rolePermissions: Record<string, string[]> = {
    "super-admin": ["*"], // Accès total
    "finance-admin": ["dashboard", "finance", "analytics", "business"],
    "support-admin": ["dashboard", "users", "calls", "marketing"],
    "read-only": ["dashboard", "analytics"],
  };

  const permissions = rolePermissions[userRole] || [];

  // Si accès total
  if (permissions.includes("*")) return true;

  // Vérifier si l'ID du menu est autorisé
  return permissions.includes(menuItem.id);
}

/**
 * Applique les badges dynamiques au menu
 */
export function applyBadgesToMenu(
  items: AdminMenuItem[] = adminMenuTree
): AdminMenuItem[] {
  const badges = getMenuBadges();

  return items.map((item) => ({
    ...item,
    badge: badges[item.id] || item.badge,
    children: item.children ? applyBadgesToMenu(item.children) : undefined,
  }));
}

/**
 * Filtre le menu selon les permissions utilisateur
 */
export function filterMenuByPermissions(
  items: AdminMenuItem[] = adminMenuTree,
  userRole: string = "admin"
): AdminMenuItem[] {
  return items
    .filter((item) => hasMenuAccess(item, userRole))
    .map((item) => ({
      ...item,
      children: item.children
        ? filterMenuByPermissions(item.children, userRole)
        : undefined,
    }));
}

/**
 * Obtient le menu final avec badges et permissions
 */
export function getFinalMenu(userRole: string = "admin"): AdminMenuItem[] {
  const menuWithBadges = applyBadgesToMenu(adminMenuTree);
  return filterMenuByPermissions(menuWithBadges, userRole);
}

// Export par défaut
export default adminMenuTree;
