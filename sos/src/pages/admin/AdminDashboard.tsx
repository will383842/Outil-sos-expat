// src/pages/admin/AdminDashboard.tsx - PROFESSIONAL DASHBOARD
// =============================================================================
// CHANGEMENTS :
// 1. Remplacement de ExternalServicesWidget et DomainAuthorityWidget
// 2. Intégration du nouveau ProfessionalDashboard avec métriques complètes
// 3. KPIs Hero: Total inscrits, Connectés, CA, Appels, Taux succès, Durée
// 4. Graphiques professionnels: Inscriptions, Revenus (Stripe/PayPal), Appels
// 5. Filtres par période, pays, rôle, méthode de paiement
// =============================================================================

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useIntl } from "react-intl";
import {
  Shield,
  Trash,
  CheckCircle,
  AlertTriangle,
  UserCheck,
  Cog,
} from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import ProfessionalDashboard from "../../components/admin/ProfessionalDashboard";
import Button from "../../components/common/Button";
import { useAuth } from "../../contexts/AuthContext";
import { functions } from "../../config/firebase";
import { httpsCallable } from "firebase/functions";
import ErrorBoundary from "../../components/common/ErrorBoundary";
import { logError } from "../../utils/logging";
import Modal from "../../components/common/Modal";
import {
  validateDataIntegrity,
  cleanupObsoleteData,
} from "../../utils/firestore";

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

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const intl = useIntl();

  // Ref pour tracker si le composant est monté
  const mountedRef = useRef<boolean>(true);

  // Extraction sûre de l'ID et du rôle
  const userId =
    typeof (user as { id?: unknown } | null)?.id === "string"
      ? (user as { id?: string }).id
      : undefined;
  const userRole =
    typeof (user as { role?: unknown } | null)?.role === "string"
      ? (user as { role?: string }).role
      : undefined;

  // États
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showIntegrityModal, setShowIntegrityModal] = useState<boolean>(false);
  const [integrityReport, setIntegrityReport] = useState<IntegrityReport | null>(null);
  const [isCheckingIntegrity, setIsCheckingIntegrity] = useState<boolean>(false);
  const [isCleaningData, setIsCleaningData] = useState<boolean>(false);
  const [isRestoringRoles, setIsRestoringRoles] = useState<boolean>(false);
  const [roleRestorationResult, setRoleRestorationResult] = useState<{
    restored: number;
    synced: number;
    failed: number;
    skipped: number;
  } | null>(null);

  // Restauration des rôles
  const handleRestoreRoles = async () => {
    if (!user || user.role !== 'admin') return;

    setIsRestoringRoles(true);
    setRoleRestorationResult(null);

    try {
      const restoreUserRolesFn = httpsCallable<unknown, {
        totalProcessed: number;
        restored: number;
        failed: number;
        skipped: number;
      }>(functions, 'restoreUserRoles');

      const restoreResult = await restoreUserRolesFn();

      const syncAllCustomClaimsFn = httpsCallable<unknown, {
        synced: number;
        failed: number;
      }>(functions, 'syncAllCustomClaims');

      const syncResult = await syncAllCustomClaimsFn();

      if (!mountedRef.current) return;

      setRoleRestorationResult({
        restored: restoreResult.data.restored,
        synced: syncResult.data.synced,
        failed: restoreResult.data.failed + syncResult.data.failed,
        skipped: restoreResult.data.skipped,
      });

      alert(`✅ Restauration terminée!\n\n` +
        `• Rôles restaurés: ${restoreResult.data.restored}\n` +
        `• Claims synchronisés: ${syncResult.data.synced}\n` +
        `• Ignorés (vrais clients): ${restoreResult.data.skipped}\n` +
        `• Échecs: ${restoreResult.data.failed + syncResult.data.failed}`);

    } catch (error) {
      console.error('❌ Erreur restauration:', error);
      alert('❌ Erreur lors de la restauration des rôles. Voir la console pour les détails.');
    } finally {
      if (mountedRef.current) {
        setIsRestoringRoles(false);
      }
    }
  };

  // Chargement initial
  useEffect(() => {
    mountedRef.current = true;

    if (user) {
      // Simuler un court délai de chargement pour l'UX
      const timer = setTimeout(() => {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }, 500);
      return () => clearTimeout(timer);
    }

    return () => {
      mountedRef.current = false;
    };
  }, [user]);

  // Vérification intégrité des données
  const handleCheckIntegrity = async (): Promise<void> => {
    setIsCheckingIntegrity(true);
    try {
      const report = await validateDataIntegrity();

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

  // Nettoyage des données obsolètes
  const handleCleanupData = async (): Promise<void> => {
    if (
      !confirm(intl.formatMessage({ id: 'admin.dashboard.cleanup.confirmMessage' }))
    ) {
      return;
    }

    setIsCleaningData(true);
    try {
      const success = await cleanupObsoleteData();

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
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            <p className="text-gray-500">{intl.formatMessage({ id: 'admin.dashboard.loading' })}</p>
          </div>
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
                <div className="flex items-center space-x-3">
                  {/* Actions système */}
                  <Button
                    onClick={handleCheckIntegrity}
                    loading={isCheckingIntegrity}
                    variant="outline"
                    className="border-blue-300 text-blue-600 hover:bg-blue-50"
                  >
                    <Shield size={18} className="mr-2" />
                    {intl.formatMessage({ id: 'admin.dashboard.buttons.integrity' })}
                  </Button>
                  <Button
                    onClick={handleCleanupData}
                    loading={isCleaningData}
                    variant="outline"
                    className="border-orange-300 text-orange-600 hover:bg-orange-50"
                  >
                    <Trash size={18} className="mr-2" />
                    {intl.formatMessage({ id: 'admin.dashboard.buttons.clean' })}
                  </Button>
                  <Button
                    onClick={handleRestoreRoles}
                    loading={isRestoringRoles}
                    variant="outline"
                    className="border-yellow-300 text-yellow-600 hover:bg-yellow-50"
                  >
                    <UserCheck size={18} className="mr-2" />
                    {intl.formatMessage({ id: 'admin.dashboard.buttons.roles' })}
                  </Button>
                  <Button
                    onClick={() => navigate("/admin/settings")}
                    variant="outline"
                    className="border-gray-300 text-gray-600 hover:bg-gray-50"
                  >
                    <Cog size={18} className="mr-2" />
                    {intl.formatMessage({ id: 'admin.dashboard.buttons.settings' })}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content - Charts Dashboard */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Role restoration result banner */}
            {roleRestorationResult && (
              <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                  <div>
                    <p className="font-medium text-green-800">{intl.formatMessage({ id: 'admin.dashboard.roleRestoration.completed' })}</p>
                    <p className="text-sm text-green-600">
                      {intl.formatMessage({ id: 'admin.dashboard.roleRestoration.result' }, { restored: roleRestorationResult.restored, synced: roleRestorationResult.synced })}
                    </p>
                  </div>
                  <button
                    onClick={() => setRoleRestorationResult(null)}
                    className="ml-auto text-green-600 hover:text-green-800"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* Quick Navigation */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-gray-500">{intl.formatMessage({ id: 'admin.dashboard.quickAccess.label' })}</span>
                <button
                  onClick={() => navigate("/admin/users/all")}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md text-sm hover:bg-blue-100 transition-colors"
                >
                  {intl.formatMessage({ id: 'admin.dashboard.quickAccess.users' })}
                </button>
                <button
                  onClick={() => navigate("/admin/calls")}
                  className="px-3 py-1.5 bg-green-50 text-green-700 rounded-md text-sm hover:bg-green-100 transition-colors"
                >
                  {intl.formatMessage({ id: 'admin.dashboard.quickAccess.calls' })}
                </button>
                <button
                  onClick={() => navigate("/admin/finance/payments")}
                  className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-md text-sm hover:bg-purple-100 transition-colors"
                >
                  {intl.formatMessage({ id: 'admin.dashboard.quickAccess.payments' })}
                </button>
                <button
                  onClick={() => navigate("/admin/pricing")}
                  className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-md text-sm hover:bg-amber-100 transition-colors"
                >
                  {intl.formatMessage({ id: 'admin.dashboard.quickAccess.pricing' })}
                </button>
                <button
                  onClick={() => navigate("/admin/approvals/lawyers")}
                  className="px-3 py-1.5 bg-red-50 text-red-700 rounded-md text-sm hover:bg-red-100 transition-colors"
                >
                  {intl.formatMessage({ id: 'admin.dashboard.quickAccess.validations' })}
                </button>
                <button
                  onClick={() => navigate("/admin/reports/country-stats")}
                  className="px-3 py-1.5 bg-cyan-50 text-cyan-700 rounded-md text-sm hover:bg-cyan-100 transition-colors"
                >
                  {intl.formatMessage({ id: 'admin.dashboard.quickAccess.countryStats' })}
                </button>
              </div>
            </div>

            {/* Professional Dashboard with comprehensive business metrics */}
            <ProfessionalDashboard />
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
