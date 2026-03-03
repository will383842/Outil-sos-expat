import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { logError } from '../../utils/logging';
import { Tabs, Tab } from "../../components/ui/tabs"; 

// Importation des composants des pages (à créer)
import CampaignsPage from "../../emails/admin/AdminEmails/CampaignsPage";
import TemplatesManager from "../../emails/admin/AdminEmails/TemplatesManager";
import SendToContact from "../../emails/admin/AdminEmails/SendToContact";
import SendToOne from "../../emails/admin/AdminEmails/SendToOne";
import SendToRoles from "../../emails/admin/AdminEmails/SendToRoles";
import SendToSelection from "../../emails/admin/AdminEmails/SendToSelection";
import LogsPage from "../../emails/admin/AdminEmails/LogsPage";
import EmailPreviewModal from "../../emails/admin/AdminEmails/EmailPreviewModal";


const AdminEmailsPage: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Vérification de l'authentification et du rôle admin
  useEffect(() => {
    if (user) {
      setIsLoading(false);
    }
  }, [user]);

  // Check authentication
  if (!user) {
    return (
      <AdminLayout>
        <LoadingSpinner size="large" fullPage />
      </AdminLayout>
    );
  }

  // Check admin role
  if (user?.role !== 'admin') {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Accès non autorisé
            </h1>
            <p className="text-gray-600">
              Vous devez être administrateur pour accéder à cette page.
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <LoadingSpinner size="large" fullPage />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <ErrorBoundary
        onError={(error: Error, errorInfo: React.ErrorInfo) => {
          logError({
            origin: 'frontend',
            userId: user?.id,
            error: error.message,
            context: {
              component: 'AdminEmailsPage',
              componentStack: errorInfo.componentStack
            }
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
                    📬 Gestion des Emails
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Centre de contrôle pour toutes les communications par email
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Tabs defaultValue="campaigns" className="w-full">
              <Tab value="campaigns" label="📆 Campagnes programmées">
                <CampaignsPage />
              </Tab>
              <Tab value="templates" label="🧱 Templates d'emails">
                <TemplatesManager />
              </Tab>
              <Tab value="contact" label="✉️ Répondre à un message de contact">
                <SendToContact />
              </Tab>
              <Tab value="sendOne" label="👤 Envoi individuel">
                <SendToOne />
              </Tab>
              <Tab value="sendRole" label="👥 Envoi par rôle">
                <SendToRoles />
              </Tab>
              <Tab value="sendSelection" label="✅ Envoi ciblé manuel">
                <SendToSelection />
              </Tab>
              <Tab value="logs" label="🕓 Historique des envois">
                <LogsPage />
              </Tab>
            </Tabs>

            {/* Aperçu HTML/MJML à activer globalement si nécessaire */}
            <EmailPreviewModal />
          </div>
        </div>
      </ErrorBoundary>
    </AdminLayout>
  );
};

export default AdminEmailsPage;

