/**
 * Admin IA Page - Outil IA
 * Gestion complète de l'IA : accès, quotas, tarification, logs
 */

import React, { useState, Suspense, lazy } from 'react';
import {
  Bot,
  LayoutDashboard,
  Users,
  Gauge,
  Link2,
  DollarSign,
  Clock,
  Activity,
  RefreshCw,
  CreditCard,
  Bell
} from 'lucide-react';
import { cn } from '../../utils/cn';
import AdminLayout from '../../components/admin/AdminLayout';
import { IaTabId, IaTab } from './ia/types';

// ============================================================================
// LAZY LOADED TABS
// ============================================================================

const IaDashboardTab = lazy(() => import('./ia/IaDashboardTab'));
const IaAccessTab = lazy(() => import('./ia/IaAccessTab'));
const IaQuotasTab = lazy(() => import('./ia/IaQuotasTab'));
const IaSubscriptionsTab = lazy(() => import('./ia/IaSubscriptionsTab'));
const IaMultiProvidersTab = lazy(() => import('./ia/IaMultiProvidersTab'));
const IaPricingTab = lazy(() => import('./ia/IaPricingTab'));
const IaTrialConfigTab = lazy(() => import('./ia/IaTrialConfigTab'));
const IaLogsTab = lazy(() => import('./ia/IaLogsTab'));
const IaAlertsEventsTab = lazy(() => import('./ia/IaAlertsEventsTab'));

// ============================================================================
// TAB DEFINITIONS
// ============================================================================

const TABS: IaTab[] = [
  {
    id: 'dashboard',
    label: 'Tableau de bord',
    icon: LayoutDashboard,
  },
  {
    id: 'access',
    label: 'Acces Prestataires',
    icon: Users,
  },
  {
    id: 'quotas',
    label: 'Quotas',
    icon: Gauge,
  },
  {
    id: 'subscriptions',
    label: 'Abonnements',
    icon: CreditCard,
  },
  {
    id: 'multi-providers',
    label: 'Multi-Prestataires',
    icon: Link2,
  },
  {
    id: 'pricing',
    label: 'Tarification',
    icon: DollarSign,
  },
  {
    id: 'trial-config',
    label: 'Config Essai',
    icon: Clock,
  },
  {
    id: 'logs',
    label: 'Logs IA',
    icon: Activity,
  },
  {
    id: 'alerts',
    label: 'Alertes',
    icon: Bell,
  },
];

// ============================================================================
// LOADING FALLBACK
// ============================================================================

const TabLoader: React.FC = () => (
  <div className="flex items-center justify-center py-12">
    <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const AdminIA: React.FC = () => {
  const [activeTab, setActiveTab] = useState<IaTabId>('dashboard');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <IaDashboardTab />;
      case 'access':
        return <IaAccessTab />;
      case 'quotas':
        return <IaQuotasTab />;
      case 'subscriptions':
        return <IaSubscriptionsTab />;
      case 'multi-providers':
        return <IaMultiProvidersTab />;
      case 'pricing':
        return <IaPricingTab />;
      case 'trial-config':
        return <IaTrialConfigTab />;
      case 'logs':
        return <IaLogsTab />;
      case 'alerts':
        return <IaAlertsEventsTab />;
      default:
        return <IaDashboardTab />;
    }
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Outil IA
                </h1>
                <p className="text-gray-500">
                  Gestion complète de l'assistant IA : accès, quotas, tarification et logs
                </p>
              </div>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="mb-6 border-b border-gray-200">
            <nav className="flex space-x-1 overflow-x-auto pb-px" aria-label="Tabs">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'group inline-flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors',
                      isActive
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    )}
                  >
                    <Icon className={cn(
                      'w-4 h-4',
                      isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-500'
                    )} />
                    {tab.label}
                    {tab.badge && (
                      <span className={cn(
                        'ml-1 px-2 py-0.5 rounded-full text-xs font-medium',
                        isActive
                          ? 'bg-indigo-100 text-indigo-600'
                          : 'bg-gray-100 text-gray-600'
                      )}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <Suspense fallback={<TabLoader />}>
            {renderTabContent()}
          </Suspense>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminIA;
