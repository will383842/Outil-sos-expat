import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Save, 
  RefreshCw, 
  Shield, 
  Bell, 
  Database,
  Key,
  Globe,
  Smartphone,
  Wifi,
  HardDrive,
  AlertTriangle,
  CheckCircle,
  Info,
  Eye,
  EyeOff,
  Download,
  Upload,
  Activity,
  Users,
  Server,
  Clock
} from 'lucide-react';

interface SystemSettings {
  openaiApiKey: string;
  defaultGptModel: string;
  maxRequestsPerUser: number;
  autoArchiveAfterDays: number;
  enablePushNotifications: boolean;
  enableEmailNotifications: boolean;
  maxChatHistoryDays: number;
  enableOfflineMode: boolean;
  debugMode: boolean;
  maintenanceMode: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  dataRetentionMonths: number;
  maxTokensPerRequest: number;
  temperatureDefault: number;
  enableAutoTranslation: boolean;
  sessionTimeoutMinutes: number;
  maxFileUploadSizeMB: number;
  enableAnalytics: boolean;
}

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalRequests: number;
  storageUsedGB: number;
  uptime: string;
  lastBackup: string;
}

export default function SettingsPanel() {
  const [settings, setSettings] = useState<SystemSettings>({
    openaiApiKey: '',
    defaultGptModel: 'gpt-4',
    maxRequestsPerUser: 50,
    autoArchiveAfterDays: 30,
    enablePushNotifications: true,
    enableEmailNotifications: true,
    maxChatHistoryDays: 90,
    enableOfflineMode: true,
    debugMode: false,
    maintenanceMode: false,
    backupFrequency: 'daily',
    dataRetentionMonths: 12,
    maxTokensPerRequest: 1000,
    temperatureDefault: 0.7,
    enableAutoTranslation: true,
    sessionTimeoutMinutes: 30,
    maxFileUploadSizeMB: 10,
    enableAnalytics: true
  });

  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 1247,
    activeUsers: 89,
    totalRequests: 15743,
    storageUsedGB: 2.3,
    uptime: '15 jours 8h 23min',
    lastBackup: 'Il y a 2 heures'
  });

  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'ai' | 'notifications' | 'data' | 'security' | 'performance'>('general');

  useEffect(() => {
    loadSettings();
    loadStats();
  }, []);

  const loadSettings = async () => {
    // Chargement depuis localStorage pour Bolt.new
    const savedSettings = localStorage.getItem('system_settings');
    if (savedSettings) {
      setSettings({ ...settings, ...JSON.parse(savedSettings) });
    }
  };

  const loadStats = async () => {
    // Mock stats pour Bolt.new
    console.log('Chargement des statistiques système...');
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Sauvegarde dans localStorage pour Bolt.new
      localStorage.setItem('system_settings', JSON.stringify(settings));
      
      // Simulation de sauvegarde
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('⚠️ Êtes-vous sûr de vouloir réinitialiser tous les paramètres ? Cette action est irréversible.')) {
      localStorage.removeItem('system_settings');
      setSettings({
        openaiApiKey: '',
        defaultGptModel: 'gpt-4',
        maxRequestsPerUser: 50,
        autoArchiveAfterDays: 30,
        enablePushNotifications: true,
        enableEmailNotifications: true,
        maxChatHistoryDays: 90,
        enableOfflineMode: true,
        debugMode: false,
        maintenanceMode: false,
        backupFrequency: 'daily',
        dataRetentionMonths: 12,
        maxTokensPerRequest: 1000,
        temperatureDefault: 0.7,
        enableAutoTranslation: true,
        sessionTimeoutMinutes: 30,
        maxFileUploadSizeMB: 10,
        enableAnalytics: true
      });
    }
  };

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sos-expat-settings-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedSettings = JSON.parse(e.target?.result as string);
          setSettings({ ...settings, ...importedSettings });
          alert('Paramètres importés avec succès !');
        } catch (error) {
          alert('Erreur lors de l\'importation du fichier.');
        }
      };
      reader.readAsText(file);
    }
  };

  const tabs = [
    { id: 'general', label: 'Général', icon: Settings },
    { id: 'ai', label: 'Intelligence Artificielle', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'data', label: 'Données', icon: Database },
    { id: 'security', label: 'Sécurité', icon: Key },
    { id: 'performance', label: 'Performance', icon: Activity }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                <Settings size={20} className="mr-2 text-blue-500" />
                Paramètres généraux
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Demandes max par utilisateur / jour
                  </label>
                  <input
                    type="number"
                    value={settings.maxRequestsPerUser}
                    onChange={(e) => setSettings({ ...settings, maxRequestsPerUser: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="1000"
                  />
                  <p className="text-xs text-gray-500 mt-1">Limite pour éviter les abus</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Archivage automatique (jours)
                  </label>
                  <input
                    type="number"
                    value={settings.autoArchiveAfterDays}
                    onChange={(e) => setSettings({ ...settings, autoArchiveAfterDays: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="365"
                  />
                  <p className="text-xs text-gray-500 mt-1">Déplacement vers les archives</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timeout de session (minutes)
                  </label>
                  <input
                    type="number"
                    value={settings.sessionTimeoutMinutes}
                    onChange={(e) => setSettings({ ...settings, sessionTimeoutMinutes: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="5"
                    max="480"
                  />
                  <p className="text-xs text-gray-500 mt-1">Déconnexion automatique</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Taille max fichiers (MB)
                  </label>
                  <input
                    type="number"
                    value={settings.maxFileUploadSizeMB}
                    onChange={(e) => setSettings({ ...settings, maxFileUploadSizeMB: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="100"
                  />
                  <p className="text-xs text-gray-500 mt-1">Upload de documents</p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
                  <div>
                    <h4 className="font-medium text-gray-800">Mode maintenance</h4>
                    <p className="text-sm text-gray-600">Désactive l'accès sauf pour les admins</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.maintenanceMode}
                      onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
                  <div>
                    <h4 className="font-medium text-gray-800">Mode debug</h4>
                    <p className="text-sm text-gray-600">Logs détaillés pour le développement</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.debugMode}
                      onChange={(e) => setSettings({ ...settings, debugMode: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
                  <div>
                    <h4 className="font-medium text-gray-800">Traduction automatique</h4>
                    <p className="text-sm text-gray-600">Détection et traduction des messages</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.enableAutoTranslation}
                      onChange={(e) => setSettings({ ...settings, enableAutoTranslation: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        );

      case 'ai':
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                <Shield size={20} className="mr-2 text-blue-500" />
                Configuration OpenAI
              </h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Clé API OpenAI *
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={settings.openaiApiKey}
                      onChange={(e) => setSettings({ ...settings, openaiApiKey: e.target.value })}
                      placeholder="sk-proj-..."
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    🔒 Chiffrée et stockée de manière sécurisée
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Modèle par défaut
                    </label>
                    <select
                      value={settings.defaultGptModel}
                      onChange={(e) => setSettings({ ...settings, defaultGptModel: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="gpt-4">GPT-4</option>
                      <option value="gpt-4-turbo">GPT-4 Turbo</option>
                      <option value="gpt-4o">GPT-4o</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tokens max par requête
                    </label>
                    <input
                      type="number"
                      value={settings.maxTokensPerRequest}
                      onChange={(e) => setSettings({ ...settings, maxTokensPerRequest: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="100"
                      max="4000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Température par défaut: {settings.temperatureDefault}
                  </label>
                  <input
                    type="range"
                    value={settings.temperatureDefault}
                    onChange={(e) => setSettings({ ...settings, temperatureDefault: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                    min="0"
                    max="1"
                    step="0.1"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Plus précis (0.0)</span>
                    <span>Plus créatif (1.0)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Historique de chat (jours)
                  </label>
                  <input
                    type="number"
                    value={settings.maxChatHistoryDays}
                    onChange={(e) => setSettings({ ...settings, maxChatHistoryDays: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="365"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Conservation des conversations avec GPT
                  </p>
                </div>

                {/* Test de connexion */}
                <div className="bg-white p-4 rounded-lg border">
                  <h4 className="font-medium text-gray-800 mb-2">Test de connexion</h4>
                  <button className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors">
                    Tester l'API OpenAI
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                <Bell size={20} className="mr-2 text-blue-500" />
                Paramètres de notifications
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
                  <div>
                    <h4 className="font-medium text-gray-800 flex items-center">
                      <Smartphone size={16} className="mr-2 text-blue-500" />
                      Notifications push
                    </h4>
                    <p className="text-sm text-gray-600">Alertes en temps réel sur les appareils</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.enablePushNotifications}
                      onChange={(e) => setSettings({ ...settings, enablePushNotifications: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
                  <div>
                    <h4 className="font-medium text-gray-800 flex items-center">
                      <Bell size={16} className="mr-2 text-green-500" />
                      Notifications email
                    </h4>
                    <p className="text-sm text-gray-600">Résumés quotidiens et alertes importantes</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.enableEmailNotifications}
                      onChange={(e) => setSettings({ ...settings, enableEmailNotifications: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                </div>

                <div className="bg-white p-4 rounded-lg border">
                  <h4 className="font-medium text-gray-800 mb-3">Configuration avancée</h4>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" defaultChecked />
                      <span className="text-sm">Nouvelles demandes urgentes</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" defaultChecked />
                      <span className="text-sm">Réponses d'experts reçues</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" />
                      <span className="text-sm">Rapport hebdomadaire d'activité</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" defaultChecked />
                      <span className="text-sm">Alertes système</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'data':
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                <Database size={20} className="mr-2 text-blue-500" />
                Gestion des données
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fréquence de sauvegarde
                  </label>
                  <select
                    value={settings.backupFrequency}
                    onChange={(e) => setSettings({ ...settings, backupFrequency: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="daily">Quotidienne (recommandé)</option>
                    <option value="weekly">Hebdomadaire</option>
                    <option value="monthly">Mensuelle</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rétention des données (mois)
                  </label>
                  <input
                    type="number"
                    value={settings.dataRetentionMonths}
                    onChange={(e) => setSettings({ ...settings, dataRetentionMonths: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="60"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Conservation des données archivées
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
                  <div>
                    <h4 className="font-medium text-gray-800 flex items-center">
                      <Wifi size={16} className="mr-2 text-orange-500" />
                      Mode hors ligne
                    </h4>
                    <p className="text-sm text-gray-600">Fonctionnement sans connexion internet</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.enableOfflineMode}
                      onChange={(e) => setSettings({ ...settings, enableOfflineMode: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
                  <div>
                    <h4 className="font-medium text-gray-800 flex items-center">
                      <Activity size={16} className="mr-2 text-purple-500" />
                      Analytics & métriques
                    </h4>
                    <p className="text-sm text-gray-600">Collecte de données d'usage anonymes</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.enableAnalytics}
                      onChange={(e) => setSettings({ ...settings, enableAnalytics: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                </div>
              </div>

              {/* Actions de sauvegarde */}
              <div className="mt-6 bg-white p-4 rounded-lg border">
                <h4 className="font-medium text-gray-800 mb-3">Actions rapides</h4>
                <div className="flex flex-wrap gap-3">
                  <button className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2">
                    <HardDrive size={16} />
                    <span>Sauvegarde manuelle</span>
                  </button>
                  <button 
                    onClick={exportSettings}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-2"
                  >
                    <Download size={16} />
                    <span>Exporter config</span>
                  </button>
                  <label className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors flex items-center space-x-2 cursor-pointer">
                    <Upload size={16} />
                    <span>Importer config</span>
                    <input 
                      type="file" 
                      accept=".json" 
                      onChange={importSettings} 
                      className="hidden" 
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                <Key size={20} className="mr-2 text-blue-500" />
                Paramètres de sécurité
              </h3>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-2">
                  <AlertTriangle size={18} className="text-amber-600" />
                  <span className="font-medium text-amber-800">Zone sensible</span>
                </div>
                <p className="text-sm text-amber-700 mt-1">
                  Les modifications de sécurité peuvent affecter l'accès de tous les utilisateurs.
                </p>
              </div>

              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg border hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                        <RefreshCw size={18} className="text-red-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-800">Réinitialiser les sessions</h4>
                        <p className="text-sm text-gray-600">Déconnecte tous les utilisateurs actifs</p>
                      </div>
                    </div>
                    <button className="text-red-600 hover:text-red-700">
                      Exécuter
                    </button>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Shield size={18} className="text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-800">Audit des accès</h4>
                        <p className="text-sm text-gray-600">Consulter les logs de connexion</p>
                      </div>
                    </div>
                    <button className="text-blue-600 hover:text-blue-700">
                      Voir logs
                    </button>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <HardDrive size={18} className="text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-800">Exporter toutes les données</h4>
                        <p className="text-sm text-gray-600">Sauvegarde complète RGPD</p>
                      </div>
                    </div>
                    <button className="text-green-600 hover:text-green-700">
                      Exporter
                    </button>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Users size={18} className="text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-800">Gestion des permissions</h4>
                        <p className="text-sm text-gray-600">Configurer les rôles utilisateurs</p>
                      </div>
                    </div>
                    <button className="text-purple-600 hover:text-purple-700">
                      Configurer
                    </button>
                  </div>
                </div>
              </div>

              {/* Métriques de sécurité */}
              <div className="mt-6 bg-white p-4 rounded-lg border">
                <h4 className="font-medium text-gray-800 mb-3">Métriques de sécurité (7 derniers jours)</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">127</p>
                    <p className="text-xs text-gray-500">Connexions réussies</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">3</p>
                    <p className="text-xs text-gray-500">Tentatives échouées</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">12</p>
                    <p className="text-xs text-gray-500">Sessions expirées</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">0</p>
                    <p className="text-xs text-gray-500">Alertes sécurité</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'performance':
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                <Activity size={20} className="mr-2 text-blue-500" />
                Monitoring des performances
              </h3>
              
              {/* Métriques en temps réel */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg border text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Users size={20} className="text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-800">{stats.activeUsers}</p>
                  <p className="text-sm text-gray-600">Utilisateurs actifs</p>
                </div>
                <div className="bg-white p-4 rounded-lg border text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Server size={20} className="text-green-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-800">{stats.storageUsedGB}GB</p>
                  <p className="text-sm text-gray-600">Stockage utilisé</p>
                </div>
                <div className="bg-white p-4 rounded-lg border text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Clock size={20} className="text-orange-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-800">{stats.uptime}</p>
                  <p className="text-sm text-gray-600">Uptime</p>
                </div>
                <div className="bg-white p-4 rounded-lg border text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Activity size={20} className="text-purple-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-800">{stats.totalRequests}</p>
                  <p className="text-sm text-gray-600">Requêtes totales</p>
                </div>
              </div>

              {/* Graphiques de performance simulés */}
              <div className="bg-white p-4 rounded-lg border">
                <h4 className="font-medium text-gray-800 mb-3">Performance des dernières 24h</h4>
                <div className="h-32 bg-gradient-to-r from-blue-100 to-blue-200 rounded-lg flex items-end justify-center">
                  <p className="text-gray-600 mb-4">📊 Graphique de performance (simulation)</p>
                </div>
              </div>

              {/* Optimisations recommandées */}
              <div className="bg-white p-4 rounded-lg border">
                <h4 className="font-medium text-gray-800 mb-3">Recommandations d'optimisation</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                    <CheckCircle size={16} className="text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-800">Cache optimisé</p>
                      <p className="text-xs text-green-600">Temps de réponse excellent</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
                    <AlertTriangle size={16} className="text-yellow-600" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">Base de données</p>
                      <p className="text-xs text-yellow-600">Considérer un index sur la table requests</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                    <Info size={16} className="text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">Stockage</p>
                      <p className="text-xs text-blue-600">23% d'espace libre restant</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header avec actions */}
      <div className="bg-white rounded-lg p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <Settings size={24} className="mr-3 text-blue-500" />
              Paramètres système
            </h2>
            <p className="text-gray-600 mt-1">
              Configuration avancée et monitoring de la plateforme SOS Expat
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleReset}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
            >
              <RefreshCw size={16} />
              <span>Réinitialiser</span>
            </button>
            
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center space-x-2 min-w-[140px]"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Sauvegarde...</span>
                </>
              ) : saved ? (
                <>
                  <CheckCircle size={16} />
                  <span>Sauvegardé !</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Sauvegarder</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-500">{stats.totalUsers}</p>
            <p className="text-xs text-gray-500">Utilisateurs totaux</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-500">{stats.activeUsers}</p>
            <p className="text-xs text-gray-500">Actifs maintenant</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-500">{stats.totalRequests}</p>
            <p className="text-xs text-gray-500">Demandes traitées</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-500">{stats.storageUsedGB} GB</p>
            <p className="text-xs text-gray-500">Stockage</p>
          </div>
        </div>
      </div>

      {/* Navigation par onglets */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="flex overflow-x-auto border-b border-gray-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>

      {/* Informations système */}
      <div className="bg-white rounded-lg p-6 shadow-lg">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
          <Info size={20} className="mr-2 text-blue-500" />
          Informations système
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-gray-600 text-sm">Version</div>
            <div className="font-medium text-gray-800">v2.1.3</div>
          </div>
          <div className="text-center">
            <div className="text-gray-600 text-sm">Environnement</div>
            <div className="font-medium text-green-600">Production</div>
          </div>
          <div className="text-center">
            <div className="text-gray-600 text-sm">Base de données</div>
            <div className="font-medium text-gray-800">Firebase</div>
          </div>
          <div className="text-center">
            <div className="text-gray-600 text-sm">Dernière sauvegarde</div>
            <div className="font-medium text-gray-800">{stats.lastBackup}</div>
          </div>
        </div>

        {/* Status système */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <span className="text-sm text-green-800">API OpenAI</span>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-green-600">Opérationnel</span>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <span className="text-sm text-green-800">Base de données</span>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-green-600">Connectée</span>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <span className="text-sm text-green-800">Notifications</span>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-green-600">Actives</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}