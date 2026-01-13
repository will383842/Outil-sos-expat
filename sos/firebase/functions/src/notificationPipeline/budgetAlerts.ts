/**
 * Budget Alert Notifications
 *
 * Sends email notifications to admins when service costs exceed budget thresholds.
 * - Warning email at 80% of budget
 * - Urgent email at 100% of budget
 *
 * Uses the existing message_events system for notification delivery.
 * For critical alerts (100%+), also sends direct email for guaranteed delivery.
 */

import * as admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
// sendZoho import reserved for future direct email alerts
// import { sendZoho } from "./providers/email/zohoSmtp";

// Lazy initialization to prevent deployment timeout
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

function getDb() {
  ensureInitialized();
  return admin.firestore();
}

// ==========================================
// TYPES
// ==========================================

export type BudgetServiceType = "twilio" | "firestore" | "functions" | "storage" | "total";

export type BudgetAlertLevel = "warning" | "critical";

export interface BudgetAlertPayload {
  service: BudgetServiceType;
  currentCost: number;
  budgetAmount: number;
  percentUsed: number;
  currency?: string;
  period?: string;
}

export interface BudgetAlertResult {
  success: boolean;
  alertLevel: BudgetAlertLevel | null;
  notificationsSent: number;
  error?: string;
}

// ==========================================
// CONFIGURATION
// ==========================================

const BUDGET_ALERT_CONFIG = {
  warningThreshold: 80,    // 80% - Send warning email
  criticalThreshold: 100,  // 100% - Send urgent email
  cooldownHours: 24,       // Avoid duplicate alerts within 24 hours
};

const SERVICE_DISPLAY_NAMES: Record<BudgetServiceType, { fr: string; en: string }> = {
  twilio: { fr: "Twilio (SMS/Appels)", en: "Twilio (SMS/Calls)" },
  firestore: { fr: "Firestore (Base de donnees)", en: "Firestore (Database)" },
  functions: { fr: "Cloud Functions", en: "Cloud Functions" },
  storage: { fr: "Cloud Storage", en: "Cloud Storage" },
  total: { fr: "Budget Total", en: "Total Budget" },
};

// ==========================================
// ADMIN RECIPIENTS
// ==========================================

interface AdminRecipient {
  uid: string;
  email: string;
  locale: string;
}

/**
 * Get all admin users who should receive budget alerts
 */
async function getAdminRecipients(): Promise<AdminRecipient[]> {
  try {
    // Get admins from users collection
    const adminsSnapshot = await getDb()
      .collection("users")
      .where("role", "in", ["admin", "super_admin"])
      .get();

    const recipients: AdminRecipient[] = [];

    adminsSnapshot.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      const data = doc.data();
      if (data.email) {
        recipients.push({
          uid: doc.id,
          email: data.email,
          locale: data.preferredLanguage || data.locale || "fr",
        });
      }
    });

    // Fallback: if no admins found, try admin_alert_preferences
    if (recipients.length === 0) {
      const prefsSnapshot = await getDb().collection("admin_alert_preferences").get();

      prefsSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.email) {
          recipients.push({
            uid: doc.id,
            email: data.email,
            locale: "fr",
          });
        }
      });
    }

    return recipients;
  } catch (error) {
    console.error("[BudgetAlerts] Error fetching admin recipients:", error);
    return [];
  }
}

// ==========================================
// COOLDOWN CHECK
// ==========================================

/**
 * Check if an alert was recently sent for this service and level
 */
async function isAlertInCooldown(
  service: BudgetServiceType,
  level: BudgetAlertLevel
): Promise<boolean> {
  try {
    const cooldownKey = `budget_alert_${service}_${level}`;
    const cooldownDoc = await getDb().collection("alert_cooldowns").doc(cooldownKey).get();

    if (!cooldownDoc.exists) {
      return false;
    }

    const data = cooldownDoc.data();
    if (!data?.lastSentAt) {
      return false;
    }

    const lastSentAt = data.lastSentAt.toDate();
    const hoursSinceLastAlert = (Date.now() - lastSentAt.getTime()) / (1000 * 60 * 60);

    return hoursSinceLastAlert < BUDGET_ALERT_CONFIG.cooldownHours;
  } catch (error) {
    console.error("[BudgetAlerts] Error checking cooldown:", error);
    return false;
  }
}

/**
 * Mark an alert as sent to start cooldown
 */
async function markAlertSent(
  service: BudgetServiceType,
  level: BudgetAlertLevel
): Promise<void> {
  const cooldownKey = `budget_alert_${service}_${level}`;
  await getDb().collection("alert_cooldowns").doc(cooldownKey).set({
    service,
    level,
    lastSentAt: Timestamp.now(),
  });
}

// ==========================================
// EMAIL TEMPLATES
// ==========================================

interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

function generateWarningEmail(
  payload: BudgetAlertPayload,
  locale: string
): EmailContent {
  const serviceName = SERVICE_DISPLAY_NAMES[payload.service][locale === "en" ? "en" : "fr"];
  const currency = payload.currency || "EUR";
  const period = payload.period || new Date().toLocaleDateString(locale === "en" ? "en-US" : "fr-FR", { month: "long", year: "numeric" });

  if (locale === "en") {
    return {
      subject: `[SOS Expat] Budget Alert: ${serviceName} at ${payload.percentUsed.toFixed(1)}%`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f59e0b; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">Budget Warning</h1>
          </div>
          <div style="padding: 20px; background-color: #fff9e6; border: 1px solid #f59e0b;">
            <p>Hello,</p>
            <p>The budget for <strong>${serviceName}</strong> has reached <strong style="color: #f59e0b;">${payload.percentUsed.toFixed(1)}%</strong> of the monthly limit.</p>

            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Service:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${serviceName}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Period:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${period}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Current Cost:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${payload.currentCost.toFixed(2)} ${currency}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Budget Limit:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${payload.budgetAmount.toFixed(2)} ${currency}</td>
              </tr>
              <tr>
                <td style="padding: 10px;"><strong>Usage:</strong></td>
                <td style="padding: 10px; color: #f59e0b; font-weight: bold;">${payload.percentUsed.toFixed(1)}%</td>
              </tr>
            </table>

            <p><strong>Recommended actions:</strong></p>
            <ul>
              <li>Review recent usage in the admin dashboard</li>
              <li>Check for any unusual activity</li>
              <li>Consider increasing the budget if legitimate</li>
            </ul>

            <p style="margin-top: 20px;">
              <a href="https://sos-expat.com/admin/finance" style="background-color: #f59e0b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                View Dashboard
              </a>
            </p>
          </div>
          <div style="padding: 15px; background-color: #f5f5f5; text-align: center; font-size: 12px; color: #666;">
            SOS Expat - Automated Budget Monitoring
          </div>
        </div>
      `,
      text: `[SOS Expat] Budget Warning

The budget for ${serviceName} has reached ${payload.percentUsed.toFixed(1)}% of the monthly limit.

Service: ${serviceName}
Period: ${period}
Current Cost: ${payload.currentCost.toFixed(2)} ${currency}
Budget Limit: ${payload.budgetAmount.toFixed(2)} ${currency}
Usage: ${payload.percentUsed.toFixed(1)}%

Recommended actions:
- Review recent usage in the admin dashboard
- Check for any unusual activity
- Consider increasing the budget if legitimate

View Dashboard: https://sos-expat.com/admin/finance
`,
    };
  }

  // French (default)
  return {
    subject: `[SOS Expat] Alerte Budget: ${serviceName} a ${payload.percentUsed.toFixed(1)}%`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f59e0b; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Alerte Budget</h1>
        </div>
        <div style="padding: 20px; background-color: #fff9e6; border: 1px solid #f59e0b;">
          <p>Bonjour,</p>
          <p>Le budget pour <strong>${serviceName}</strong> a atteint <strong style="color: #f59e0b;">${payload.percentUsed.toFixed(1)}%</strong> de la limite mensuelle.</p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Service:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${serviceName}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Periode:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${period}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Cout actuel:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${payload.currentCost.toFixed(2)} ${currency}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Limite budget:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${payload.budgetAmount.toFixed(2)} ${currency}</td>
            </tr>
            <tr>
              <td style="padding: 10px;"><strong>Utilisation:</strong></td>
              <td style="padding: 10px; color: #f59e0b; font-weight: bold;">${payload.percentUsed.toFixed(1)}%</td>
            </tr>
          </table>

          <p><strong>Actions recommandees:</strong></p>
          <ul>
            <li>Verifiez l'utilisation recente dans le tableau de bord admin</li>
            <li>Verifiez s'il y a une activite inhabituelle</li>
            <li>Envisagez d'augmenter le budget si justifie</li>
          </ul>

          <p style="margin-top: 20px;">
            <a href="https://sos-expat.com/admin/finance" style="background-color: #f59e0b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Voir le Dashboard
            </a>
          </p>
        </div>
        <div style="padding: 15px; background-color: #f5f5f5; text-align: center; font-size: 12px; color: #666;">
          SOS Expat - Surveillance Automatique des Budgets
        </div>
      </div>
    `,
    text: `[SOS Expat] Alerte Budget

Le budget pour ${serviceName} a atteint ${payload.percentUsed.toFixed(1)}% de la limite mensuelle.

Service: ${serviceName}
Periode: ${period}
Cout actuel: ${payload.currentCost.toFixed(2)} ${currency}
Limite budget: ${payload.budgetAmount.toFixed(2)} ${currency}
Utilisation: ${payload.percentUsed.toFixed(1)}%

Actions recommandees:
- Verifiez l'utilisation recente dans le tableau de bord admin
- Verifiez s'il y a une activite inhabituelle
- Envisagez d'augmenter le budget si justifie

Voir le Dashboard: https://sos-expat.com/admin/finance
`,
  };
}

function generateCriticalEmail(
  payload: BudgetAlertPayload,
  locale: string
): EmailContent {
  const serviceName = SERVICE_DISPLAY_NAMES[payload.service][locale === "en" ? "en" : "fr"];
  const currency = payload.currency || "EUR";
  const period = payload.period || new Date().toLocaleDateString(locale === "en" ? "en-US" : "fr-FR", { month: "long", year: "numeric" });
  const overBudget = payload.currentCost - payload.budgetAmount;

  if (locale === "en") {
    return {
      subject: `[URGENT] SOS Expat - Budget Exceeded: ${serviceName} at ${payload.percentUsed.toFixed(1)}%`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">URGENT: Budget Exceeded</h1>
          </div>
          <div style="padding: 20px; background-color: #fef2f2; border: 2px solid #dc2626;">
            <p style="font-size: 18px; color: #dc2626;"><strong>Immediate action required!</strong></p>
            <p>The budget for <strong>${serviceName}</strong> has exceeded <strong style="color: #dc2626;">${payload.percentUsed.toFixed(1)}%</strong> of the monthly limit.</p>

            <div style="background-color: #dc2626; color: white; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
              <div style="font-size: 24px; font-weight: bold;">Over budget by ${overBudget.toFixed(2)} ${currency}</div>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Service:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${serviceName}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Period:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${period}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Current Cost:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; color: #dc2626; font-weight: bold;">${payload.currentCost.toFixed(2)} ${currency}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Budget Limit:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${payload.budgetAmount.toFixed(2)} ${currency}</td>
              </tr>
              <tr>
                <td style="padding: 10px;"><strong>Usage:</strong></td>
                <td style="padding: 10px; color: #dc2626; font-weight: bold;">${payload.percentUsed.toFixed(1)}%</td>
              </tr>
            </table>

            <p><strong>Required actions:</strong></p>
            <ul>
              <li><strong>Immediately review usage</strong> to identify the cause</li>
              <li>Check for potential abuse or anomalies</li>
              <li>Consider temporarily limiting the service if necessary</li>
              <li>Update budget allocation if usage is legitimate</li>
            </ul>

            <p style="margin-top: 20px;">
              <a href="https://sos-expat.com/admin/finance" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Take Action Now
              </a>
            </p>
          </div>
          <div style="padding: 15px; background-color: #f5f5f5; text-align: center; font-size: 12px; color: #666;">
            SOS Expat - Automated Budget Monitoring - CRITICAL ALERT
          </div>
        </div>
      `,
      text: `[URGENT] SOS Expat - Budget Exceeded

IMMEDIATE ACTION REQUIRED!

The budget for ${serviceName} has exceeded ${payload.percentUsed.toFixed(1)}% of the monthly limit.

OVER BUDGET BY: ${overBudget.toFixed(2)} ${currency}

Service: ${serviceName}
Period: ${period}
Current Cost: ${payload.currentCost.toFixed(2)} ${currency}
Budget Limit: ${payload.budgetAmount.toFixed(2)} ${currency}
Usage: ${payload.percentUsed.toFixed(1)}%

Required actions:
- IMMEDIATELY review usage to identify the cause
- Check for potential abuse or anomalies
- Consider temporarily limiting the service if necessary
- Update budget allocation if usage is legitimate

Take Action Now: https://sos-expat.com/admin/finance
`,
    };
  }

  // French (default)
  return {
    subject: `[URGENT] SOS Expat - Budget Depasse: ${serviceName} a ${payload.percentUsed.toFixed(1)}%`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">URGENT: Budget Depasse</h1>
        </div>
        <div style="padding: 20px; background-color: #fef2f2; border: 2px solid #dc2626;">
          <p style="font-size: 18px; color: #dc2626;"><strong>Action immediate requise!</strong></p>
          <p>Le budget pour <strong>${serviceName}</strong> a depasse <strong style="color: #dc2626;">${payload.percentUsed.toFixed(1)}%</strong> de la limite mensuelle.</p>

          <div style="background-color: #dc2626; color: white; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
            <div style="font-size: 24px; font-weight: bold;">Depassement de ${overBudget.toFixed(2)} ${currency}</div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Service:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${serviceName}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Periode:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${period}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Cout actuel:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd; color: #dc2626; font-weight: bold;">${payload.currentCost.toFixed(2)} ${currency}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Limite budget:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${payload.budgetAmount.toFixed(2)} ${currency}</td>
            </tr>
            <tr>
              <td style="padding: 10px;"><strong>Utilisation:</strong></td>
              <td style="padding: 10px; color: #dc2626; font-weight: bold;">${payload.percentUsed.toFixed(1)}%</td>
            </tr>
          </table>

          <p><strong>Actions requises:</strong></p>
          <ul>
            <li><strong>Verifiez immediatement l'utilisation</strong> pour identifier la cause</li>
            <li>Recherchez des abus potentiels ou des anomalies</li>
            <li>Envisagez de limiter temporairement le service si necessaire</li>
            <li>Mettez a jour l'allocation budgetaire si l'utilisation est legitime</li>
          </ul>

          <p style="margin-top: 20px;">
            <a href="https://sos-expat.com/admin/finance" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Agir Maintenant
            </a>
          </p>
        </div>
        <div style="padding: 15px; background-color: #f5f5f5; text-align: center; font-size: 12px; color: #666;">
          SOS Expat - Surveillance Automatique des Budgets - ALERTE CRITIQUE
        </div>
      </div>
    `,
    text: `[URGENT] SOS Expat - Budget Depasse

ACTION IMMEDIATE REQUISE!

Le budget pour ${serviceName} a depasse ${payload.percentUsed.toFixed(1)}% de la limite mensuelle.

DEPASSEMENT DE: ${overBudget.toFixed(2)} ${currency}

Service: ${serviceName}
Periode: ${period}
Cout actuel: ${payload.currentCost.toFixed(2)} ${currency}
Limite budget: ${payload.budgetAmount.toFixed(2)} ${currency}
Utilisation: ${payload.percentUsed.toFixed(1)}%

Actions requises:
- VERIFIEZ IMMEDIATEMENT l'utilisation pour identifier la cause
- Recherchez des abus potentiels ou des anomalies
- Envisagez de limiter temporairement le service si necessaire
- Mettez a jour l'allocation budgetaire si l'utilisation est legitime

Agir Maintenant: https://sos-expat.com/admin/finance
`,
  };
}

// ==========================================
// MAIN FUNCTIONS
// ==========================================

/**
 * Send budget alert notification to all admin recipients
 * Uses the message_events collection for delivery via the notification pipeline
 */
async function sendBudgetAlertNotification(
  payload: BudgetAlertPayload,
  level: BudgetAlertLevel,
  recipients: AdminRecipient[]
): Promise<number> {
  let sentCount = 0;

  for (const recipient of recipients) {
    const emailContent = level === "critical"
      ? generateCriticalEmail(payload, recipient.locale)
      : generateWarningEmail(payload, recipient.locale);

    try {
      // Create message_event for email delivery
      await getDb().collection("message_events").add({
        eventId: `budget.alert.${level}`,
        locale: recipient.locale,
        to: {
          email: recipient.email,
        },
        context: {
          user: {
            uid: recipient.uid,
            email: recipient.email,
          },
        },
        vars: {
          service: payload.service,
          currentCost: payload.currentCost,
          budgetAmount: payload.budgetAmount,
          percentUsed: payload.percentUsed,
          alertLevel: level,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        },
        channels: ["email"],
        dedupeKey: `budget_${payload.service}_${level}_${recipient.uid}_${new Date().toISOString().slice(0, 10)}`,
        createdAt: Timestamp.now(),
      });

      sentCount++;
      console.log(`[BudgetAlerts] Queued ${level} alert email to ${recipient.email}`);
    } catch (error) {
      console.error(`[BudgetAlerts] Failed to queue email for ${recipient.email}:`, error);
    }
  }

  return sentCount;
}

/**
 * Check budget and send alerts if thresholds are exceeded
 *
 * @param service - The service to check (twilio, firestore, functions, storage, total)
 * @param currentCost - Current cost for the period
 * @param budgetAmount - Budget limit for the period
 * @param currency - Currency code (default: EUR)
 * @param period - Period description (e.g., "January 2025")
 * @returns Result with alert status and notifications sent
 */
export async function checkBudgetAndAlert(
  service: BudgetServiceType,
  currentCost: number,
  budgetAmount: number,
  currency: string = "EUR",
  period?: string
): Promise<BudgetAlertResult> {
  const result: BudgetAlertResult = {
    success: true,
    alertLevel: null,
    notificationsSent: 0,
  };

  try {
    // Calculate percentage
    const percentUsed = budgetAmount > 0 ? (currentCost / budgetAmount) * 100 : 0;

    console.log(`[BudgetAlerts] Checking ${service}: ${percentUsed.toFixed(1)}% (${currentCost}/${budgetAmount} ${currency})`);

    // Determine alert level
    let alertLevel: BudgetAlertLevel | null = null;

    if (percentUsed >= BUDGET_ALERT_CONFIG.criticalThreshold) {
      alertLevel = "critical";
    } else if (percentUsed >= BUDGET_ALERT_CONFIG.warningThreshold) {
      alertLevel = "warning";
    }

    if (!alertLevel) {
      console.log(`[BudgetAlerts] ${service} is within budget (${percentUsed.toFixed(1)}%)`);
      return result;
    }

    result.alertLevel = alertLevel;

    // Check cooldown
    const inCooldown = await isAlertInCooldown(service, alertLevel);
    if (inCooldown) {
      console.log(`[BudgetAlerts] ${service} ${alertLevel} alert is in cooldown period`);
      return result;
    }

    // Get admin recipients
    const recipients = await getAdminRecipients();
    if (recipients.length === 0) {
      console.warn("[BudgetAlerts] No admin recipients found for budget alerts");
      result.success = false;
      result.error = "No admin recipients found";
      return result;
    }

    // Prepare payload
    const payload: BudgetAlertPayload = {
      service,
      currentCost,
      budgetAmount,
      percentUsed,
      currency,
      period,
    };

    // Send notifications
    const sentCount = await sendBudgetAlertNotification(payload, alertLevel, recipients);
    result.notificationsSent = sentCount;

    // Mark alert as sent
    await markAlertSent(service, alertLevel);

    // Log to admin_notifications collection for dashboard visibility
    await getDb().collection("admin_notifications").add({
      type: "budget_alert",
      severity: alertLevel === "critical" ? "critical" : "high",
      title: alertLevel === "critical"
        ? `Budget Depasse: ${SERVICE_DISPLAY_NAMES[service].fr}`
        : `Alerte Budget: ${SERVICE_DISPLAY_NAMES[service].fr}`,
      message: `${service}: ${percentUsed.toFixed(1)}% du budget utilise (${currentCost.toFixed(2)}/${budgetAmount.toFixed(2)} ${currency})`,
      service,
      currentCost,
      budgetAmount,
      percentUsed,
      currency,
      alertLevel,
      read: false,
      createdAt: Timestamp.now(),
    });

    console.log(`[BudgetAlerts] ${alertLevel.toUpperCase()} alert sent for ${service} to ${sentCount} recipients`);

  } catch (error) {
    console.error("[BudgetAlerts] Error in checkBudgetAndAlert:", error);
    result.success = false;
    result.error = error instanceof Error ? error.message : "Unknown error";
  }

  return result;
}

/**
 * Check all services against their budgets and send alerts as needed
 * Designed to be called from a scheduled function
 */
export async function checkAllBudgetsAndAlert(): Promise<Record<BudgetServiceType, BudgetAlertResult>> {
  const results: Record<BudgetServiceType, BudgetAlertResult> = {
    twilio: { success: false, alertLevel: null, notificationsSent: 0 },
    firestore: { success: false, alertLevel: null, notificationsSent: 0 },
    functions: { success: false, alertLevel: null, notificationsSent: 0 },
    storage: { success: false, alertLevel: null, notificationsSent: 0 },
    total: { success: false, alertLevel: null, notificationsSent: 0 },
  };

  try {
    // Get budget config
    const configDoc = await getDb().collection("budget_config").doc("default").get();
    if (!configDoc.exists) {
      console.warn("[BudgetAlerts] No budget config found");
      return results;
    }

    const config = configDoc.data();
    const monthlyConfig = config?.monthly;

    if (!monthlyConfig) {
      console.warn("[BudgetAlerts] No monthly budget config found");
      return results;
    }

    // Get current costs (from cost_tracking collection)
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    const costsDoc = await getDb().collection("cost_tracking").doc(currentMonth).get();
    const costs = costsDoc.exists ? costsDoc.data() : {};

    const period = new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

    // Check each service
    const services: BudgetServiceType[] = ["twilio", "firestore", "functions", "storage", "total"];

    for (const service of services) {
      const budgetConfig = monthlyConfig[service];
      if (!budgetConfig) continue;

      const currentCost = costs?.[service]?.cost || costs?.[service] || 0;
      const budgetAmount = budgetConfig.budget || 0;

      results[service] = await checkBudgetAndAlert(
        service,
        currentCost,
        budgetAmount,
        "EUR",
        period
      );
    }

  } catch (error) {
    console.error("[BudgetAlerts] Error in checkAllBudgetsAndAlert:", error);
  }

  return results;
}

// Export types for external use
export type { AdminRecipient, EmailContent };
