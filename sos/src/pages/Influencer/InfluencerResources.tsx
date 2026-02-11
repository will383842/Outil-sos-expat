/**
 * InfluencerResources - Resources page for influencers
 * 3 categories: SOS-Expat, Ulixai, Founder
 */

import React, { useEffect, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useInfluencerResources } from '@/hooks/useInfluencerResources';
import InfluencerDashboardLayout from '@/components/Influencer/Layout/InfluencerDashboardLayout';
import type { InfluencerResourceCategory } from '@/types/influencer';
import {
  FolderOpen,
  Download,
  Copy,
  Image,
  FileText,
  Star,
  Loader2,
  CheckCircle,
  Search,
} from 'lucide-react';

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all",
  },
} as const;

const CATEGORIES: { value: InfluencerResourceCategory; label: string; description: string; icon: React.ReactNode; color: string }[] = [
  {
    value: 'sos_expat',
    label: 'SOS-Expat',
    description: 'Logos, bannières et textes promotionnels SOS-Expat',
    icon: <FolderOpen className="w-6 h-6" />,
    color: 'red',
  },
  {
    value: 'ulixai',
    label: 'Ulixai',
    description: "Ressources pour promouvoir l'assistant IA Ulixai",
    icon: <Star className="w-6 h-6" />,
    color: 'blue',
  },
  {
    value: 'founder',
    label: 'Fondateur',
    description: 'Photos, bio et citations du fondateur',
    icon: <FileText className="w-6 h-6" />,
    color: 'green',
  },
];

const InfluencerResources: React.FC = () => {
  const intl = useIntl();
  const { resources, isLoading, error, fetchResources, downloadResource, copyText } = useInfluencerResources();
  const [selectedCategory, setSelectedCategory] = useState<InfluencerResourceCategory>('sos_expat');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchResources(selectedCategory);
  }, [selectedCategory]);

  const handleDownload = async (resourceId: string) => {
    setDownloadingId(resourceId);
    const result = await downloadResource(resourceId);
    if (result.success && result.downloadUrl) {
      window.open(result.downloadUrl, '_blank');
    }
    setDownloadingId(null);
  };

  const handleCopy = async (textId: string) => {
    const result = await copyText(textId);
    if (result.success) {
      setCopiedId(textId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const filteredFiles = resources?.files?.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const filteredTexts = resources?.texts?.filter(text =>
    text.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    text.content.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <InfluencerDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            <FormattedMessage id="influencer.resources.title" defaultMessage="Ressources" />
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            <FormattedMessage id="influencer.resources.subtitle" defaultMessage="Logos, images et textes prêts à l'emploi pour vos promotions" />
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-3">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.value;
            const colorClasses = {
              red: isActive ? 'bg-red-600 text-white' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100',
              blue: isActive ? 'bg-blue-600 text-white' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100',
              green: isActive ? 'bg-green-600 text-white' : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100',
            };

            return (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all ${colorClasses[cat.color as keyof typeof colorClasses]}`}
              >
                {cat.icon}
                <div className="text-left">
                  <p className="font-medium">{cat.label}</p>
                  <p className="text-xs opacity-80">{cat.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={intl.formatMessage({ id: 'influencer.resources.search', defaultMessage: 'Rechercher...' })}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-red-500" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Files Section */}
        {!isLoading && filteredFiles.length > 0 && (
          <div className={`${UI.card} p-6`}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Image className="w-5 h-5 text-red-500" />
              <FormattedMessage id="influencer.resources.files" defaultMessage="Fichiers téléchargeables" />
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-shadow"
                >
                  {file.previewUrl && (
                    <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg mb-3 overflow-hidden">
                      <img src={file.previewUrl} alt={file.name} className="w-full h-full object-contain" />
                    </div>
                  )}
                  <h3 className="font-medium text-gray-900 dark:text-white mb-1">{file.name}</h3>
                  {file.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{file.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{file.format?.toUpperCase()} {file.sizeFormatted ? `• ${file.sizeFormatted}` : ''}</span>
                    <button
                      onClick={() => handleDownload(file.id)}
                      disabled={downloadingId === file.id}
                      className={`${UI.button.primary} px-3 py-1.5 text-sm flex items-center gap-1`}
                    >
                      {downloadingId === file.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <FormattedMessage id="influencer.resources.download" defaultMessage="Télécharger" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Texts Section */}
        {!isLoading && filteredTexts.length > 0 && (
          <div className={`${UI.card} p-6`}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              <FormattedMessage id="influencer.resources.texts" defaultMessage="Textes à copier" />
            </h2>
            <div className="space-y-4">
              {filteredTexts.map((text) => (
                <div
                  key={text.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-gray-900 dark:text-white">{text.title}</h3>
                    <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                      {text.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 whitespace-pre-wrap line-clamp-4">
                    {text.content}
                  </p>
                  <button
                    onClick={() => handleCopy(text.id)}
                    className={`${UI.button.secondary} px-3 py-1.5 text-sm flex items-center gap-1`}
                  >
                    {copiedId === text.id ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <FormattedMessage id="influencer.resources.copied" defaultMessage="Copié !" />
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <FormattedMessage id="influencer.resources.copy" defaultMessage="Copier" />
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredFiles.length === 0 && filteredTexts.length === 0 && (
          <div className={`${UI.card} p-12 text-center`}>
            <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery ? (
                <FormattedMessage id="influencer.resources.noResults" defaultMessage="Aucun résultat pour cette recherche" />
              ) : (
                <FormattedMessage id="influencer.resources.empty" defaultMessage="Aucune ressource disponible pour cette catégorie" />
              )}
            </p>
          </div>
        )}

        {/* Usage Guidelines */}
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">
            <FormattedMessage id="influencer.resources.guidelines.title" defaultMessage="Conditions d'utilisation" />
          </h3>
          <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
            <li>
              • <FormattedMessage id="influencer.resources.guidelines.1" defaultMessage="Ces ressources sont réservées aux influenceurs partenaires" />
            </li>
            <li>
              • <FormattedMessage id="influencer.resources.guidelines.2" defaultMessage="Utilisez-les uniquement pour promouvoir SOS-Expat" />
            </li>
            <li>
              • <FormattedMessage id="influencer.resources.guidelines.3" defaultMessage="Ne modifiez pas les logos sans autorisation" />
            </li>
            <li>
              • <FormattedMessage id="influencer.resources.guidelines.4" defaultMessage="Incluez toujours votre lien d'affiliation avec le contenu" />
            </li>
          </ul>
        </div>
      </div>
    </InfluencerDashboardLayout>
  );
};

export default InfluencerResources;
