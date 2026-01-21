/**
 * QuickActions - Actions rapides sur le dashboard
 * Permet d'accéder rapidement aux fonctionnalités principales
 */

import React from 'react';
import { useIntl } from 'react-intl';
import { useLocaleNavigate } from '../../multilingual-system/hooks/useLocaleNavigate';
import { getTranslatedRouteSlug, type RouteKey } from '../../multilingual-system/core/routing/localeRoutes';
import { useApp } from '../../contexts/AppContext';
import {
  Phone,
  Search,
  Calendar,
  MessageSquare,
  FileText,
  Settings,
  Bot,
  CreditCard,
  Users,
  Globe,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import type { User } from '../../contexts/types';
import dashboardLog from '../../utils/dashboardLogger';

interface QuickActionsProps {
  user: User;
  onTabChange?: (tab: string) => void;
}

interface ActionItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  gradient: string;
  onClick: () => void;
  badge?: string;
}

const QuickActions: React.FC<QuickActionsProps> = ({ user, onTabChange }) => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const { language } = useApp();
  const langCode = (language || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';

  const isProvider = user.role === 'lawyer' || user.role === 'expat';
  const isClient = user.role === 'client';

  // Routes traduites
  const findLawyerSlug = getTranslatedRouteSlug('find-lawyer' as RouteKey, langCode);
  const findExpatSlug = getTranslatedRouteSlug('find-expat' as RouteKey, langCode);
  const aiAssistantSlug = getTranslatedRouteSlug('dashboard-ai-assistant' as RouteKey, langCode);
  const subscriptionSlug = getTranslatedRouteSlug('dashboard-subscription' as RouteKey, langCode);

  // Actions pour les prestataires
  const providerActions: ActionItem[] = [
    {
      key: 'ai-assistant',
      icon: <Bot className="w-5 h-5" />,
      label: intl.formatMessage({ id: 'quickActions.aiAssistant', defaultMessage: 'AI Assistant' }),
      description: intl.formatMessage({ id: 'quickActions.aiAssistant.desc', defaultMessage: 'Get AI-powered help' }),
      gradient: 'from-purple-500 to-pink-500',
      onClick: () => {
        dashboardLog.click('QuickAction: AI Assistant clicked');
        dashboardLog.nav(`Navigating to AI Assistant: /${aiAssistantSlug}`);
        navigate(`/${aiAssistantSlug}`);
      },
      badge: 'NEW',
    },
    {
      key: 'messages',
      icon: <MessageSquare className="w-5 h-5" />,
      label: intl.formatMessage({ id: 'quickActions.messages', defaultMessage: 'Messages' }),
      description: intl.formatMessage({ id: 'quickActions.messages.desc', defaultMessage: 'Check your inbox' }),
      gradient: 'from-blue-500 to-cyan-500',
      onClick: () => {
        dashboardLog.click('QuickAction: Messages clicked');
        dashboardLog.tab('Switching to messages tab');
        onTabChange?.('messages');
      },
    },
    {
      key: 'calls',
      icon: <Phone className="w-5 h-5" />,
      label: intl.formatMessage({ id: 'quickActions.calls', defaultMessage: 'My Calls' }),
      description: intl.formatMessage({ id: 'quickActions.calls.desc', defaultMessage: 'View call history' }),
      gradient: 'from-emerald-500 to-teal-500',
      onClick: () => {
        dashboardLog.click('QuickAction: Calls clicked');
        dashboardLog.tab('Switching to calls tab');
        onTabChange?.('calls');
      },
    },
    {
      key: 'subscription',
      icon: <CreditCard className="w-5 h-5" />,
      label: intl.formatMessage({ id: 'quickActions.subscription', defaultMessage: 'Subscription' }),
      description: intl.formatMessage({ id: 'quickActions.subscription.desc', defaultMessage: 'Manage your plan' }),
      gradient: 'from-amber-500 to-orange-500',
      onClick: () => {
        dashboardLog.click('QuickAction: Subscription clicked');
        dashboardLog.nav(`Navigating to Subscription: /${subscriptionSlug}`);
        navigate(`/${subscriptionSlug}`);
      },
    },
  ];

  // Actions pour les clients
  const clientActions: ActionItem[] = [
    {
      key: 'find-lawyer',
      icon: <Search className="w-5 h-5" />,
      label: intl.formatMessage({ id: 'quickActions.findLawyer', defaultMessage: 'Find a Lawyer' }),
      description: intl.formatMessage({ id: 'quickActions.findLawyer.desc', defaultMessage: 'Legal consultation' }),
      gradient: 'from-red-500 to-orange-500',
      onClick: () => {
        dashboardLog.click('QuickAction: Find Lawyer clicked');
        dashboardLog.nav(`Navigating to Find Lawyer: /${findLawyerSlug}`);
        navigate(`/${findLawyerSlug}`);
      },
    },
    {
      key: 'find-expat',
      icon: <Globe className="w-5 h-5" />,
      label: intl.formatMessage({ id: 'quickActions.findExpat', defaultMessage: 'Find an Expat' }),
      description: intl.formatMessage({ id: 'quickActions.findExpat.desc', defaultMessage: 'Expat assistance' }),
      gradient: 'from-blue-500 to-indigo-500',
      onClick: () => {
        dashboardLog.click('QuickAction: Find Expat clicked');
        dashboardLog.nav(`Navigating to Find Expat: /${findExpatSlug}`);
        navigate(`/${findExpatSlug}`);
      },
    },
    {
      key: 'messages',
      icon: <MessageSquare className="w-5 h-5" />,
      label: intl.formatMessage({ id: 'quickActions.messages', defaultMessage: 'Messages' }),
      description: intl.formatMessage({ id: 'quickActions.messages.desc', defaultMessage: 'Check your inbox' }),
      gradient: 'from-purple-500 to-pink-500',
      onClick: () => {
        dashboardLog.click('QuickAction: Messages clicked');
        dashboardLog.tab('Switching to messages tab');
        onTabChange?.('messages');
      },
    },
    {
      key: 'favorites',
      icon: <Users className="w-5 h-5" />,
      label: intl.formatMessage({ id: 'quickActions.favorites', defaultMessage: 'My Favorites' }),
      description: intl.formatMessage({ id: 'quickActions.favorites.desc', defaultMessage: 'Saved providers' }),
      gradient: 'from-emerald-500 to-teal-500',
      onClick: () => {
        dashboardLog.click('QuickAction: Favorites clicked');
        dashboardLog.tab('Switching to favorites tab');
        onTabChange?.('favorites');
      },
    },
  ];

  const actions = isProvider ? providerActions : clientActions;

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-amber-500" />
        {intl.formatMessage({ id: 'dashboard.quickActions', defaultMessage: 'Quick Actions' })}
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {actions.map((action) => (
          <button
            key={action.key}
            onClick={action.onClick}
            className="group relative bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-xl p-3 sm:p-4 text-left hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 overflow-hidden"
          >
            {/* Gradient overlay on hover */}
            <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />

            {/* Badge */}
            {action.badge && (
              <span className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold">
                {action.badge}
              </span>
            )}

            {/* Icon */}
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br ${action.gradient} flex items-center justify-center text-white mb-2 sm:mb-3 group-hover:scale-110 transition-transform duration-300`}>
              {action.icon}
            </div>

            {/* Text */}
            <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              {action.label}
            </p>
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
              {action.description}
            </p>

            {/* Arrow indicator */}
            <ArrowRight className="absolute bottom-3 right-3 w-3.5 h-3.5 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all duration-300" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
