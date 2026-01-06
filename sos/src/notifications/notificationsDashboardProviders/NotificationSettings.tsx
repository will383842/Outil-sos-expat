import React, { useEffect, useState } from 'react';
import { getNotificationPreferences, saveNotificationPreferences } from './preferencesProviders';
import { NotificationPreferences } from './types';
import { useAuth } from '../../contexts/AuthContext';
import { useIntl } from 'react-intl';

const NotificationSettings: React.FC = () => {
  const { user } = useAuth();
  const intl = useIntl();

  // Ne pas afficher pour les clients
  const isProvider = user?.role === 'lawyer' || user?.role === 'expat';
  if (!isProvider) return null;

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

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow space-y-4 max-w-md">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
        {intl.formatMessage({ id: 'notifications.preferences.title', defaultMessage: 'Préférences de notifications' })}
      </h2>

      <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={prefs.enableSound}
            onChange={() => handleChange('enableSound')}
            className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
          />
          {intl.formatMessage({ id: 'notifications.preferences.sound', defaultMessage: 'Son de rappel toutes les 30 minutes' })}
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={prefs.enableVoice}
            onChange={() => handleChange('enableVoice')}
            className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
          />
          {intl.formatMessage({ id: 'notifications.preferences.voice', defaultMessage: 'Voix vocale toutes les 60 minutes' })}
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={prefs.enableModal}
            onChange={() => handleChange('enableModal')}
            className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
          />
          {intl.formatMessage({ id: 'notifications.preferences.modal', defaultMessage: 'Affichage de la fenêtre de rappel (popup)' })}
        </label>
      </div>
    </div>
  );
};

export default NotificationSettings;
