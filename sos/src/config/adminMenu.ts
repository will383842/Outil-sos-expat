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
  Paperclip,
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
  Mail,
  ClipboardCheck,
  ClipboardList,
  LogIn,
  PieChart,
  Cloud,
  // Toolbox icons
  Wrench,
  Inbox,
  Send,
  // Affiliate icons
  Handshake,
  UserPlus,
  Award,
  Wallet,
  // Chatter icons
  MessageCircle,
  Crown,
  GitBranch,
  // Training icons
  GraduationCap,
  // Blogger icons
  FolderOpen,
  Code,
  // Team icons
  UsersRound,
  // Press icons
  Newspaper,
  Image,
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
  allowedRoles?: string[];
};

export const adminMenuTree: AdminMenuItem[] = [
  // ===== 1. TABLEAU DE BORD =====
  {
    id: "dashboard",
    labelKey: "admin.menu.dashboard",
    path: "/admin/dashboard",
    icon: BarChart3,
    descriptionKey: "admin.menu.dashboard.description",
  },

  // ===== INBOX CENTRALISÉ (tous les messages entrants) =====
  {
    id: "inbox",
    labelKey: "admin.menu.inbox",
    path: "/admin/inbox",
    icon: Inbox,
    descriptionKey: "admin.menu.inbox.description",
  },

  // ===== 2. UTILISATEURS (clients + providers + validations + reviews) =====
  {
    id: "users",
    labelKey: "admin.menu.users",
    icon: Users,
    descriptionKey: "admin.menu.users.description",
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
          {
            id: "provider-stats",
            labelKey: "admin.menu.providerStats",
            path: "/admin/users/providers/stats",
            icon: TrendingUp,
            descriptionKey: "admin.menu.providerStats.description",
          },
        ],
      },
      {
        id: "aaa-profiles",
        labelKey: "admin.menu.aaaProfiles",
        path: "/admin/aaaprofiles",
        icon: TestTube,
        descriptionKey: "admin.menu.aaaProfiles.description",
      },
      {
        id: "validation-prestataires",
        labelKey: "admin.menu.providerValidation",
        path: "/admin/approvals/lawyers",
        icon: UserCheck,
        descriptionKey: "admin.menu.providerValidation.description",
      },
      {
        id: "kyc-prestataires",
        labelKey: "admin.menu.kycProviders",
        path: "/admin/kyc/providers",
        icon: Shield,
        descriptionKey: "admin.menu.kycProviders.description",
      },
      {
        id: "avis-notation",
        labelKey: "admin.menu.reviews",
        path: "/admin/reviews",
        icon: Star,
        descriptionKey: "admin.menu.reviews.description",
      },
    ],
  },

  // ===== 3. APPELS & SERVICES =====
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
      {
        id: "calls-errors",
        labelKey: "admin.menu.callErrors",
        path: "/admin/calls/errors",
        icon: AlertCircle,
        descriptionKey: "admin.menu.callErrors.description",
      },
    ],
  },

  // ===== 4. FINANCE & PAIEMENTS (finance + payments fusionnés) =====
  {
    id: "finance",
    labelKey: "admin.menu.finance",
    icon: DollarSign,
    descriptionKey: "admin.menu.finance.description",
    allowedRoles: ["admin", "accountant"],
    children: [
      {
        id: "finance-dashboard",
        labelKey: "admin.menu.financeDashboard",
        path: "/admin/finance/dashboard",
        icon: LayoutDashboard,
        descriptionKey: "admin.menu.financeDashboard.description",
      },
      // Transactions & Paiements
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
          {
            id: "subscription-plans",
            labelKey: "admin.menu.subscriptionPlans",
            path: "/admin/finance/plans",
            icon: CreditCard,
            badge: "NEW",
            descriptionKey: "admin.menu.subscriptionPlans.description",
          },
        ],
      },
      // Retraits & Paiements centralisés (ex-section payments)
      {
        id: "finance-withdrawals",
        labelKey: "admin.menu.payments",
        icon: Wallet,
        descriptionKey: "admin.menu.payments.description",
        children: [
          {
            id: "payments-dashboard",
            labelKey: "admin.menu.paymentsDashboard",
            path: "/admin/payments",
            icon: LayoutDashboard,
            descriptionKey: "admin.menu.paymentsDashboard.description",
          },
          {
            id: "payments-withdrawals",
            labelKey: "admin.menu.paymentsWithdrawals",
            path: "/admin/payments/withdrawals",
            icon: Banknote,
            descriptionKey: "admin.menu.paymentsWithdrawals.description",
          },
          {
            id: "finance-affiliate-payouts",
            labelKey: "admin.menu.affiliatePayouts",
            path: "/admin/affiliates/payouts",
            icon: DollarSign,
            descriptionKey: "admin.menu.affiliatePayouts.description",
          },
          {
            id: "payments-config",
            labelKey: "admin.menu.paymentsConfig",
            path: "/admin/payments/config",
            icon: Settings,
            descriptionKey: "admin.menu.paymentsConfig.description",
          },
        ],
      },
      // Remboursements & Litiges
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
            descriptionKey: "admin.menu.disputes.description",
          },
        ],
      },
      // Comptabilité & Fiscalité
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
          {
            id: "supporting-documents",
            labelKey: "admin.menu.supportingDocuments",
            path: "/admin/finance/supporting-documents",
            icon: Paperclip,
            badge: "NEW",
            descriptionKey: "admin.menu.supportingDocuments.description",
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
      // Suivi des Coûts Cloud
      {
        id: "cost-monitoring",
        labelKey: "admin.menu.costMonitoring",
        path: "/admin/finance/costs",
        icon: TrendingDown,
        descriptionKey: "admin.menu.costMonitoring.description",
      },
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

  // ===== 5. MARKETING & COMMUNICATION =====
  {
    id: "marketing-comms",
    labelKey: "admin.menu.marketing",
    icon: Megaphone,
    descriptionKey: "admin.menu.marketing.description",
    children: [
      // --- Sous-section : Marketing ---
      {
        id: "marketing-sub",
        labelKey: "admin.menu.marketingSub",
        icon: Megaphone,
        descriptionKey: "admin.menu.marketingSub.description",
        children: [
          {
            id: "landing-pages",
            labelKey: "admin.menu.landingPages",
            path: "/admin/marketing/landing-pages",
            icon: Globe,
            badge: "NEW",
            descriptionKey: "admin.menu.landingPages.description",
          },
          {
            id: "trustpilot",
            labelKey: "admin.menu.trustpilot",
            path: "/admin/marketing/trustpilot",
            icon: Star,
            badge: "NEW",
            descriptionKey: "admin.menu.trustpilot.description",
          },
        ],
      },
      // --- Sous-section : Communication ---
      {
        id: "communication-sub",
        labelKey: "admin.menu.communicationSub",
        icon: Bell,
        descriptionKey: "admin.menu.communicationSub.description",
        children: [
          {
            id: "whatsapp",
            labelKey: "admin.menu.whatsapp",
            icon: MessageCircle,
            descriptionKey: "admin.menu.whatsapp.description",
            children: [
              {
                id: "whatsapp-groups",
                labelKey: "admin.menu.chattersWhatsappGroups",
                path: "/admin/marketing/whatsapp-groups",
                icon: MessageCircle,
                descriptionKey: "admin.menu.chattersWhatsappGroups.description",
              },
              {
                id: "whatsapp-supervision",
                labelKey: "admin.menu.whatsappSupervision",
                path: "/admin/marketing/whatsapp-supervision",
                icon: ClipboardList,
                descriptionKey: "admin.menu.whatsappSupervision.description",
              },
            ],
          },
          {
            id: "notifications",
            labelKey: "admin.menu.notifications",
            path: "/admin/comms/notifications",
            icon: Bell,
            descriptionKey: "admin.menu.notifications.description",
          },
        ],
      },
    ],
  },

  // ===== 6. PROGRAMMES AFFILIÉS (affiliation + chatters + influencers + bloggers + groupadmins + training) =====
  {
    id: "affiliates",
    labelKey: "admin.menu.affiliation",
    icon: Handshake,
    descriptionKey: "admin.menu.affiliation.description",
    children: [
      // Sous-section : Affiliation globale
      {
        id: "affiliation-global",
        labelKey: "admin.menu.affiliation",
        icon: Handshake,
        descriptionKey: "admin.menu.affiliation.description",
        children: [
          {
            id: "affiliate-dashboard",
            labelKey: "admin.menu.affiliateDashboard",
            path: "/admin/affiliates/dashboard",
            icon: LayoutDashboard,
            descriptionKey: "admin.menu.affiliateDashboard.description",
          },
          {
            id: "affiliates-list",
            labelKey: "admin.menu.affiliatesList",
            path: "/admin/affiliates",
            icon: UserPlus,
            descriptionKey: "admin.menu.affiliatesList.description",
          },
          {
            id: "affiliate-commissions",
            labelKey: "admin.menu.affiliateCommissions",
            path: "/admin/affiliates/commissions",
            icon: Percent,
            descriptionKey: "admin.menu.affiliateCommissions.description",
          },
          {
            id: "affiliate-payouts",
            labelKey: "admin.menu.affiliatePayouts",
            path: "/admin/affiliates/payouts",
            icon: Wallet,
            descriptionKey: "admin.menu.affiliatePayouts.description",
          },
          {
            id: "affiliate-reports",
            labelKey: "admin.menu.affiliateReports",
            path: "/admin/affiliates/reports",
            icon: BarChart3,
            descriptionKey: "admin.menu.affiliateReports.description",
          },
          {
            id: "affiliate-fraud",
            labelKey: "admin.menu.affiliateFraud",
            path: "/admin/affiliates/fraud",
            icon: ShieldAlert,
            badge: "NEW",
            descriptionKey: "admin.menu.affiliateFraud.description",
          },
          {
            id: "affiliate-config",
            labelKey: "admin.menu.affiliateConfig",
            path: "/admin/affiliates/config",
            icon: Settings,
            descriptionKey: "admin.menu.affiliateConfig.description",
          },
          {
            id: "commission-rules",
            labelKey: "admin.menu.commissionRules",
            path: "/admin/affiliates/rules",
            icon: Cog,
            descriptionKey: "admin.menu.commissionRules.description",
          },
          {
            id: "commission-plans",
            labelKey: "admin.menu.commissionPlans",
            path: "/admin/affiliates/plans",
            icon: Cog,
            descriptionKey: "admin.menu.commissionPlans.description",
          },
        ],
      },
      // Sous-section : Chatters
      {
        id: "chatters",
        labelKey: "admin.menu.chatters",
        icon: MessageCircle,
        descriptionKey: "admin.menu.chatters.description",
        children: [
          {
            id: "chatters-list",
            labelKey: "admin.menu.chattersList",
            path: "/admin/chatters",
            icon: Users,
            descriptionKey: "admin.menu.chattersList.description",
          },
          {
            id: "chatters-hierarchy",
            labelKey: "admin.menu.chattersHierarchy",
            path: "/admin/chatters/hierarchy",
            icon: GitBranch,
            descriptionKey: "admin.menu.chattersHierarchy.description",
          },
          {
            id: "chatters-captains",
            labelKey: "admin.menu.chattersCaptains",
            path: "/admin/team/captains/recruitment",
            icon: Crown,
            descriptionKey: "admin.menu.chattersCaptains.description",
          },
          {
            id: "chatters-referrals",
            labelKey: "admin.menu.chattersReferrals",
            path: "/admin/chatters/referrals",
            icon: UserPlus,
            descriptionKey: "admin.menu.chattersReferrals.description",
          },
          {
            id: "chatters-commissions",
            labelKey: "admin.menu.chattersCommissions",
            path: "/admin/chatters/commissions",
            icon: DollarSign,
            badge: "NEW",
            descriptionKey: "admin.menu.chattersCommissions.description",
          },
          {
            id: "chatters-payments",
            labelKey: "admin.menu.chattersPayments",
            path: "/admin/chatters/payments",
            icon: Wallet,
            descriptionKey: "admin.menu.chattersPayments.description",
          },
          {
            id: "chatters-fraud",
            labelKey: "admin.menu.chattersFraud",
            path: "/admin/chatters/fraud",
            icon: ShieldAlert,
            descriptionKey: "admin.menu.chattersFraud.description",
          },
          {
            id: "chatters-promotions",
            labelKey: "admin.menu.chattersPromotions",
            path: "/admin/chatters/promotions",
            icon: Percent,
            descriptionKey: "admin.menu.chattersPromotions.description",
          },
          {
            id: "chatters-country-rotation",
            labelKey: "admin.menu.chattersCountryRotation",
            path: "/admin/chatters/country-rotation",
            icon: RotateCcw,
            badge: "NEW",
            descriptionKey: "admin.menu.chattersCountryRotation.description",
          },
          {
            id: "chatters-analytics",
            labelKey: "admin.menu.chattersAnalytics",
            path: "/admin/chatters/analytics",
            icon: BarChart3,
            badge: "NEW",
            descriptionKey: "admin.menu.chattersAnalytics.description",
          },
          {
            id: "chatters-funnel",
            labelKey: "admin.menu.chattersFunnel",
            path: "/admin/chatters/funnel",
            icon: TrendingDown,
            badge: "NEW",
            descriptionKey: "admin.menu.chattersFunnel.description",
          },
          {
            id: "chatters-config",
            labelKey: "admin.menu.chattersConfig",
            path: "/admin/chatters/config",
            icon: Settings,
            descriptionKey: "admin.menu.chattersConfig.description",
          },
        ],
      },
      // Sous-section : Influenceurs
      {
        id: "influencers",
        labelKey: "admin.menu.influencers",
        icon: Megaphone,
        descriptionKey: "admin.menu.influencers.description",
        children: [
          {
            id: "influencers-list",
            labelKey: "admin.menu.influencersList",
            path: "/admin/influencers",
            icon: Users,
            descriptionKey: "admin.menu.influencersList.description",
          },
          {
            id: "influencers-payments",
            labelKey: "admin.menu.influencersPayments",
            path: "/admin/influencers/payments",
            icon: Wallet,
            badge: "NEW",
            descriptionKey: "admin.menu.influencersPayments.description",
          },
          {
            id: "influencers-leaderboard",
            labelKey: "admin.menu.influencersLeaderboard",
            path: "/admin/influencers/leaderboard",
            icon: Award,
            descriptionKey: "admin.menu.influencersLeaderboard.description",
          },
          {
            id: "influencers-resources",
            labelKey: "admin.menu.influencersResources",
            path: "/admin/influencers/resources",
            icon: FolderOpen,
            badge: "NEW",
            descriptionKey: "admin.menu.influencersResources.description",
          },
          {
            id: "influencers-analytics",
            labelKey: "admin.menu.influencersAnalytics",
            path: "/admin/influencers/analytics",
            icon: BarChart3,
            badge: "NEW",
            descriptionKey: "admin.menu.influencersAnalytics.description",
          },
          {
            id: "influencers-fraud",
            labelKey: "admin.menu.influencersFraud",
            path: "/admin/influencers/fraud",
            icon: ShieldAlert,
            badge: "NEW",
            descriptionKey: "admin.menu.influencersFraud.description",
          },
          {
            id: "influencers-config",
            labelKey: "admin.menu.influencersConfig",
            path: "/admin/influencers/config",
            icon: Settings,
            descriptionKey: "admin.menu.influencersConfig.description",
          },
        ],
      },
      // Sous-section : Blogueurs
      {
        id: "bloggers",
        labelKey: "admin.menu.bloggers",
        icon: FileText,
        descriptionKey: "admin.menu.bloggers.description",
        children: [
          {
            id: "bloggers-list",
            labelKey: "admin.menu.bloggersList",
            path: "/admin/bloggers",
            icon: Users,
            descriptionKey: "admin.menu.bloggersList.description",
          },
          {
            id: "bloggers-payments",
            labelKey: "admin.menu.bloggersPayments",
            path: "/admin/bloggers/payments",
            icon: Wallet,
            badge: "NEW",
            descriptionKey: "admin.menu.bloggersPayments.description",
          },
          {
            id: "bloggers-resources",
            labelKey: "admin.menu.bloggersResources",
            path: "/admin/bloggers/resources",
            icon: FolderOpen,
            badge: "NEW",
            descriptionKey: "admin.menu.bloggersResources.description",
          },
          {
            id: "bloggers-guide",
            labelKey: "admin.menu.bloggersGuide",
            path: "/admin/bloggers/guide",
            icon: BookOpen,
            badge: "NEW",
            descriptionKey: "admin.menu.bloggersGuide.description",
          },
          {
            id: "bloggers-articles",
            labelKey: "admin.menu.bloggersArticles",
            path: "/admin/bloggers/articles",
            icon: FileText,
            badge: "NEW",
            descriptionKey: "admin.menu.bloggersArticles.description",
          },
          {
            id: "bloggers-widgets",
            labelKey: "admin.menu.bloggersWidgets",
            path: "/admin/bloggers/widgets",
            icon: Code,
            badge: "NEW",
            descriptionKey: "admin.menu.bloggersWidgets.description",
          },
          {
            id: "bloggers-analytics",
            labelKey: "admin.menu.bloggersAnalytics",
            path: "/admin/bloggers/analytics",
            icon: BarChart3,
            badge: "NEW",
            descriptionKey: "admin.menu.bloggersAnalytics.description",
          },
          {
            id: "bloggers-fraud",
            labelKey: "admin.menu.bloggersFraud",
            path: "/admin/bloggers/fraud",
            icon: ShieldAlert,
            badge: "NEW",
            descriptionKey: "admin.menu.bloggersFraud.description",
          },
          {
            id: "bloggers-config",
            labelKey: "admin.menu.bloggersConfig",
            path: "/admin/bloggers/config",
            icon: Settings,
            descriptionKey: "admin.menu.bloggersConfig.description",
          },
        ],
      },
      // Sous-section : Group Admins
      {
        id: "groupadmins",
        labelKey: "admin.menu.groupAdminsSection",
        icon: Shield,
        descriptionKey: "admin.menu.groupAdminsSection.description",
        children: [
          {
            id: "groupadmins-list",
            labelKey: "admin.menu.groupAdminsList",
            path: "/admin/group-admins",
            icon: Users,
            descriptionKey: "admin.menu.groupAdminsList.description",
          },
          {
            id: "groupadmins-recruitments",
            labelKey: "admin.menu.groupAdminsRecruitments",
            path: "/admin/group-admins/recruitments",
            icon: UserPlus,
            badge: "NEW",
            descriptionKey: "admin.menu.groupAdminsRecruitments.description",
          },
          {
            id: "groupadmins-payments",
            labelKey: "admin.menu.groupAdminsPayments",
            path: "/admin/group-admins/payments",
            icon: Wallet,
            descriptionKey: "admin.menu.groupAdminsPayments.description",
          },
          {
            id: "groupadmins-resources",
            labelKey: "admin.menu.groupAdminsResources",
            path: "/admin/group-admins/resources",
            icon: FolderOpen,
            descriptionKey: "admin.menu.groupAdminsResources.description",
          },
          {
            id: "groupadmins-posts",
            labelKey: "admin.menu.groupAdminsPosts",
            path: "/admin/group-admins/posts",
            icon: FileText,
            descriptionKey: "admin.menu.groupAdminsPosts.description",
          },
          {
            id: "groupadmins-promotions",
            labelKey: "admin.menu.groupAdminsPromotions",
            path: "/admin/group-admins/promotions",
            icon: Percent,
            descriptionKey: "admin.menu.groupAdminsPromotions.description",
          },
          {
            id: "groupadmins-analytics",
            labelKey: "admin.menu.groupAdminsAnalytics",
            path: "/admin/group-admins/analytics",
            icon: BarChart3,
            badge: "NEW",
            descriptionKey: "admin.menu.groupAdminsAnalytics.description",
          },
          {
            id: "groupadmins-fraud",
            labelKey: "admin.menu.groupAdminsFraud",
            path: "/admin/group-admins/fraud",
            icon: ShieldAlert,
            badge: "NEW",
            descriptionKey: "admin.menu.groupAdminsFraud.description",
          },
          {
            id: "groupadmins-config",
            labelKey: "admin.menu.groupAdminsConfig",
            path: "/admin/group-admins/config",
            icon: Settings,
            descriptionKey: "admin.menu.groupAdminsConfig.description",
          },
        ],
      },
      // Sous-section : Partenaires
      {
        id: "partners",
        labelKey: "admin.menu.partners",
        icon: Handshake,
        descriptionKey: "admin.menu.partners.description",
        children: [
          {
            id: "partners-list",
            labelKey: "admin.menu.partnersList",
            path: "/admin/partners",
            icon: Users,
          },
          {
            id: "partners-applications",
            labelKey: "admin.menu.partnersApplications",
            path: "/admin/partners/applications",
            icon: Inbox,
          },
          {
            id: "partners-create",
            labelKey: "admin.menu.partnersCreate",
            path: "/admin/partners/create",
            icon: UserPlus,
          },
          {
            id: "partners-payments",
            labelKey: "admin.menu.partnersPayments",
            path: "/admin/partners/payments",
            icon: Wallet,
          },
          {
            id: "partners-widgets",
            labelKey: "admin.menu.partnersWidgets",
            path: "/admin/partners/widgets",
            icon: Code,
          },
          {
            id: "partners-config",
            labelKey: "admin.menu.partnersConfig",
            path: "/admin/partners/config",
            icon: Settings,
          },
          {
            id: "partners-stats",
            labelKey: "admin.menu.partnersStats",
            path: "/admin/partners/stats",
            icon: TrendingUp,
          },
        ],
      },
      // Sous-section : Formation
      {
        id: "training-modules",
        labelKey: "admin.menu.trainingModules",
        path: "/admin/training/modules",
        icon: GraduationCap,
        badge: "NEW",
        descriptionKey: "admin.menu.trainingModules.description",
      },
    ],
  },

  // ===== 7. CONTENU & SEO (press + legal docs + FAQs) =====
  {
    id: "content",
    labelKey: "admin.menu.content",
    icon: Newspaper,
    descriptionKey: "admin.menu.content.description",
    children: [
      {
        id: "press",
        labelKey: "admin.menu.press",
        icon: Newspaper,
        descriptionKey: "admin.menu.press.description",
        children: [
          {
            id: "press-resources",
            labelKey: "admin.menu.pressResources",
            path: "/admin/press/resources",
            icon: Image,
            badge: "NEW",
            descriptionKey: "admin.menu.pressResources.description",
          },
          {
            id: "press-releases",
            labelKey: "admin.menu.pressReleases",
            path: "/admin/press/releases",
            icon: FileText,
            badge: "NEW",
            descriptionKey: "admin.menu.pressReleases.description",
          },
        ],
      },
      {
        id: "legal-documents",
        labelKey: "admin.menu.legalDocuments",
        path: "/admin/documents",
        icon: FileText,
        descriptionKey: "admin.menu.legalDocuments.description",
      },
      {
        id: "faqs-management",
        labelKey: "admin.menu.faqs",
        path: "/admin/cms/faqs",
        icon: HelpCircle,
        descriptionKey: "admin.menu.faqs.description",
      },
      {
        id: "help-center",
        labelKey: "admin.menu.helpCenter",
        path: "/admin/help/center",
        icon: HelpingHand,
        descriptionKey: "admin.menu.helpCenter.description",
      },
    ],
  },

  // ===== 8. ANALYTICS & RAPPORTS =====
  {
    id: "analytics",
    labelKey: "admin.menu.analytics",
    icon: TrendingUp,
    descriptionKey: "admin.menu.analytics.description",
    children: [
      {
        id: "unified-analytics",
        labelKey: "admin.menu.unifiedAnalytics",
        path: "/admin/analytics/unified",
        icon: PieChart,
        badge: "NEW",
        descriptionKey: "admin.menu.unifiedAnalytics.description",
      },
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

  // ===== 9. CONFIGURATION SYSTEME (admin-system + toolbox + team fusionnés) =====
  {
    id: "admin-system",
    labelKey: "admin.menu.adminSystem",
    icon: Settings,
    descriptionKey: "admin.menu.adminSystem.description",
    children: [
      {
        id: "promo-codes",
        labelKey: "admin.menu.promoCodes",
        path: "/admin/coupons",
        icon: Percent,
        descriptionKey: "admin.menu.promoCodes.description",
      },
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
        id: "ia-management",
        labelKey: "admin.menu.iaManagement",
        path: "/admin/ia",
        icon: Bot,
        descriptionKey: "admin.menu.iaManagement.description",
      },
      {
        id: "telegram-admin",
        labelKey: "admin.menu.telegram",
        path: "/admin/toolbox/telegram",
        icon: Send,
        badge: "NEW",
        descriptionKey: "admin.menu.telegram.description",
      },
      {
        id: "toolbox",
        labelKey: "admin.menu.toolbox",
        path: "/admin/toolbox",
        icon: Wrench,
        descriptionKey: "admin.menu.toolbox.description",
      },
      {
        id: "team-captain-recruitment",
        labelKey: "admin.menu.teamCaptainRecruitment",
        path: "/admin/team/captains/recruitment",
        icon: Crown,
        badge: "NEW",
        descriptionKey: "admin.menu.teamCaptainRecruitment.description",
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
            id: "email-health",
            labelKey: "admin.menu.emailHealth",
            path: "/admin/email-health",
            icon: Mail,
            badge: "NEW",
            descriptionKey: "admin.menu.emailHealth.description",
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
    "admin": ["*"],       // Accès total
    "accountant": ["*"],  // Accès total (filtrage fait au niveau des routes)
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
