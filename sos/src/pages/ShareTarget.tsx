// src/pages/ShareTarget.tsx
/**
 * Share Target Handler Page
 *
 * This page receives shared content from other apps via the Web Share Target API.
 * It processes the shared data and redirects to the appropriate action.
 */

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLocaleNavigate } from '../multilingual-system';
import { Share2, FileText, Link2, MessageSquare, Loader2 } from 'lucide-react';

interface SharedData {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

const ShareTarget: React.FC = () => {
  const navigate = useLocaleNavigate();
  const [searchParams] = useSearchParams();
  const [sharedData, setSharedData] = useState<SharedData | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processSharedData = async () => {
      try {
        // Get shared text data from URL params
        const title = searchParams.get('title') || undefined;
        const text = searchParams.get('text') || undefined;
        const url = searchParams.get('url') || undefined;

        // Check for shared files (if POST request with FormData)
        let files: File[] = [];

        // For file sharing, we need to handle the POST data
        // This requires server-side handling or a service worker intercept
        // For now, we handle text sharing which uses GET params

        const data: SharedData = { title, text, url, files };

        // Check if we have any shared data
        if (!title && !text && !url && files.length === 0) {
          setError('Aucun contenu partagé détecté');
          setIsProcessing(false);
          return;
        }

        setSharedData(data);
        setIsProcessing(false);

        // Auto-redirect based on content type
        // If it's a URL, could navigate to a specific page
        // For now, show the user what was shared and let them decide
      } catch (err) {
        console.error('Error processing shared data:', err);
        setError('Erreur lors du traitement du contenu partagé');
        setIsProcessing(false);
      }
    };

    processSharedData();
  }, [searchParams]);

  const handleAction = (action: 'message' | 'document' | 'search' | 'cancel') => {
    switch (action) {
      case 'message':
        // Navigate to messages with pre-filled content
        navigate('/dashboard/messages', {
          state: { sharedContent: sharedData },
        });
        break;
      case 'document':
        // Navigate to document upload
        navigate('/dashboard', {
          state: { sharedContent: sharedData },
        });
        break;
      case 'search':
        // Search for providers related to shared content
        const searchQuery = sharedData?.text || sharedData?.title || '';
        navigate(`/providers?q=${encodeURIComponent(searchQuery)}`);
        break;
      case 'cancel':
        navigate('/');
        break;
    }
  };

  // Loading state
  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Traitement du contenu partagé...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Share2 className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Partage non disponible</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-red-500 text-white py-3 rounded-xl font-semibold hover:bg-red-600 transition-colors"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto pt-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Share2 className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Contenu partagé</h1>
          <p className="text-gray-600 mt-2">Que souhaitez-vous faire ?</p>
        </div>

        {/* Shared content preview */}
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Contenu reçu
          </h2>

          {sharedData?.title && (
            <div className="mb-3">
              <span className="text-xs text-gray-400">Titre</span>
              <p className="text-gray-900 font-medium">{sharedData.title}</p>
            </div>
          )}

          {sharedData?.text && (
            <div className="mb-3">
              <span className="text-xs text-gray-400">Texte</span>
              <p className="text-gray-700 line-clamp-3">{sharedData.text}</p>
            </div>
          )}

          {sharedData?.url && (
            <div className="mb-3">
              <span className="text-xs text-gray-400">Lien</span>
              <a
                href={sharedData.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline flex items-center gap-1 truncate"
              >
                <Link2 className="w-4 h-4 shrink-0" />
                <span className="truncate">{sharedData.url}</span>
              </a>
            </div>
          )}

          {sharedData?.files && sharedData.files.length > 0 && (
            <div>
              <span className="text-xs text-gray-400">Fichiers</span>
              <div className="space-y-1 mt-1">
                {sharedData.files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-gray-700"
                  >
                    <FileText className="w-4 h-4" />
                    <span className="truncate">{file.name}</span>
                    <span className="text-xs text-gray-400">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <button
            onClick={() => handleAction('message')}
            className="w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4 text-left"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Envoyer en message</h3>
              <p className="text-sm text-gray-500">Partager avec un prestataire</p>
            </div>
          </button>

          <button
            onClick={() => handleAction('document')}
            className="w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4 text-left"
          >
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Sauvegarder comme document</h3>
              <p className="text-sm text-gray-500">Ajouter à vos documents</p>
            </div>
          </button>

          <button
            onClick={() => handleAction('search')}
            className="w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4 text-left"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Share2 className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Rechercher un prestataire</h3>
              <p className="text-sm text-gray-500">Trouver de l'aide pour ce sujet</p>
            </div>
          </button>

          <button
            onClick={() => handleAction('cancel')}
            className="w-full py-3 text-gray-500 hover:text-gray-700 font-medium"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareTarget;
