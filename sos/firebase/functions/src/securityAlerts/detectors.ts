/**
 * Détecteurs de menaces pour SOS Expat
 *
 * IMPORTANT: La détection est basée sur les COMPORTEMENTS anormaux, PAS sur la géographie.
 * Aucun pays n'est blacklisté. Tous les utilisateurs de tous les pays peuvent utiliser la plateforme.
 * Seuls les comportements suspects déclenchent des alertes.
 */

import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { db } from '../firebaseAdmin';
import {
  SecurityAlertType,
  UserGeoProfile,
  PaymentAnomaly,
  PaymentAnomalyType,
  InjectionAttempt,
  GeoLocation,
} from './types';
import {
  createBruteForceAlert,
  createUnusualLocationAlert,
  createSuspiciousPaymentAlert,
  createApiAbuseAlert,
  createDataBreachAlert,
  createSecurityAlert,
} from './createAlert';

// ==========================================
// CONFIGURATION DES SEUILS DE DÉTECTION
// ==========================================

export const DETECTION_THRESHOLDS = {
  // Brute force
  MAX_LOGIN_ATTEMPTS_PER_MINUTE: 5,
  MAX_LOGIN_ATTEMPTS_PER_HOUR: 20,
  LOCKOUT_DURATION_MS: 30 * 60 * 1000, // 30 minutes

  // Création de comptes
  MAX_ACCOUNTS_PER_IP_PER_HOUR: 3,
  MAX_ACCOUNTS_PER_IP_PER_DAY: 10,

  // Paiements
  PAYMENT_VELOCITY_THRESHOLD: 5, // paiements par heure
  HIGH_AMOUNT_THRESHOLD: 500, // EUR
  CARD_TESTING_THRESHOLD: 3, // échecs consécutifs

  // API abuse
  MAX_REQUESTS_PER_MINUTE: 60,
  MAX_REQUESTS_PER_HOUR: 500,

  // Impossible travel (vitesse max en km/h)
  MAX_TRAVEL_SPEED_KMH: 1000, // Avion supersonique = impossible

  // Sessions multiples
  MAX_CONCURRENT_SESSIONS: 5,
};

// ==========================================
// DÉTECTION BRUTE FORCE
// ==========================================

export interface LoginAttemptInfo {
  ip: string;
  userId?: string;
  userEmail?: string;
  success: boolean;
  timestamp: Date;
  userAgent?: string;
}

/**
 * Enregistre une tentative de connexion et détecte les attaques brute force
 */
export async function detectBruteForce(attempt: LoginAttemptInfo): Promise<boolean> {
  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;
  const oneHourAgo = now - 60 * 60 * 1000;

  // Stocker la tentative
  await db.collection('login_attempts').add({
    ...attempt,
    timestamp: Timestamp.fromDate(attempt.timestamp),
    createdAt: Timestamp.now(),
  });

  // Compter les tentatives récentes pour cette IP
  const recentAttemptsSnapshot = await db
    .collection('login_attempts')
    .where('ip', '==', attempt.ip)
    .where('success', '==', false)
    .where('timestamp', '>=', Timestamp.fromMillis(oneHourAgo))
    .get();

  const recentAttempts = recentAttemptsSnapshot.docs.map((doc) => doc.data());

  // Tentatives dans la dernière minute
  const lastMinuteAttempts = recentAttempts.filter(
    (a) => a.timestamp.toMillis() >= oneMinuteAgo
  ).length;

  // Tentatives dans la dernière heure
  const lastHourAttempts = recentAttempts.length;

  let shouldAlert = false;
  let severity: 'warning' | 'critical' = 'warning';

  if (lastMinuteAttempts >= DETECTION_THRESHOLDS.MAX_LOGIN_ATTEMPTS_PER_MINUTE) {
    shouldAlert = true;
    severity = 'critical';
  } else if (lastHourAttempts >= DETECTION_THRESHOLDS.MAX_LOGIN_ATTEMPTS_PER_HOUR) {
    shouldAlert = true;
    severity = 'warning';
  }

  if (shouldAlert) {
    await createBruteForceAlert({
      ip: attempt.ip,
      userId: attempt.userId,
      userEmail: attempt.userEmail,
      attemptCount: lastHourAttempts,
      targetResource: 'login',
    });

    console.log(`[Detector] Brute force detected from ${attempt.ip}: ${lastHourAttempts} attempts`);
    return true;
  }

  return false;
}

// ==========================================
// DÉTECTION CONNEXION INHABITUELLE
// ==========================================

/**
 * Calcule la distance entre deux points géographiques (formule de Haversine)
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface GeoLoginInfo {
  userId: string;
  userEmail: string;
  ip: string;
  geoLocation: GeoLocation;
  timestamp: Date;
}

/**
 * Détecte les connexions depuis des emplacements inhabituels
 * NOTE: Ne bloque PAS basé sur le pays, seulement sur les anomalies de comportement
 */
export async function detectUnusualLocation(login: GeoLoginInfo): Promise<boolean> {
  const userId = login.userId;

  // Récupérer le profil géographique de l'utilisateur
  const profileRef = db.collection('geo_profiles').doc(userId);
  const profileDoc = await profileRef.get();

  let profile: UserGeoProfile | null = profileDoc.exists
    ? (profileDoc.data() as UserGeoProfile)
    : null;

  const newLocation = {
    ip: login.ip,
    country: login.geoLocation.country,
    city: login.geoLocation.city,
    latitude: login.geoLocation.latitude,
    longitude: login.geoLocation.longitude,
    timestamp: Timestamp.now(),
  };

  if (!profile) {
    // Premier login - créer le profil (pas d'alerte)
    await profileRef.set({
      userId,
      knownCountries: [login.geoLocation.country],
      knownIPs: [login.ip],
      lastLocations: [newLocation],
      averageTravelVelocity: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return false;
  }

  // Vérifier si c'est un nouveau pays
  const isNewCountry = !profile.knownCountries.includes(login.geoLocation.country);

  // Vérifier le "impossible travel"
  let isImpossibleTravel = false;
  let distanceKm = 0;

  if (profile.lastLocations.length > 0) {
    const lastLocation = profile.lastLocations[profile.lastLocations.length - 1];

    if (
      lastLocation.latitude &&
      lastLocation.longitude &&
      login.geoLocation.latitude &&
      login.geoLocation.longitude
    ) {
      distanceKm = calculateDistance(
        lastLocation.latitude,
        lastLocation.longitude,
        login.geoLocation.latitude,
        login.geoLocation.longitude
      );

      const timeDiffHours =
        (Date.now() - lastLocation.timestamp.toMillis()) / (1000 * 60 * 60);

      if (timeDiffHours > 0) {
        const speedKmh = distanceKm / timeDiffHours;
        isImpossibleTravel = speedKmh > DETECTION_THRESHOLDS.MAX_TRAVEL_SPEED_KMH;
      }
    }
  }

  // Mettre à jour le profil
  const updatedLocations = [...profile.lastLocations.slice(-9), newLocation];
  const updatedCountries = isNewCountry
    ? [...profile.knownCountries, login.geoLocation.country]
    : profile.knownCountries;
  const updatedIPs = profile.knownIPs.includes(login.ip)
    ? profile.knownIPs
    : [...profile.knownIPs.slice(-19), login.ip];

  await profileRef.update({
    lastLocations: updatedLocations,
    knownCountries: updatedCountries,
    knownIPs: updatedIPs,
    updatedAt: Timestamp.now(),
  });

  // Décider si on doit alerter
  let shouldAlert = false;

  if (isImpossibleTravel) {
    // Impossible travel = alerte critique
    await createSecurityAlert({
      type: 'security.impossible_travel',
      severity: 'critical',
      context: {
        timestamp: new Date().toISOString(),
        userId: login.userId,
        userEmail: login.userEmail,
        userName: login.userEmail.split('@')[0],
        ip: login.ip,
        country: login.geoLocation.country,
        countryName: login.geoLocation.countryName,
        city: login.geoLocation.city,
        previousCountry: profile.lastLocations[profile.lastLocations.length - 1]?.country,
        distanceKm: Math.round(distanceKm),
        geoLocation: login.geoLocation,
      },
      source: {
        userId: login.userId,
        userEmail: login.userEmail,
        ip: login.ip,
        country: login.geoLocation.country,
      },
    });
    shouldAlert = true;
  } else if (isNewCountry && login.geoLocation.isVPN) {
    // Nouveau pays + VPN = alerte warning
    await createUnusualLocationAlert({
      userId: login.userId,
      userEmail: login.userEmail,
      ip: login.ip,
      country: login.geoLocation.country,
      countryName: login.geoLocation.countryName,
      city: login.geoLocation.city,
      previousCountry: profile.lastLocations[profile.lastLocations.length - 1]?.country || 'Unknown',
      distanceKm: Math.round(distanceKm),
      isVPN: login.geoLocation.isVPN,
      isTor: login.geoLocation.isTor,
    });
    shouldAlert = true;
  } else if (login.geoLocation.isTor) {
    // Connexion via Tor = toujours alerter
    await createUnusualLocationAlert({
      userId: login.userId,
      userEmail: login.userEmail,
      ip: login.ip,
      country: login.geoLocation.country,
      countryName: login.geoLocation.countryName,
      city: login.geoLocation.city,
      previousCountry: profile.lastLocations[profile.lastLocations.length - 1]?.country || 'Unknown',
      isVPN: false,
      isTor: true,
    });
    shouldAlert = true;
  }

  return shouldAlert;
}

// ==========================================
// DÉTECTION FRAUDE PAIEMENT
// ==========================================

export interface PaymentInfo {
  userId: string;
  userEmail: string;
  ip: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentId: string;
  cardCountry?: string;
  userCountry?: string;
  isNewCard: boolean;
  timestamp: Date;
}

/**
 * Détecte les anomalies de paiement
 */
export async function detectPaymentFraud(payment: PaymentInfo): Promise<{
  isSuspicious: boolean;
  riskScore: number;
  anomalies: PaymentAnomaly[];
}> {
  const anomalies: PaymentAnomaly[] = [];
  let riskScore = 0;

  // Récupérer l'historique des paiements de l'utilisateur
  const last24h = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
  const lastHour = Timestamp.fromMillis(Date.now() - 60 * 60 * 1000);

  const [recentPayments, hourlyPayments] = await Promise.all([
    db.collection('payments')
      .where('userId', '==', payment.userId)
      .where('createdAt', '>=', last24h)
      .get(),
    db.collection('payments')
      .where('userId', '==', payment.userId)
      .where('createdAt', '>=', lastHour)
      .get(),
  ]);

  // 1. Velocity check
  if (hourlyPayments.size >= DETECTION_THRESHOLDS.PAYMENT_VELOCITY_THRESHOLD) {
    anomalies.push({
      type: 'velocity_spike',
      severity: 'high',
      details: { paymentsLastHour: hourlyPayments.size },
      timestamp: Timestamp.now(),
    });
    riskScore += 30;
  }

  // 2. Montant élevé + nouvelle carte
  if (payment.amount > DETECTION_THRESHOLDS.HIGH_AMOUNT_THRESHOLD && payment.isNewCard) {
    anomalies.push({
      type: 'new_card_high_amount',
      severity: 'medium',
      details: { amount: payment.amount, currency: payment.currency },
      timestamp: Timestamp.now(),
    });
    riskScore += 25;
  }

  // 3. Montant anormal par rapport à l'historique
  if (recentPayments.size > 0) {
    const avgAmount = recentPayments.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0) / recentPayments.size;
    if (payment.amount > avgAmount * 3) {
      anomalies.push({
        type: 'amount_outlier',
        severity: 'medium',
        details: { amount: payment.amount, avgAmount },
        timestamp: Timestamp.now(),
      });
      riskScore += 20;
    }
  }

  // 4. Paiement hors heures (3h-6h heure locale)
  const hour = new Date().getHours();
  if (hour >= 3 && hour <= 6) {
    anomalies.push({
      type: 'after_hours',
      severity: 'low',
      details: { hour },
      timestamp: Timestamp.now(),
    });
    riskScore += 10;
  }

  // Créer une alerte si le score est suffisant
  const isSuspicious = riskScore >= 50;

  if (isSuspicious) {
    await createSuspiciousPaymentAlert({
      userId: payment.userId,
      userEmail: payment.userEmail,
      ip: payment.ip,
      amount: payment.amount,
      currency: payment.currency,
      paymentMethod: payment.paymentMethod,
      paymentId: payment.paymentId,
      riskFactors: anomalies.map((a) => a.type),
      riskScore,
    });
  }

  return { isSuspicious, riskScore, anomalies };
}

// ==========================================
// DÉTECTION CARD TESTING
// ==========================================

/**
 * Détecte les tentatives de test de carte (petits montants répétés ou échecs consécutifs)
 */
export async function detectCardTesting(params: {
  ip: string;
  userId?: string;
  paymentId: string;
  success: boolean;
  amount: number;
}): Promise<boolean> {
  const lastHour = Timestamp.fromMillis(Date.now() - 60 * 60 * 1000);

  // Compter les échecs de paiement depuis cette IP
  const failedPayments = await db
    .collection('payment_attempts')
    .where('ip', '==', params.ip)
    .where('success', '==', false)
    .where('timestamp', '>=', lastHour)
    .get();

  // Stocker cette tentative
  await db.collection('payment_attempts').add({
    ...params,
    timestamp: Timestamp.now(),
  });

  if (failedPayments.size >= DETECTION_THRESHOLDS.CARD_TESTING_THRESHOLD) {
    await createSecurityAlert({
      type: 'security.card_testing',
      severity: 'critical',
      context: {
        timestamp: new Date().toISOString(),
        ip: params.ip,
        userId: params.userId,
        attemptCount: failedPayments.size + 1,
      },
      source: {
        ip: params.ip,
        userId: params.userId,
      },
    });

    console.log(`[Detector] Card testing detected from ${params.ip}: ${failedPayments.size + 1} failures`);
    return true;
  }

  return false;
}

// ==========================================
// DÉTECTION CRÉATION MASSIVE DE COMPTES
// ==========================================

/**
 * Détecte la création massive de comptes depuis une même IP
 */
export async function detectMassAccountCreation(params: {
  ip: string;
  email: string;
  userId: string;
}): Promise<boolean> {
  const lastHour = Timestamp.fromMillis(Date.now() - 60 * 60 * 1000);
  const lastDay = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);

  // Stocker la création de compte
  await db.collection('account_creations').add({
    ...params,
    timestamp: Timestamp.now(),
  });

  // Compter les créations depuis cette IP
  const [hourlyCreations, dailyCreations] = await Promise.all([
    db.collection('account_creations')
      .where('ip', '==', params.ip)
      .where('timestamp', '>=', lastHour)
      .get(),
    db.collection('account_creations')
      .where('ip', '==', params.ip)
      .where('timestamp', '>=', lastDay)
      .get(),
  ]);

  let shouldAlert = false;

  if (hourlyCreations.size >= DETECTION_THRESHOLDS.MAX_ACCOUNTS_PER_IP_PER_HOUR) {
    await createSecurityAlert({
      type: 'security.mass_account_creation',
      severity: 'critical',
      context: {
        timestamp: new Date().toISOString(),
        ip: params.ip,
        accountCount: hourlyCreations.size,
        timeWindow: '1 hour',
      },
      source: {
        ip: params.ip,
      },
    });
    shouldAlert = true;
  } else if (dailyCreations.size >= DETECTION_THRESHOLDS.MAX_ACCOUNTS_PER_IP_PER_DAY) {
    await createSecurityAlert({
      type: 'security.mass_account_creation',
      severity: 'warning',
      context: {
        timestamp: new Date().toISOString(),
        ip: params.ip,
        accountCount: dailyCreations.size,
        timeWindow: '24 hours',
      },
      source: {
        ip: params.ip,
      },
    });
    shouldAlert = true;
  }

  return shouldAlert;
}

// ==========================================
// DÉTECTION ABUS API
// ==========================================

/**
 * Détecte les abus d'API (rate limit, scraping, etc.)
 */
export async function detectApiAbuse(params: {
  ip: string;
  userId?: string;
  endpoint: string;
  method: string;
  userAgent?: string;
}): Promise<boolean> {
  const lastMinute = Timestamp.fromMillis(Date.now() - 60 * 1000);
  const lastHour = Timestamp.fromMillis(Date.now() - 60 * 60 * 1000);

  // Compter les requêtes
  const [minuteRequests, hourRequests] = await Promise.all([
    db.collection('api_requests')
      .where('ip', '==', params.ip)
      .where('timestamp', '>=', lastMinute)
      .get(),
    db.collection('api_requests')
      .where('ip', '==', params.ip)
      .where('timestamp', '>=', lastHour)
      .get(),
  ]);

  // Stocker cette requête (avec nettoyage automatique des anciennes)
  const requestRef = db.collection('api_requests').doc();
  await requestRef.set({
    ...params,
    timestamp: Timestamp.now(),
    expiresAt: Timestamp.fromMillis(Date.now() + 2 * 60 * 60 * 1000), // TTL 2h
  });

  let shouldAlert = false;

  if (minuteRequests.size >= DETECTION_THRESHOLDS.MAX_REQUESTS_PER_MINUTE) {
    await createApiAbuseAlert({
      ip: params.ip,
      userId: params.userId,
      endpoint: params.endpoint,
      requestCount: minuteRequests.size,
      timeWindow: '1 minute',
      userAgent: params.userAgent,
    });
    shouldAlert = true;
  } else if (hourRequests.size >= DETECTION_THRESHOLDS.MAX_REQUESTS_PER_HOUR) {
    await createApiAbuseAlert({
      ip: params.ip,
      userId: params.userId,
      endpoint: params.endpoint,
      requestCount: hourRequests.size,
      timeWindow: '1 hour',
      userAgent: params.userAgent,
    });
    shouldAlert = true;
  }

  return shouldAlert;
}

// ==========================================
// DÉTECTION INJECTION SQL/XSS
// ==========================================

const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER)\b.*\b(FROM|INTO|TABLE|SET|WHERE)\b)/i,
  /(--|#|\/\*|\*\/)/,
  /(\bOR\b\s+\d+\s*=\s*\d+)/i,
  /(\bAND\b\s+\d+\s*=\s*\d+)/i,
  /(;\s*(DROP|DELETE|UPDATE|INSERT))/i,
  /('|")\s*(OR|AND)\s*('|")\s*=\s*('|")/i,
];

const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<img[^>]+onerror\s*=/i,
  /<[^>]+on\w+\s*=/i,
  /javascript:/i,
  /data:text\/html/i,
  /<iframe/i,
  /<object/i,
  /<embed/i,
];

/**
 * Détecte les tentatives d'injection dans les requêtes
 */
export async function detectInjectionAttempt(params: {
  ip: string;
  userId?: string;
  endpoint: string;
  method: string;
  payload: string;
}): Promise<InjectionAttempt | null> {
  let detectedType: 'sql' | 'xss' | null = null;
  let matchedPattern: string = '';

  // Vérifier SQL injection
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(params.payload)) {
      detectedType = 'sql';
      matchedPattern = pattern.toString();
      break;
    }
  }

  // Vérifier XSS
  if (!detectedType) {
    for (const pattern of XSS_PATTERNS) {
      if (pattern.test(params.payload)) {
        detectedType = 'xss';
        matchedPattern = pattern.toString();
        break;
      }
    }
  }

  if (!detectedType) {
    return null;
  }

  const attempt: InjectionAttempt = {
    id: db.collection('api_abuse_logs').doc().id,
    type: detectedType,
    ip: params.ip,
    userId: params.userId,
    endpoint: params.endpoint,
    method: params.method,
    payload: params.payload.substring(0, 500), // Limiter la taille
    matchedPattern,
    blocked: true,
    timestamp: Timestamp.now(),
  };

  // Stocker la tentative
  await db.collection('api_abuse_logs').doc(attempt.id).set(attempt);

  // Créer une alerte
  await createDataBreachAlert({
    ip: params.ip,
    userId: params.userId,
    affectedResource: params.endpoint,
    attackType: detectedType === 'sql' ? 'SQL Injection' : 'XSS',
    payloadSnippet: params.payload.substring(0, 100),
  });

  console.log(`[Detector] ${detectedType.toUpperCase()} injection detected from ${params.ip}`);

  return attempt;
}

// ==========================================
// DÉTECTION SESSIONS MULTIPLES
// ==========================================

/**
 * Détecte si un utilisateur a trop de sessions actives simultanées
 */
export async function detectMultipleSessions(params: {
  userId: string;
  userEmail: string;
  sessionId: string;
  ip: string;
  userAgent: string;
}): Promise<boolean> {
  // Compter les sessions actives
  const activeSessions = await db
    .collection('active_sessions')
    .where('userId', '==', params.userId)
    .where('expiresAt', '>', Timestamp.now())
    .get();

  // Enregistrer cette session
  await db.collection('active_sessions').doc(params.sessionId).set({
    ...params,
    createdAt: Timestamp.now(),
    expiresAt: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000), // 24h
  });

  if (activeSessions.size >= DETECTION_THRESHOLDS.MAX_CONCURRENT_SESSIONS) {
    await createSecurityAlert({
      type: 'security.multiple_sessions',
      severity: 'warning',
      context: {
        timestamp: new Date().toISOString(),
        userId: params.userId,
        userEmail: params.userEmail,
        userName: params.userEmail.split('@')[0],
        attemptCount: activeSessions.size + 1,
      },
      source: {
        userId: params.userId,
        userEmail: params.userEmail,
        ip: params.ip,
      },
    });

    console.log(`[Detector] Multiple sessions for ${params.userId}: ${activeSessions.size + 1}`);
    return true;
  }

  return false;
}

// ==========================================
// EXPORT DES FONCTIONS DE DÉTECTION
// ==========================================

export const detectors = {
  detectBruteForce,
  detectUnusualLocation,
  detectPaymentFraud,
  detectCardTesting,
  detectMassAccountCreation,
  detectApiAbuse,
  detectInjectionAttempt,
  detectMultipleSessions,
};
