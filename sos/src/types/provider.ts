// src/types/provider.ts
import { Timestamp } from 'firebase/firestore';

// Types de prestataires disponibles
export type ProviderType =
  | 'lawyer'
  | 'expat'
  | 'accountant'
  | 'notary'
  | 'tax_consultant'
  | 'real_estate'
  | 'translator'
  | 'hr_consultant'
  | 'financial_advisor'
  | 'insurance_broker';

// Statuts de validation du profil
export type ValidationStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'changes_requested';

// Structure de la dernière décision de validation
export interface ValidationDecision {
  status: string;
  by: string;
  at: Timestamp;
  reason?: string;
}

// Interface Provider unifiée pour assurer la cohérence entre tous les composants
export interface Provider {
  // Champs obligatoires de base (présents dans Providers.tsx original)
  id: string;
  name: string;
 type: ProviderType;
  country: string;
  languages: string[];
  specialties: string[];
  rating: number;
  reviewCount: number;
  yearsOfExperience: number;
  isOnline: boolean;
  avatar: string;
  description: string;
  price: number;
  isVisible?: boolean;
  isApproved?: boolean;
  isBanned?: boolean;

  // Champs de paiement (Stripe ou PayPal selon le pays)
  paymentGateway?: 'stripe' | 'paypal';

  // Stripe Connect
  stripeAccountId?: string;
  stripeAccountStatus?: 'pending_verification' | 'verified' | 'restricted' | 'error';
  stripeOnboardingComplete?: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  kycStatus?: 'not_started' | 'pending' | 'completed' | 'verified' | 'error';

  // PayPal Commerce Platform
  paypalMerchantId?: string;
  paypalAccountStatus?: 'not_connected' | 'pending' | 'connected' | 'restricted' | 'error';
  paypalOnboardingComplete?: boolean;
  paypalPaymentsReceivable?: boolean;
  paypalRemindersCount?: number;

  // Statut de compte de paiement
  isPaymentAccountRequired?: boolean;
  paymentAccountRequiredReason?: string;

  // Champs étendus pour compatibilité avec les autres composants
  fullName?: string;
  firstName?: string;
  lastName?: string;
  role?: ProviderType; // Alias de type pour compatibilité (optionnel)
  currentCountry?: string;
  currentPresenceCountry?: string;
  profilePhoto?: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
  telephone?: string; // <— ajouté pour corriger les usages existants
  whatsapp?: string;
  whatsAppNumber?: string;
  languagesSpoken?: string[]; // Alias de languages pour compatibilité
  preferredLanguage?: string;
  duration: number; // Obligatoire avec fallback
  bio?: string;
  yearsAsExpat?: number;
  graduationYear?: string;
  expatriationYear?: string;
  isActive?: boolean;
  lastActivity?: Timestamp;
  lastActivityCheck?: Timestamp;
  autoOfflineEnabled?: boolean;
  inactivityTimeoutMinutes?: number;
  lastStatusChange?: Timestamp;
  nationality?: string;
  practiceCountries?: string[]; // Pays d'intervention
  operatingCountries?: string[]; // Alias pour pays d'intervention (compatibilité ProviderProfile)
  interventionCountries?: string[]; // Alias pour pays d'intervention (compatibilité SOSCall)

  // ========== GESTION STATUT BUSY PENDANT APPELS ==========
  /** Statut de disponibilité du prestataire */
  availability?: 'available' | 'busy' | 'offline';
  /** ID de la session d'appel en cours (si busy) */
  currentCallSessionId?: string | null;
  /** Timestamp du début de l'indisponibilité */
  busySince?: Timestamp | null;
  /** Raison de l'indisponibilité */
  busyReason?: 'in_call' | 'break' | 'offline' | 'manually_disabled' | null;

  // ========== PROFILS AAA (GÉRÉS EN INTERNE) ==========
  /** Profil AAA géré en interne par SOS-Expat */
  isAAA?: boolean;
  /** ID du compte de payout consolidé pour les profils AAA */
  aaaPayoutAccountId?: string;
  /** Gateway de payout pour le compte AAA consolidé */
  aaaPayoutGateway?: 'stripe' | 'paypal';
  /** Statut KYC délégué au compte consolidé */
  kycDelegated?: boolean;

  // ========== PAYOUT MODE (POUR TOUS LES PROFILS) ==========
  /** Mode de paiement: 'internal' (SOS-Expat) ou ID de compte externe */
  payoutMode?: 'internal' | string;
  /** Alias pour compatibilité AAA - même valeur que payoutMode */
  aaaPayoutMode?: 'internal' | string;

  // ========== SUSPENSION FIELDS ==========
  /** Indique si le prestataire est suspendu */
  isSuspended?: boolean;
  /** Timestamp de la suspension */
  suspendedAt?: Timestamp | null;
  /** Timestamp de fin de suspension (null = indéfini) */
  suspendedUntil?: Timestamp | null;
  /** Raison de la suspension */
  suspendReason?: string;

  // ========== ENHANCED VALIDATION FIELDS ==========
  /** Statut de validation du profil */
  validationStatus?: ValidationStatus;
  /** Timestamp de la demande de validation */
  validationRequestedAt?: Timestamp;
  /** Dernière décision de validation */
  lastValidationDecision?: ValidationDecision;
  /** Liste des changements demandés */
  requestedChanges?: string[];
}

/**
 * Normalise les données d'un provider pour assurer la cohérence
 * Respecte l'interface originale de Providers.tsx + extensions
 */
export function normalizeProvider(providerData: unknown): Provider {
  if (typeof providerData !== 'object' || providerData === null) {
    throw new Error('Provider data is required');
  }
  const o = providerData as Record<string, unknown>;

  // helpers
  const toStr = (v: unknown, fb = ''): string =>
    typeof v === 'string' ? v : fb;

  // Helper pour extraire un texte depuis un objet localisé {fr: "...", en: "..."} ou une string
  const toLocalizedStr = (v: unknown, fb = ''): string => {
    if (typeof v === 'string') return v;
    if (typeof v === 'object' && v !== null) {
      const obj = v as Record<string, unknown>;
      // Priorité: fr > en > première valeur non-vide
      for (const key of ['fr', 'en', ...Object.keys(obj)]) {
        const val = obj[key];
        if (typeof val === 'string' && val.trim()) return val.trim();
      }
    }
    return fb;
  };

  const toNum = (v: unknown, fb = 0): number => {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string') {
      const n = Number(v);
      return Number.isFinite(n) ? n : fb;
    }
    return fb;
  };

  const toBool = (v: unknown, fb = false): boolean =>
    typeof v === 'boolean' ? v : fb;

  const toStrArray = (v: unknown, fb: string[] = []): string[] => {
    if (!Array.isArray(v)) return fb;
    const arr = v.filter((x) => typeof x === 'string') as string[];
    return arr.length ? arr : fb;
  };

  // id
  const id =
    toStr(o.id) ||
    toStr(o.providerId) ||
    Math.random().toString(36);

  // type / role
  const rawType = o.type ?? o.role ?? o.providerType;
  const type: 'lawyer' | 'expat' =
    rawType === 'lawyer' || rawType === 'expat' ? (rawType as 'lawyer' | 'expat') : 'expat';

  // name / fullName - Format public: "Prénom N." (first name + initial)
  const firstName = toStr(o.firstName);
  const lastName = toStr(o.lastName);

  // Build public display name (FirstName + Last initial)
  const formatPublicName = (first: string, last: string): string => {
    if (first && last) {
      return `${first} ${last.charAt(0).toUpperCase()}.`;
    }
    return first || last || '';
  };

  // Priority: existing formatted name > build from first/last > full name > fallback
  const existingName = toStr(o.name) || toStr(o.providerName) || toStr(o.displayName);
  const publicName = formatPublicName(firstName, lastName);
  const rawFullName = toStr(o.fullName);

  // Use public name format if we have firstName+lastName, otherwise use existing
  const name = publicName || existingName || rawFullName || (id ? `Expert ${id.slice(-4)}` : 'Expert');
  const fullName = rawFullName || existingName || `${firstName} ${lastName}`.trim() || name;

  // country - PAS de fallback vers France !
  // Si le provider n'a pas de pays défini, on laisse vide pour éviter
  // de polluer le formulaire BookingRequest avec une valeur incorrecte
  const country =
    toStr(o.country) ||
    toStr(o.currentCountry) ||
    toStr(o.currentPresenceCountry) ||
    toStr(o.providerCountry) ||
    '';

  // languages
  const languages =
    toStrArray(o.languages) ||
    toStrArray(o.languagesSpoken) ||
    toStrArray(o.providerLanguages, ['fr']);

  // specialties
  const specialties =
    toStrArray(o.specialties) ||
    toStrArray(o.providerSpecialties, []);

  // price / duration
  const price = toNum(o.price, type === 'lawyer' ? 49 : 19);
  const duration = toNum(o.duration, type === 'lawyer' ? 20 : 30);

  // rating / reviews
  const rating = (() => {
    const r = toNum(o.rating, toNum(o.providerRating, 4.5));
    return Math.min(Math.max(r, 0), 5);
  })();
  const reviewCount = Math.max(0, toNum(o.reviewCount, toNum(o.providerReviewCount, 0)));

  // years of experience
  const yearsOfExperience = Math.max(0, toNum(o.yearsOfExperience, toNum(o.yearsAsExpat, 1)));

  // media / description (utilise toLocalizedStr pour gérer les objets {fr: "...", en: "..."})
  const avatar = toStr(o.avatar) || toStr(o.profilePhoto) || toStr(o.providerAvatar) || '/default-avatar.png';
  const description = toLocalizedStr(o.description) || toLocalizedStr(o.bio) || toLocalizedStr(o.professionalDescription) || toLocalizedStr(o.experienceDescription) || '';

  // Pays d'intervention (practiceCountries, operatingCountries, interventionCountries)
  const practiceCountries = toStrArray(o.practiceCountries) || toStrArray(o.operatingCountries) || toStrArray(o.interventionCountries, []);
  const operatingCountries = practiceCountries; // Alias pour compatibilité
  const interventionCountries = practiceCountries; // Alias pour compatibilité

  // contact
  const phone = toStr(o.phone) || toStr(o.phoneNumber) || toStr(o.providerPhone);
  const phoneNumber = toStr(o.phoneNumber) || toStr(o.phone) || toStr(o.providerPhone);
  const whatsapp = toStr(o.whatsapp) || toStr(o.whatsAppNumber);
  const whatsAppNumber = toStr(o.whatsAppNumber) || toStr(o.whatsapp);
  const telephone = toStr(o.telephone) || phone || phoneNumber; // normalisation
  const email = toStr(o.email);

  // flags
  const isOnline = toBool(o.isOnline, false);
  const isVisible = o.isVisible === false ? false : true;
  const isApproved = o.isApproved === false ? false : true;
  const isBanned = o.isBanned === true;

  // autres
  const preferredLanguage = toStr(o.preferredLanguage, 'fr');
  const yearsAsExpat = toNum(o.yearsAsExpat, yearsOfExperience);
  const graduationYear = toStr(o.graduationYear);
  const expatriationYear = toStr(o.expatriationYear);
  const currentCountry = toStr(o.currentCountry, country);
  const currentPresenceCountry = toStr(o.currentPresenceCountry, country);
  // firstName and lastName already declared above for name formatting
  const profilePhoto = avatar;
  const isActive = o.isActive === false ? false : true;

  // Nouveaux champs pour gestion statut busy
  const availability = ((): 'available' | 'busy' | 'offline' => {
    if (o.availability === 'busy') return 'busy';
    if (o.availability === 'offline' || !isOnline) return 'offline';
    return 'available';
  })();
  const currentCallSessionId = typeof o.currentCallSessionId === 'string' ? o.currentCallSessionId : null;
  const busySince = o.busySince as Timestamp | null | undefined;
  const busyReason = o.busyReason as 'in_call' | 'break' | 'offline' | 'manually_disabled' | null | undefined;

  return {
    // Champs obligatoires de l'interface originale Providers.tsx
    id,
    name,
    type,
    country,
    languages,
    specialties,
    rating,
    reviewCount,
    yearsOfExperience,
    isOnline,
    avatar,
    description,
    price,
    isVisible,
    isApproved,
    isBanned,

    // Champs étendus pour compatibilité avec autres composants
    fullName,
    firstName,
    lastName,
    role: type,
    currentCountry,
    currentPresenceCountry,
    profilePhoto,
    email,
    phone,
    phoneNumber,
    telephone,
    whatsapp,
    whatsAppNumber,
    languagesSpoken: languages,
    preferredLanguage,
    duration,
    bio: description,
    yearsAsExpat,
    graduationYear,
    expatriationYear,
    isActive,

    // Pays d'intervention (avec alias pour compatibilité tous composants)
    practiceCountries,
    operatingCountries,
    interventionCountries,

    // Nouveaux champs statut busy
    availability,
    currentCallSessionId,
    busySince,
    busyReason,

    // Champs AAA (profils gérés en interne)
    isAAA: toBool(o.isAAA, false),
    aaaPayoutAccountId: toStr(o.aaaPayoutAccountId),
    aaaPayoutGateway: o.aaaPayoutGateway === 'stripe' || o.aaaPayoutGateway === 'paypal'
      ? o.aaaPayoutGateway
      : undefined,
    kycDelegated: toBool(o.kycDelegated, false),
  };
}

/**
 * Valide qu'un provider a les données minimales requises
 * Filtre les prestataires inactifs, non approuvés, bannis, cachés ou suspendus
 *
 * ⚠️ IMPORTANT: Validation STRICTE - seuls les profils explicitement
 * approuvés (isApproved === true) et visibles (isVisible === true) passent
 */
export function validateProvider(provider: Provider | null): provider is Provider {
  if (!provider) return false;

  // Critères de validation STRICTS :
  // - ID valide et nom valide
  // - Compte actif (isActive === true ou non défini)
  // - Profil EXPLICITEMENT approuvé (isApproved === true) ⚠️ STRICT
  // - Non banni (isBanned !== true)
  // - Non suspendu (isSuspended !== true)
  // - EXPLICITEMENT visible (isVisible === true) ⚠️ STRICT
  // - Si validationStatus existe, doit être 'approved'
  // - Pas un admin
  const rawProvider = provider as unknown as Record<string, unknown>;
  const roleStr = String(rawProvider.role ?? '');
  const notAdmin = roleStr !== 'admin' && rawProvider.isAdmin !== true;

  // Validation du statut de validation (si le champ existe)
  const validationOk = provider.validationStatus === undefined || provider.validationStatus === 'approved';

  return Boolean(
    provider.id.trim() &&
    provider.name.trim() &&
    provider.isActive !== false &&
    provider.isApproved === true &&      // ✅ STRICT: doit être explicitement true
    !provider.isBanned &&
    !provider.isSuspended &&             // ✅ Non suspendu
    provider.isVisible === true &&        // ✅ STRICT: doit être explicitement true
    validationOk &&                       // ✅ Validation status approved (si existe)
    notAdmin
  );
}

/**
 * Crée un provider par défaut avec un ID donné
 * Respecte l'interface originale de Providers.tsx
 */
export function createDefaultProvider(providerId: string): Provider {
  return {
    // Champs obligatoires de l'interface originale
    id: providerId,
    name: 'Expert Consultant',
    type: 'expat',
    country: 'France',
    languages: ['fr'],
    specialties: [],
    rating: 4.5,
    reviewCount: 0,
    yearsOfExperience: 1,
    isOnline: false,
    avatar: '/default-avatar.png',
    description: '',
    price: 19,
    isVisible: true,
    isApproved: true,
    isBanned: false,

    // Champs étendus
    fullName: 'Expert Consultant',
    firstName: '',
    lastName: '',
    role: 'expat',
    currentCountry: 'France',
    currentPresenceCountry: 'France',
    profilePhoto: '/default-avatar.png',
    email: '',
    phone: '',
    phoneNumber: '',
    telephone: '',
    whatsapp: '',
    whatsAppNumber: '',
    languagesSpoken: ['fr'],
    preferredLanguage: 'fr',
    duration: 30,
    bio: '',
    yearsAsExpat: 1,
    graduationYear: '',
    expatriationYear: '',
    isActive: true,

    // Pays d'intervention
    practiceCountries: [],
    operatingCountries: [],
    interventionCountries: [],

    // Nouveaux champs statut busy
    availability: 'offline',
    currentCallSessionId: null,
    busySince: null,
    busyReason: null,

    // Champs AAA
    isAAA: false,
    aaaPayoutAccountId: '',
    aaaPayoutGateway: undefined,
    kycDelegated: false,

    // Champs de suspension (défauts)
    isSuspended: false,
    suspendedAt: null,
    suspendedUntil: null,
    suspendReason: '',

    // Champs de validation (défauts)
    validationStatus: undefined,
    validationRequestedAt: undefined,
    lastValidationDecision: undefined,
    requestedChanges: [],
  };
}

/**
 * Interface étendue pour l'administration incluant tous les champs admin-only
 */
export interface ProviderAdmin extends Provider {
  // Champs de suspension (requis pour admin)
  isSuspended: boolean;
  suspendedAt: Timestamp | null;
  suspendedUntil: Timestamp | null;
  suspendReason: string;

  // Champs de validation (requis pour admin)
  validationStatus: ValidationStatus;
  validationRequestedAt?: Timestamp;
  lastValidationDecision?: ValidationDecision;
  requestedChanges: string[];

  // Métadonnées admin supplémentaires
  _adminNotes?: string;
  _lastAdminAction?: {
    action: string;
    by: string;
    at: Timestamp;
  };
}

/**
 * Normalise les données d'un provider pour l'administration
 * Inclut tous les champs admin-only avec des valeurs par défaut
 *
 * @param providerData - Données brutes du provider
 * @returns Provider normalisé avec tous les champs admin
 */
export function normalizeProviderForAdmin(providerData: unknown): ProviderAdmin {
  // D'abord, normaliser avec la fonction standard
  const baseProvider = normalizeProvider(providerData);

  // Cast pour accéder aux champs potentiellement présents
  const o = (providerData as Record<string, unknown>) || {};

  // Helper pour les strings
  const toStr = (v: unknown, fb = ''): string =>
    typeof v === 'string' ? v : fb;

  // Helper pour les arrays de strings
  const toStrArray = (v: unknown, fb: string[] = []): string[] => {
    if (!Array.isArray(v)) return fb;
    const arr = v.filter((x) => typeof x === 'string') as string[];
    return arr.length ? arr : fb;
  };

  // Normaliser le statut de validation
  const validValidationStatuses: ValidationStatus[] = ['pending', 'in_review', 'approved', 'rejected', 'changes_requested'];
  const rawValidationStatus = o.validationStatus;
  const validationStatus: ValidationStatus =
    typeof rawValidationStatus === 'string' && validValidationStatuses.includes(rawValidationStatus as ValidationStatus)
      ? (rawValidationStatus as ValidationStatus)
      : 'pending';

  // Normaliser la dernière décision de validation
  const rawDecision = o.lastValidationDecision as Record<string, unknown> | undefined;
  const lastValidationDecision: ValidationDecision | undefined = rawDecision
    ? {
        status: toStr(rawDecision.status, ''),
        by: toStr(rawDecision.by, ''),
        at: rawDecision.at as Timestamp,
        reason: rawDecision.reason ? toStr(rawDecision.reason) : undefined,
      }
    : undefined;

  // Normaliser les métadonnées admin
  const rawLastAdminAction = o._lastAdminAction as Record<string, unknown> | undefined;
  const _lastAdminAction = rawLastAdminAction
    ? {
        action: toStr(rawLastAdminAction.action, ''),
        by: toStr(rawLastAdminAction.by, ''),
        at: rawLastAdminAction.at as Timestamp,
      }
    : undefined;

  return {
    ...baseProvider,

    // Champs de suspension
    isSuspended: o.isSuspended === true,
    suspendedAt: (o.suspendedAt as Timestamp | null) ?? null,
    suspendedUntil: (o.suspendedUntil as Timestamp | null) ?? null,
    suspendReason: toStr(o.suspendReason, ''),

    // Champs de validation
    validationStatus,
    validationRequestedAt: o.validationRequestedAt as Timestamp | undefined,
    lastValidationDecision,
    requestedChanges: toStrArray(o.requestedChanges, []),

    // Métadonnées admin
    _adminNotes: toStr(o._adminNotes),
    _lastAdminAction,
  };
}
