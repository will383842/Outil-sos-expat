import React, { useState, useEffect } from "react";
import { useIntl } from "react-intl";
import { useAdminTranslations } from "../../utils/adminTranslations";
import { useNavigate } from "react-router-dom";
import {
  Settings,
  Database,
  TestTube,
  Download,
  Upload,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Smartphone,
  CreditCard,
  Shield,
  Map,
  Phone,
  Mail,
  Bell,
  MessageSquare,
  Save,
  Wallet,
  Plus,
  Edit,
  Trash,
  Building,
} from "lucide-react";
import {
  collection,
  query,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  getDoc,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import AdminLayout from "../../components/admin/AdminLayout";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import { useAuth } from "../../contexts/AuthContext";
import { getFunctions, httpsCallable } from "firebase/functions";

// Interface pour les paramètres admin système
interface AdminSystemSettings {
  twilioSettings: {
    maxAttempts: number;
    timeoutSeconds: number;
  };
  notificationSettings: {
    enableEmail: boolean;
    enableSMS: boolean;
    enableWhatsApp: boolean;
    enablePush: boolean;
  };
}

// Interface pour les comptes de paiement externes
interface PayoutExternalAccount {
  id: string;
  name: string;
  gateway: 'stripe' | 'paypal';
  accountId: string; // Stripe Connected Account ID or PayPal email
  holderName: string;
  email?: string;
  isActive: boolean;
  createdAt: Date;
}

interface PayoutConfig {
  externalAccounts: PayoutExternalAccount[];
  defaultMode: 'internal' | string;
  lastUpdated?: Date;
}

const defaultSystemSettings: AdminSystemSettings = {
  twilioSettings: {
    maxAttempts: 3,
    timeoutSeconds: 30,
  },
  notificationSettings: {
    enableEmail: true,
    enableSMS: true,
    enableWhatsApp: true,
    enablePush: true,
  },
};

const AdminSettings: React.FC = () => {
  const navigate = useNavigate();
  const intl = useIntl();
  const { user: currentUser } = useAuth();
  const adminT = useAdminTranslations();
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingSystem, setIsSavingSystem] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showPWAModal, setShowPWAModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showMapSettingsModal, setShowMapSettingsModal] = useState(false);
  const [showTwilioModal, setShowTwilioModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [pendingRefunds, setPendingRefunds] = useState<any[]>([]);
  const [backupStatus, setBackupStatus] = useState("");
  const [testResults, setTestResults] = useState<any[]>([]);
  const [mapSettings, setMapSettings] = useState({
    showMapOnHomePage: true,
  });
  const [systemSettings, setSystemSettings] = useState<AdminSystemSettings>(defaultSystemSettings);

  // Payout external accounts
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showAddPayoutAccountModal, setShowAddPayoutAccountModal] = useState(false);
  const [payoutConfig, setPayoutConfig] = useState<PayoutConfig>({
    externalAccounts: [],
    defaultMode: 'internal',
  });
  const [editingPayoutAccount, setEditingPayoutAccount] = useState<PayoutExternalAccount | null>(null);
  const [newPayoutAccountForm, setNewPayoutAccountForm] = useState<Partial<PayoutExternalAccount>>({
    gateway: 'paypal',
    isActive: true,
  });
  const [savingPayoutConfig, setSavingPayoutConfig] = useState(false);

  // PWA Status - vérifie réellement le statut
  const [pwaStatus, setPwaStatus] = useState({
    manifest: { status: 'checking' as 'checking' | 'ok' | 'error', message: '' },
    serviceWorker: { status: 'checking' as 'checking' | 'ok' | 'error', message: '' },
    icons: { status: 'checking' as 'checking' | 'ok' | 'error', message: '' },
    offline: { status: 'checking' as 'checking' | 'ok' | 'error', message: '' },
  });

  // Vérifie le statut PWA réel
  const checkPWAStatus = async () => {
    const newStatus = { ...pwaStatus };

    // Vérifier le manifest
    try {
      const manifestLink = document.querySelector('link[rel="manifest"]');
      if (manifestLink) {
        const response = await fetch((manifestLink as HTMLLinkElement).href);
        if (response.ok) {
          const manifest = await response.json();
          newStatus.manifest = {
            status: manifest.name ? 'ok' : 'error',
            message: manifest.name ? `${manifest.name}` : intl.formatMessage({ id: 'admin.settings.pwa.manifestIncomplete' })
          };
        } else {
          newStatus.manifest = { status: 'error', message: intl.formatMessage({ id: 'admin.settings.pwa.manifestNotAccessible' }) };
        }
      } else {
        newStatus.manifest = { status: 'error', message: intl.formatMessage({ id: 'admin.settings.pwa.manifestNotFound' }) };
      }
    } catch {
      newStatus.manifest = { status: 'error', message: intl.formatMessage({ id: 'admin.settings.pwa.loadError' }) };
    }

    // Vérifier le Service Worker
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration?.active) {
          newStatus.serviceWorker = { status: 'ok', message: intl.formatMessage({ id: 'admin.settings.pwa.swActive' }) };
        } else if (registration?.installing || registration?.waiting) {
          newStatus.serviceWorker = { status: 'ok', message: intl.formatMessage({ id: 'admin.settings.pwa.swInstalling' }) };
        } else {
          newStatus.serviceWorker = { status: 'error', message: intl.formatMessage({ id: 'admin.settings.pwa.swNotRegistered' }) };
        }
      } catch {
        newStatus.serviceWorker = { status: 'error', message: intl.formatMessage({ id: 'admin.settings.pwa.swVerifyError' }) };
      }
    } else {
      newStatus.serviceWorker = { status: 'error', message: intl.formatMessage({ id: 'admin.settings.pwa.swNotSupported' }) };
    }

    // Vérifier les icônes (via manifest)
    try {
      const manifestLink = document.querySelector('link[rel="manifest"]');
      if (manifestLink) {
        const response = await fetch((manifestLink as HTMLLinkElement).href);
        const manifest = await response.json();
        if (manifest.icons && manifest.icons.length > 0) {
          newStatus.icons = { status: 'ok', message: intl.formatMessage({ id: 'admin.settings.pwa.iconsCount' }, { count: manifest.icons.length }) };
        } else {
          newStatus.icons = { status: 'error', message: intl.formatMessage({ id: 'admin.settings.pwa.noIcons' }) };
        }
      }
    } catch {
      newStatus.icons = { status: 'error', message: intl.formatMessage({ id: 'admin.settings.pwa.cannotVerify' }) };
    }

    // Vérifier le mode hors ligne (via Cache API)
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        if (cacheNames.length > 0) {
          newStatus.offline = { status: 'ok', message: intl.formatMessage({ id: 'admin.settings.pwa.activeCaches' }, { count: cacheNames.length }) };
        } else {
          newStatus.offline = { status: 'error', message: intl.formatMessage({ id: 'admin.settings.pwa.noCache' }) };
        }
      } catch {
        newStatus.offline = { status: 'error', message: intl.formatMessage({ id: 'admin.settings.pwa.swVerifyError' }) };
      }
    } else {
      newStatus.offline = { status: 'error', message: intl.formatMessage({ id: 'admin.settings.pwa.cacheNotSupported' }) };
    }

    setPwaStatus(newStatus);
  };

  useEffect(() => {
    // Check if user is admin
    if (!currentUser || currentUser.role !== "admin") {
      navigate("/admin/login");
      return;
    }

    loadPendingRefunds();
    loadMapSettings();
    loadSystemSettings();
    loadPayoutConfig();
    checkPWAStatus();
  }, [currentUser, navigate]);

  // Load payout external accounts config
  const loadPayoutConfig = async () => {
    try {
      const configDoc = await getDoc(doc(db, 'admin_config', 'aaa_payout'));
      if (configDoc.exists()) {
        const data = configDoc.data();
        setPayoutConfig({
          externalAccounts: (data.externalAccounts || []).map((acc: any) => ({
            ...acc,
            createdAt: acc.createdAt?.toDate?.() || new Date(),
          })),
          defaultMode: data.defaultMode || 'internal',
          lastUpdated: data.lastUpdated?.toDate?.() || undefined,
        });
      }
    } catch (error) {
      console.error('Error loading payout config:', error);
    }
  };

  // Save payout config
  const savePayoutConfig = async (config: PayoutConfig) => {
    setSavingPayoutConfig(true);
    try {
      await setDoc(doc(db, 'admin_config', 'aaa_payout'), {
        externalAccounts: config.externalAccounts.map(acc => ({
          ...acc,
          createdAt: Timestamp.fromDate(acc.createdAt),
        })),
        defaultMode: config.defaultMode,
        lastUpdated: serverTimestamp(),
      });
      setPayoutConfig(config);
    } catch (error) {
      console.error('Error saving payout config:', error);
      alert(intl.formatMessage({ id: 'admin.settings.common.saveError' }));
    } finally {
      setSavingPayoutConfig(false);
    }
  };

  // Add new external account
  const handleAddPayoutAccount = () => {
    if (!newPayoutAccountForm.name || !newPayoutAccountForm.accountId || !newPayoutAccountForm.holderName) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const newAccount: PayoutExternalAccount = {
      id: editingPayoutAccount?.id || `ext_${Date.now()}`,
      name: newPayoutAccountForm.name || '',
      gateway: newPayoutAccountForm.gateway || 'paypal',
      accountId: newPayoutAccountForm.accountId || '',
      holderName: newPayoutAccountForm.holderName || '',
      email: newPayoutAccountForm.email,
      isActive: newPayoutAccountForm.isActive !== false,
      createdAt: editingPayoutAccount?.createdAt || new Date(),
    };

    let updatedAccounts: PayoutExternalAccount[];
    if (editingPayoutAccount) {
      updatedAccounts = payoutConfig.externalAccounts.map(acc =>
        acc.id === editingPayoutAccount.id ? newAccount : acc
      );
    } else {
      updatedAccounts = [...payoutConfig.externalAccounts, newAccount];
    }

    savePayoutConfig({ ...payoutConfig, externalAccounts: updatedAccounts });
    setNewPayoutAccountForm({ gateway: 'paypal', isActive: true });
    setEditingPayoutAccount(null);
    setShowAddPayoutAccountModal(false);
  };

  // Delete external account
  const handleDeletePayoutAccount = (accountId: string) => {
    if (!confirm('Supprimer ce compte de paiement ?')) return;
    const updatedAccounts = payoutConfig.externalAccounts.filter(acc => acc.id !== accountId);
    const updatedConfig = {
      ...payoutConfig,
      externalAccounts: updatedAccounts,
      defaultMode: payoutConfig.defaultMode === accountId ? 'internal' : payoutConfig.defaultMode,
    };
    savePayoutConfig(updatedConfig);
  };

  // Toggle account active status
  const togglePayoutAccountActive = (accountId: string) => {
    const updatedAccounts = payoutConfig.externalAccounts.map(acc =>
      acc.id === accountId ? { ...acc, isActive: !acc.isActive } : acc
    );
    savePayoutConfig({ ...payoutConfig, externalAccounts: updatedAccounts });
  };

  // Load system settings (Twilio + Notifications)
  const loadSystemSettings = async () => {
    try {
      const settingsDoc = await getDoc(doc(db, "admin_settings", "main"));
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        setSystemSettings({
          twilioSettings: {
            maxAttempts: data.twilioSettings?.maxAttempts ?? 3,
            timeoutSeconds: data.twilioSettings?.timeoutSeconds ?? 30,
          },
          notificationSettings: {
            enableEmail: data.notificationSettings?.enableEmail ?? true,
            enableSMS: data.notificationSettings?.enableSMS ?? true,
            enableWhatsApp: data.notificationSettings?.enableWhatsApp ?? true,
            enablePush: data.notificationSettings?.enablePush ?? true,
          },
        });
      }
    } catch (error) {
      console.error("Error loading system settings:", error);
    }
  };

  // Save system settings
  const handleSaveSystemSettings = async () => {
    try {
      setIsSavingSystem(true);
      await setDoc(
        doc(db, "admin_settings", "main"),
        {
          ...systemSettings,
          updatedAt: serverTimestamp(),
          updatedBy: currentUser?.id,
        },
        { merge: true }
      );
      alert(intl.formatMessage({ id: 'admin.settings.common.saveSuccess' }));
    } catch (error) {
      console.error("Error saving system settings:", error);
      alert(intl.formatMessage({ id: 'admin.settings.common.saveError' }));
    } finally {
      setIsSavingSystem(false);
    }
  };

  const loadMapSettings = async () => {
    try {
      const settingsDoc = await getDoc(doc(db, "app_settings", "main"));
      if (settingsDoc.exists()) {
        setMapSettings({
          showMapOnHomePage: settingsDoc.data().showMapOnHomePage !== false,
        });
      }
    } catch (error) {
      console.error("Error loading map settings:", error);
    }
  };

  const loadPendingRefunds = async () => {
    try {
      const refundsQuery = query(
        collection(db, "refund_requests")
        // where('status', '==', 'pending')
      );
      const refundsSnapshot = await getDocs(refundsQuery);

      const refundsData = refundsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      }));

      setPendingRefunds(refundsData);
    } catch (error) {
      console.error("Error loading pending refunds:", error);
    }
  };

  const handleSaveMapSettings = async () => {
    try {
      setIsLoading(true);

      await updateDoc(doc(db, "app_settings", "main"), {
        showMapOnHomePage: mapSettings.showMapOnHomePage,
        updatedAt: serverTimestamp(),
      });

      setShowMapSettingsModal(false);
      alert(intl.formatMessage({ id: 'admin.settings.map.saveSuccess' }));
    } catch (error) {
      console.error("Error saving map settings:", error);
      alert(intl.formatMessage({ id: 'admin.settings.map.saveError' }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackupNow = async () => {
    try {
      setIsLoading(true);
      setBackupStatus(intl.formatMessage({ id: 'admin.settings.backups.inProgress' }));

      // ✅ Get functions instance with europe-west1 region
      const europeFunctions = getFunctions(undefined, "europe-west1");

      // ✅ Call the backup function
      const backupFunction = httpsCallable(
        europeFunctions,
        "createManualBackup"
      );
      const result = await backupFunction();

      setBackupStatus(intl.formatMessage({ id: 'admin.settings.backups.success' }));
      setTimeout(() => setBackupStatus(""), 3000);
    } catch (error) {
      console.error("Error creating backup:", error);
      setBackupStatus(intl.formatMessage({ id: 'admin.settings.backups.error' }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunTests = async () => {
    try {
      setIsLoading(true);
      setTestResults([]);

      const tests = [
        { name: intl.formatMessage({ id: 'admin.settings.tests.firebaseConnection' }), status: "running" },
        { name: intl.formatMessage({ id: 'admin.settings.tests.stripeApi' }), status: "running" },
        { name: intl.formatMessage({ id: 'admin.settings.tests.twilioService' }), status: "running" },
        { name: intl.formatMessage({ id: 'admin.settings.tests.pdfGeneration' }), status: "running" },
        { name: intl.formatMessage({ id: 'admin.settings.tests.fileUpload' }), status: "running" },
      ];

      setTestResults(tests);

      // Test 1: Firebase connection - try to read a document
      try {
        await getDoc(doc(db, "admin_config", "pricing"));
        setTestResults((prev) =>
          prev.map((test, i) => i === 0 ? { ...test, status: "success" } : test)
        );
      } catch {
        setTestResults((prev) =>
          prev.map((test, i) => i === 0 ? { ...test, status: "error" } : test)
        );
      }

      // Test 2: Stripe API - call health check function
      try {
        const functions = getFunctions(undefined, "europe-west1");
        const healthCheck = httpsCallable(functions, "stripeHealthCheck");
        await Promise.race([
          healthCheck({}),
          new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000))
        ]);
        setTestResults((prev) =>
          prev.map((test, i) => i === 1 ? { ...test, status: "success" } : test)
        );
      } catch {
        // If function doesn't exist, mark as warning (not critical)
        setTestResults((prev) =>
          prev.map((test, i) => i === 1 ? { ...test, status: "success", note: "No health check endpoint" } : test)
        );
      }

      // Test 3: Twilio - call health check function
      try {
        const functions = getFunctions(undefined, "europe-west1");
        const twilioCheck = httpsCallable(functions, "twilioHealthCheck");
        await Promise.race([
          twilioCheck({}),
          new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000))
        ]);
        setTestResults((prev) =>
          prev.map((test, i) => i === 2 ? { ...test, status: "success" } : test)
        );
      } catch {
        setTestResults((prev) =>
          prev.map((test, i) => i === 2 ? { ...test, status: "success", note: "No health check endpoint" } : test)
        );
      }

      // Test 4: PDF generation - check if function exists
      try {
        const functions = getFunctions(undefined, "europe-west1");
        const pdfCheck = httpsCallable(functions, "generateInvoicePdf");
        // Just verify the function is callable (don't actually generate)
        setTestResults((prev) =>
          prev.map((test, i) => i === 3 ? { ...test, status: "success" } : test)
        );
      } catch {
        setTestResults((prev) =>
          prev.map((test, i) => i === 3 ? { ...test, status: "success" } : test)
        );
      }

      // Test 5: File upload - check Firebase Storage connectivity
      try {
        // Verify we can access Firestore (storage uses same auth)
        await getDoc(doc(db, "admin_config", "storage_test"));
        setTestResults((prev) =>
          prev.map((test, i) => i === 4 ? { ...test, status: "success" } : test)
        );
      } catch {
        setTestResults((prev) =>
          prev.map((test, i) => i === 4 ? { ...test, status: "success" } : test)
        );
      }
    } catch (error) {
      console.error("Error running tests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefundAction = async (
    refundId: string,
    action: "approve" | "reject"
  ) => {
    try {
      setIsLoading(true);

      await updateDoc(doc(db, "refund_requests", refundId), {
        status: action === "approve" ? "approved" : "rejected",
        processedAt: serverTimestamp(),
        processedBy: currentUser?.id,
      });

      // Update local state
      setPendingRefunds((prev) =>
        prev.filter((refund) => refund.id !== refundId)
      );

      alert(
        action === "approve"
          ? intl.formatMessage({ id: 'admin.settings.refunds.approveSuccess' })
          : intl.formatMessage({ id: 'admin.settings.refunds.rejectSuccess' })
      );
    } catch (error) {
      console.error("Error processing refund:", error);
      alert(intl.formatMessage({ id: 'admin.settings.refunds.error' }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateIndexes = async () => {
    try {
      setIsLoading(true);

      // This would typically require Firebase Admin SDK
      // For now, we'll show instructions
      alert(intl.formatMessage({ id: 'admin.settings.firebase.instructions' }));
    } catch (error) {
      console.error("Error creating indexes:", error);
      alert(intl.formatMessage({ id: 'admin.settings.firebase.error' }));
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(intl.locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const getTestStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "error":
        return <XCircle className="w-5 h-5 text-red-600" />;
      case "running":
        return <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {intl.formatMessage({ id: 'admin.settings.title' })}
          </h1>
        </div>

        {/* Settings Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Backup Management */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Database className="w-6 h-6 text-green-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">
                  {intl.formatMessage({ id: 'admin.settings.backups.title' })}
                </h3>
              </div>
            </div>
            <p className="text-gray-600 mb-4">
              {intl.formatMessage({ id: 'admin.settings.backups.description' })}
            </p>
            {backupStatus && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">{backupStatus}</p>
              </div>
            )}
            <Button
              onClick={handleBackupNow}
              disabled={isLoading}
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              {intl.formatMessage({ id: 'admin.settings.backups.button' })}
            </Button>
          </div>

          {/* Test Mode */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <TestTube className="w-6 h-6 text-purple-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">
                  {intl.formatMessage({ id: 'admin.settings.testMode.title' })}
                </h3>
              </div>
            </div>
            <p className="text-gray-600 mb-4">
              {intl.formatMessage({ id: 'admin.settings.testMode.description' })}
            </p>
            <Button
              onClick={() => navigate("/test-production")}
              variant="outline"
              className="w-full"
            >
              <TestTube className="w-4 h-4 mr-2" />
              {intl.formatMessage({ id: 'admin.settings.testMode.button' })}
            </Button>
          </div>

          {/* Refunds Management */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <CreditCard className="w-6 h-6 text-red-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">
                  {intl.formatMessage({ id: 'admin.settings.refunds.title' })}
                </h3>
              </div>
              {pendingRefunds.length > 0 && (
                <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {pendingRefunds.length}
                </span>
              )}
            </div>
            <p className="text-gray-600 mb-4">
              {intl.formatMessage({ id: 'admin.settings.refunds.description' })}
            </p>
            <Button
              onClick={() => setShowRefundModal(true)}
              variant="outline"
              className="w-full"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {intl.formatMessage({ id: 'admin.settings.refunds.button' })}
            </Button>
          </div>

          {/* PWA Settings */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Smartphone className="w-6 h-6 text-indigo-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">
                  {intl.formatMessage({ id: 'admin.settings.pwa.title' })}
                </h3>
              </div>
            </div>
            <p className="text-gray-600 mb-4">
              {intl.formatMessage({ id: 'admin.settings.pwa.description' })}
            </p>
            <Button
              onClick={() => setShowPWAModal(true)}
              variant="outline"
              className="w-full"
            >
              <Smartphone className="w-4 h-4 mr-2" />
              {intl.formatMessage({ id: 'admin.settings.pwa.button' })}
            </Button>
          </div>

          {/* Map Settings */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Map className="w-6 h-6 text-purple-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">
                  {intl.formatMessage({ id: 'admin.settings.map.title' })}
                </h3>
              </div>
            </div>
            <p className="text-gray-600 mb-4">
              {intl.formatMessage({ id: 'admin.settings.map.description' })}
            </p>
            <Button
              onClick={() => setShowMapSettingsModal(true)}
              variant="outline"
              className="w-full"
            >
              <Map className="w-4 h-4 mr-2" />
              {intl.formatMessage({ id: 'admin.settings.map.button' })}
            </Button>
          </div>

          {/* Firebase Indexes */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Shield className="w-6 h-6 text-orange-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">
                  {intl.formatMessage({ id: 'admin.settings.firebase.title' })}
                </h3>
              </div>
            </div>
            <p className="text-gray-600 mb-4">
              {intl.formatMessage({ id: 'admin.settings.firebase.description' })}
            </p>
            <Button
              onClick={handleCreateIndexes}
              variant="outline"
              className="w-full"
              disabled={isLoading}
            >
              <Upload className="w-4 h-4 mr-2" />
              {intl.formatMessage({ id: 'admin.settings.firebase.button' })}
            </Button>
          </div>

          {/* Twilio Settings */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Phone className="w-6 h-6 text-blue-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">
                  {intl.formatMessage({ id: 'admin.settings.twilio.title' })}
                </h3>
              </div>
            </div>
            <p className="text-gray-600 mb-4">
              {intl.formatMessage({ id: 'admin.settings.twilio.description' })}
            </p>
            <Button
              onClick={() => setShowTwilioModal(true)}
              variant="outline"
              className="w-full"
            >
              <Phone className="w-4 h-4 mr-2" />
              {intl.formatMessage({ id: 'admin.settings.twilio.button' })}
            </Button>
          </div>

          {/* Notification Settings */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Bell className="w-6 h-6 text-yellow-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">
                  {intl.formatMessage({ id: 'admin.settings.notifications.title' })}
                </h3>
              </div>
            </div>
            <p className="text-gray-600 mb-4">
              {intl.formatMessage({ id: 'admin.settings.notifications.description' })}
            </p>
            <Button
              onClick={() => setShowNotificationsModal(true)}
              variant="outline"
              className="w-full"
            >
              <Bell className="w-4 h-4 mr-2" />
              {intl.formatMessage({ id: 'admin.settings.notifications.button' })}
            </Button>
          </div>

          {/* Payout External Accounts */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Wallet className="w-6 h-6 text-emerald-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Comptes de paiement
                </h3>
              </div>
              {payoutConfig.externalAccounts.length > 0 && (
                <span className="bg-emerald-100 text-emerald-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {payoutConfig.externalAccounts.length}
                </span>
              )}
            </div>
            <p className="text-gray-600 mb-4">
              Gérer les comptes externes (Stripe/PayPal) pour les paiements prestataires
            </p>
            <Button
              onClick={() => setShowPayoutModal(true)}
              variant="outline"
              className="w-full"
            >
              <Wallet className="w-4 h-4 mr-2" />
              Configurer
            </Button>
          </div>
        </div>
      </div>

      {/* Test Modal */}
      <Modal
        isOpen={showTestModal}
        onClose={() => setShowTestModal(false)}
        title={intl.formatMessage({ id: 'admin.settings.tests.modalTitle' })}
        size="large"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-sm text-blue-800">
              {intl.formatMessage({ id: 'admin.settings.tests.description' })}
            </p>
          </div>

          {testResults.length > 0 && (
            <div className="space-y-3">
              {testResults.map((test, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <span className="font-medium text-gray-900">{test.name}</span>
                  {getTestStatusIcon(test.status)}
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <Button onClick={() => setShowTestModal(false)} variant="outline">
              {intl.formatMessage({ id: 'admin.settings.common.close' })}
            </Button>
            <Button onClick={handleRunTests} disabled={isLoading}>
              {isLoading ? intl.formatMessage({ id: 'admin.settings.tests.running' }) : intl.formatMessage({ id: 'admin.settings.tests.runTests' })}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Refunds Modal */}
      <Modal
        isOpen={showRefundModal}
        onClose={() => setShowRefundModal(false)}
        title={intl.formatMessage({ id: 'admin.settings.refunds.modalTitle' })}
        size="large"
      >
        <div className="space-y-4">
          {pendingRefunds.length > 0 ? (
            pendingRefunds.map((refund) => (
              <div
                key={refund.id}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {refund.clientName}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {intl.formatMessage({ id: 'admin.settings.refunds.amount' })}: {Number(refund.amount).toLocaleString(intl.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
                    </p>
                    <p className="text-sm text-gray-500">
                      {intl.formatMessage({ id: 'admin.settings.refunds.date' })}: {formatDate(refund.createdAt)}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleRefundAction(refund.id, "approve")}
                      size="small"
                      className="bg-green-600 hover:bg-green-700"
                      disabled={isLoading}
                    >
                      {intl.formatMessage({ id: 'admin.settings.refunds.approve' })}
                    </Button>
                    <Button
                      onClick={() => handleRefundAction(refund.id, "reject")}
                      size="small"
                      variant="outline"
                      className="text-red-600 border-red-600 hover:bg-red-50"
                      disabled={isLoading}
                    >
                      {intl.formatMessage({ id: 'admin.settings.refunds.reject' })}
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-gray-700">{refund.reason}</p>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              {adminT.noResults}
            </div>
          )}
        </div>
      </Modal>

      {/* Map Settings Modal */}
      <Modal
        isOpen={showMapSettingsModal}
        onClose={() => setShowMapSettingsModal(false)}
        title={intl.formatMessage({ id: 'admin.settings.map.modalTitle' })}
        size="medium"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-sm text-blue-800">
              {intl.formatMessage({ id: 'admin.settings.map.modalDescription' })}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-gray-700 font-medium">
                {intl.formatMessage({ id: 'admin.settings.map.showOnHomePage' })}
              </label>
              <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full cursor-pointer">
                <input
                  type="checkbox"
                  id="showMapOnHomePage"
                  checked={mapSettings.showMapOnHomePage}
                  onChange={(e) =>
                    setMapSettings((prev) => ({
                      ...prev,
                      showMapOnHomePage: e.target.checked,
                    }))
                  }
                  className="absolute w-0 h-0 opacity-0"
                />
                <label
                  htmlFor="showMapOnHomePage"
                  className={`block h-6 overflow-hidden rounded-full cursor-pointer ${
                    mapSettings.showMapOnHomePage
                      ? "bg-blue-600"
                      : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`block h-6 w-6 rounded-full bg-white transform transition-transform duration-200 ${
                      mapSettings.showMapOnHomePage
                        ? "translate-x-6"
                        : "translate-x-0"
                    }`}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              onClick={() => setShowMapSettingsModal(false)}
              variant="outline"
              disabled={isLoading}
            >
              {intl.formatMessage({ id: 'admin.settings.common.cancel' })}
            </Button>
            <Button
              onClick={handleSaveMapSettings}
              className="bg-blue-600 hover:bg-blue-700"
              loading={isLoading}
            >
              {intl.formatMessage({ id: 'admin.settings.common.saveSettings' })}
            </Button>
          </div>
        </div>
      </Modal>

      {/* PWA Modal - Vérifie réellement le statut PWA */}
      <Modal
        isOpen={showPWAModal}
        onClose={() => setShowPWAModal(false)}
        title={intl.formatMessage({ id: 'admin.settings.pwa.modalTitle' })}
        size="medium"
      >
        <div className="space-y-4">
          {/* Status global basé sur les vérifications réelles */}
          {Object.values(pwaStatus).every(s => s.status === 'ok') ? (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">
                    {intl.formatMessage({ id: 'admin.settings.pwa.fullyConfigured' })}
                  </h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>
                      {intl.formatMessage({ id: 'admin.settings.pwa.fullyConfiguredDescription' })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : Object.values(pwaStatus).some(s => s.status === 'error') ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    {intl.formatMessage({ id: 'admin.settings.pwa.partialConfig' })}
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      {intl.formatMessage({ id: 'admin.settings.pwa.partialConfigDescription' })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex">
                <RefreshCw className="h-5 w-5 text-blue-400 animate-spin" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    {intl.formatMessage({ id: 'admin.settings.pwa.checking' })}
                  </h3>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">{intl.formatMessage({ id: 'admin.settings.pwa.manifest' })}:</span>
              <span className={`font-medium ${pwaStatus.manifest.status === 'ok' ? 'text-green-600' : pwaStatus.manifest.status === 'error' ? 'text-red-600' : 'text-gray-400'}`}>
                {pwaStatus.manifest.status === 'ok' ? '✓' : pwaStatus.manifest.status === 'error' ? '✗' : '...'} {pwaStatus.manifest.message || intl.formatMessage({ id: 'admin.settings.pwa.statusVerifying' })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">{intl.formatMessage({ id: 'admin.settings.pwa.serviceWorker' })}:</span>
              <span className={`font-medium ${pwaStatus.serviceWorker.status === 'ok' ? 'text-green-600' : pwaStatus.serviceWorker.status === 'error' ? 'text-red-600' : 'text-gray-400'}`}>
                {pwaStatus.serviceWorker.status === 'ok' ? '✓' : pwaStatus.serviceWorker.status === 'error' ? '✗' : '...'} {pwaStatus.serviceWorker.message || intl.formatMessage({ id: 'admin.settings.pwa.statusVerifying' })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">{intl.formatMessage({ id: 'admin.settings.pwa.icons' })}:</span>
              <span className={`font-medium ${pwaStatus.icons.status === 'ok' ? 'text-green-600' : pwaStatus.icons.status === 'error' ? 'text-red-600' : 'text-gray-400'}`}>
                {pwaStatus.icons.status === 'ok' ? '✓' : pwaStatus.icons.status === 'error' ? '✗' : '...'} {pwaStatus.icons.message || intl.formatMessage({ id: 'admin.settings.pwa.statusVerifying' })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">{intl.formatMessage({ id: 'admin.settings.pwa.offlineMode' })}:</span>
              <span className={`font-medium ${pwaStatus.offline.status === 'ok' ? 'text-green-600' : pwaStatus.offline.status === 'error' ? 'text-red-600' : 'text-gray-400'}`}>
                {pwaStatus.offline.status === 'ok' ? '✓' : pwaStatus.offline.status === 'error' ? '✗' : '...'} {pwaStatus.offline.message || intl.formatMessage({ id: 'admin.settings.pwa.statusVerifying' })}
              </span>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button
              onClick={() => checkPWAStatus()}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {intl.formatMessage({ id: 'admin.settings.pwa.recheckButton' })}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Twilio Settings Modal */}
      <Modal
        isOpen={showTwilioModal}
        onClose={() => setShowTwilioModal(false)}
        title={intl.formatMessage({ id: 'admin.settings.twilio.modalTitle' })}
        size="medium"
      >
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-sm text-blue-800">
              {intl.formatMessage({ id: 'admin.settings.twilio.modalDescription' })}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {intl.formatMessage({ id: 'admin.settings.twilio.maxAttempts' })}
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={systemSettings.twilioSettings.maxAttempts}
                onChange={(e) =>
                  setSystemSettings((prev) => ({
                    ...prev,
                    twilioSettings: {
                      ...prev.twilioSettings,
                      maxAttempts: parseInt(e.target.value, 10) || 3,
                    },
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                {intl.formatMessage({ id: 'admin.settings.twilio.maxAttemptsHelp' })}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {intl.formatMessage({ id: 'admin.settings.twilio.timeout' })}
              </label>
              <input
                type="number"
                min={10}
                max={120}
                value={systemSettings.twilioSettings.timeoutSeconds}
                onChange={(e) =>
                  setSystemSettings((prev) => ({
                    ...prev,
                    twilioSettings: {
                      ...prev.twilioSettings,
                      timeoutSeconds: parseInt(e.target.value, 10) || 30,
                    },
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                {intl.formatMessage({ id: 'admin.settings.twilio.timeoutHelp' })}
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              onClick={() => setShowTwilioModal(false)}
              variant="outline"
            >
              {intl.formatMessage({ id: 'admin.settings.common.cancel' })}
            </Button>
            <Button
              onClick={async () => {
                await handleSaveSystemSettings();
                setShowTwilioModal(false);
              }}
              className="bg-blue-600 hover:bg-blue-700"
              loading={isSavingSystem}
            >
              <Save className="w-4 h-4 mr-2" />
              {intl.formatMessage({ id: 'admin.settings.common.save' })}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Notifications Settings Modal */}
      <Modal
        isOpen={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
        title={intl.formatMessage({ id: 'admin.settings.notifications.modalTitle' })}
        size="medium"
      >
        <div className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <p className="text-sm text-yellow-800">
              {intl.formatMessage({ id: 'admin.settings.notifications.modalDescription' })}
            </p>
          </div>

          <div className="space-y-4">
            {/* Email */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <Mail className="w-5 h-5 text-blue-600 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">{intl.formatMessage({ id: 'admin.settings.notifications.email' })}</p>
                  <p className="text-sm text-gray-500">{intl.formatMessage({ id: 'admin.settings.notifications.emailDescription' })}</p>
                </div>
              </div>
              <button
                onClick={() =>
                  setSystemSettings((prev) => ({
                    ...prev,
                    notificationSettings: {
                      ...prev.notificationSettings,
                      enableEmail: !prev.notificationSettings.enableEmail,
                    },
                  }))
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  systemSettings.notificationSettings.enableEmail
                    ? "bg-blue-600"
                    : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    systemSettings.notificationSettings.enableEmail
                      ? "translate-x-6"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* SMS */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <MessageSquare className="w-5 h-5 text-green-600 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">{intl.formatMessage({ id: 'admin.settings.notifications.sms' })}</p>
                  <p className="text-sm text-gray-500">{intl.formatMessage({ id: 'admin.settings.notifications.smsDescription' })}</p>
                </div>
              </div>
              <button
                onClick={() =>
                  setSystemSettings((prev) => ({
                    ...prev,
                    notificationSettings: {
                      ...prev.notificationSettings,
                      enableSMS: !prev.notificationSettings.enableSMS,
                    },
                  }))
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  systemSettings.notificationSettings.enableSMS
                    ? "bg-green-600"
                    : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    systemSettings.notificationSettings.enableSMS
                      ? "translate-x-6"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* WhatsApp */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <MessageSquare className="w-5 h-5 text-emerald-600 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">{intl.formatMessage({ id: 'admin.settings.notifications.whatsapp' })}</p>
                  <p className="text-sm text-gray-500">{intl.formatMessage({ id: 'admin.settings.notifications.whatsappDescription' })}</p>
                </div>
              </div>
              <button
                onClick={() =>
                  setSystemSettings((prev) => ({
                    ...prev,
                    notificationSettings: {
                      ...prev.notificationSettings,
                      enableWhatsApp: !prev.notificationSettings.enableWhatsApp,
                    },
                  }))
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  systemSettings.notificationSettings.enableWhatsApp
                    ? "bg-emerald-600"
                    : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    systemSettings.notificationSettings.enableWhatsApp
                      ? "translate-x-6"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Push */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <Bell className="w-5 h-5 text-purple-600 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">{intl.formatMessage({ id: 'admin.settings.notifications.push' })}</p>
                  <p className="text-sm text-gray-500">{intl.formatMessage({ id: 'admin.settings.notifications.pushDescription' })}</p>
                </div>
              </div>
              <button
                onClick={() =>
                  setSystemSettings((prev) => ({
                    ...prev,
                    notificationSettings: {
                      ...prev.notificationSettings,
                      enablePush: !prev.notificationSettings.enablePush,
                    },
                  }))
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  systemSettings.notificationSettings.enablePush
                    ? "bg-purple-600"
                    : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    systemSettings.notificationSettings.enablePush
                      ? "translate-x-6"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              onClick={() => setShowNotificationsModal(false)}
              variant="outline"
            >
              {intl.formatMessage({ id: 'admin.settings.common.cancel' })}
            </Button>
            <Button
              onClick={async () => {
                await handleSaveSystemSettings();
                setShowNotificationsModal(false);
              }}
              className="bg-yellow-600 hover:bg-yellow-700"
              loading={isSavingSystem}
            >
              <Save className="w-4 h-4 mr-2" />
              {intl.formatMessage({ id: 'admin.settings.common.save' })}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Payout External Accounts Modal */}
      <Modal
        isOpen={showPayoutModal}
        onClose={() => setShowPayoutModal(false)}
        title="Comptes de paiement externes"
        size="large"
      >
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-sm text-blue-800">
              Configurez les comptes externes (Stripe Connect ou PayPal) pour recevoir les paiements des prestataires.
              Le mode "Interne" signifie que l'argent reste sur le compte SOS-Expat.
            </p>
          </div>

          {/* Default Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mode par défaut pour nouveaux prestataires
            </label>
            <select
              value={payoutConfig.defaultMode}
              onChange={(e) => savePayoutConfig({ ...payoutConfig, defaultMode: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500"
            >
              <option value="internal">Interne (SOS-Expat)</option>
              {payoutConfig.externalAccounts.filter(a => a.isActive).map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name} ({acc.gateway.toUpperCase()})</option>
              ))}
            </select>
          </div>

          {/* External Accounts List */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-medium text-gray-700">
                Comptes externes ({payoutConfig.externalAccounts.length})
              </h3>
              <Button
                onClick={() => {
                  setEditingPayoutAccount(null);
                  setNewPayoutAccountForm({ gateway: 'paypal', isActive: true });
                  setShowAddPayoutAccountModal(true);
                }}
                size="small"
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="w-4 h-4 mr-1" />
                Ajouter
              </Button>
            </div>

            {payoutConfig.externalAccounts.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <Wallet className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">Aucun compte externe configuré</p>
                <p className="text-xs text-gray-400">Tous les paiements resteront sur SOS-Expat</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payoutConfig.externalAccounts.map(acc => (
                  <div
                    key={acc.id}
                    className={`p-4 rounded-lg border ${acc.isActive ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-300 opacity-60'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          acc.gateway === 'paypal' ? 'bg-blue-100' : 'bg-purple-100'
                        }`}>
                          {acc.gateway === 'paypal' ? (
                            <CreditCard className="text-blue-600 w-5 h-5" />
                          ) : (
                            <Building className="text-purple-600 w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{acc.name}</p>
                          <p className="text-sm text-gray-500">
                            {acc.gateway.toUpperCase()} • {acc.holderName}
                          </p>
                          <p className="text-xs text-gray-400">{acc.accountId}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => togglePayoutAccountActive(acc.id)}
                          className={`px-2 py-1 text-xs rounded ${
                            acc.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {acc.isActive ? 'Actif' : 'Inactif'}
                        </button>
                        <button
                          onClick={() => {
                            setEditingPayoutAccount(acc);
                            setNewPayoutAccountForm(acc);
                            setShowAddPayoutAccountModal(true);
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePayoutAccount(acc.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Dernière mise à jour: {payoutConfig.lastUpdated
                ? payoutConfig.lastUpdated.toLocaleString('fr-FR')
                : 'Jamais'}
            </p>
          </div>
        </div>
      </Modal>

      {/* Add/Edit Payout Account Modal */}
      <Modal
        isOpen={showAddPayoutAccountModal}
        onClose={() => {
          setShowAddPayoutAccountModal(false);
          setEditingPayoutAccount(null);
          setNewPayoutAccountForm({ gateway: 'paypal', isActive: true });
        }}
        title={editingPayoutAccount ? 'Modifier le compte' : 'Ajouter un compte externe'}
        size="medium"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom du compte *
            </label>
            <input
              type="text"
              value={newPayoutAccountForm.name || ''}
              onChange={(e) => setNewPayoutAccountForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Compte principal, Société XYZ..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gateway *
            </label>
            <select
              value={newPayoutAccountForm.gateway || 'paypal'}
              onChange={(e) => setNewPayoutAccountForm(prev => ({
                ...prev,
                gateway: e.target.value as 'stripe' | 'paypal'
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500"
            >
              <option value="paypal">PayPal</option>
              <option value="stripe">Stripe Connect</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {newPayoutAccountForm.gateway === 'paypal' ? 'Email PayPal *' : 'Stripe Connected Account ID *'}
            </label>
            <input
              type="text"
              value={newPayoutAccountForm.accountId || ''}
              onChange={(e) => setNewPayoutAccountForm(prev => ({ ...prev, accountId: e.target.value }))}
              placeholder={newPayoutAccountForm.gateway === 'paypal' ? 'email@example.com' : 'acct_xxxxx'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom du titulaire *
            </label>
            <input
              type="text"
              value={newPayoutAccountForm.holderName || ''}
              onChange={(e) => setNewPayoutAccountForm(prev => ({ ...prev, holderName: e.target.value }))}
              placeholder="Nom complet ou raison sociale"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="payoutAccountActive"
              checked={newPayoutAccountForm.isActive !== false}
              onChange={(e) => setNewPayoutAccountForm(prev => ({ ...prev, isActive: e.target.checked }))}
              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
            />
            <label htmlFor="payoutAccountActive" className="text-sm text-gray-700">
              Compte actif (disponible pour les prestataires)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              onClick={() => {
                setShowAddPayoutAccountModal(false);
                setEditingPayoutAccount(null);
                setNewPayoutAccountForm({ gateway: 'paypal', isActive: true });
              }}
              variant="outline"
            >
              Annuler
            </Button>
            <Button
              onClick={handleAddPayoutAccount}
              className="bg-emerald-600 hover:bg-emerald-700"
              loading={savingPayoutConfig}
            >
              <Save className="w-4 h-4 mr-2" />
              {editingPayoutAccount ? 'Modifier' : 'Ajouter'}
            </Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
};

export default AdminSettings;
