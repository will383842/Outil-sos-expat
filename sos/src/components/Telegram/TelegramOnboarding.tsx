/**
 * TelegramOnboarding - Composant générique pour lier Telegram
 * Utilisé par tous les rôles : chatter, influencer, blogger, groupAdmin, etc.
 *
 * Appelle l'API Laravel Engine (pas Firebase) pour tout ce qui est Telegram.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../contexts/AuthContext';
import { telegramOnboardingApi } from '../../config/telegramEngine';
import {
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  RefreshCw,
  ArrowRight,
  MessageSquare,
} from 'lucide-react';

// Types
type TelegramRole = 'chatter' | 'influencer' | 'blogger' | 'groupAdmin' | 'group_admin' | 'affiliate' | 'client' | 'lawyer' | 'expat' | 'captain' | 'captain_chatter' | 'partner';

interface TelegramOnboardingProps {
  role: TelegramRole;
  dashboardPath: string;
  skipPath: string;
  title?: string;
  subtitle?: string;
}

interface GenerateLinkResponse {
  success: boolean;
  code: string;
  deepLink: string;
  expiresAt: string;
}

interface CheckStatusResponse {
  success: boolean;
  status: 'none' | 'pending' | 'linked' | 'expired';
  isLinked: boolean;
  telegramId: number | null;
  telegramUsername: string | null;
}

/** Convert frontend role names to Laravel API role names */
function normalizeRole(role: TelegramRole): string {
  if (role === 'groupAdmin') return 'group_admin';
  return role;
}

const TelegramOnboarding: React.FC<TelegramOnboardingProps> = ({
  role,
  dashboardPath,
  skipPath,
  title,
  subtitle,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deepLink, setDeepLink] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [checking, setChecking] = useState(false);
  const [isLinked, setIsLinked] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState<string | null>(null);

  // Role-specific labels
  const roleLabels: Record<string, { title: string; subtitle: string }> = {
    chatter: {
      title: title || '🎉 Dernière étape : Liez votre Telegram',
      subtitle: subtitle || 'Recevez vos notifications de commissions et confirmez vos retraits en toute sécurité',
    },
    influencer: {
      title: title || '🚀 Connectez votre compte Telegram',
      subtitle: subtitle || 'Recevez vos alertes de gains et gérez vos retraits facilement',
    },
    blogger: {
      title: title || '📝 Liez votre Telegram',
      subtitle: subtitle || 'Notifications en temps réel et retraits sécurisés',
    },
    groupAdmin: {
      title: title || '👥 Connectez Telegram',
      subtitle: subtitle || 'Gérez votre communauté et vos gains depuis Telegram',
    },
    group_admin: {
      title: title || '👥 Connectez Telegram',
      subtitle: subtitle || 'Gérez votre communauté et vos gains depuis Telegram',
    },
    affiliate: {
      title: title || '💼 Liez votre Telegram',
      subtitle: subtitle || 'Recevez vos notifications d\'affiliation',
    },
    client: {
      title: title || '📱 Connectez votre Telegram',
      subtitle: subtitle || 'Suivez vos commissions de parrainage et gérez vos retraits',
    },
    lawyer: {
      title: title || '⚖️ Liez votre Telegram',
      subtitle: subtitle || 'Notifications de commissions et retraits sécurisés',
    },
    expat: {
      title: title || '🌍 Connectez Telegram',
      subtitle: subtitle || 'Gérez vos commissions d\'affiliation depuis Telegram',
    },
    captain: {
      title: title || '🎖️ Liez votre Telegram',
      subtitle: subtitle || 'Gérez vos bonus de capitaine et retraits depuis Telegram',
    },
    captain_chatter: {
      title: title || '🎖️ Liez votre Telegram',
      subtitle: subtitle || 'Gérez vos bonus de capitaine chatter depuis Telegram',
    },
    partner: {
      title: title || '🤝 Connectez votre Telegram',
      subtitle: subtitle || 'Suivez vos revenus partenaire et confirmez vos retraits',
    },
  };

  const currentLabels = roleLabels[role] || roleLabels.chatter;

  // Generate Telegram link on mount
  useEffect(() => {
    generateLink();
  }, []);

  // Poll for link status every 3 seconds
  useEffect(() => {
    if (!code || isLinked) return;

    const interval = setInterval(() => {
      checkLinkStatus();
    }, 3000);

    return () => clearInterval(interval);
  }, [code, isLinked]);

  const generateLink = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await telegramOnboardingApi<GenerateLinkResponse>(
        '/generate-link',
        {
          method: 'POST',
          body: {
            userId: user?.uid,
            role: normalizeRole(role),
          },
        }
      );

      if (result.success) {
        setDeepLink(result.deepLink);
        setCode(result.code);
      } else {
        setError('Erreur lors de la génération du lien Telegram');
      }
    } catch (err: any) {
      console.error('Error generating Telegram link:', err);
      setError(err.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const checkLinkStatus = async () => {
    if (checking) return;

    try {
      setChecking(true);

      const result = await telegramOnboardingApi<CheckStatusResponse>(
        '/check-status',
        { method: 'GET' }
      );

      if (result.isLinked) {
        setIsLinked(true);
        setTelegramUsername(result.telegramUsername);

        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          navigate(dashboardPath);
        }, 2000);
      }
    } catch (err) {
      console.error('Error checking link status:', err);
    } finally {
      setChecking(false);
    }
  };

  const handleSkip = async () => {
    try {
      await telegramOnboardingApi('/skip', { method: 'POST' });
      navigate(skipPath);
    } catch (err) {
      console.error('Error skipping Telegram:', err);
      // Navigate anyway
      navigate(skipPath);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Génération du lien Telegram...</p>
        </div>
      </div>
    );
  }

  if (isLinked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="bg-green-100 dark:bg-green-900/30 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
            ✅ Telegram connecté !
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            Compte lié avec succès
          </p>
          {telegramUsername && (
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
              @{telegramUsername}
            </p>
          )}
          <div className="flex items-center justify-center text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Redirection vers le dashboard...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
            {currentLabels.title}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {currentLabels.subtitle}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-red-900 dark:text-red-200">{error}</p>
            </div>
            <button
              onClick={generateLink}
              className="mt-3 flex items-center gap-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
            >
              <RefreshCw className="w-4 h-4" />
              Réessayer
            </button>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* QR Code */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <div className="text-center mb-6">
              <div className="bg-blue-100 dark:bg-blue-900/30 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                📱 Scanner le QR Code
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Ouvrez Telegram et scannez ce code
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border-4 border-gray-100 dark:border-gray-700 mb-6">
              <QRCodeSVG
                value={deepLink}
                size={256}
                level="H"
                includeMargin
                className="w-full h-auto"
              />
            </div>

            <div className="flex items-center justify-center text-xs text-gray-500 dark:text-gray-500">
              {checking ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin mr-2" />
                  Vérification...
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2" />
                  En attente de connexion
                </>
              )}
            </div>
          </div>

          {/* Direct Link */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <div className="text-center mb-6">
              <div className="bg-purple-100 dark:bg-purple-900/30 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <ExternalLink className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                🔗 Lien direct
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Ou cliquez sur le bouton ci-dessous
              </p>
            </div>

            <a
              href={deepLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105 text-center mb-6"
            >
              <div className="flex items-center justify-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Ouvrir Telegram
                <ArrowRight className="w-5 h-5" />
              </div>
            </a>

            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 mb-6">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">
                ✨ Avantages :
              </h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Notifications instantanées de vos gains</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Confirmation sécurisée des retraits</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Support prioritaire par message</span>
                </li>
                {role === 'chatter' && (
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Messages de motivation quotidiens</span>
                  </li>
                )}
              </ul>
            </div>

            <p className="text-xs text-center text-gray-500 dark:text-gray-500 mb-4">
              ⏱️ Ce lien expire dans 24 heures
            </p>

            <button
              onClick={handleSkip}
              className="w-full text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 py-2 text-sm"
            >
              Ignorer pour le moment →
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            💡 Comment ça marche ?
          </h4>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <li>Scannez le QR code ou cliquez sur "Ouvrir Telegram"</li>
            <li>Appuyez sur "Start" dans la conversation Telegram</li>
            <li>Votre compte sera automatiquement lié</li>
            <li>Vous serez redirigé vers votre dashboard</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default TelegramOnboarding;
