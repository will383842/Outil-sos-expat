/**
 * AdminCommissionsHub - Unified commission configuration page
 * Groups all affiliate commission settings with sub-tabs per role
 */

import React, { useState, Suspense, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  DollarSign,
  Loader2,
  MessageCircle,
  Crown,
  TrendingUp,
  PenTool,
  Users,
  Handshake,
  User,
  Scale,
  Globe,
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';

// Lazy load tab components
const ChatterTab = lazy(() => import('./tabs/ChatterTab'));
const CaptainChatterTab = lazy(() => import('./tabs/CaptainChatterTab'));
const InfluencerTab = lazy(() => import('./tabs/InfluencerTab'));
const BloggerTab = lazy(() => import('./tabs/BloggerTab'));
const GroupAdminTab = lazy(() => import('./tabs/GroupAdminTab'));
const PartnerTab = lazy(() => import('./tabs/PartnerTab'));
const ClientTab = lazy(() => import('./tabs/ClientTab'));
const LawyerRatesTab = lazy(() => import('./tabs/LawyerRatesTab'));
const ExpatRatesTab = lazy(() => import('./tabs/ExpatRatesTab'));

const TABS = [
  { id: 'client', label: 'Client', icon: User, color: 'text-gray-500' },
  { id: 'avocat', label: 'Avocat', icon: Scale, color: 'text-amber-600' },
  { id: 'expatrie', label: 'Expatrié', icon: Globe, color: 'text-teal-500' },
  { id: 'chatter', label: 'Chatter', icon: MessageCircle, color: 'text-red-500' },
  { id: 'captain', label: 'Captain', icon: Crown, color: 'text-yellow-500' },
  { id: 'influenceur', label: 'Influenceur', icon: TrendingUp, color: 'text-orange-500' },
  { id: 'blogueur', label: 'Blogueur', icon: PenTool, color: 'text-purple-500' },
  { id: 'groupadmin', label: 'Admin Groupe', icon: Users, color: 'text-blue-500' },
  { id: 'partenaire', label: 'Partenaire', icon: Handshake, color: 'text-green-500' },
] as const;

type TabId = typeof TABS[number]['id'];

const TabLoading = () => (
  <div className="flex items-center justify-center py-16">
    <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
  </div>
);

const AdminCommissionsHub: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabId) || 'chatter';
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'client': return <ClientTab />;
      case 'avocat': return <LawyerRatesTab />;
      case 'expatrie': return <ExpatRatesTab />;
      case 'chatter': return <ChatterTab />;
      case 'captain': return <CaptainChatterTab />;
      case 'influenceur': return <InfluencerTab />;
      case 'blogueur': return <BloggerTab />;
      case 'groupadmin': return <GroupAdminTab />;
      case 'partenaire': return <PartnerTab />;
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <DollarSign className="w-7 h-7 sm:w-8 sm:h-8 text-green-500" />
            Commissions d'affiliation
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Configuration centralisée de toutes les commissions par rôle
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700 -mx-4 sm:-mx-6 px-4 sm:px-6">
          <div className="flex gap-1 overflow-x-auto pb-px scrollbar-thin">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                    isActive
                      ? 'border-red-500 text-red-600 dark:text-red-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? tab.color : ''}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <Suspense fallback={<TabLoading />}>
          {renderTabContent()}
        </Suspense>
      </div>
    </AdminLayout>
  );
};

export default AdminCommissionsHub;
