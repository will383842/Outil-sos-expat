/**
 * TelegramRequiredBanner - Banner affiché quand Telegram n'est pas lié
 * Utilisé dans les pages de retrait pour guider l'utilisateur
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, AlertTriangle, ArrowRight, CheckCircle } from 'lucide-react';

interface TelegramRequiredBannerProps {
  role: 'chatter' | 'influencer' | 'blogger' | 'groupAdmin';
  onboardingPath: string;
  availableBalance?: number;
}

const TelegramRequiredBanner: React.FC<TelegramRequiredBannerProps> = ({
  role,
  onboardingPath,
  availableBalance,
}) => {
  const navigate = useNavigate();

  const roleLabels: Record<string, string> = {
    chatter: 'Chatter',
    influencer: 'Influenceur',
    blogger: 'Blogueur',
    groupAdmin: 'Admin Groupe',
  };

  const handleLinkTelegram = () => {
    navigate(onboardingPath);
  };

  return (
    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-2xl p-6 mb-6 shadow-lg">
      <div className="flex items-start gap-4">
        <div className="bg-yellow-100 dark:bg-yellow-900/40 rounded-full p-3 flex-shrink-0">
          <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
        </div>

        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            🔒 Telegram requis pour les retraits
          </h3>

          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Pour sécuriser vos retraits et confirmer chaque transaction, vous devez d'abord
            lier votre compte Telegram.
          </p>

          {availableBalance !== undefined && availableBalance >= 2500 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4 border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-2">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    Vous avez ${(availableBalance / 100).toFixed(2)} disponible !
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Liez Telegram pour retirer vos gains
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-4">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 text-sm">
              ✨ Pourquoi Telegram ?
            </h4>
            <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <span><b>Double vérification</b> : Confirmez chaque retrait depuis Telegram</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <span><b>Sécurité maximale</b> : Protection contre les retraits non autorisés</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <span><b>Notifications instantanées</b> : Soyez alerté de chaque commission</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <span><b>Rapide et simple</b> : Lien en 30 secondes via QR code</span>
              </li>
            </ul>
          </div>

          <button
            onClick={handleLinkTelegram}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg flex items-center justify-center gap-3"
          >
            <MessageSquare className="w-5 h-5" />
            <span>Lier mon compte Telegram maintenant</span>
            <ArrowRight className="w-5 h-5" />
          </button>

          <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-3">
            ⏱️ Cela ne prend que 30 secondes
          </p>
        </div>
      </div>
    </div>
  );
};

export default TelegramRequiredBanner;
