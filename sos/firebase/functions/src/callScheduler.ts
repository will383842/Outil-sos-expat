// firebase/functions/src/callScheduler.ts
import { logCallRecord } from './utils/logs/logCallRecord';
import { logError } from './utils/logs/logError';
import * as admin from 'firebase-admin';
import { CallSessionState } from './TwilioCallManager';

// Configuration pour la production
const SCHEDULER_CONFIG = {
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 5000,
  HEALTH_CHECK_INTERVAL: 60000, // 1 minute
  MAX_PENDING_SESSIONS: 100} as const;

/**
 * ✅ Interface des paramètres de création d'appel CORRIGÉE.
 * IMPORTANT MONNAIE :
 * - `amount` est **toujours en EUROS** (unités réelles), **pas** en centimes.
 * - La conversion en centimes ne doit se faire **qu'au moment Stripe** (en amont,
 *   typiquement dans la Cloud Function qui crée le PaymentIntent).
 * - Les champs `amountCents`, `currency`, `platformAmountCents` ci-dessous sont
 *   **optionnels** et purement informatifs (déjà calculés en amont). Le scheduler
 *   n'effectue **aucune** conversion supplémentaire.
 */
interface CreateCallParams {
  sessionId?: string;
  providerId: string;
  clientId: string;
  providerPhone: string;
  clientPhone: string;
  serviceType: 'lawyer_call' | 'expat_call';
  providerType: 'lawyer' | 'expat';
  paymentIntentId: string;
  amount: number; // ✅ EN EUROS (unités réelles)
  delayMinutes?: number;
  requestId?: string;
  clientLanguages?: string[];
  providerLanguages?: string[];
  // ✅ CORRECTION: Ajouter le champ clientWhatsapp qui est maintenant envoyé par le frontend
  clientWhatsapp?: string;
  providerCountry?: string;

  // Métadonnées optionnelles passées par l'étape de paiement (déjà converties/calculées)
  amountCents?: number; // en centimes, si fourni par l'amont (non utilisé pour des calculs ici)
  currency?: 'eur' | 'usd' | 'EUR' | 'USD';
  platformAmountCents?: number;
  platformFeePercent?: number;
}

// Interface pour les statistiques de planification
interface SchedulerStats {
  totalScheduled: number;
  currentlyPending: number;
  completedToday: number;
  failedToday: number;
  averageWaitTime: number;
}

/**
 * 🔧 REFACTORISÉ: Classe pour gérer uniquement les sessions d'appel (plus de planification en mémoire)
 */
class CallSchedulerManager {
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private stats: SchedulerStats = {
    totalScheduled: 0,
    currentlyPending: 0,
    completedToday: 0,
    failedToday: 0,
    averageWaitTime: 0};
  private isInitialized = false;

  constructor() {
    // 🔧 FIX: Ne pas initialiser immédiatement - attendre le premier appel
  }

  private async initialize() {
    if (!this.isInitialized) {
      try {
        this.startHealthCheck();
        await this.loadInitialStats();
        this.isInitialized = true;
        console.log('✅ CallSchedulerManager initialisé (sans planification en mémoire)');
      } catch (error) {
        console.error('❌ Erreur initialisation CallSchedulerManager:', error);
        throw error;
      }
    }
  }

  /**
   * Démarre la surveillance de santé du scheduler
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        await logError('CallScheduler:healthCheck', error);
      }
    }, SCHEDULER_CONFIG.HEALTH_CHECK_INTERVAL);
  }

  /**
   * Effectue une vérification de santé du système
   */
  private async performHealthCheck(): Promise<void> {
    try {
      // Vérifier les sessions en attente
      const pendingSessions = await this.getPendingSessions();
      this.stats.currentlyPending = pendingSessions.length;

      // Nettoyer les sessions expirées
      await this.cleanupExpiredSessions();

      // Log des métriques pour monitoring
      console.log(
        `📊 Scheduler Health: ${this.stats.currentlyPending} pending sessions`
      );
    } catch (error) {
      await logError('CallScheduler:performHealthCheck', error);
    }
  }

  /**
   * Charge les statistiques initiales
   */
  private async loadInitialStats(): Promise<void> {
    try {
      const database = getDB();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTimestamp = admin.firestore.Timestamp.fromDate(today);

      // Compter les appels d'aujourd'hui
      const todayQuery = await database
        .collection('call_sessions')
        .where('metadata.createdAt', '>=', todayTimestamp)
        .limit(5000)
        .get();

      this.stats.completedToday = 0;
      this.stats.failedToday = 0;

      todayQuery.docs.forEach((doc) => {
        const session = doc.data() as CallSessionState;
        if (session.status === 'completed') {
          this.stats.completedToday++;
        } else if (session.status === 'failed') {
          this.stats.failedToday++;
        }
      });
    } catch (error) {
      await logError('CallScheduler:loadInitialStats', error);
    }
  }

  /**
   * Nettoie les sessions expirées
   */
  private async cleanupExpiredSessions(): Promise<void> {
    const expiredThreshold = Date.now() - 30 * 60 * 1000; // 30 minutes

    try {
      const pendingSessions = await this.getPendingSessions();
      
      for (const session of pendingSessions) {
        if (session.metadata.createdAt.toMillis() < expiredThreshold) {
          const twilioCallManager = await getTwilioCallManager();
          await twilioCallManager.cancelCallSession(session.id, 'expired', 'scheduler');
          console.log(`🧹 Session expirée nettoyée: ${session.id}`);
        }
      }
    } catch (error) {
      await logError('CallScheduler:cleanupExpiredSessions', error);
    }
  }

  /**
   * Récupère les sessions en attente
   */
  private async getPendingSessions(): Promise<CallSessionState[]> {
    try {
      const database = getDB();
      const snapshot = await database
        .collection('call_sessions')
        .where('status', 'in', ['pending', 'provider_connecting', 'client_connecting'])
        .orderBy('metadata.createdAt', 'desc')
        .limit(SCHEDULER_CONFIG.MAX_PENDING_SESSIONS)
        .get();

      return snapshot.docs.map((doc) => doc.data() as CallSessionState);
    } catch (error) {
      await logError('CallScheduler:getPendingSessions', error);
      return [];
    }
  }

  /**
   * 🆕 NOUVEAU: Exécute un appel programmé (appelé par Cloud Tasks webhook)
   * Cette méthode sera appelée par la Cloud Function qui reçoit le webhook de Cloud Tasks
   */
  async executeScheduledCall(callSessionId: string): Promise<void> {
    let retryCount = 0;

    while (retryCount < SCHEDULER_CONFIG.RETRY_ATTEMPTS) {
      try {
        console.log(
          `🚀 Exécution appel programmé par Cloud Tasks: ${callSessionId} (tentative ${
            retryCount + 1
          }/${SCHEDULER_CONFIG.RETRY_ATTEMPTS})`
        );

        // Vérifier que la session est toujours valide
        const twilioCallManager = await getTwilioCallManager();
        const session = await twilioCallManager.getCallSession(callSessionId);
        if (!session) {
          console.warn(`Session non trouvée lors de l'exécution: ${callSessionId}`);
          return;
        }

        if (session.status !== 'pending') {
          console.log(
            `Session ${callSessionId} status changed to ${session.status}, arrêt de l'exécution`
          );
          return;
        }

        // Utiliser le TwilioCallManager pour la gestion robuste des appels
        await twilioCallManager.initiateCallSequence(callSessionId, 0);

        console.log(`✅ Appel initié avec succès par Cloud Tasks: ${callSessionId}`);
        return;
      } catch (error) {
        retryCount++;

        await logError(`CallScheduler:executeScheduledCall:attempt_${retryCount}`, error);

        if (retryCount < SCHEDULER_CONFIG.RETRY_ATTEMPTS) {
          console.log(
            `⏳ Retry ${retryCount}/${SCHEDULER_CONFIG.RETRY_ATTEMPTS} pour ${callSessionId} dans ${SCHEDULER_CONFIG.RETRY_DELAY_MS}ms`
          );
          await this.delay(SCHEDULER_CONFIG.RETRY_DELAY_MS * retryCount); // Délai progressif
        }
      }
    }

    // Toutes les tentatives ont échoué
    console.error(`❌ Échec de toutes les tentatives pour ${callSessionId}`);

    try {
      const twilioCallManager = await getTwilioCallManager();
      await twilioCallManager.updateCallSessionStatus(callSessionId, 'failed');
      this.stats.failedToday++;

      await logCallRecord({
        callId: callSessionId,
        status: 'sequence_failed_all_retries',
        retryCount: SCHEDULER_CONFIG.RETRY_ATTEMPTS});
    } catch (updateError) {
      await logError('CallScheduler:executeScheduledCall:finalUpdate', updateError);
    }
  }

  /**
   * 🔄 MODIFIÉ: Annule une session d'appel
   */
  async cancelScheduledCall(callSessionId: string, reason: string): Promise<void> {
    try {
      // 🔧 FIX: Initialiser si nécessaire
      await this.initialize();

      // Utiliser TwilioCallManager pour annuler la session
      const twilioCallManager = await getTwilioCallManager();
      await twilioCallManager.cancelCallSession(callSessionId, reason, 'scheduler');

      await logCallRecord({
        callId: callSessionId,
        status: `call_cancelled_${reason}`,
        retryCount: 0});

      console.log(`✅ Appel annulé: ${callSessionId}, raison: ${reason}`);
    } catch (error) {
      await logError('CallScheduler:cancelScheduledCall', error);
      throw error;
    }
  }

  /**
   * Obtient les statistiques du scheduler
   */
  getStats(): SchedulerStats {
    return { ...this.stats };
  }

  /**
   * 🔄 MODIFIÉ: Ferme proprement le scheduler
   */
  shutdown(): void {
    console.log('🔄 Arrêt du CallScheduler...');

    // Arrêter le health check
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    console.log('✅ CallScheduler arrêté proprement');
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// 🔧 FIX: Instance singleton avec lazy loading
let callSchedulerManagerInstance: CallSchedulerManager | null = null;

function getCallSchedulerManager(): CallSchedulerManager {
  if (!callSchedulerManagerInstance) {
    callSchedulerManagerInstance = new CallSchedulerManager();
  }
  return callSchedulerManagerInstance;
}

// 🔧 FIX: Import mais pas d'initialisation immédiate avec typage précis
let twilioCallManagerInstance: import('./TwilioCallManager').TwilioCallManager | null = null;
let isInitializing = false;

async function getTwilioCallManager(): Promise<import('./TwilioCallManager').TwilioCallManager> {
  // Éviter les initialisations multiples
  if (isInitializing) {
    // Attendre que l'initialisation en cours se termine
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    return twilioCallManagerInstance!;
  }

  if (!twilioCallManagerInstance) {
    isInitializing = true;
    try {
      const { twilioCallManager } = await import('./TwilioCallManager');
      twilioCallManagerInstance = twilioCallManager;
    } finally {
      isInitializing = false;
    }
  }
  
  return twilioCallManagerInstance;
}

// 🔧 FIX: Initialisation Firebase lazy avec detection de deployment analysis
const IS_DEPLOYMENT_ANALYSIS =
  !process.env.K_REVISION &&
  !process.env.K_SERVICE &&
  !process.env.FUNCTION_TARGET &&
  !process.env.FUNCTIONS_EMULATOR;

let _initialized = false;
function ensureInitialized() {
  if (!_initialized && !IS_DEPLOYMENT_ANALYSIS) {
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    _initialized = true;
  }
}

let db: admin.firestore.Firestore | null = null;

function getDB(): admin.firestore.Firestore {
  ensureInitialized();
  if (!db) {
    db = admin.firestore();
  }
  return db;
}

/**
 * 🆕 NOUVEAU: Fonction pour exécuter un appel programmé (appelée par Cloud Tasks webhook)
 */
export const executeScheduledCall = async (callSessionId: string): Promise<void> => {
  const manager = getCallSchedulerManager();
  return manager.executeScheduledCall(callSessionId);
};

/**
 * ✅ Fonction pour créer un nouvel appel (SANS PLANIFICATION)
 * - `amount` est **en EUROS** (unités réelles).
 * - ❌ Pas de vérification de "cohérence service/prix" ici.
 * - ✅ On garde uniquement la validation min/max.
 * - ❗️Aucune conversion centimes ici : la conversion unique vers centimes se fait
 *   au moment Stripe (dans la fonction de paiement en amont).
 * - 🔄 PLUS DE PLANIFICATION : seule la création de session
 */
export const createCallSession = async (
  params: CreateCallParams
): Promise<CallSessionState> => {
  try {
    // Générer un ID unique si non fourni
   const sessionId =
      params.sessionId ||
      `call_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`🆕 Création d'une nouvelle session d'appel: ${sessionId}`);
    console.log(`💰 Montant (EUROS): ${params.amount} pour ${params.serviceType}`);

    // ✅ VALIDATION AMÉLIORÉE - Champs obligatoires avec messages spécifiques
    const requiredFields = {
      providerId: params.providerId,
      clientId: params.clientId,
      providerPhone: params.providerPhone,
      clientPhone: params.clientPhone,
      paymentIntentId: params.paymentIntentId,
      amount: params.amount
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([, value]) => !value || (typeof value === 'string' && value.trim() === ''))
      .map(([key]) => key);

    if (missingFields.length > 0) {
      console.error(`❌ [createCallSession] Champs manquants:`, missingFields);
      throw new Error(`Paramètres obligatoires manquants pour créer l'appel: ${missingFields.join(', ')}`);
    }

    // ✅ Validation montant numérique
    if (typeof params.amount !== 'number' || isNaN(params.amount) || params.amount <= 0) {
      console.error(`❌ [createCallSession] Montant invalide:`, {
        amount: params.amount,
        type: typeof params.amount
      });
      throw new Error(`Montant invalide: ${params.amount} (type: ${typeof params.amount})`);
    }

    // ✅ Validation min/max (toujours en euros)
    if (params.amount < 0.50) {
      throw new Error('Montant minimum de 0.50€ requis');
    }
    if (params.amount > 500) {
      throw new Error('Montant maximum de 500€ dépassé');
    }

    // ✅ VALIDATION NUMÉROS DE TÉLÉPHONE
    const phoneRegex = /^\+[1-9]\d{8,14}$/;
    
    if (!phoneRegex.test(params.providerPhone)) {
      console.error(`❌ [createCallSession] Numéro prestataire invalide:`, params.providerPhone);
      throw new Error(`Numéro de téléphone prestataire invalide: ${params.providerPhone}`);
    }

    if (!phoneRegex.test(params.clientPhone)) {
      console.error(`❌ [createCallSession] Numéro client invalide:`, params.clientPhone);
      throw new Error(`Numéro de téléphone client invalide: ${params.clientPhone}`);
    }

    if (params.providerPhone === params.clientPhone) {
      console.error(`❌ [createCallSession] Numéros identiques:`, {
        providerPhone: params.providerPhone,
        clientPhone: params.clientPhone
      });
      throw new Error('Les numéros du prestataire et du client doivent être différents');
    }

    console.log(`✅ [createCallSession] Validation réussie pour ${sessionId}`);

    // ✅ Créer la session avec montants EN EUROS (aucune conversion ici)
    const twilioCallManager = await getTwilioCallManager();
    const callSession = await twilioCallManager.createCallSession({
      sessionId,
      callSessionId: sessionId,
      providerId: params.providerId,
      clientId: params.clientId,
      providerPhone: params.providerPhone,
      clientPhone: params.clientPhone,
      serviceType: params.serviceType,
      providerType: params.providerType,
      paymentIntentId: params.paymentIntentId,
      amount: params.amount, // ✅ euros
      requestId: params.requestId,
      clientLanguages: params.clientLanguages,
      providerLanguages: params.providerLanguages,
      providerCountry: params.providerCountry});

    await logCallRecord({
      callId: sessionId,
      status: 'call_session_created',
      retryCount: 0,
      additionalData: {
        serviceType: params.serviceType,
        amountInEuros: params.amount, // audit humain
        schedulingMethod: 'webhook_only', // Plus de planification ici
        // ✅ AJOUT: Log des numéros pour debug
        hasProviderPhone: !!params.providerPhone,
        hasClientPhone: !!params.clientPhone,
        hasClientWhatsapp: !!params.clientWhatsapp,
        // infos additionnelles si disponibles (purement indicatives)
        currency: params.currency,
        amountCents: params.amountCents,
        platformAmountCents: params.platformAmountCents,
        platformFeePercent: params.platformFeePercent}});

    console.log(
      `✅ Session d'appel créée (sans planification): ${sessionId} (montant gardé en euros)`
    );

    return callSession;
  } catch (error) {
    await logError('createCallSession:error', error);
    throw error;
  }
};

/**
 * Fonction pour annuler un appel programmé
 */
export const cancelScheduledCall = async (
  callSessionId: string,
  reason: string
): Promise<void> => {
  const manager = getCallSchedulerManager();
  return manager.cancelScheduledCall(callSessionId, reason);
};

/**
 * 🔄 SUPPRIMÉ: Plus de resumePendingCalls car plus de planification en mémoire
 * La planification se fait uniquement via webhook Stripe → Cloud Tasks
 */

/**
 * Fonction de nettoyage des anciennes sessions
 */
export const cleanupOldSessions = async (
  olderThanDays: number = 30
): Promise<void> => {
  try {
    console.log(`🧹 Nettoyage des sessions de plus de ${olderThanDays} jours...`);

    const twilioCallManager = await getTwilioCallManager();
    const result = await twilioCallManager.cleanupOldSessions({
      olderThanDays,
      keepCompletedDays: 7, // Garder les complétées 7 jours
      batchSize: 50});

    console.log(
      `✅ Nettoyage terminé: ${result.deleted} supprimées, ${result.errors} erreurs`
    );
  } catch (error) {
    await logError('cleanupOldSessions:error', error);
  }
};

/**
 * ✅ Fonction pour obtenir des statistiques sur les appels avec montants en EUROS
 */
export const getCallStatistics = async (
  periodDays: number = 7
): Promise<{
  scheduler: SchedulerStats;
  calls: {
    total: number;
    completed: number;
    failed: number;
    cancelled: number;
    averageDuration: number;
    successRate: number;
    totalRevenueEuros: number; // ✅ EN EUROS pour affichage
    averageAmountEuros: number; // ✅ EN EUROS pour affichage
  };
}> => {
  try {
    const database = getDB();
    const startDate = admin.firestore.Timestamp.fromMillis(
      Date.now() - periodDays * 24 * 60 * 60 * 1000
    );

    const [schedulerStats, twilioCallManager] = await Promise.all([
      getCallSchedulerManager().getStats(),
      getTwilioCallManager(),
    ]);

    const callStats = await twilioCallManager.getCallStatistics({ startDate });

    // ✅ Calculs de revenus EN EUROS pour l'affichage
    let totalRevenueEuros = 0;
    let completedCallsWithRevenue = 0;

    // Récupérer les sessions complétées avec revenus
    const completedSessionsQuery = await database
      .collection('call_sessions')
      .where('metadata.createdAt', '>=', startDate)
      .where('status', '==', 'completed')
      .where('payment.status', '==', 'captured')
      .get();

    completedSessionsQuery.docs.forEach((doc) => {
      const session = doc.data() as CallSessionState;
      const amountInEuros = session.payment.amount; // stocké en euros
      totalRevenueEuros += amountInEuros;
      completedCallsWithRevenue++;
    });

    const averageAmountEuros =
      completedCallsWithRevenue > 0
        ? totalRevenueEuros / completedCallsWithRevenue
        : 0;

    return {
      scheduler: schedulerStats,
      calls: {
        total: callStats.total,
        completed: callStats.completed,
        failed: callStats.failed,
        cancelled: callStats.cancelled,
        averageDuration: callStats.averageDuration,
        successRate: callStats.successRate,
        totalRevenueEuros,
        averageAmountEuros}};
  } catch (error) {
    await logError('getCallStatistics:error', error);
    throw error;
  }
};

/**
 * 🔄 MODIFIÉ: Gestionnaire pour l'arrêt propre du service
 */
export const gracefulShutdown = (): void => {
  console.log('🔄 Arrêt gracieux du CallScheduler...');
  if (callSchedulerManagerInstance) {
    callSchedulerManagerInstance.shutdown();
  }
};

// Gestionnaire de signaux pour arrêt propre
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Export du manager pour les tests
export { getCallSchedulerManager as callSchedulerManager };

// 🔄 SUPPRIMÉ: scheduleCallSequence, createAndScheduleCall, resumePendingCalls
// Car la planification se fait uniquement via webhook Stripe → Cloud Tasks
