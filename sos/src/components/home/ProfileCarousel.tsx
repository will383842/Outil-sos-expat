// src/components/home/ProfileCarousel.tsx - VERSION FINALE avec conversion des langues + REST API fallback
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocaleNavigate } from '../../multilingual-system';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { getDownloadURL, ref } from 'firebase/storage';
import { storage } from '../../config/firebase';
import { getCountryName } from '../../utils/formatters';
import { runQueryRest } from '../../utils/firestoreRestApi';
import ModernProfileCard from './ModernProfileCard';
import type { Provider } from '@/types/provider';

// ✅ PERF: Timeout réduit de 8s à 3s pour un affichage plus rapide
// Le fallback (skeleton ou cache) s'affichera si Firestore est lent
const FIRESTORE_TIMEOUT_MS = 3000;

const DEFAULT_AVATAR = '/default-avatar.webp';

interface ProfileCarouselProps {
  className?: string;
  showStats?: boolean;
  pageSize?: number;
}

// ✅ PERF: Réduire le nombre de cartes visibles pour améliorer le rendu initial
// Mobile: 8 cartes suffisent pour le carousel scroll
// Desktop: 12 cartes pour l'animation infinite scroll (3x = 36 DOM nodes au lieu de 60)
const MAX_VISIBLE = 12;
const ROTATE_INTERVAL_MS = 30000;
const ROTATE_COUNT = 8;

const ProfileCarousel: React.FC<ProfileCarouselProps> = ({
  className = "",
  showStats = false,
  pageSize = 12
}) => {
  const { language } = useApp();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useLocaleNavigate();
  const [onlineProviders, setOnlineProviders] = useState<Provider[]>([]);
  const [visibleProviders, setVisibleProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rotationIndex, setRotationIndex] = useState(0);

  const rotationTimer = useRef<NodeJS.Timeout | null>(null);
  const recentlyShown = useRef<Set<string>>(new Set());
  // ✅ OPTIMISATION: Ref pour éviter les memory leaks
  const mountedRef = useRef(true);

  const isUserConnected = useMemo(() => !authLoading && !!user, [authLoading, user]);

  // SEO navigation - simplified structure
  const handleProfileClick = useCallback((provider: Provider) => {
    const typeSlug = provider.type === 'lawyer' ? 'avocat' : 'expatrie';
    // Use translated slug if available, otherwise generate from name
    const nameSlug = (provider as any).slug || provider.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-');
    // Append ID only if slug doesn't already contain it
    const finalSlug = nameSlug.includes(provider.id) ? nameSlug : `${nameSlug}-${provider.id}`;
    const seoUrl = `/${typeSlug}/${finalSlug}`;
    try { sessionStorage.setItem('selectedProvider', JSON.stringify(provider)); } catch { /* storage quota exceeded */ }
    navigate(seoUrl, { state: { selectedProvider: provider, navigationSource: 'home_carousel' } });
  }, [navigate]);

  // Sélection intelligente pour la rotation
  const selectVisibleProviders = useCallback((all: Provider[]): Provider[] => {
    if (all.length === 0) return [];

    // Fonction pour vérifier si un profil a une vraie photo
    const hasRealPhoto = (p: Provider) => {
      return p.avatar && p.avatar !== DEFAULT_AVATAR && p.avatar.trim() !== "";
    };

    // Trier: d'abord ceux avec photo, puis aléatoire
    const sortByPhotoThenRandom = (a: Provider, b: Provider) => {
      const aHasPhoto = hasRealPhoto(a);
      const bHasPhoto = hasRealPhoto(b);
      if (aHasPhoto !== bHasPhoto) {
        return aHasPhoto ? -1 : 1; // Avec photo en premier
      }
      return Math.random() - 0.5; // Aléatoire pour le reste
    };

    const busy = all.filter(p => p.availability === 'busy' && p.isOnline);
    const available = all.filter(p => p.isOnline && p.availability !== 'busy');
    const offline = all.filter(p => !p.isOnline);
    const sortedBusy = busy.sort(sortByPhotoThenRandom);
    const sortedAvailable = available.sort(sortByPhotoThenRandom);
    const sortedOffline = offline.sort(sortByPhotoThenRandom);
    const prioritized = [...sortedBusy, ...sortedAvailable, ...sortedOffline];
    const notRecent = prioritized.filter(p => !recentlyShown.current.has(p.id));

    let selected = notRecent.slice(0, MAX_VISIBLE);
    if (selected.length < MAX_VISIBLE) {
      const remaining = prioritized.filter(p => !selected.includes(p));
      selected = [...selected, ...remaining].slice(0, MAX_VISIBLE);
    }
    selected.forEach(p => recentlyShown.current.add(p.id));
    if (recentlyShown.current.size > 40) {
      const old = Array.from(recentlyShown.current).slice(0, 20);
      old.forEach(id => recentlyShown.current.delete(id));
    }
    return selected;
  }, []);

  // Chargement initial avec REST API fallback
  const loadInitialProviders = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log("🏠 [ProfileCarousel] Tentative 1: REST API...");

      // Fonction de transformation commune
      const transformDoc = async (id: string, data: any): Promise<Provider | null> => {
        try {
          // Extraction prénom/nom
          const firstName = (data.firstName || '').trim();
          const lastName = (data.lastName || '').trim();
          const fullName =
            data.fullName ||
            `${firstName} ${lastName}`.trim() ||
            'Expert';

          // Génération du nom public avec initiale
          const publicDisplayName = firstName && lastName
            ? `${firstName} ${lastName.charAt(0)}.`
            : fullName;

          const type: 'lawyer' | 'expat' | string =
            data.type === 'lawyer' || data.type === 'expat' ? data.type : 'expat';

          // Extraction du code pays et conversion en nom lisible
          const countryCode: string =
            data.currentPresenceCountry || data.country || data.currentCountry || 'FR';
          const country: string = getCountryName(countryCode, language);

          let avatar: string = data.profilePhoto || data.photoURL || data.avatar || '';
          if (avatar && avatar.startsWith('user_uploads/')) {
            try { avatar = await getDownloadURL(ref(storage, avatar)); }
            catch { avatar = DEFAULT_AVATAR; }
          } else if (!avatar || !avatar.startsWith('http')) {
            avatar = DEFAULT_AVATAR;
          }

          // Détection admin réelle
          const rawRole = typeof data.role === 'string' ? data.role.toLowerCase() : undefined;
          const isAdmin = data.isAdmin === true || rawRole === 'admin';

          // Pays d'intervention - prendre practiceCountries ou operatingCountries
          const practiceCountries: string[] = Array.isArray(data.practiceCountries) && data.practiceCountries.length > 0
            ? data.practiceCountries
            : Array.isArray(data.operatingCountries) && data.operatingCountries.length > 0
              ? data.operatingCountries
              : [];

          const provider: Provider = {
            id,
            name: publicDisplayName,
            type,
            country,
            practiceCountries, // Pays d'intervention pour l'affichage
            languages: Array.isArray(data.languages) ? data.languages : ['fr'],
            specialties: Array.isArray(data.specialties) ? data.specialties : [],
            rating: typeof data.rating === 'number' && data.rating >= 0 && data.rating <= 5 ? data.rating : 4.5,
            reviewCount: typeof data.reviewCount === 'number' && data.reviewCount >= 0 ? data.reviewCount : 0,
            yearsOfExperience: typeof data.yearsOfExperience === 'number' ? data.yearsOfExperience : (data.yearsAsExpat || 0),
            isOnline: data.isOnline === true,
            availability: data.availability || (data.isOnline ? 'available' : 'offline'),
            busyReason: data.busyReason || null,
            avatar,
            profilePhoto: avatar,
            description: data.description || data.bio || '',
            price: typeof data.price === 'number' ? data.price : (type === 'lawyer' ? 49 : 19),
            duration: typeof data.duration === 'number' ? data.duration : (type === 'lawyer' ? 20 : 30),
            isApproved: data.isApproved === true,
            isVisible: data.isVisible !== false,
            isBanned: data.isBanned === true,
            isActive: data.isActive !== false,
            isVerified: data.isVerified === true,
          } as Provider & { __isAdmin?: boolean };
          // Add internal trace
          (provider as any).__isAdmin = isAdmin;

          // Règle d'affichage - ⚠️ CORRECTION: Vérifier isApproved
          const hasValidData = provider.name.trim() !== '' && provider.country.trim() !== '';
          const notBanned = data.isBanned !== true;
          const notAdmin = !(provider as any).__isAdmin;
          const visible = data.isVisible !== false;
          const approved = data.isApproved === true;  // ✅ AJOUT: Vérifier l'approbation
          const validType = provider.type === 'lawyer' || provider.type === 'expat';

          if (hasValidData && notBanned && notAdmin && visible && approved && validType) {
            return provider;
          }
          return null;
        } catch (e) {
          console.error('❌ Erreur transformation document:', id, e);
          return null;
        }
      };

      let items: Provider[] = [];

      // Tentative 1: REST API
      try {
        const docs = await runQueryRest<any>("sos_profiles", [
          { field: 'isApproved', op: 'EQUAL', value: true },
          { field: 'isVisible', op: 'EQUAL', value: true },
        ], {
          limit: 100,
          timeoutMs: FIRESTORE_TIMEOUT_MS,
        });

        console.log(`✅ [ProfileCarousel] REST API: ${docs.length} documents`);

        const transformedPromises = docs.map(doc => transformDoc(doc.id, doc.data));
        const transformed = await Promise.all(transformedPromises);
        items = transformed.filter((p): p is Provider => p !== null);

        if (items.length > 0) {
          console.log(`✅ [ProfileCarousel] ${items.length} providers valides`);
          setOnlineProviders(items.slice(0, pageSize));
          setVisibleProviders(selectVisibleProviders(items));
          return;
        }
      } catch (restError) {
        console.error("❌ [ProfileCarousel] REST API échoué:", restError);
      }

      // Tentative 2: SDK Firestore
      console.log("🏠 [ProfileCarousel] Tentative 2: SDK Firestore...");

      try {
        const sosProfilesQuery = query(
          collection(db, 'sos_profiles'),
          where('isApproved', '==', true),
          where('isVisible', '==', true),
        );

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("SDK timeout")), FIRESTORE_TIMEOUT_MS);
        });

        const snapshot = await Promise.race([
          getDocs(sosProfilesQuery),
          timeoutPromise
        ]);

        console.log(`✅ [ProfileCarousel] SDK: ${snapshot.size} documents reçus`);

        if (!snapshot.empty) {
          const transformedPromises = snapshot.docs.map(d => transformDoc(d.id, d.data()));
          const transformed = await Promise.all(transformedPromises);
          items = transformed.filter((p): p is Provider => p !== null);
        }
      } catch (sdkError) {
        console.error("❌ [ProfileCarousel] SDK aussi échoué:", sdkError);
      }

      if (items.length === 0) {
        console.warn("⚠️ [ProfileCarousel] Aucun provider trouvé");
        setOnlineProviders([]);
        setVisibleProviders([]);
        return;
      }

      setOnlineProviders(items.slice(0, pageSize));
      setVisibleProviders(selectVisibleProviders(items));
    } catch (err) {
      console.error('❌ Erreur ProfileCarousel:', err);
      setError(`Erreur de chargement: ${err instanceof Error ? err.message : 'inconnue'}`);
      setOnlineProviders([]);
      setVisibleProviders([]);
    } finally {
      setIsLoading(false);
    }
  }, [pageSize, selectVisibleProviders]);

  // Rotation
  const rotateVisibleProviders = useCallback(() => {
    if (onlineProviders.length === 0) return;
    const keepCount = Math.max(0, MAX_VISIBLE - ROTATE_COUNT);
    const toKeep = visibleProviders.slice(0, keepCount);

    const available = onlineProviders.filter(p =>
      !toKeep.find(kept => kept.id === p.id) &&
      !recentlyShown.current.has(p.id)
    );

    let newOnes = available.slice(0, ROTATE_COUNT);
    if (newOnes.length < ROTATE_COUNT) {
      const fallback = onlineProviders.filter(p => !toKeep.find(kept => kept.id === p.id));
      newOnes = [...newOnes, ...fallback].slice(0, ROTATE_COUNT);
    }

    const rotated = [...toKeep, ...newOnes].sort(() => Math.random() - 0.5);
    setVisibleProviders(rotated.slice(0, MAX_VISIBLE));
    setRotationIndex(prev => prev + 1);
    newOnes.forEach(p => recentlyShown.current.add(p.id));
  }, [onlineProviders, visibleProviders]);

  // Temps réel: statut online et availability sur les visibles
  const updateProviderStatus = useCallback((
    id: string,
    isOnline: boolean,
    availability: 'available' | 'busy' | 'offline',
    busyReason?: 'in_call' | 'break' | 'offline' | 'manually_disabled' | null
  ) => {
    setOnlineProviders(prev => prev.map(p => p.id === id ? { ...p, isOnline, availability, busyReason } : p));
    setVisibleProviders(prev => prev.map(p => p.id === id ? { ...p, isOnline, availability, busyReason } : p));
  }, []);

  // ✅ OPTIMISATION: Un seul listener au lieu de N listeners
  // Utilise 'in' query limitée à 30 providers max (limite Firestore)
  const setupRealtimeListeners = useCallback(() => {
    if (visibleProviders.length === 0) return () => {};

    // Prendre les premiers 30 IDs (limite Firestore pour 'in' queries)
    const providerIds = visibleProviders.slice(0, 30).map(p => p.id);

    // Un seul listener pour tous les providers visibles
    const sosProfilesRef = collection(db, 'sos_profiles');
    const q = query(sosProfilesRef, where('__name__', 'in', providerIds));

    const unsub = onSnapshot(q, (snap) => {
      // ✅ Check si le composant est toujours monté
      if (!mountedRef.current) return;

      snap.docChanges().forEach((chg) => {
        if (chg.type === 'modified') {
          const data = chg.doc.data() as any;
          const online = data.isOnline === true;
          const availability = data.availability || (online ? 'available' : 'offline');
          const busyReason = data.busyReason || null;
          const provider = visibleProviders.find(p => p.id === chg.doc.id);

          // Mettre à jour si isOnline OU availability a changé
          if (provider && (online !== provider.isOnline || availability !== provider.availability)) {
            updateProviderStatus(chg.doc.id, online, availability, busyReason);
          }
        }
      });
    }, (e) => {
      if (mountedRef.current) {
        console.error('[ProfileCarousel] Realtime listener error:', e);
      }
    });

    return () => unsub();
  }, [visibleProviders, updateProviderStatus]);

  // Timers / Effects
  useEffect(() => {
    if (rotationTimer.current) clearInterval(rotationTimer.current);
    if (visibleProviders.length > 0 && onlineProviders.length > MAX_VISIBLE) {
      rotationTimer.current = setInterval(() => rotateVisibleProviders(), ROTATE_INTERVAL_MS);
    }
    return () => { if (rotationTimer.current) clearInterval(rotationTimer.current); };
  }, [rotateVisibleProviders, visibleProviders.length, onlineProviders.length]);

  // ✅ OPTIMISATION: Cleanup propre avec mountedRef
  useEffect(() => {
    mountedRef.current = true;
    loadInitialProviders();
    return () => {
      mountedRef.current = false;
    };
  }, [loadInitialProviders]);

  useEffect(() => {
    if (visibleProviders.length === 0) return;
    const cleanup = setupRealtimeListeners();
    return cleanup;
  }, [setupRealtimeListeners, visibleProviders.length]);

  // Stats
  const stats = useMemo(() => ({
    total: onlineProviders.length,
    online: onlineProviders.filter(p => p.isOnline).length,
    lawyers: onlineProviders.filter(p => p.type === 'lawyer').length,
    experts: onlineProviders.filter(p => p.type === 'expat').length
  }), [onlineProviders]);

  // Textes multilingues
  const carouselTexts = useMemo(() => {
    const texts: Record<string, { loading: string; retry: string }> = {
      fr: { loading: 'Chargement des experts...', retry: 'Réessayer' },
      en: { loading: 'Loading experts...', retry: 'Retry' },
      es: { loading: 'Cargando expertos...', retry: 'Reintentar' },
      de: { loading: 'Experten werden geladen...', retry: 'Erneut versuchen' },
      pt: { loading: 'Carregando especialistas...', retry: 'Tentar novamente' },
      ru: { loading: 'Загрузка экспертов...', retry: 'Повторить' },
      ch: { loading: '正在加载专家...', retry: '重试' },
      hi: { loading: 'विशेषज्ञ लोड हो रहे हैं...', retry: 'पुन: प्रयास करें' },
      ar: { loading: 'جاري تحميل الخبراء...', retry: 'إعادة المحاولة' }
    };
    return texts[language] || texts.en;
  }, [language]);

  // UI states
  if (isLoading) {
    return (
      <div className={`flex flex-col sm:flex-row justify-center items-center py-12 px-4 ${className}`}>
        <div className="w-10 h-10 sm:w-8 sm:h-8 border-3 sm:border-2 border-gray-300 border-t-red-500 rounded-full animate-spin" />
        <span className="mt-3 sm:mt-0 sm:ml-3 text-gray-600 text-sm sm:text-base text-center">{carouselTexts.loading}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center text-center py-12 px-4 ${className}`}>
        <p className="text-red-600 mb-4 text-sm sm:text-base px-4 max-w-sm">{error}</p>
        <button
          onClick={loadInitialProviders}
          className="px-6 py-3 sm:px-4 sm:py-2 bg-red-500 text-white rounded-xl sm:rounded hover:bg-red-600 transition-colors text-sm sm:text-base font-medium touch-manipulation"
          style={{ minHeight: '48px', WebkitTapHighlightColor: 'transparent' }}
        >
          {carouselTexts.retry}
        </button>
      </div>
    );
  }

  const displayProviders = visibleProviders.length > 0 ? visibleProviders : onlineProviders;

  if (displayProviders.length === 0) {
    return (
      <div className={`flex items-center justify-center py-12 px-4 ${className}`}>
        <div className="w-full max-w-sm mx-auto text-center">
          <div className="text-5xl sm:text-6xl mb-4">🔍</div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2">Aucun expert disponible</h3>
          <p className="text-gray-600 text-sm px-4">Aucun profil n'a été trouvé dans la base de données Firebase.</p>
        </div>
      </div>
    );
  }

  const infiniteProviders = [...displayProviders, ...displayProviders, ...displayProviders];

  return (
    <div className={className}>
      {showStats && (
        <div className="mb-6 sm:mb-8 flex justify-center gap-4 sm:gap-6 px-4">
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-green-600">{stats.online}</div>
            <div className="text-xs sm:text-sm text-gray-600">En ligne</div>
          </div>
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-blue-600">{stats.lawyers}</div>
            <div className="text-xs sm:text-sm text-gray-600">Avocats</div>
          </div>
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-purple-600">{stats.experts}</div>
            <div className="text-xs sm:text-sm text-gray-600">Expats</div>
          </div>
        </div>
      )}

      {onlineProviders.length > MAX_VISIBLE && (
        <div className="flex justify-center mb-4 px-4">
          <div className="text-[10px] sm:text-xs text-gray-500 bg-gray-100 px-2 sm:px-3 py-1 rounded-full text-center">
            Rotation auto • {displayProviders.filter(p => p.isOnline).length}/{displayProviders.length} en ligne
          </div>
        </div>
      )}

      {/* Mobile & Tablet - Scroll horizontal avec snap - CENTRÉ */}
      {/* ✅ FIX 2026-02-02: touch-action pan-x pour permettre le scroll horizontal natif */}
      <div
        className="lg:hidden flex gap-4 sm:gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide carousel-scroll-container"
        style={{
          scrollPaddingInline: 'calc(50vw - 150px)',
          paddingLeft: 'calc(50vw - 150px)',
          paddingRight: 'calc(50vw - 150px)',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-x pan-y', // ✅ FIX: Permettre scroll horizontal ET vertical (page)
        }}
      >
        {displayProviders.map((provider, index) => (
          <div
            key={`${provider.id}-${rotationIndex}`}
            className="flex-shrink-0 w-[300px] sm:w-[340px] snap-center"
            style={{ touchAction: 'pan-x pan-y' }} // ✅ FIX: Propager touch-action
          >
            <ModernProfileCard
              provider={provider}
              onProfileClick={handleProfileClick}
              isUserConnected={isUserConnected}
              index={index}
              language={language as "fr" | "en" | "es" | "de" | "ru" | "pt" | "ch" | "hi" | "ar"}
            />
          </div>
        ))}
      </div>

      {/* Desktop - Animation infinite scroll */}
      <div className="hidden lg:flex gap-8 animate-infinite-scroll">
        {infiniteProviders.map((provider, index) => (
          <div key={`${provider.id}-${index}-${rotationIndex}`} className="flex-shrink-0">
            <ModernProfileCard
              provider={provider}
              onProfileClick={handleProfileClick}
              isUserConnected={isUserConnected}
              index={index % displayProviders.length}
              language={language}
            />
          </div>
        ))}
      </div>

      <style>{`
        @keyframes infinite-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        .animate-infinite-scroll { animation: infinite-scroll 60s linear infinite; }
        .animate-infinite-scroll:hover { animation-play-state: paused; }
        .scrollbar-hide {
          scrollbar-width: none;
          -ms-overflow-style: none;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }

        /* ✅ FIX 2026-02-02: Amélioration scroll tactile mobile */
        @media (max-width: 1023px) {
          .carousel-scroll-container {
            scroll-snap-type: x mandatory;
            overscroll-behavior-x: contain;
            /* Permettre scroll horizontal ET vertical (page) */
            touch-action: pan-x pan-y;
          }

          /* S'assurer que les enfants ne bloquent pas le scroll */
          .carousel-scroll-container > * {
            touch-action: pan-x pan-y;
          }
        }
      `}</style>
    </div>
  );
};

export default React.memo(ProfileCarousel);
export type { Provider };