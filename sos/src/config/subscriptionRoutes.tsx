/**
 * Subscription Routes Configuration
 * Routes pour le système d'abonnement IA
 *
 * À intégrer dans le fichier de routes principal (App.tsx ou router.tsx)
 */

import React, { lazy, Suspense } from 'react';
import { Route } from 'react-router-dom';

// Lazy load subscription pages for better performance
const AiAssistantPage = lazy(() => import('../pages/Dashboard/AiAssistant/Index'));
const SubscriptionPage = lazy(() => import('../pages/Dashboard/Subscription/Index'));
const PlansPage = lazy(() => import('../pages/Dashboard/Subscription/Plans'));
const SubscriptionSuccessPage = lazy(() => import('../pages/Dashboard/Subscription/Success'));
const AdminIA = lazy(() => import('../pages/admin/AdminIA'));

// Loading component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
  </div>
);

/**
 * Dashboard Routes (Prestataires)
 * À ajouter dans la section dashboard des routes
 */
export const SubscriptionDashboardRoutes = () => (
  <>
    {/* AI Assistant */}
    <Route
      path="/dashboard/ai-assistant"
      element={
        <Suspense fallback={<LoadingSpinner />}>
          <AiAssistantPage />
        </Suspense>
      }
    />

    {/* Subscription Management */}
    <Route
      path="/dashboard/subscription"
      element={
        <Suspense fallback={<LoadingSpinner />}>
          <SubscriptionPage />
        </Suspense>
      }
    />

    {/* Plans Selection */}
    <Route
      path="/dashboard/subscription/plans"
      element={
        <Suspense fallback={<LoadingSpinner />}>
          <PlansPage />
        </Suspense>
      }
    />

    {/* Subscription Success */}
    <Route
      path="/dashboard/subscription/success"
      element={
        <Suspense fallback={<LoadingSpinner />}>
          <SubscriptionSuccessPage />
        </Suspense>
      }
    />
  </>
);

/**
 * Admin Routes
 * À ajouter dans la section admin des routes
 */
export const SubscriptionAdminRoutes = () => (
  <>
    {/* Admin IA - Outil IA */}
    <Route
      path="/admin/ia"
      element={
        <Suspense fallback={<LoadingSpinner />}>
          <AdminIA />
        </Suspense>
      }
    />
  </>
);

/**
 * Navigation Items pour le Dashboard Prestataire
 */
export const subscriptionNavItems = [
  {
    path: '/dashboard/ai-assistant',
    label: { fr: 'Assistant IA', en: 'AI Assistant' },
    icon: 'Bot', // Lucide icon name
    badge: 'new'
  },
  {
    path: '/dashboard/subscription',
    label: { fr: 'Mon Abonnement', en: 'My Subscription' },
    icon: 'CreditCard'
  }
];

/**
 * Navigation Item pour l'Admin
 * À ajouter au menu admin existant
 */
export const adminIaNavItem = {
  path: '/admin/ia',
  label: { fr: 'Outil IA', en: 'AI Tool' },
  icon: 'Bot',
  description: { fr: 'Gestion des accès IA, quotas et tarification', en: 'AI access, quotas and pricing management' },
  category: 'settings' // ou la catégorie appropriée dans votre menu admin
};

/**
 * Exemple d'intégration dans App.tsx ou router.tsx:
 *
 * import { SubscriptionDashboardRoutes, SubscriptionAdminRoutes } from './config/subscriptionRoutes';
 *
 * <Routes>
 *   // ... autres routes ...
 *
 *   // Routes Dashboard
 *   <Route path="/dashboard" element={<DashboardLayout />}>
 *     {SubscriptionDashboardRoutes()}
 *     // ... autres routes dashboard ...
 *   </Route>
 *
 *   // Routes Admin
 *   <Route path="/admin" element={<AdminLayout />}>
 *     {SubscriptionAdminRoutes()}
 *     // ... autres routes admin ...
 *   </Route>
 * </Routes>
 */

export default {
  SubscriptionDashboardRoutes,
  SubscriptionAdminRoutes,
  subscriptionNavItems,
  adminIaNavItem
};
