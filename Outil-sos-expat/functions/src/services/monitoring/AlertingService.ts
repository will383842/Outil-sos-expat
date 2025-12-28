/**
 * =============================================================================
 * ALERTING SERVICE - Multi-level alerts with runbooks
 * =============================================================================
 *
 * Système d'alertes multi-niveaux:
 * - P1 (Critical): PagerDuty + SMS + Slack + Email
 * - P2 (High): Slack + Email
 * - P3 (Medium): Slack
 * - P4 (Low): Log only
 *
 * Includes runbook references for each alert type.
 *
 * =============================================================================
 */

import { metrics } from "./MetricsService";

// =============================================================================
// TYPES
// =============================================================================

export type AlertPriority = "P1" | "P2" | "P3" | "P4";

export type AlertChannel = "pagerduty" | "slack" | "email" | "sms" | "log";

export interface Alert {
  id: string;
  priority: AlertPriority;
  title: string;
  description: string;
  source: string;
  timestamp: Date;
  runbookUrl?: string;
  context: Record<string, unknown>;
  channels: AlertChannel[];
  acknowledged: boolean;
  resolvedAt?: Date;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: AlertCondition;
  priority: AlertPriority;
  channels: AlertChannel[];
  runbookId: string;
  cooldownMs: number;
  enabled: boolean;
}

export interface AlertCondition {
  metric: string;
  operator: ">" | "<" | ">=" | "<=" | "==" | "!=";
  threshold: number;
  windowMs: number;
  aggregation: "count" | "avg" | "max" | "min" | "p95" | "p99";
}

export interface Runbook {
  id: string;
  title: string;
  priority: AlertPriority;
  symptoms: string[];
  diagnosis: string[];
  resolution: string[];
  escalation: string;
  preventiveMeasures: string[];
}

// =============================================================================
// RUNBOOKS
// =============================================================================

export const RUNBOOKS: Record<string, Runbook> = {
  "high-error-rate": {
    id: "high-error-rate",
    title: "Taux d'erreur élevé",
    priority: "P1",
    symptoms: [
      "Taux d'erreur > 5% sur les 5 dernières minutes",
      "Augmentation soudaine des erreurs 5xx",
      "Plaintes utilisateurs multiples",
    ],
    diagnosis: [
      "1. Vérifier les logs Cloud Functions: `gcloud functions logs read`",
      "2. Identifier le pattern d'erreur dominant",
      "3. Vérifier l'état des services externes (APIs IA, Firestore)",
      "4. Vérifier les quotas API (OpenAI, Claude)",
    ],
    resolution: [
      "1. Si API externe down: activer le fallback",
      "2. Si quota dépassé: augmenter les limites ou activer le throttling",
      "3. Si bug code: rollback vers version précédente",
      "4. Si Firestore: vérifier les règles de sécurité et indexes",
    ],
    escalation: "Contacter l'équipe backend si non résolu en 15 minutes",
    preventiveMeasures: [
      "Implémenter des tests de charge réguliers",
      "Configurer des alertes de quota proactives",
      "Maintenir un circuit breaker pour les APIs externes",
    ],
  },

  "high-latency": {
    id: "high-latency",
    title: "Latence élevée",
    priority: "P2",
    symptoms: [
      "P95 latence > 3s sur les endpoints critiques",
      "Temps de réponse IA dégradé",
      "Timeouts fréquents",
    ],
    diagnosis: [
      "1. Vérifier les métriques par endpoint",
      "2. Identifier les cold starts excessifs",
      "3. Vérifier la charge Firestore",
      "4. Analyser les requêtes IA (taille des prompts)",
    ],
    resolution: [
      "1. Si cold starts: augmenter minInstances",
      "2. Si Firestore lent: vérifier les indexes",
      "3. Si IA lente: réduire la taille des prompts ou activer le streaming",
      "4. Activer le cache Redis si désactivé",
    ],
    escalation: "Contacter l'équipe performance si > 30 minutes",
    preventiveMeasures: [
      "Maintenir les caches à jour",
      "Monitorer les tailles de prompts IA",
      "Configurer minInstances en production",
    ],
  },

  "cache-miss-high": {
    id: "cache-miss-high",
    title: "Taux de cache miss élevé",
    priority: "P3",
    symptoms: [
      "Hit rate cache < 30%",
      "Latence accrue sur les endpoints IA",
      "Coûts API en augmentation",
    ],
    diagnosis: [
      "1. Vérifier la connexion Redis",
      "2. Analyser les patterns de clés",
      "3. Vérifier les TTL configurés",
      "4. Identifier les requêtes non-cachables",
    ],
    resolution: [
      "1. Si Redis down: vérifier Upstash/Memorystore",
      "2. Si TTL trop court: ajuster les valeurs",
      "3. Si clés mal formées: corriger la génération de clés",
    ],
    escalation: "Ticket infrastructure si problème Redis",
    preventiveMeasures: [
      "Monitorer régulièrement le hit rate",
      "Auditer les stratégies de cache",
    ],
  },

  "quota-exceeded": {
    id: "quota-exceeded",
    title: "Quota utilisateur dépassé",
    priority: "P4",
    symptoms: [
      "Utilisateurs bloqués par le quota",
      "Augmentation des erreurs 429",
    ],
    diagnosis: [
      "1. Identifier les utilisateurs concernés",
      "2. Vérifier leur plan d'abonnement",
      "3. Analyser leur usage récent",
    ],
    resolution: [
      "1. Si abus: maintenir le blocage",
      "2. Si légitime: proposer upgrade ou reset exceptionnel",
      "3. Si bug quota: corriger le compteur Redis",
    ],
    escalation: "Support client pour cas individuels",
    preventiveMeasures: [
      "Alertes proactives à 80% du quota",
      "Communication claire des limites",
    ],
  },

  "ai-provider-down": {
    id: "ai-provider-down",
    title: "Fournisseur IA indisponible",
    priority: "P1",
    symptoms: [
      "Erreurs de connexion vers OpenAI/Claude",
      "Timeouts répétés sur les appels IA",
      "Circuit breaker ouvert",
    ],
    diagnosis: [
      "1. Vérifier le status page du provider",
      "2. Tester la connectivité réseau",
      "3. Vérifier les clés API",
      "4. Vérifier les quotas API du provider",
    ],
    resolution: [
      "1. Activer le fallback vers provider alternatif",
      "2. Si tous down: activer le mode dégradé (réponses cached)",
      "3. Communiquer aux utilisateurs le délai estimé",
    ],
    escalation: "Contacter le provider si incident de leur côté",
    preventiveMeasures: [
      "Maintenir plusieurs providers configurés",
      "Tester régulièrement les fallbacks",
    ],
  },

  "firestore-quota": {
    id: "firestore-quota",
    title: "Quota Firestore atteint",
    priority: "P2",
    symptoms: [
      "Erreurs RESOURCE_EXHAUSTED",
      "Writes/Reads échouent",
    ],
    diagnosis: [
      "1. Vérifier la console GCP quotas",
      "2. Identifier les opérations excessives",
      "3. Analyser les patterns d'écriture",
    ],
    resolution: [
      "1. Activer le batch writing si possible",
      "2. Réduire la fréquence des listeners",
      "3. Demander augmentation de quota si légitime",
    ],
    escalation: "Contacter GCP support pour augmentation urgente",
    preventiveMeasures: [
      "Monitorer les opérations Firestore",
      "Optimiser les requêtes régulièrement",
    ],
  },
};

// =============================================================================
// ALERT RULES
// =============================================================================

export const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    id: "error-rate-critical",
    name: "Taux d'erreur critique",
    condition: {
      metric: "error_rate",
      operator: ">",
      threshold: 5,
      windowMs: 5 * 60 * 1000,
      aggregation: "avg",
    },
    priority: "P1",
    channels: ["pagerduty", "slack", "email"],
    runbookId: "high-error-rate",
    cooldownMs: 15 * 60 * 1000,
    enabled: true,
  },
  {
    id: "latency-high",
    name: "Latence P95 élevée",
    condition: {
      metric: "latency.ai_chat",
      operator: ">",
      threshold: 5000,
      windowMs: 5 * 60 * 1000,
      aggregation: "p95",
    },
    priority: "P2",
    channels: ["slack", "email"],
    runbookId: "high-latency",
    cooldownMs: 30 * 60 * 1000,
    enabled: true,
  },
  {
    id: "cache-miss",
    name: "Cache hit rate faible",
    condition: {
      metric: "cache_hit_rate",
      operator: "<",
      threshold: 30,
      windowMs: 15 * 60 * 1000,
      aggregation: "avg",
    },
    priority: "P3",
    channels: ["slack"],
    runbookId: "cache-miss-high",
    cooldownMs: 60 * 60 * 1000,
    enabled: true,
  },
  {
    id: "ai-errors",
    name: "Erreurs API IA",
    condition: {
      metric: "errors.ai_chat",
      operator: ">",
      threshold: 10,
      windowMs: 5 * 60 * 1000,
      aggregation: "count",
    },
    priority: "P1",
    channels: ["pagerduty", "slack"],
    runbookId: "ai-provider-down",
    cooldownMs: 10 * 60 * 1000,
    enabled: true,
  },
];

// =============================================================================
// ALERTING SERVICE
// =============================================================================

class AlertingService {
  private alerts: Alert[] = [];
  private lastAlertTime = new Map<string, number>();
  private rules: AlertRule[] = [...DEFAULT_ALERT_RULES];

  /**
   * Create and send an alert
   */
  async createAlert(
    priority: AlertPriority,
    title: string,
    description: string,
    options?: {
      source?: string;
      runbookId?: string;
      context?: Record<string, unknown>;
    }
  ): Promise<Alert> {
    const runbook = options?.runbookId ? RUNBOOKS[options.runbookId] : undefined;

    const alert: Alert = {
      id: this.generateId(),
      priority,
      title,
      description,
      source: options?.source || "system",
      timestamp: new Date(),
      runbookUrl: runbook ? `/runbooks/${runbook.id}` : undefined,
      context: options?.context || {},
      channels: this.getChannelsForPriority(priority),
      acknowledged: false,
    };

    this.alerts.push(alert);

    // Log the alert
    this.logAlert(alert, runbook);

    // Send to channels
    await this.sendToChannels(alert, runbook);

    // Record metric
    metrics.incrementCounter("alerts_sent", {
      priority,
      source: alert.source,
    });

    return alert;
  }

  /**
   * Check all rules against current metrics
   */
  async checkRules(): Promise<void> {
    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      const shouldAlert = await this.evaluateRule(rule);
      if (shouldAlert && this.canAlert(rule.id, rule.cooldownMs)) {
        await this.createAlert(
          rule.priority,
          rule.name,
          `Condition triggered: ${rule.condition.metric} ${rule.condition.operator} ${rule.condition.threshold}`,
          {
            source: "rule:" + rule.id,
            runbookId: rule.runbookId,
            context: {
              rule: rule.id,
              condition: rule.condition,
            },
          }
        );

        this.lastAlertTime.set(rule.id, Date.now());
      }
    }
  }

  /**
   * Evaluate a single rule
   */
  private async evaluateRule(rule: AlertRule): Promise<boolean> {
    const stats = metrics.getLatencyStats(rule.condition.metric);
    if (!stats) return false;

    let value: number;
    switch (rule.condition.aggregation) {
      case "count":
        value = stats.count;
        break;
      case "avg":
        value = stats.avg;
        break;
      case "max":
        value = stats.max;
        break;
      case "min":
        value = stats.min;
        break;
      case "p95":
        value = stats.p95;
        break;
      case "p99":
        value = stats.p99;
        break;
      default:
        value = stats.avg;
    }

    switch (rule.condition.operator) {
      case ">":
        return value > rule.condition.threshold;
      case "<":
        return value < rule.condition.threshold;
      case ">=":
        return value >= rule.condition.threshold;
      case "<=":
        return value <= rule.condition.threshold;
      case "==":
        return value === rule.condition.threshold;
      case "!=":
        return value !== rule.condition.threshold;
      default:
        return false;
    }
  }

  /**
   * Check cooldown
   */
  private canAlert(ruleId: string, cooldownMs: number): boolean {
    const lastTime = this.lastAlertTime.get(ruleId);
    if (!lastTime) return true;
    return Date.now() - lastTime > cooldownMs;
  }

  /**
   * Get channels for priority
   */
  private getChannelsForPriority(priority: AlertPriority): AlertChannel[] {
    switch (priority) {
      case "P1":
        return ["pagerduty", "slack", "email", "sms"];
      case "P2":
        return ["slack", "email"];
      case "P3":
        return ["slack"];
      case "P4":
        return ["log"];
      default:
        return ["log"];
    }
  }

  /**
   * Log the alert
   */
  private logAlert(alert: Alert, runbook?: Runbook): void {
    const logMethod = alert.priority === "P1" ? metrics.critical
      : alert.priority === "P2" ? metrics.error
      : alert.priority === "P3" ? metrics.warn
      : metrics.info;

    logMethod.call(metrics, `[ALERT:${alert.priority}] ${alert.title}`, {
      alertId: alert.id,
      priority: alert.priority,
      description: alert.description,
      source: alert.source,
      runbook: runbook?.id,
      channels: alert.channels,
      ...alert.context,
    });
  }

  /**
   * Send alert to channels
   */
  private async sendToChannels(alert: Alert, runbook?: Runbook): Promise<void> {
    const message = this.formatAlertMessage(alert, runbook);

    for (const channel of alert.channels) {
      try {
        await this.sendToChannel(channel, alert, message);
      } catch (error) {
        metrics.error(`Failed to send alert to ${channel}`, {
          alertId: alert.id,
          channel,
          error: (error as Error).message,
        });
      }
    }
  }

  /**
   * Format alert message
   */
  private formatAlertMessage(alert: Alert, runbook?: Runbook): string {
    let message = `🚨 *[${alert.priority}] ${alert.title}*\n\n`;
    message += `${alert.description}\n\n`;
    message += `📅 ${alert.timestamp.toISOString()}\n`;
    message += `🔧 Source: ${alert.source}\n`;

    if (runbook) {
      message += `\n📖 *Runbook: ${runbook.title}*\n`;
      message += `\n**Symptômes:**\n`;
      runbook.symptoms.forEach((s) => (message += `• ${s}\n`));
      message += `\n**Première étape:**\n${runbook.diagnosis[0]}\n`;
    }

    if (Object.keys(alert.context).length > 0) {
      message += `\n**Contexte:**\n\`\`\`\n${JSON.stringify(alert.context, null, 2)}\n\`\`\``;
    }

    return message;
  }

  /**
   * Send to specific channel
   */
  private async sendToChannel(
    channel: AlertChannel,
    alert: Alert,
    message: string
  ): Promise<void> {
    switch (channel) {
      case "slack":
        await this.sendSlack(message, alert.priority);
        break;
      case "email":
        await this.sendEmail(alert);
        break;
      case "pagerduty":
        await this.sendPagerDuty(alert);
        break;
      case "sms":
        await this.sendSMS(alert);
        break;
      case "log":
        // Already logged
        break;
    }
  }

  /**
   * Send Slack notification
   */
  private async sendSlack(message: string, priority: AlertPriority): Promise<void> {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      metrics.debug("Slack webhook not configured");
      return;
    }

    const color = priority === "P1" ? "#FF0000"
      : priority === "P2" ? "#FF8C00"
      : priority === "P3" ? "#FFD700"
      : "#808080";

    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attachments: [{
            color,
            text: message,
            mrkdwn_in: ["text"],
          }],
        }),
      });
    } catch (error) {
      metrics.error("Slack send failed", { error: (error as Error).message });
    }
  }

  /**
   * Send email notification (placeholder)
   */
  private async sendEmail(alert: Alert): Promise<void> {
    // Implementation depends on email service (SendGrid, SES, etc.)
    metrics.debug("Email alert", { alertId: alert.id });
  }

  /**
   * Send PagerDuty notification (placeholder)
   */
  private async sendPagerDuty(alert: Alert): Promise<void> {
    const routingKey = process.env.PAGERDUTY_ROUTING_KEY;
    if (!routingKey) {
      metrics.debug("PagerDuty not configured");
      return;
    }

    try {
      await fetch("https://events.pagerduty.com/v2/enqueue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routing_key: routingKey,
          event_action: "trigger",
          payload: {
            summary: `[${alert.priority}] ${alert.title}`,
            severity: alert.priority === "P1" ? "critical" : "error",
            source: alert.source,
            custom_details: alert.context,
          },
        }),
      });
    } catch (error) {
      metrics.error("PagerDuty send failed", { error: (error as Error).message });
    }
  }

  /**
   * Send SMS notification (placeholder)
   */
  private async sendSMS(alert: Alert): Promise<void> {
    // Implementation depends on SMS service (Twilio, etc.)
    metrics.debug("SMS alert", { alertId: alert.id });
  }

  /**
   * Acknowledge an alert
   */
  acknowledge(alertId: string): void {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      metrics.info("Alert acknowledged", { alertId });
    }
  }

  /**
   * Resolve an alert
   */
  resolve(alertId: string): void {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.resolvedAt = new Date();
      metrics.info("Alert resolved", { alertId });
    }
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter((a) => !a.resolvedAt);
  }

  /**
   * Get runbook
   */
  getRunbook(id: string): Runbook | undefined {
    return RUNBOOKS[id];
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

export const alerting = new AlertingService();

export default alerting;
