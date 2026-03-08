// src/pages/CallCheckoutWrapper.tsx - Version corrigée complète
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useLocaleNavigate } from '../multilingual-system';
import CallCheckout from './CallCheckout';
import { PayPalProvider } from '../contexts/PayPalContext';
import { AlertCircle } from 'lucide-react';
import { Provider, normalizeProvider, createDefaultProvider } from '../types/provider';

import {
  calculateServiceAmounts,
  detectUserCurrency,
} from '../services/pricingService';

// —————————————————————————————————————————————————————
// Types
// —————————————————————————————————————————————————————
interface LoadingState {
  isLoading: boolean;
  error: string | null;
  provider: Provider | null;
}

type RouterState = {
  selectedProvider?: Provider;
  providerData?: Provider;
  provider?: Provider;
  bookingData?: BookingData;
} | null;

type ProviderLike = Partial<Provider> & {
  id?: string;
  providerId?: string;
  role?: 'lawyer' | 'expat';
  type?: 'lawyer' | 'expat';
  providerType?: 'lawyer' | 'expat';
  price?: number;
  duration?: number;
};

interface BookingData {
  providerId?: string;
  providerName?: string;
  providerType?: 'lawyer' | 'expat';
  providerCountry?: string;
  providerAvatar?: string;
  providerPhone?: string;
  providerLanguages?: string[];
  price?: number;
  duration?: number;
  providerRating?: number;
  providerReviewCount?: number;
  providerSpecialties?: string[];
  clientPhone?: string;
}

// —————————————————————————————————————————————————————
// i18n light
// —————————————————————————————————————————————————————
import { useApp } from '../contexts/AppContext';
import { useIntl } from 'react-intl';

const useTranslation = () => {
  const { language } = useApp();
  const intl = useIntl();
  const t = (key: string): string => {
    const keyMap: Record<string, string> = {
      'loading.title': 'callCheckoutWrapper.loading.title',
      'loading.subtitle': 'callCheckoutWrapper.loading.subtitle',
      'loading.progress': 'callCheckoutWrapper.loading.progress',
      'error.title': 'callCheckoutWrapper.error.title',
      'error.body': 'callCheckoutWrapper.error.body',
      'cta.select_expert': 'callCheckoutWrapper.cta.selectExpert',
      'cta.home': 'callCheckoutWrapper.cta.home',
      'cta.back': 'callCheckoutWrapper.cta.back',
      'cta.clear_cache': 'callCheckoutWrapper.cta.clearCache',
    };
    const intlKey = keyMap[key] || key;
    try {
      return intl.formatMessage({ id: intlKey });
    } catch {
      return key;
    }
  };
  return { t, language };
};

// —————————————————————————————————————————————————————
// Helpers
// —————————————————————————————————————————————————————

// ✅ CORRECTION: Fonction pour normaliser un numéro de téléphone
const normalizePhoneNumber = (phone?: string): string => {
  if (!phone) return '';
  
  // Nettoyer le numéro
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Si c'est déjà au format international, le retourner
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  // Si c'est un numéro français commençant par 0, le convertir
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return `+33${cleaned.substring(1)}`;
  }
  
  // Si c'est un numéro français sans le 0, ajouter +33
  if (cleaned.length === 9) {
    return `+33${cleaned}`;
  }
  
  // Pour les autres cas, essayer d'ajouter +33 par défaut
  if (cleaned.length >= 8) {
    return `+33${cleaned}`;
  }
  
  return cleaned;
};

// ✅ CORRECTION: Fonction améliorée pour reconstruire un provider depuis BookingData
const reconstructProviderFromBooking = (bookingData: BookingData): Provider => {
  // Normaliser le numéro de téléphone
  const normalizedPhone = normalizePhoneNumber(bookingData.providerPhone);
  
  // P1-3 FIX: Ne plus générer de faux numéro — garder vide pour que la validation bloque
  const phoneToUse = normalizedPhone || '';
  
  console.log('🔧 Reconstruction provider depuis booking:', {
    originalPhone: bookingData.providerPhone,
    normalizedPhone,
    finalPhone: phoneToUse,
    providerName: bookingData.providerName,
    providerType: bookingData.providerType
  });

  return normalizeProvider({
    id: bookingData.providerId || `provider_${Math.random().toString(36).slice(2)}`,
    name: bookingData.providerName || 'Expert',
    fullName: bookingData.providerName || 'Expert',
    firstName: (bookingData.providerName || 'Expert').split(' ')[0] || 'Expert',
    lastName: (bookingData.providerName || 'Expert').split(' ').slice(1).join(' ') || '',
    role: (bookingData.providerType as 'lawyer' | 'expat') || 'expat',
    type: (bookingData.providerType as 'lawyer' | 'expat') || 'expat',
    country: bookingData.providerCountry || 'FR',
    currentCountry: bookingData.providerCountry || 'FR',
    avatar: bookingData.providerAvatar || '/default-avatar.png',
    profilePhoto: bookingData.providerAvatar || '/default-avatar.png',
    email: `${(bookingData.providerName || 'expert').toLowerCase().replace(/\s+/g, '')}@example.com`,
    // ✅ CORRECTION: S'assurer que tous les champs de téléphone sont remplis
    phone: phoneToUse,
    phoneNumber: phoneToUse,
    telephone: phoneToUse,
    whatsapp: phoneToUse,
    whatsAppNumber: phoneToUse,
    languagesSpoken: bookingData.providerLanguages || ['fr'],
    languages: bookingData.providerLanguages || ['fr'],
    preferredLanguage: 'fr',
    // ✅ CORRECTION: Ne plus utiliser de prix par défaut, laisser CallCheckout gérer via adminPricing
    price: 0, // Sera remplacé par adminPricing
    duration: 0, // Sera remplacé par adminPricing
    rating: bookingData.providerRating || 4.5,
    reviewCount: bookingData.providerReviewCount || 0,
    specialties: bookingData.providerSpecialties || ['Conseil général'],
    description: `Expert ${bookingData.providerType || 'expat'} spécialisé en conseil`,
    bio: `Professionnel expérimenté en ${bookingData.providerType === 'lawyer' ? 'droit' : 'expatriation'}`,
    yearsOfExperience: 5,
    isActive: true,
    isApproved: true,
    isVisible: true,
    isBanned: false,
    isOnline: true,
  });
};

// ✅ CORRECTION: Fonction améliorée pour créer un provider par défaut
const createImprovedDefaultProvider = (providerId: string): Provider => {
  // P1-3 FIX: Pas de faux numéro — le provider sera rejeté par la validation téléphone
  const providerShortId = providerId.substring(0, 6);

  console.log('🔧 Création provider par défaut (sans téléphone):', {
    providerId,
    shortId: providerShortId,
  });

  return normalizeProvider({
    id: providerId,
    name: `Expert ${providerShortId}`,
    fullName: `Expert ${providerShortId}`,
    firstName: 'Expert',
    lastName: providerShortId,
    role: 'expat', // Par défaut expat
    type: 'expat',
    country: 'FR',
    currentCountry: 'FR',
    avatar: '/default-avatar.png',
    profilePhoto: '/default-avatar.png',
    email: `expert${providerShortId}@example.com`,
    // P1-3 FIX: Pas de faux numéro — la validation bloquera si pas de téléphone réel
    phone: '',
    phoneNumber: '',
    telephone: '',
    whatsapp: '',
    whatsAppNumber: '',
    languagesSpoken: ['fr'],
    languages: ['fr'],
    preferredLanguage: 'fr',
    price: 0, // Sera géré par adminPricing
    duration: 0, // Sera géré par adminPricing
    rating: 4.5,
    reviewCount: 0,
    specialties: ['Conseil général'],
    description: 'Expert conseil généraliste pour expatriés',
    bio: 'Professionnel expérimenté en conseil expatriation',
    yearsOfExperience: 5,
    isActive: true,
    isApproved: true,
    isVisible: true,
    isBanned: false,
    isOnline: true,
  });
};

// —————————————————————————————————————————————————————
// Component
// —————————————————————————————————————————————————————
const CallCheckoutWrapper: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation() as { state: RouterState };
  const navigate = useLocaleNavigate();
  const { providerId } = useParams<{ providerId: string }>();

  // Devise sélectionnée (source d'autorité côté wrapper)
  const [selectedCurrency, setSelectedCurrency] = useState<'eur' | 'usd'>(() => {
    try {
      const fromSession = sessionStorage.getItem('selectedCurrency') as 'eur' | 'usd' | null;
      if (fromSession && (fromSession === 'eur' || fromSession === 'usd')) return fromSession;
    } catch { /* noop */ }
    try {
      const fromLocal = localStorage.getItem('preferredCurrency') as 'eur' | 'usd' | null;
      if (fromLocal && (fromLocal === 'eur' || fromLocal === 'usd')) return fromLocal;
    } catch { /* noop */ }
    return detectUserCurrency();
  });

  // Persistance immédiate
  useEffect(() => {
    try {
      sessionStorage.setItem('selectedCurrency', selectedCurrency);
      localStorage.setItem('preferredCurrency', selectedCurrency);
    } catch { /* noop */ }
    if (import.meta.env.DEV) {
      console.log('💱 [Wrapper] currency:', selectedCurrency);
    }
  }, [selectedCurrency]);

  const [state, setState] = useState<LoadingState>({
    isLoading: true,
    error: null,
    provider: null,
  });

  // Erreur stricte si pas de prix admin disponible
  const [pricingError, setPricingError] = useState<string | null>(null);

  const locState = useMemo(() => location.state || null, [location.state]);

  const setCurrency = useCallback((cur?: string | null) => {
    if (!cur) return;
    const lc = cur.toLowerCase();
    if (lc === 'eur' || lc === 'usd') {
      setSelectedCurrency(lc);
    } else if (import.meta.env.DEV) {
      console.warn('[Wrapper] Ignoring unsupported currency:', cur);
    }
  }, []);

  useEffect(() => {
    const loadData = async (): Promise<void> => {
      try {
        if (import.meta.env.DEV) {
          console.log('🔍 CallCheckoutWrapper - providerId:', providerId);
        }

        // 1) location.state → on lit uniquement le provider
        const stateProvider =
          locState?.selectedProvider || locState?.providerData || locState?.provider;

        if (stateProvider && (stateProvider as ProviderLike).id) {
          if (import.meta.env.DEV) console.log('✅ Provider via location.state');
          const normalized = normalizeProvider(stateProvider as Provider);
          
          // P1-3 FIX: Bloquer si le provider n'a pas de numéro de téléphone
          if (!normalized.phone && !normalized.phoneNumber) {
            console.error('❌ Provider sans numéro de téléphone — booking impossible');
            setState({ isLoading: false, error: 'Ce prestataire n\'a pas de numéro de téléphone enregistré. Veuillez contacter le support.', provider: null });
            return;
          }

          setState({ isLoading: false, error: null, provider: normalized });
          return;
        }

        // 2) sessionStorage → uniquement le provider
        if (import.meta.env.DEV) console.log('🔎 sessionStorage…');
        try {
          const savedProvider = sessionStorage.getItem('selectedProvider');
          if (savedProvider) {
            const savedProviderData = JSON.parse(savedProvider) as Provider;
            if (!providerId || savedProviderData.id === providerId) {
              const normalized = normalizeProvider(savedProviderData);
              
              // P1-3 FIX: Bloquer si le provider n'a pas de numéro de téléphone
              if (!normalized.phone && !normalized.phoneNumber) {
                console.error('❌ Provider sans numéro de téléphone — booking impossible');
                setState({ isLoading: false, error: 'Ce prestataire n\'a pas de numéro de téléphone enregistré. Veuillez contacter le support.', provider: null });
                return;
              }

              setState({ isLoading: false, error: null, provider: normalized });
              return;
            }
          }
        } catch (err) {
          if (import.meta.env.DEV) console.error('[Wrapper] parse selectedProvider error', err);
        }

        // 3) bookingRequest → reconstruire uniquement le provider
        try {
          const savedBookingRequest = sessionStorage.getItem('bookingRequest');
          if (savedBookingRequest) {
            const bookingData = JSON.parse(savedBookingRequest) as BookingData;
            if (!providerId || bookingData.providerId === providerId) {
              const reconstructedProvider = reconstructProviderFromBooking(bookingData);

              // P1-3 FIX: Bloquer si le provider reconstruit n'a pas de numéro de téléphone
              if (!reconstructedProvider.phone && !reconstructedProvider.phoneNumber) {
                console.error('❌ Provider reconstruit sans numéro de téléphone — booking impossible');
                setState({ isLoading: false, error: 'Ce prestataire n\'a pas de numéro de téléphone enregistré. Veuillez contacter le support.', provider: null });
                return;
              }

              setState({ isLoading: false, error: null, provider: reconstructedProvider });
              return;
            }
          }
        } catch (err) {
          if (import.meta.env.DEV) console.error('[Wrapper] parse bookingRequest error', err);
        }

        // 4) providerProfile
        try {
          const savedProviderProfile = sessionStorage.getItem('providerProfile');
          if (savedProviderProfile) {
            const profileData = JSON.parse(savedProviderProfile) as Provider;
            if (!providerId || profileData.id === providerId) {
              const normalized = normalizeProvider(profileData);

              // P1-3 FIX: Bloquer si le provider n'a pas de numéro de téléphone
              if (!normalized.phone && !normalized.phoneNumber) {
                console.error('❌ Provider sans numéro de téléphone — booking impossible');
                setState({ isLoading: false, error: 'Ce prestataire n\'a pas de numéro de téléphone enregistré. Veuillez contacter le support.', provider: null });
                return;
              }

              setState({ isLoading: false, error: null, provider: normalized });
              return;
            }
          }
        } catch (err) {
          if (import.meta.env.DEV) console.error('[Wrapper] parse providerProfile error', err);
        }

        // 5) autres clés sessionStorage (provider-like)
        const sessionStorageKeys = ['providerData', 'selectedExpert', 'expertData', 'consultationData', 'callData'] as const;
        for (const key of sessionStorageKeys) {
          try {
            const data = sessionStorage.getItem(key);
            if (data) {
              const parsed = JSON.parse(data) as ProviderLike;
              if (parsed && (parsed.id || parsed.providerId) && (!providerId || parsed.id === providerId || parsed.providerId === providerId)) {
                const normalized = normalizeProvider(parsed as Provider);

                // P1-3 FIX: Bloquer si le provider n'a pas de numéro de téléphone
                if (!normalized.phone && !normalized.phoneNumber) {
                  console.error('❌ Provider sans numéro de téléphone — booking impossible');
                  setState({ isLoading: false, error: 'Ce prestataire n\'a pas de numéro de téléphone enregistré. Veuillez contacter le support.', provider: null });
                  return;
                }

                setState({ isLoading: false, error: null, provider: normalized });
                return;
              }
            }
          } catch (err) {
            if (import.meta.env.DEV) console.error(`[Wrapper] parse ${key} error`, err);
          }
        }

        // 6) history.state
        try {
          const historyState = window.history.state as RouterState;
          const historyProvider = historyState?.selectedProvider || historyState?.provider || historyState?.providerData;
          if (historyProvider && (historyProvider as ProviderLike).id && (!providerId || (historyProvider as ProviderLike).id === providerId)) {
            const normalized = normalizeProvider(historyProvider as Provider);

            // P1-3 FIX: Bloquer si le provider n'a pas de numéro de téléphone
            if (!normalized.phone && !normalized.phoneNumber) {
              console.error('❌ Provider sans numéro de téléphone — booking impossible');
              setState({ isLoading: false, error: 'Ce prestataire n\'a pas de numéro de téléphone enregistré. Veuillez contacter le support.', provider: null });
              return;
            }

            setState({ isLoading: false, error: null, provider: normalized });
            return;
          }
        } catch (err) {
          if (import.meta.env.DEV) console.error('[Wrapper] read history.state error', err);
        }

        // 7) localStorage (backup)
        try {
          const localStorageKeys = ['lastSelectedProvider', 'recentProvider', 'currentProvider'] as const;
          for (const key of localStorageKeys) {
            const data = localStorage.getItem(key);
            if (data) {
              const parsed = JSON.parse(data) as Provider;
              if (parsed && parsed.id && (!providerId || parsed.id === providerId)) {
                const normalized = normalizeProvider(parsed);

                // P1-3 FIX: Bloquer si le provider n'a pas de numéro de téléphone
                if (!normalized.phone && !normalized.phoneNumber) {
                  console.error('❌ Provider sans numéro de téléphone — booking impossible');
                  setState({ isLoading: false, error: 'Ce prestataire n\'a pas de numéro de téléphone enregistré. Veuillez contacter le support.', provider: null });
                  return;
                }

                setState({ isLoading: false, error: null, provider: normalized });
                return;
              }
            }
          }
        } catch (err) {
          if (import.meta.env.DEV) console.error('[Wrapper] parse localStorage provider error', err);
        }

        // 8) paramètres URL → provider + currency uniquement
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const providerParam = urlParams.get('provider');
          const currencyParam = urlParams.get('currency'); // ex: ?currency=usd
          if (currencyParam) setCurrency(currencyParam);

          if (providerParam) {
            const providerData = JSON.parse(decodeURIComponent(providerParam)) as Provider;
            if (providerData && providerData.id && (!providerId || providerData.id === providerId)) {
              const normalized = normalizeProvider(providerData);

              // P1-3 FIX: Bloquer si le provider n'a pas de numéro de téléphone
              if (!normalized.phone && !normalized.phoneNumber) {
                console.error('❌ Provider sans numéro de téléphone — booking impossible');
                setState({ isLoading: false, error: 'Ce prestataire n\'a pas de numéro de téléphone enregistré. Veuillez contacter le support.', provider: null });
                return;
              }

              setState({ isLoading: false, error: null, provider: normalized });
              return;
            }
          }
        } catch (err) {
          if (import.meta.env.DEV) console.error('[Wrapper] parse URL params error', err);
        }

        // 9) fallback avec providerId — P1-3 FIX: bloquer car pas de données réelles
        if (providerId) {
          console.error('❌ [Wrapper] Fallback provider sans données réelles — booking impossible');
          setState({
            isLoading: false,
            error: 'Impossible de charger les informations du prestataire. Veuillez retourner à la page précédente et réessayer.',
            provider: null,
          });
          return;
        }

        // 10) rien trouvé
        console.warn('❌ [Wrapper] Aucune donnée de provider trouvée');
        setState({
          isLoading: false,
          error: t('error.body'),
          provider: null,
        });
      } catch (err) {
        if (import.meta.env.DEV) console.error('❌ loadData error', err);
        setState({
          isLoading: false,
          error: t('error.body'),
          provider: null,
        });
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locState, providerId, t]);

  // ✅ Vérification stricte : un prix admin doit exister (pas de fallback permissif)
  useEffect(() => {
    if (!state.provider || state.isLoading) return;

    const role = (state.provider.role || state.provider.type || 'expat') as 'lawyer' | 'expat';

    (async () => {
      try {
        const res = await calculateServiceAmounts(role, selectedCurrency);
        // Si la config renvoie des montants incohérents → on considère que le prix admin est manquant
        const ok =
          res &&
          typeof res.totalAmount === 'number' &&
          res.totalAmount > 0 &&
          typeof res.duration === 'number' &&
          res.duration > 0 &&
          typeof res.connectionFeeAmount === 'number' &&
          typeof res.providerAmount === 'number';

        if (!ok) {
          throw new Error('Invalid admin pricing response');
        }
        setPricingError(null);
      } catch (e) {
        const msg = `Configuration tarifaire manquante pour le rôle « ${role} » en ${selectedCurrency.toUpperCase()}. Contactez un administrateur.`;
        if (import.meta.env.DEV) console.error('[CallCheckoutWrapper] Admin pricing error:', e);
        setPricingError(msg);
      }
    })();
  }, [state.provider, state.isLoading, selectedCurrency]);

  // Sauvegarde session (❌ pas de serviceData — on garde seulement le provider)
  useEffect(() => {
    if (state.provider && !state.isLoading && !state.error) {
      try {
        sessionStorage.setItem('selectedProvider', JSON.stringify(state.provider));
        localStorage.setItem('lastSelectedProvider', JSON.stringify(state.provider));
        
        // ✅ CORRECTION: Log pour debug
        if (import.meta.env.DEV) {
          console.log('💾 Provider sauvegardé:', {
            id: state.provider.id,
            name: state.provider.name,
            phone: state.provider.phone,
            phoneNumber: state.provider.phoneNumber,
            role: state.provider.role
          });
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error('[Wrapper] persist provider error', err);
      }
    }
  }, [state.provider, state.isLoading, state.error]);

  const handleGoBack = (): void => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };

  // —————————————————————————————————————————————————————
  // UI States — mobile-first, i18n
  // —————————————————————————————————————————————————————
  if (state.isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-red-100 px-4">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 sm:p-8 text-center w-full max-w-lg">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600 mx-auto mb-4" />
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">{t('loading.title')}</h2>
          <p className="text-gray-600 text-sm">{t('loading.subtitle')}</p>
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-red-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
            <p className="text-xs text-gray-500 mt-2">{t('loading.progress')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (state.error || pricingError || !state.provider) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-red-100 px-4">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 sm:p-8 text-center w-full max-w-lg">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Données manquantes</h2>
          <p className="text-gray-600 text-sm mb-5">
            {pricingError ||
              state.error ||
              'Les informations de consultation sont manquantes. Veuillez sélectionner à nouveau un expert.'}
          </p>

          <div className="space-y-2">
            <button
              onClick={() => navigate('/sos-appel')}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors"
            >
              {t('cta.select_expert')}
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors"
            >
              {t('cta.home')}
            </button>
            <button
              onClick={handleGoBack}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-xl transition-colors"
            >
              {t('cta.back')}
            </button>
            <button
              onClick={() => {
                try {
                  const affiliateRef = sessionStorage.getItem('sos_affiliate_ref');
                  sessionStorage.clear();
                  localStorage.clear();
                  if (affiliateRef) sessionStorage.setItem('sos_affiliate_ref', affiliateRef);
                  console.log('🗑️ Cache vidé');
                } catch { /* noop */ }
                finally { window.location.reload(); }
              }}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 rounded-lg text-sm transition-colors"
            >
              {t('cta.clear_cache')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success — CallCheckout
  return (
    <PayPalProvider>
      <CallCheckout
        selectedProvider={state.provider}
        onGoBack={handleGoBack}
      />
    </PayPalProvider>
  );
};

export default CallCheckoutWrapper;