/**
 * Service de scoring des menaces SOS Expat
 *
 * Algorithme: Score = min(100, Σ(FacteurPoids × NbOccurrences) - Decay)
 * Decay = HeuresDepuisDernierIncident × 2
 *
 * Actions automatiques basées sur le score:
 * - 0-30:  Log uniquement
 * - 31-50: Rate limit réduit, notification admin
 * - 51-70: CAPTCHA requis, MFA forcé
 * - 71-85: Sessions terminées, blocage temp compte
 * - 86-100: Blocage IP, blocage permanent
 */

import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { db } from '../firebaseAdmin';
import {
  ThreatScore,
  ThreatAction,
  ThreatCategory,
  EntityType,
} from './types';

// ==========================================
// CONFIGURATION DES POIDS
// ==========================================

export interface FactorWeight {
  category: ThreatCategory;
  name: string;
  weight: number;       // 0-40
  threshold: number;    // Seuil d'occurrence avant impact
  maxImpact: number;    // Impact max (éviter overflow)
}

export const FACTOR_WEIGHTS: Record<string, FactorWeight> = {
  // Intrusion
  brute_force: {
    category: 'intrusion',
    name: 'Brute Force Attempts',
    weight: 15,
    threshold: 5,
    maxImpact: 40,
  },
  unusual_location: {
    category: 'intrusion',
    name: 'Unusual Login Location',
    weight: 10,
    threshold: 1,
    maxImpact: 30,
  },
  impossible_travel: {
    category: 'intrusion',
    name: 'Impossible Travel',
    weight: 25,
    threshold: 1,
    maxImpact: 50,
  },
  multiple_sessions: {
    category: 'intrusion',
    name: 'Multiple Concurrent Sessions',
    weight: 5,
    threshold: 3,
    maxImpact: 20,
  },
  tor_usage: {
    category: 'intrusion',
    name: 'Tor Network Usage',
    weight: 20,
    threshold: 1,
    maxImpact: 40,
  },

  // Fraude
  suspicious_payment: {
    category: 'fraud',
    name: 'Suspicious Payment Pattern',
    weight: 20,
    threshold: 1,
    maxImpact: 50,
  },
  card_testing: {
    category: 'fraud',
    name: 'Card Testing',
    weight: 30,
    threshold: 2,
    maxImpact: 60,
  },
  promo_abuse: {
    category: 'fraud',
    name: 'Promo Code Abuse',
    weight: 10,
    threshold: 3,
    maxImpact: 30,
  },
  mass_account_creation: {
    category: 'fraud',
    name: 'Mass Account Creation',
    weight: 25,
    threshold: 3,
    maxImpact: 50,
  },

  // API Abuse
  rate_limit_exceeded: {
    category: 'api_abuse',
    name: 'Rate Limit Exceeded',
    weight: 8,
    threshold: 3,
    maxImpact: 30,
  },
  sql_injection: {
    category: 'api_abuse',
    name: 'SQL Injection Attempt',
    weight: 40,
    threshold: 1,
    maxImpact: 80,
  },
  xss_attempt: {
    category: 'api_abuse',
    name: 'XSS Attempt',
    weight: 35,
    threshold: 1,
    maxImpact: 70,
  },
  scraping: {
    category: 'api_abuse',
    name: 'Scraping Activity',
    weight: 12,
    threshold: 5,
    maxImpact: 40,
  },

  // Data Exfiltration
  data_breach_attempt: {
    category: 'data_exfil',
    name: 'Data Breach Attempt',
    weight: 50,
    threshold: 1,
    maxImpact: 100,
  },
};

// ==========================================
// ACTIONS PAR SEUIL DE SCORE
// ==========================================

export const ACTION_THRESHOLDS: Record<number, ThreatAction[]> = {
  30: ['log_only'],
  50: ['rate_limit_reduced', 'notify_admin'],
  70: ['captcha_required', 'mfa_required', 'notify_user'],
  85: ['session_terminated', 'account_locked_temp'],
  100: ['ip_blocked_temp', 'account_locked_perm', 'notify_admin'],
};

// ==========================================
// DECAY RATE
// ==========================================

const DECAY_RATE_PER_HOUR = 2; // Score diminue de 2 par heure sans incident

// ==========================================
// SERVICE PRINCIPAL
// ==========================================

export class ThreatScoreService {
  /**
   * Récupère ou crée un score de menace pour une entité
   */
  async getOrCreateScore(
    entityId: string,
    entityType: EntityType
  ): Promise<ThreatScore> {
    const docId = `${entityType}_${entityId}`;
    const ref = db.collection('threat_scores').doc(docId);
    const doc = await ref.get();

    if (doc.exists) {
      return { id: doc.id, ...doc.data() } as ThreatScore & { id: string };
    }

    const newScore: ThreatScore = {
      entityId,
      entityType,
      currentScore: 0,
      factors: [],
      history: [],
      actionsTaken: [],
      lastUpdated: Timestamp.now(),
      createdAt: Timestamp.now(),
    };

    await ref.set(newScore);
    return newScore;
  }

  /**
   * Ajoute un facteur de menace et recalcule le score
   */
  async addThreatFactor(
    entityId: string,
    entityType: EntityType,
    factorKey: string,
    occurrenceCount: number = 1
  ): Promise<{
    newScore: number;
    previousScore: number;
    actionsTriggered: ThreatAction[];
  }> {
    const factorConfig = FACTOR_WEIGHTS[factorKey];
    if (!factorConfig) {
      throw new Error(`Unknown factor: ${factorKey}`);
    }

    const docId = `${entityType}_${entityId}`;
    const ref = db.collection('threat_scores').doc(docId);

    const result = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(ref);

      let score: ThreatScore;

      if (!doc.exists) {
        score = {
          entityId,
          entityType,
          currentScore: 0,
          factors: [],
          history: [],
          actionsTaken: [],
          lastUpdated: Timestamp.now(),
          createdAt: Timestamp.now(),
        };
      } else {
        score = doc.data() as ThreatScore;
      }

      const previousScore = score.currentScore;

      // Trouver ou créer le facteur
      let factor = score.factors.find((f) => f.name === factorConfig.name);

      if (factor) {
        factor.occurrenceCount += occurrenceCount;
        factor.lastOccurrence = Timestamp.now();
      } else {
        factor = {
          category: factorConfig.category,
          name: factorConfig.name,
          weight: factorConfig.weight,
          value: 0,
          threshold: factorConfig.threshold,
          lastOccurrence: Timestamp.now(),
          occurrenceCount,
        };
        score.factors.push(factor);
      }

      // Calculer la valeur du facteur
      if (factor.occurrenceCount >= factorConfig.threshold) {
        const effectiveOccurrences = factor.occurrenceCount - factorConfig.threshold + 1;
        factor.value = Math.min(
          factorConfig.weight * effectiveOccurrences,
          factorConfig.maxImpact
        );
      }

      // Calculer le decay
      const hoursSinceLastUpdate =
        (Date.now() - score.lastUpdated.toMillis()) / (1000 * 60 * 60);
      const decay = hoursSinceLastUpdate * DECAY_RATE_PER_HOUR;

      // Calculer le nouveau score
      const rawScore = score.factors.reduce((sum, f) => sum + f.value, 0);
      const newScore = Math.max(0, Math.min(100, rawScore - decay));

      score.currentScore = Math.round(newScore);
      score.lastUpdated = Timestamp.now();

      // Ajouter à l'historique
      score.history.push({
        score: score.currentScore,
        timestamp: Timestamp.now(),
        reason: `Added factor: ${factorConfig.name}`,
      });

      // Limiter l'historique à 100 entrées
      if (score.history.length > 100) {
        score.history = score.history.slice(-100);
      }

      // Déterminer les actions à prendre
      const actionsTriggered: ThreatAction[] = [];

      for (const [threshold, actions] of Object.entries(ACTION_THRESHOLDS)) {
        const thresholdNum = parseInt(threshold, 10);

        if (score.currentScore >= thresholdNum && previousScore < thresholdNum) {
          actionsTriggered.push(...actions);
        }
      }

      // Enregistrer les actions
      for (const action of actionsTriggered) {
        score.actionsTaken.push({
          action,
          timestamp: Timestamp.now(),
          triggeredBy: factorConfig.name,
          expiresAt: getActionExpiry(action),
        });
      }

      // Limiter les actions à 50 entrées
      if (score.actionsTaken.length > 50) {
        score.actionsTaken = score.actionsTaken.slice(-50);
      }

      transaction.set(ref, score);

      return {
        newScore: score.currentScore,
        previousScore,
        actionsTriggered,
      };
    });

    console.log(
      `[ThreatScore] ${entityType}:${entityId} - ${factorKey}: ` +
      `${result.previousScore} -> ${result.newScore}`
    );

    // Exécuter les actions
    if (result.actionsTriggered.length > 0) {
      await this.executeActions(entityId, entityType, result.actionsTriggered);
    }

    return result;
  }

  /**
   * Récupère le score actuel avec decay appliqué
   */
  async getCurrentScore(
    entityId: string,
    entityType: EntityType
  ): Promise<number> {
    const score = await this.getOrCreateScore(entityId, entityType);

    const hoursSinceLastUpdate =
      (Date.now() - score.lastUpdated.toMillis()) / (1000 * 60 * 60);
    const decay = hoursSinceLastUpdate * DECAY_RATE_PER_HOUR;

    return Math.max(0, Math.round(score.currentScore - decay));
  }

  /**
   * Réinitialise le score d'une entité
   */
  async resetScore(
    entityId: string,
    entityType: EntityType,
    adminId: string,
    reason: string
  ): Promise<void> {
    const docId = `${entityType}_${entityId}`;
    const ref = db.collection('threat_scores').doc(docId);

    await ref.update({
      currentScore: 0,
      factors: [],
      history: FieldValue.arrayUnion({
        score: 0,
        timestamp: Timestamp.now(),
        reason: `Reset by admin ${adminId}: ${reason}`,
      }),
      lastUpdated: Timestamp.now(),
    });

    // Logger l'action admin
    await db.collection('admin_security_actions').add({
      adminId,
      action: 'reset_threat_score',
      target: entityId,
      targetType: entityType,
      timestamp: Timestamp.now(),
      details: reason,
    });

    console.log(`[ThreatScore] Reset ${entityType}:${entityId} by ${adminId}`);
  }

  /**
   * Applique le decay à tous les scores (à exécuter périodiquement)
   */
  async applyGlobalDecay(): Promise<number> {
    const cutoff = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
    let updatedCount = 0;

    const snapshot = await db
      .collection('threat_scores')
      .where('lastUpdated', '<', cutoff)
      .where('currentScore', '>', 0)
      .limit(100)
      .get();

    const batch = db.batch();

    snapshot.docs.forEach((doc) => {
      const score = doc.data() as ThreatScore;
      const hoursSinceUpdate =
        (Date.now() - score.lastUpdated.toMillis()) / (1000 * 60 * 60);
      const decay = hoursSinceUpdate * DECAY_RATE_PER_HOUR;
      const newScore = Math.max(0, Math.round(score.currentScore - decay));

      if (newScore !== score.currentScore) {
        batch.update(doc.ref, {
          currentScore: newScore,
          lastUpdated: Timestamp.now(),
        });
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      await batch.commit();
      console.log(`[ThreatScore] Applied decay to ${updatedCount} scores`);
    }

    return updatedCount;
  }

  /**
   * Exécute les actions déclenchées par le score
   */
  private async executeActions(
    entityId: string,
    entityType: EntityType,
    actions: ThreatAction[]
  ): Promise<void> {
    for (const action of actions) {
      try {
        switch (action) {
          case 'rate_limit_reduced':
            await this.applyReducedRateLimit(entityId, entityType);
            break;

          case 'captcha_required':
            await this.flagForCaptcha(entityId, entityType);
            break;

          case 'mfa_required':
            await this.flagForMFA(entityId, entityType);
            break;

          case 'session_terminated':
            await this.terminateSessions(entityId, entityType);
            break;

          case 'account_locked_temp':
            await this.lockAccount(entityId, entityType, false);
            break;

          case 'account_locked_perm':
            await this.lockAccount(entityId, entityType, true);
            break;

          case 'ip_blocked_temp':
            await this.blockIP(entityId, entityType, false);
            break;

          case 'ip_blocked_perm':
            await this.blockIP(entityId, entityType, true);
            break;

          case 'notify_admin':
          case 'notify_user':
          case 'log_only':
            // Ces actions sont gérées ailleurs
            break;
        }
      } catch (error) {
        console.error(`[ThreatScore] Failed to execute action ${action}:`, error);
      }
    }
  }

  private async applyReducedRateLimit(entityId: string, entityType: EntityType): Promise<void> {
    if (entityType === 'ip') {
      await db.collection('global_rate_limits').doc(`ip_${entityId.replace(/\./g, '_')}`).set({
        ip: entityId,
        maxRequestsPerMinute: 20,
        appliedAt: Timestamp.now(),
        expiresAt: Timestamp.fromMillis(Date.now() + 60 * 60 * 1000), // 1h
        reason: 'threat_score',
      });
    }
  }

  private async flagForCaptcha(entityId: string, entityType: EntityType): Promise<void> {
    const collection = entityType === 'user' ? 'users' : 'blocked_entities';
    const docId = entityType === 'user' ? entityId : `${entityType}_${entityId}`;

    await db.collection(collection).doc(docId).set({
      requiresCaptcha: true,
      captchaRequiredAt: Timestamp.now(),
      captchaExpiresAt: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000),
    }, { merge: true });
  }

  private async flagForMFA(entityId: string, entityType: EntityType): Promise<void> {
    if (entityType === 'user') {
      await db.collection('users').doc(entityId).update({
        requiresMFA: true,
        mfaRequiredAt: Timestamp.now(),
      });
    }
  }

  private async terminateSessions(entityId: string, entityType: EntityType): Promise<void> {
    if (entityType === 'user') {
      const sessions = await db
        .collection('active_sessions')
        .where('userId', '==', entityId)
        .get();

      const batch = db.batch();
      sessions.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }
  }

  private async lockAccount(entityId: string, entityType: EntityType, permanent: boolean): Promise<void> {
    if (entityType === 'user') {
      await db.collection('users').doc(entityId).update({
        suspended: true,
        suspendedAt: Timestamp.now(),
        suspendedReason: 'threat_score_threshold',
        suspendedBy: 'system',
        suspendedUntil: permanent ? null : Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000),
      });

      await db.collection('blocked_entities').doc(`user_${entityId}`).set({
        entityType: 'user',
        entityId,
        reason: 'Threat score threshold exceeded',
        blockedAt: Timestamp.now(),
        expiresAt: permanent ? null : Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000),
        blockedBy: 'system',
      });
    }
  }

  private async blockIP(entityId: string, entityType: EntityType, permanent: boolean): Promise<void> {
    if (entityType === 'ip') {
      await db.collection('blocked_entities').doc(`ip_${entityId.replace(/\./g, '_')}`).set({
        entityType: 'ip',
        entityId,
        reason: 'Threat score threshold exceeded',
        blockedAt: Timestamp.now(),
        expiresAt: permanent ? null : Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000),
        blockedBy: 'system',
      });
    }
  }
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function getActionExpiry(action: ThreatAction): Timestamp | undefined {
  const expiryMap: Record<ThreatAction, number | null> = {
    none: null,
    log_only: null,
    rate_limit_reduced: 60 * 60 * 1000, // 1h
    captcha_required: 24 * 60 * 60 * 1000, // 24h
    mfa_required: null, // Permanent until disabled
    session_terminated: null,
    account_locked_temp: 24 * 60 * 60 * 1000, // 24h
    account_locked_perm: null,
    ip_blocked_temp: 24 * 60 * 60 * 1000, // 24h
    ip_blocked_perm: null,
    notify_admin: null,
    notify_user: null,
  };

  const expiryMs = expiryMap[action];
  return expiryMs ? Timestamp.fromMillis(Date.now() + expiryMs) : undefined;
}

// ==========================================
// SINGLETON EXPORT
// ==========================================

export const threatScoreService = new ThreatScoreService();
