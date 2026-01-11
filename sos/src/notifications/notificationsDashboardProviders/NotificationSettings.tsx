import React, { useEffect, useState } from 'react';
import {
  getNotificationPreferences,
  saveNotificationPreferences,
  NotificationPreferences
} from './preferencesProviders';
import { useAuth } from '../../contexts/AuthContext';
import { useIntl } from 'react-intl';
import { PROVIDER_ACTIVITY_CONFIG } from '../../config/providerActivityConfig';

const NotificationSettings: React.FC = () => {
  const { user } = useAuth();
  const intl = useIntl();

  // State doit être déclaré avant tout return conditionnel (Rules of Hooks)
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    enableSound: true,
    enableVoice: true,
    enableModal: true
  });

  useEffect(() => {
    const loadedPrefs = getNotificationPreferences();
    setPrefs(loadedPrefs);
  }, []);

  const handleChange = (key: keyof NotificationPreferences) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    saveNotificationPreferences(updated);
  };

  // Ne pas afficher pour les clients (après les hooks)
  const isProvider = user?.role === 'lawyer' || user?.role === 'expat';
  if (!isProvider) return null;

  // Récupérer les intervalles depuis la config centralisée
  const soundInterval = PROVIDER_ACTIVITY_CONFIG.SOUND_INTERVAL_MINUTES;
  const voiceInterval = PROVIDER_ACTIVITY_CONFIG.VOICE_INTERVAL_MINUTES;

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow space-y-4 max-w-md">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
        {intl.formatMessage({
          id: 'notifications.preferences.title',
          defaultMessage: 'Préférences de notifications'
        })}
      </h2>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        {intl.formatMessage({
          id: 'notifications.preferences.description',
          defaultMessage: 'Ces paramètres contrôlent les rappels lorsque vous êtes en ligne mais inactif.'
        })}
      </p>

      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
        <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
          <input
            type="checkbox"
            checked={prefs.enableSound}
            onChange={() => handleChange('enableSound')}
            className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
          />
          <span>
            {intl.formatMessage({
              id: 'notifications.preferences.sound',
              defaultMessage: 'Son de rappel toutes les {minutes} minutes'
            }, { minutes: soundInterval })}
          </span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
          <input
            type="checkbox"
            checked={prefs.enableVoice}
            onChange={() => handleChange('enableVoice')}
            className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
          />
          <span>
            {intl.formatMessage({
              id: 'notifications.preferences.voice',
              defaultMessage: 'Message vocal toutes les {minutes} minutes'
            }, { minutes: voiceInterval })}
          </span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
          <input
            type="checkbox"
            checked={prefs.enableModal}
            onChange={() => handleChange('enableModal')}
            className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
          />
          <span>
            {intl.formatMessage({
              id: 'notifications.preferences.modal',
              defaultMessage: 'Affichage de la fenêtre de rappel (popup)'
            })}
          </span>
        </label>
      </div>

      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {intl.formatMessage({
            id: 'notifications.preferences.note',
            defaultMessage: 'Les modifications sont sauvegardées automatiquement.'
          })}
        </p>
      </div>
    </div>
  );
};

export default NotificationSettings;
