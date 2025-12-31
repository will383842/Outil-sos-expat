// src/pages/admin/AdminDashboard.tsx - VERSION CORRIGÉE ABORTERROR
// =============================================================================
// CHANGEMENTS :
// 1. ✅ Ajout d'un ref `mountedRef` pour tracker si le composant est monté
// 2. ✅ Vérification du flag avant chaque setState après une opération async
// 3. ✅ Cleanup propre dans le useEffect
// =============================================================================

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useIntl } from "react-intl";
import {
  Phone,
  Settings,
  Users,
  DollarSign,
  BarChart3,
  Save,
  Star,
  Shield,
  Trash,
  Mail,
  CheckCircle,
  AlertTriangle,
  Wifi,
  WifiOff,
  UserCheck,
  Scale,
  Globe,
  Activity,
} from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import Button from "../../components/common/Button";
import { useAuth } from "../../contexts/AuthContext";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  getDocs,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import ErrorBoundary from "../../components/common/ErrorBoundary";
import { logError } from "../../utils/logging";
import Modal from "../../components/common/Modal";
import {
  validateDataIntegrity,
  cleanupObsoleteData,
} from "../../utils/firestore";
import testNotificationSystem from "../../services/notifications/notificationService";

// Interface pour les paramètres admin (SIMPLIFIÉ - sans commission)
interface AdminSettings {
  twilioSettings: {
    maxAttempts: number;
    timeoutSeconds: number;
  };
  notificationSettings: {
    enableEmail: boolean;
    enableSMS: boolean;
    enableWhatsApp: boolean;
  };
  createdAt: unknown;
  updatedAt?: unknown;
  updatedBy?: string;
}

// Interface pour le rapport d'intégrité
interface IntegrityReport {
  isValid: boolean;
  issues: string[];
  fixes: IntegrityFix[];
}

interface IntegrityFix {
  type: string;
  description: string;
  data: Record<string, unknown>;
}

// Interface pour les statistiques
interface Stats {
  totalCalls: number;
  successfulCalls: number;
  totalRevenue: number;
  platformRevenue: number;
  providerRevenue: number;
}

// Helpers de typage & normalisation
function normalizeAdminSettings(input: unknown): AdminSettings {
  const partial = (input ?? {}) as Partial<AdminSettings>;
  const twilio =
    partial.twilioSettings ?? ({} as AdminSettings["twilioSettings"]);
  const notif =
    partial.notificationSettings ??
    ({} as AdminSettings["notificationSettings"]);

  return {
    twilioSettings: {
      maxAttempts:
        typeof twilio.maxAttempts === "number" ? twilio.maxAttempts : 3,
      timeoutSeconds:
        typeof twilio.timeoutSeconds === "number" ? twilio.timeoutSeconds : 30,
    },
    notificationSettings: {
      enableEmail:
        typeof notif.enableEmail === "boolean" ? notif.enableEmail : true,
      enableSMS: typeof notif.enableSMS === "boolean" ? notif.enableSMS : true,
      enableWhatsApp:
        typeof notif.enableWhatsApp === "boolean" ? notif.enableWhatsApp : true,
    },
    createdAt: partial.createdAt ?? serverTimestamp(),
    updatedAt: partial.updatedAt,
    updatedBy:
      typeof partial.updatedBy === "string" ? partial.updatedBy : undefined,
  };
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const intl = useIntl();

  // ==========================================================================
  // ✅ CORRECTION 1: Ref pour tracker si le composant est monté
  // ==========================================================================
  const mountedRef = useRef<boolean>(true);

  // extraction sûre de l'ID et du rôle pour éviter any
  const userId =
    typeof (user as { id?: unknown } | null)?.id === "string"
      ? (user as { id?: string }).id
      : undefined;
  const userRole =
    typeof (user as { role?: unknown } | null)?.role === "string"
      ? (user as { role?: string }).role
      : undefined;

  // États avec valeurs par défaut
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showIntegrityModal, setShowIntegrityModal] = useState<boolean>(false);
  const [integrityReport, setIntegrityReport] =
    useState<IntegrityReport | null>(null);
  const [isCheckingIntegrity, setIsCheckingIntegrity] =
    useState<boolean>(false);
  const [isCleaningData, setIsCleaningData] = useState<boolean>(false);
  const [isTestingNotifications, setIsTestingNotifications] =
    useState<boolean>(false);

  const [stats, setStats] = useState<Stats>({
    totalCalls: 0,
    successfulCalls: 0,
    totalRevenue: 0,
    platformRevenue: 0,
    providerRevenue: 0,
  });

  // Notification helper (simplifié)
  const invokeTestNotification = async (providerId: string): Promise<void> => {
    const candidate = testNotificationSystem as unknown;

    if (typeof candidate === "function") {
      await (candidate as (id: string) => Promise<unknown>)(providerId);
      return;
    }

    if (candidate && typeof candidate === "object") {
      const methods = [
        "sendTestNotification",
        "testNotification",
        "sendTest",
        "triggerTest",
      ];
      for (const method of methods) {
        const fn = (candidate as Record<string, unknown>)[method];
        if (typeof fn === "function") {
          await (fn as (id: string) => Promise<unknown>)(providerId);
          return;
        }
      }
    }

    throw new Error(intl.formatMessage({ id: 'admin.dashboard.notifications.serviceUnavailable' }));
  };

  // ==========================================================================
  // ✅ CORRECTION 2: loadStats avec vérification du flag mounted
  // ==========================================================================
  const loadStats = useCallback(async (): Promise<void> => {
    if (!user) return;

    try {
      // ✅ OPTIMISATION: Requêtes parallèles au lieu de séquentielles
      const [callsSnapshot, paymentsSnapshot] = await Promise.all([
        getDocs(collection(db, "calls")),
        getDocs(collection(db, "payments"))
      ]);

      // ✅ Vérifier si toujours monté AVANT de continuer
      if (!mountedRef.current) {
        console.log('[AdminDashboard] loadStats: component unmounted, aborting');
        return;
      }

      let totalCalls = 0;
      let successfulCalls = 0;
      let totalRevenue = 0;
      let platformRevenue = 0;
      let providerRevenue = 0;

      callsSnapshot.forEach((docSnapshot) => {
        totalCalls++;
        const data = docSnapshot.data() as Record<string, unknown>;
        if ((data.status as string) === "success") successfulCalls++;
      });

      paymentsSnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data() as Record<string, unknown>;
        const amount = data.amount as number | undefined;
        const platformFee = (data.platformFee ||
          data.connectionFeeAmount ||
          data.commissionAmount) as number | undefined;
        const providerAmount = data.providerAmount as number | undefined;

        if (typeof amount === "number") totalRevenue += amount;
        if (typeof platformFee === "number") platformRevenue += platformFee;
        if (typeof providerAmount === "number")
          providerRevenue += providerAmount;
      });

      // ✅ Vérifier une dernière fois avant setState
      if (!mountedRef.current) return;

      setStats({
        totalCalls,
        successfulCalls,
        totalRevenue,
        platformRevenue,
        providerRevenue,
      });
    } catch (error) {
      // ✅ Ignorer les erreurs si le composant est démonté
      if (!mountedRef.current) return;
      
      // ✅ Ignorer les AbortError silencieusement
      if (error instanceof Error && 
          (error.name === 'AbortError' || error.message.includes('aborted'))) {
        console.log('[AdminDashboard] loadStats: request aborted (normal during unmount)');
        return;
      }
      
      console.error("Error loading stats:", error);
    }
  }, [user]);

  // ==========================================================================
  // ✅ CORRECTION 3: loadAdminData avec vérification du flag mounted
  // ==========================================================================
  const loadAdminData = useCallback(async (): Promise<void> => {
    if (!user) return;

    try {
      const settingsRef = doc(db, "admin_settings", "main");
      const settingsDoc = await getDoc(settingsRef);

      // ✅ Vérifier si toujours monté après getDoc
      if (!mountedRef.current) {
        console.log('[AdminDashboard] loadAdminData: component unmounted, aborting');
        return;
      }

      if (settingsDoc.exists()) {
        const data = settingsDoc.data() as Record<string, unknown>;
        // Migration: exclure sosCommission si présent
        const { sosCommission, ...cleanSettings } = data as Record<
          string,
          unknown
        >;
        
        // ✅ Vérifier avant setState
        if (!mountedRef.current) return;
        setSettings(normalizeAdminSettings(cleanSettings));

        // Si sosCommission existait, marquer pour migration
        if (sosCommission) {
          console.warn(
            "🔄 Migration détectée: sosCommission retiré de admin_settings. Utilisez admin_config/pricing."
          );
        }
      } else {
        // Paramètres par défaut SANS commission
        const defaultSettings: AdminSettings = {
          twilioSettings: {
            maxAttempts: 3,
            timeoutSeconds: 30,
          },
          notificationSettings: {
            enableEmail: true,
            enableSMS: true,
            enableWhatsApp: true,
          },
          createdAt: serverTimestamp(),
        };
        
        await setDoc(settingsRef, defaultSettings);
        
        // ✅ Vérifier après setDoc
        if (!mountedRef.current) return;
        setSettings(defaultSettings);
      }

      // ✅ loadStats vérifie aussi mountedRef en interne
      await loadStats();
      
    } catch (error) {
      // ✅ Ignorer les erreurs si le composant est démonté
      if (!mountedRef.current) return;
      
      // ✅ Ignorer les AbortError silencieusement
      if (error instanceof Error && 
          (error.name === 'AbortError' || error.message.includes('aborted'))) {
        console.log('[AdminDashboard] loadAdminData: request aborted (normal during unmount)');
        return;
      }
      
      console.error("Error loading admin data:", error);
    } finally {
      // ✅ Vérifier avant le setState final
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [user, loadStats]);

  // ==========================================================================
  // ✅ CORRECTION 4: useEffect avec cleanup propre
  // ==========================================================================
  useEffect(() => {
    // ✅ Marquer comme monté au début
    mountedRef.current = true;
    
    if (user) {
      void loadAdminData();
    }

    // ✅ Cleanup: marquer comme démonté
    return () => {
      console.log('[AdminDashboard] Component unmounting, setting mountedRef to false');
      mountedRef.current = false;
    };
  }, [user, loadAdminData]);

  // Handle settings change (SIMPLIFIÉ)
  const handleSettingsChange = (
    path: string,
    value: string | number | boolean
  ): void => {
    if (!settings) return;

    const newSettings: AdminSettings = JSON.parse(JSON.stringify(settings));
    const keys = path.split(".");
    let current: Record<string, unknown> = newSettings as unknown as Record<
      string,
      unknown
    >;

    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]] as Record<string, unknown>;
    }
    (current as Record<string, unknown>)[keys[keys.length - 1]] = value;

    setSettings(newSettings);
  };

  // Save settings (SIMPLIFIÉ)
  const saveSettings = async (): Promise<void> => {
    if (!settings || !user) return;

    setIsSaving(true);
    try {
      await setDoc(doc(db, "admin_settings", "main"), {
        ...settings,
        updatedAt: serverTimestamp(),
        updatedBy: userId,
      });
      
      // ✅ Vérifier avant setState
      if (!mountedRef.current) return;
      alert(intl.formatMessage({ id: 'admin.dashboard.settings.saveSuccess' }));
    } catch (error) {
      if (!mountedRef.current) return;
      console.error("Error saving settings:", error);
      alert(intl.formatMessage({ id: 'admin.dashboard.settings.saveError' }));
    } finally {
      if (mountedRef.current) {
        setIsSaving(false);
      }
    }
  };

  // Check data integrity
  const handleCheckIntegrity = async (): Promise<void> => {
    setIsCheckingIntegrity(true);
    try {
      const report = await validateDataIntegrity();
      
      // ✅ Vérifier avant setState
      if (!mountedRef.current) return;
      
      const typedReport: IntegrityReport = {
        isValid: report.isValid,
        issues: report.issues,
        fixes: report.fixes as IntegrityFix[],
      };
      setIntegrityReport(typedReport);
      setShowIntegrityModal(true);
    } catch (error) {
      if (!mountedRef.current) return;
      console.error("Error checking integrity:", error);
      alert(intl.formatMessage({ id: 'admin.dashboard.integrity.checkError' }));
    } finally {
      if (mountedRef.current) {
        setIsCheckingIntegrity(false);
      }
    }
  };

  // Clean obsolete data
  const handleCleanupData = async (): Promise<void> => {
    if (
      !confirm(intl.formatMessage({ id: 'admin.dashboard.cleanup.confirmMessage' }))
    ) {
      return;
    }

    setIsCleaningData(true);
    try {
      const success = await cleanupObsoleteData();
      
      // ✅ Vérifier avant setState/alert
      if (!mountedRef.current) return;
      
      if (success) {
        alert(intl.formatMessage({ id: 'admin.dashboard.cleanup.success' }));
      } else {
        alert(intl.formatMessage({ id: 'admin.dashboard.cleanup.error' }));
      }
    } catch (error) {
      if (!mountedRef.current) return;
      console.error("Error cleaning data:", error);
      alert(intl.formatMessage({ id: 'admin.dashboard.cleanup.error' }));
    } finally {
      if (mountedRef.current) {
        setIsCleaningData(false);
      }
    }
  };

  // Test notification system
  const handleTestNotifications = async (): Promise<void> => {
    if (!confirm(intl.formatMessage({ id: 'admin.dashboard.notifications.confirmTest' }))) {
      return;
    }

    setIsTestingNotifications(true);
    try {
      const testProviderId =
        prompt(intl.formatMessage({ id: 'admin.dashboard.notifications.enterProviderId' })) ||
        "test-provider-id";
      await invokeTestNotification(testProviderId);
      
      // ✅ Vérifier avant alert
      if (!mountedRef.current) return;
      alert(intl.formatMessage({ id: 'admin.dashboard.notifications.testSuccess' }));
    } catch (error) {
      if (!mountedRef.current) return;
      console.error("Erreur lors du test de notification:", error);
      const errorMessage =
        error instanceof Error ? error.message : intl.formatMessage({ id: 'admin.dashboard.unknownError' });
      alert(intl.formatMessage({ id: 'admin.dashboard.notifications.testError' }, { error: errorMessage }));
    } finally {
      if (mountedRef.current) {
        setIsTestingNotifications(false);
      }
    }
  };

  // Guards
  if (!user) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      </AdminLayout>
    );
  }

  // ✅ Vérification par rôle admin (plus fiable que par email)
  // user.email peut être undefined si le champ n'existe pas dans Firestore
  if (userRole !== 'admin') {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {intl.formatMessage({ id: 'admin.dashboard.accessDenied.title' })}
            </h1>
            <p className="text-gray-600">
              {intl.formatMessage({ id: 'admin.dashboard.accessDenied.message' })}
            </p>
            <p className="text-sm text-gray-500 mt-4">
              {intl.formatMessage({ id: 'admin.dashboard.accessDenied.connectedEmail' })} {user?.email || intl.formatMessage({ id: 'admin.dashboard.accessDenied.notDefined' })}
            </p>
            <p className="text-sm text-gray-500">
              {intl.formatMessage({ id: 'admin.dashboard.accessDenied.detectedRole' })} {userRole || intl.formatMessage({ id: 'admin.dashboard.accessDenied.noRole' })}
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      </AdminLayout>
    );
  }


  return (
    <AdminLayout>
      <ErrorBoundary
        onError={(error: Error, errorInfo: React.ErrorInfo) => {
          logError({
            origin: "frontend",
            userId: userId,
            error: error.message,
            context: {
              component: "AdminDashboard",
              componentStack: errorInfo.componentStack,
            },
          });
        }}
      >
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <div className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {intl.formatMessage({ id: 'admin.dashboard.title' })}
                  </h1>
                  <p className="text-gray-600 mt-1">
                    {intl.formatMessage({ id: 'admin.dashboard.subtitle' })}
                  </p>
                </div>
                <div className="flex space-x-4">
                  <Button
                    onClick={() => navigate("/admin/pricing")}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <DollarSign size={20} className="mr-2" />
                    {intl.formatMessage({ id: 'admin.dashboard.buttons.pricingManagement' })}
                  </Button>
                  <Button
                    onClick={saveSettings}
                    loading={isSaving}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Save size={20} className="mr-2" />
                    {intl.formatMessage({ id: 'admin.dashboard.buttons.save' })}
                  </Button>
                  <Button
                    onClick={handleCheckIntegrity}
                    loading={isCheckingIntegrity}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Shield size={20} className="mr-2" />
                    {intl.formatMessage({ id: 'admin.dashboard.buttons.checkIntegrity' })}
                  </Button>
                  <Button
                    onClick={handleCleanupData}
                    loading={isCleaningData}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <Trash size={20} className="mr-2" />
                    {intl.formatMessage({ id: 'admin.dashboard.buttons.cleanData' })}
                  </Button>
                  <Button
                    onClick={handleTestNotifications}
                    loading={isTestingNotifications}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Mail size={20} className="mr-2" />
                    {intl.formatMessage({ id: 'admin.dashboard.buttons.testNotifications' })}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {intl.formatMessage({ id: 'admin.dashboard.stats.totalCalls' })}
                    </p>
                    <p className="text-3xl font-bold text-gray-900">
                      {stats.totalCalls.toLocaleString()}
                    </p>
                  </div>
                  <Phone className="w-8 h-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {intl.formatMessage({ id: 'admin.dashboard.stats.successfulCalls' })}
                    </p>
                    <p className="text-3xl font-bold text-green-600">
                      {stats.successfulCalls.toLocaleString()}
                    </p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-green-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {intl.formatMessage({ id: 'admin.dashboard.stats.totalRevenue' })}
                    </p>
                    <p className="text-3xl font-bold text-purple-600">
                      {stats.totalRevenue.toLocaleString("fr-FR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      €
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-purple-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {intl.formatMessage({ id: 'admin.dashboard.stats.sosCommission' })}
                    </p>
                    <p className="text-3xl font-bold text-red-600">
                      {stats.platformRevenue.toLocaleString("fr-FR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      €
                    </p>
                  </div>
                  <Settings className="w-8 h-8 text-red-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {intl.formatMessage({ id: 'admin.dashboard.stats.providerRevenue' })}
                    </p>
                    <p className="text-3xl font-bold text-orange-600">
                      {stats.providerRevenue.toLocaleString("fr-FR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      €
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-orange-600" />
                </div>
              </div>
            </div>

            {/* Acces rapides vers autres sections */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Settings className="w-5 h-5 mr-2 text-blue-600" />
                  {intl.formatMessage({ id: 'admin.dashboard.quickAccess.title' })}
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Button
                    onClick={() => navigate("/admin/pricing")}
                    className="bg-green-600 hover:bg-green-700 justify-start"
                  >
                    <DollarSign size={20} className="mr-2" />
                    {intl.formatMessage({ id: 'admin.dashboard.quickAccess.pricingManagement' })}
                  </Button>
                  <Button
                    onClick={() => navigate("/admin/users")}
                    className="bg-blue-600 hover:bg-blue-700 justify-start"
                  >
                    <Users size={20} className="mr-2" />
                    {intl.formatMessage({ id: 'admin.dashboard.quickAccess.usersManagement' })}
                  </Button>
                  <Button
                    onClick={() => navigate("/admin/calls")}
                    className="bg-purple-600 hover:bg-purple-700 justify-start"
                  >
                    <Phone size={20} className="mr-2" />
                    {intl.formatMessage({ id: 'admin.dashboard.quickAccess.callsManagement' })}
                  </Button>
                  <Button
                    onClick={() => navigate("/admin/payments")}
                    className="bg-orange-600 hover:bg-orange-700 justify-start"
                  >
                    <DollarSign size={20} className="mr-2" />
                    {intl.formatMessage({ id: 'admin.dashboard.quickAccess.paymentsManagement' })}
                  </Button>
                  <Button
                    onClick={() => navigate("/admin/reviews")}
                    className="bg-yellow-600 hover:bg-yellow-700 justify-start"
                  >
                    <Star size={20} className="mr-2" />
                    {intl.formatMessage({ id: 'admin.dashboard.quickAccess.reviewsManagement' })}
                  </Button>
                  <Button
                    onClick={() => navigate("/admin/reports/country-stats")}
                    className="bg-indigo-600 hover:bg-indigo-700 justify-start"
                  >
                    <BarChart3 size={20} className="mr-2" />
                    {intl.formatMessage({ id: 'admin.dashboard.quickAccess.reportsAnalytics' })}
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Parametres Twilio */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Phone className="w-5 h-5 mr-2" />
                    {intl.formatMessage({ id: 'admin.dashboard.twilio.title' })}
                  </h2>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {intl.formatMessage({ id: 'admin.dashboard.twilio.maxAttempts' })}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={settings?.twilioSettings.maxAttempts || 3}
                      onChange={(e) =>
                        handleSettingsChange(
                          "twilioSettings.maxAttempts",
                          parseInt(e.target.value, 10)
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {intl.formatMessage({ id: 'admin.dashboard.twilio.timeoutSeconds' })}
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={60}
                      value={settings?.twilioSettings.timeoutSeconds || 30}
                      onChange={(e) =>
                        handleSettingsChange(
                          "twilioSettings.timeoutSeconds",
                          parseInt(e.target.value, 10)
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>

              {/* Parametres de notifications */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Mail className="w-5 h-5 mr-2" />
                    {intl.formatMessage({ id: 'admin.dashboard.notifications.title' })}
                  </h2>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      {intl.formatMessage({ id: 'admin.dashboard.notifications.emailEnabled' })}
                    </label>
                    <input
                      type="checkbox"
                      checked={
                        settings?.notificationSettings?.enableEmail ?? true
                      }
                      onChange={(e) =>
                        handleSettingsChange(
                          "notificationSettings.enableEmail",
                          e.target.checked
                        )
                      }
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      {intl.formatMessage({ id: 'admin.dashboard.notifications.smsEnabled' })}
                    </label>
                    <input
                      type="checkbox"
                      checked={
                        settings?.notificationSettings?.enableSMS ?? true
                      }
                      onChange={(e) =>
                        handleSettingsChange(
                          "notificationSettings.enableSMS",
                          e.target.checked
                        )
                      }
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      {intl.formatMessage({ id: 'admin.dashboard.notifications.whatsappEnabled' })}
                    </label>
                    <input
                      type="checkbox"
                      checked={
                        settings?.notificationSettings?.enableWhatsApp ?? true
                      }
                      onChange={(e) =>
                        handleSettingsChange(
                          "notificationSettings.enableWhatsApp",
                          e.target.checked
                        )
                      }
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Reviews Management */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Star className="w-5 h-5 mr-2" />
                  {intl.formatMessage({ id: 'admin.dashboard.reviews.title' })}
                </h2>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-4">
                  {intl.formatMessage({ id: 'admin.dashboard.reviews.description' })}
                </p>
                <Button onClick={() => navigate("/admin/reviews")}>
                  {intl.formatMessage({ id: 'admin.dashboard.reviews.accessButton' })}
                </Button>
              </div>
            </div>
          </div>

          {/* Integrity Check Modal */}
          <Modal
            isOpen={showIntegrityModal}
            onClose={() => setShowIntegrityModal(false)}
            title={intl.formatMessage({ id: 'admin.dashboard.integrity.modalTitle' })}
            size="large"
          >
            {integrityReport && (
              <div className="space-y-4">
                <div
                  className={`p-4 rounded-lg ${integrityReport.isValid
                    ? "bg-green-50 border border-green-200"
                    : "bg-red-50 border border-red-200"
                    }`}
                >
                  <div className="flex items-center">
                    {integrityReport.isValid ? (
                      <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                    )}
                    <h3
                      className={`font-medium ${integrityReport.isValid ? "text-green-800" : "text-red-800"}`}
                    >
                      {integrityReport.isValid
                        ? intl.formatMessage({ id: 'admin.dashboard.integrity.dataValid' })
                        : intl.formatMessage({ id: 'admin.dashboard.integrity.issuesDetected' }, { count: integrityReport.issues.length })}
                    </h3>
                  </div>
                </div>

                {integrityReport.issues.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">
                      {intl.formatMessage({ id: 'admin.dashboard.integrity.issuesTitle' })}
                    </h4>
                    <ul className="space-y-1">
                      {integrityReport.issues.map((issue, index) => (
                        <li
                          key={index}
                          className="text-sm text-red-600 flex items-start"
                        >
                          <span className="w-2 h-2 bg-red-600 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    onClick={() => setShowIntegrityModal(false)}
                    variant="outline"
                  >
                    {intl.formatMessage({ id: 'admin.dashboard.buttons.close' })}
                  </Button>
                </div>
              </div>
            )}
          </Modal>
        </div>
      </ErrorBoundary>
    </AdminLayout>
  );
};

export default AdminDashboard;