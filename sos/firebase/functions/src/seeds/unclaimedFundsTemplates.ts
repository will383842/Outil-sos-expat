/**
 * Templates de notification pour les fonds non réclamés
 *
 * Ces templates sont utilisés par le processeur de fonds non réclamés
 * pour envoyer des rappels et notifications de forfeiture.
 *
 * Exécuter avec:
 * npx ts-node src/seeds/unclaimedFundsTemplates.ts
 */

import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";

// Templates de fonds non réclamés
const UNCLAIMED_FUNDS_TEMPLATES = {
  // Premier rappel (7-30 jours)
  "unclaimed_funds.reminder.initial": {
    _meta: {
      description: "Rappel initial - fonds en attente de KYC (7-30 jours)",
      category: "unclaimed_funds",
    },
    channels: {
      email: true,
      push: true,
      inapp: true,
      sms: false,
    },
    email: {
      subject: "You have {{AMOUNT}} {{CURRENCY}} waiting - Complete your KYC",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .amount-box { background: #ecfdf5; border: 2px solid #059669; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
    .amount { font-size: 32px; font-weight: bold; color: #059669; }
    .btn { display: inline-block; background: #059669; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Funds Waiting For You!</h1>
    </div>
    <div class="content">
      <p>Hi {{FIRST_NAME}},</p>

      <p>Great news! You have earnings waiting to be transferred to your account.</p>

      <div class="amount-box">
        <p style="margin: 0; color: #666;">Available balance:</p>
        <p class="amount">{{AMOUNT}} {{CURRENCY}}</p>
      </div>

      <p>To receive this payment, you just need to complete your identity verification (KYC).</p>

      <p style="text-align: center;">
        <a href="{{KYC_LINK}}" class="btn">Complete Verification Now</a>
      </p>

      <div class="warning">
        <strong>Important:</strong> You have <strong>{{DAYS_REMAINING}} days</strong> to complete your verification.
        After this period, unclaimed funds will be forfeited according to our Terms of Service (Article 8.6-8.9).
      </div>

      <p>The verification process takes about 5 minutes and requires:</p>
      <ul>
        <li>A valid ID document (passport or national ID)</li>
        <li>Your bank account details</li>
      </ul>

      <p>Need help? Contact our support team anytime.</p>

      <p>Best regards,<br>The SOS Expat Team</p>
    </div>
    <div class="footer">
      <p>SOS Expat - Connecting Expatriates Worldwide</p>
      <p style="font-size: 10px;">This is reminder {{REMINDER_NUMBER}} of {{TOTAL_REMINDERS}}</p>
    </div>
  </div>
</body>
</html>
      `,
      text: `Hi {{FIRST_NAME}},

You have {{AMOUNT}} {{CURRENCY}} waiting to be transferred to your account!

To receive this payment, complete your identity verification:
{{KYC_LINK}}

IMPORTANT: You have {{DAYS_REMAINING}} days to complete verification. After this period, unclaimed funds will be forfeited (Terms Article 8.6-8.9).

Best regards,
The SOS Expat Team`,
    },
    push: {
      title: "{{AMOUNT}} {{CURRENCY}} waiting for you!",
      body: "Complete your KYC to receive your funds. {{DAYS_REMAINING}} days remaining.",
      deeplink: "/dashboard/kyc",
    },
    inapp: {
      title: "Funds waiting - Complete KYC",
      body: "You have {{AMOUNT}} {{CURRENCY}} pending. Complete verification within {{DAYS_REMAINING}} days.",
      actionUrl: "/dashboard/kyc",
    },
  },

  // Rappel de suivi (60-90 jours)
  "unclaimed_funds.reminder.followup": {
    _meta: {
      description: "Rappel de suivi - fonds en attente (60-90 jours)",
      category: "unclaimed_funds",
    },
    channels: {
      email: true,
      push: true,
      inapp: true,
      sms: false,
    },
    email: {
      subject: "Reminder: {{AMOUNT}} {{CURRENCY}} still waiting - {{DAYS_REMAINING}} days left",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #d97706; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .amount-box { background: #fffbeb; border: 2px solid #d97706; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
    .amount { font-size: 32px; font-weight: bold; color: #d97706; }
    .days-box { background: #fef3c7; border-radius: 8px; padding: 15px; text-align: center; margin: 20px 0; }
    .days { font-size: 48px; font-weight: bold; color: #d97706; }
    .btn { display: inline-block; background: #d97706; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
    .warning { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Action Required</h1>
    </div>
    <div class="content">
      <p>Hi {{FIRST_NAME}},</p>

      <p>We're reaching out again because you still have unclaimed funds in your account.</p>

      <div class="amount-box">
        <p style="margin: 0; color: #666;">Your pending balance:</p>
        <p class="amount">{{AMOUNT}} {{CURRENCY}}</p>
      </div>

      <div class="days-box">
        <p style="margin: 0; color: #666;">Days remaining to claim:</p>
        <p class="days">{{DAYS_REMAINING}}</p>
      </div>

      <div class="warning">
        <strong>Important Notice:</strong> According to our Terms of Service (Article 8.6-8.9), funds not claimed within 180 days
        from the first payment will be considered abandoned and acquired by the platform. Don't lose your hard-earned money!
      </div>

      <p style="text-align: center;">
        <a href="{{KYC_LINK}}" class="btn">Complete Verification Now</a>
      </p>

      <p>If you're experiencing issues with the verification process, please contact our support team immediately.</p>

      <p>Best regards,<br>The SOS Expat Team</p>
    </div>
    <div class="footer">
      <p>SOS Expat - Connecting Expatriates Worldwide</p>
    </div>
  </div>
</body>
</html>
      `,
      text: `Hi {{FIRST_NAME}},

REMINDER: You have {{AMOUNT}} {{CURRENCY}} waiting to be claimed!

You have {{DAYS_REMAINING}} DAYS left to complete your verification.

According to our Terms (Article 8.6-8.9), unclaimed funds after 180 days will be forfeited.

Complete your verification now:
{{KYC_LINK}}

Best regards,
The SOS Expat Team`,
    },
    push: {
      title: "Action required: {{DAYS_REMAINING}} days left",
      body: "{{AMOUNT}} {{CURRENCY}} at risk. Complete KYC now!",
      deeplink: "/dashboard/kyc",
    },
    inapp: {
      title: "Urgent: Funds at risk",
      body: "Only {{DAYS_REMAINING}} days to claim {{AMOUNT}} {{CURRENCY}}. Act now!",
      actionUrl: "/dashboard/kyc",
    },
  },

  // Rappel urgent (120-150 jours)
  "unclaimed_funds.reminder.urgent": {
    _meta: {
      description: "Rappel urgent - dernière chance (120-150 jours)",
      category: "unclaimed_funds",
    },
    channels: {
      email: true,
      push: true,
      inapp: true,
      sms: true,
    },
    email: {
      subject: "URGENT: {{AMOUNT}} {{CURRENCY}} will be forfeited in {{DAYS_REMAINING}} days!",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .urgent-box { background: #fef2f2; border: 3px solid #dc2626; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
    .amount { font-size: 36px; font-weight: bold; color: #dc2626; }
    .countdown { font-size: 64px; font-weight: bold; color: #dc2626; }
    .btn { display: inline-block; background: #dc2626; color: white; padding: 16px 32px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; font-size: 18px; }
    .legal { background: #f3f4f6; padding: 15px; margin: 20px 0; font-size: 12px; border-radius: 8px; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>FINAL WARNING</h1>
    </div>
    <div class="content">
      <p>Hi {{FIRST_NAME}},</p>

      <p><strong>This is your final warning.</strong> You are about to lose your earnings permanently.</p>

      <div class="urgent-box">
        <p style="margin: 0; color: #666;">Amount at risk:</p>
        <p class="amount">{{AMOUNT}} {{CURRENCY}}</p>
        <hr style="border: 1px solid #fca5a5; margin: 15px 0;">
        <p style="margin: 0; color: #666;">Days until forfeiture:</p>
        <p class="countdown">{{DAYS_REMAINING}}</p>
      </div>

      <p style="text-align: center;">
        <a href="{{KYC_LINK}}" class="btn">COMPLETE VERIFICATION NOW</a>
      </p>

      <p>After <strong>{{FORFEITURE_DATE}}</strong>, your funds will be permanently forfeited and cannot be recovered (except in exceptional circumstances with a 20% processing fee).</p>

      <div class="legal">
        <strong>Legal basis:</strong> Terms of Service, Article 8.6-8.9 - Unclaimed Funds and Forfeiture
        <br><br>
        You accepted these terms upon registration. The platform has sent multiple reminders as required by Article 8.5.
      </div>

      <p><strong>Don't wait any longer.</strong> Complete your verification in just 5 minutes.</p>

      <p>Best regards,<br>The SOS Expat Team</p>
    </div>
    <div class="footer">
      <p>SOS Expat - Connecting Expatriates Worldwide</p>
    </div>
  </div>
</body>
</html>
      `,
      text: `URGENT - FINAL WARNING

Hi {{FIRST_NAME}},

You are about to LOSE {{AMOUNT}} {{CURRENCY}} permanently!

Only {{DAYS_REMAINING}} DAYS remaining before forfeiture on {{FORFEITURE_DATE}}.

Complete verification NOW:
{{KYC_LINK}}

This is your final warning. After the deadline, funds cannot be recovered.

Legal basis: Terms of Service, Article 8.6-8.9

The SOS Expat Team`,
    },
    push: {
      title: "FINAL WARNING: {{DAYS_REMAINING}} days!",
      body: "{{AMOUNT}} {{CURRENCY}} will be lost forever. Act NOW!",
      deeplink: "/dashboard/kyc",
    },
    inapp: {
      title: "FINAL WARNING",
      body: "{{AMOUNT}} {{CURRENCY}} will be forfeited in {{DAYS_REMAINING}} days! Complete KYC immediately.",
      actionUrl: "/dashboard/kyc",
      priority: "critical",
    },
    sms: {
      body: "SOS Expat: URGENT - Your {{AMOUNT}} {{CURRENCY}} will be forfeited in {{DAYS_REMAINING}} days. Complete KYC now: {{KYC_LINK}}",
    },
  },

  // Notification de forfeiture
  "unclaimed_funds.forfeited": {
    _meta: {
      description: "Notification de forfeiture - fonds acquis par la plateforme",
      category: "unclaimed_funds",
    },
    channels: {
      email: true,
      push: true,
      inapp: true,
      sms: false,
    },
    email: {
      subject: "Notice: Your {{AMOUNT}} {{CURRENCY}} has been forfeited",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #374151; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .notice-box { background: #f3f4f6; border: 2px solid #6b7280; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .amount { font-size: 28px; font-weight: bold; color: #6b7280; text-decoration: line-through; }
    .legal { background: #e5e7eb; padding: 15px; margin: 20px 0; font-size: 12px; border-radius: 8px; }
    .exceptional { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Forfeiture Notice</h1>
    </div>
    <div class="content">
      <p>Hi {{FIRST_NAME}},</p>

      <p>We regret to inform you that your unclaimed funds have been forfeited.</p>

      <div class="notice-box">
        <p style="margin: 0; color: #666;">Forfeited amount:</p>
        <p class="amount">{{AMOUNT}} {{CURRENCY}}</p>
        <p style="margin: 10px 0 0 0; color: #666;">These funds are no longer available.</p>
      </div>

      <p>Despite multiple reminders over the past 180 days, you did not complete the required identity verification (KYC) to claim your earnings.</p>

      <div class="legal">
        <strong>Legal basis:</strong> Terms of Service, Article 8.6-8.9
        <br><br>
        As stated in our terms (which you accepted upon registration), funds not claimed within 180 days are considered abandoned
        and acquired by the platform as compensation for management and custody costs.
      </div>

      <div class="exceptional">
        <strong>Exceptional Claims:</strong>
        <br><br>
        In limited circumstances (documented medical incapacity, force majeure, or platform error), you may submit an exceptional
        claim within <strong>12 months</strong> of this forfeiture. If approved, a 20% processing fee will be deducted.
        <br><br>
        Deadline for exceptional claims: <strong>{{EXCEPTIONAL_CLAIM_DEADLINE}}</strong>
        <br><br>
        To submit a claim, contact us at: <a href="{{CONTACT_LINK}}">{{CONTACT_LINK}}</a>
      </div>

      <p>If you have any questions, please contact our support team.</p>

      <p>Regards,<br>The SOS Expat Team</p>
    </div>
    <div class="footer">
      <p>SOS Expat - Connecting Expatriates Worldwide</p>
    </div>
  </div>
</body>
</html>
      `,
      text: `FORFEITURE NOTICE

Hi {{FIRST_NAME}},

Your unclaimed funds of {{AMOUNT}} {{CURRENCY}} have been forfeited.

Despite multiple reminders over 180 days, you did not complete KYC verification.

Legal basis: Terms of Service, Article 8.6-8.9

EXCEPTIONAL CLAIMS:
In limited circumstances, you may submit an exceptional claim within 12 months.
Deadline: {{EXCEPTIONAL_CLAIM_DEADLINE}}
Contact: {{CONTACT_LINK}}

If approved, a 20% processing fee applies.

Regards,
The SOS Expat Team`,
    },
    push: {
      title: "Funds forfeited",
      body: "Your {{AMOUNT}} {{CURRENCY}} has been forfeited. See email for details.",
      deeplink: "/dashboard/notifications",
    },
    inapp: {
      title: "Forfeiture Notice",
      body: "Your {{AMOUNT}} {{CURRENCY}} has been forfeited after 180 days. Exceptional claims available until {{EXCEPTIONAL_CLAIM_DEADLINE}}.",
      priority: "high",
    },
  },
};

// Templates en français
const UNCLAIMED_FUNDS_TEMPLATES_FR = {
  "unclaimed_funds.reminder.initial": {
    _meta: {
      description: "Rappel initial - fonds en attente de KYC (7-30 jours)",
      category: "unclaimed_funds",
    },
    channels: {
      email: true,
      push: true,
      inapp: true,
      sms: false,
    },
    email: {
      subject: "Vous avez {{AMOUNT}} {{CURRENCY}} en attente - Complétez votre KYC",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .amount-box { background: #ecfdf5; border: 2px solid #059669; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
    .amount { font-size: 32px; font-weight: bold; color: #059669; }
    .btn { display: inline-block; background: #059669; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Des fonds vous attendent !</h1>
    </div>
    <div class="content">
      <p>Bonjour {{FIRST_NAME}},</p>

      <p>Bonne nouvelle ! Vous avez des revenus en attente de transfert sur votre compte.</p>

      <div class="amount-box">
        <p style="margin: 0; color: #666;">Solde disponible :</p>
        <p class="amount">{{AMOUNT}} {{CURRENCY}}</p>
      </div>

      <p>Pour recevoir ce paiement, il vous suffit de compléter votre vérification d'identité (KYC).</p>

      <p style="text-align: center;">
        <a href="{{KYC_LINK}}" class="btn">Compléter la vérification</a>
      </p>

      <div class="warning">
        <strong>Important :</strong> Vous avez <strong>{{DAYS_REMAINING}} jours</strong> pour compléter votre vérification.
        Passé ce délai, les fonds non réclamés seront considérés comme abandonnés conformément à nos CGU (Article 8.6-8.9).
      </div>

      <p>Cordialement,<br>L'équipe SOS Expat</p>
    </div>
    <div class="footer">
      <p>SOS Expat - Connecter les expatriés du monde entier</p>
    </div>
  </div>
</body>
</html>
      `,
      text: `Bonjour {{FIRST_NAME}},

Vous avez {{AMOUNT}} {{CURRENCY}} en attente de transfert !

Pour recevoir ce paiement, complétez votre vérification d'identité :
{{KYC_LINK}}

IMPORTANT : Vous avez {{DAYS_REMAINING}} jours pour compléter la vérification.

Cordialement,
L'équipe SOS Expat`,
    },
    push: {
      title: "{{AMOUNT}} {{CURRENCY}} vous attendent !",
      body: "Complétez votre KYC pour recevoir vos fonds. {{DAYS_REMAINING}} jours restants.",
      deeplink: "/dashboard/kyc",
    },
    inapp: {
      title: "Fonds en attente - Complétez votre KYC",
      body: "Vous avez {{AMOUNT}} {{CURRENCY}} en attente. Complétez la vérification sous {{DAYS_REMAINING}} jours.",
      actionUrl: "/dashboard/kyc",
    },
  },

  "unclaimed_funds.reminder.followup": {
    _meta: {
      description: "Rappel de suivi (60-90 jours)",
      category: "unclaimed_funds",
    },
    channels: { email: true, push: true, inapp: true, sms: false },
    email: {
      subject: "Rappel : {{AMOUNT}} {{CURRENCY}} en attente - {{DAYS_REMAINING}} jours restants",
      html: `<!-- Similar to EN version but in French -->`,
      text: `Rappel : Vous avez {{AMOUNT}} {{CURRENCY}} en attente. {{DAYS_REMAINING}} jours restants.`,
    },
    push: {
      title: "Action requise : {{DAYS_REMAINING}} jours",
      body: "{{AMOUNT}} {{CURRENCY}} à risque. Complétez le KYC !",
      deeplink: "/dashboard/kyc",
    },
    inapp: {
      title: "Urgent : Fonds à risque",
      body: "Plus que {{DAYS_REMAINING}} jours pour réclamer {{AMOUNT}} {{CURRENCY}}.",
      actionUrl: "/dashboard/kyc",
    },
  },

  "unclaimed_funds.reminder.urgent": {
    _meta: {
      description: "Rappel urgent - dernière chance (120-150 jours)",
      category: "unclaimed_funds",
    },
    channels: { email: true, push: true, inapp: true, sms: true },
    email: {
      subject: "URGENT : {{AMOUNT}} {{CURRENCY}} seront perdus dans {{DAYS_REMAINING}} jours !",
      html: `<!-- Similar to EN version but in French -->`,
      text: `URGENT : {{AMOUNT}} {{CURRENCY}} seront perdus dans {{DAYS_REMAINING}} jours. Complétez le KYC : {{KYC_LINK}}`,
    },
    push: {
      title: "DERNIER AVERTISSEMENT : {{DAYS_REMAINING}} jours !",
      body: "{{AMOUNT}} {{CURRENCY}} seront perdus. Agissez MAINTENANT !",
      deeplink: "/dashboard/kyc",
    },
    inapp: {
      title: "DERNIER AVERTISSEMENT",
      body: "{{AMOUNT}} {{CURRENCY}} seront perdus dans {{DAYS_REMAINING}} jours !",
      actionUrl: "/dashboard/kyc",
      priority: "critical",
    },
    sms: {
      body: "SOS Expat URGENT: Vos {{AMOUNT}} {{CURRENCY}} seront perdus dans {{DAYS_REMAINING}} jours. KYC: {{KYC_LINK}}",
    },
  },

  "unclaimed_funds.forfeited": {
    _meta: {
      description: "Notification de déchéance",
      category: "unclaimed_funds",
    },
    channels: { email: true, push: true, inapp: true, sms: false },
    email: {
      subject: "Avis : Vos {{AMOUNT}} {{CURRENCY}} ont été acquis par la plateforme",
      html: `<!-- Similar to EN version but in French -->`,
      text: `Vos fonds de {{AMOUNT}} {{CURRENCY}} ont été acquis. Réclamation exceptionnelle possible jusqu'au {{EXCEPTIONAL_CLAIM_DEADLINE}}.`,
    },
    push: {
      title: "Fonds acquis",
      body: "Vos {{AMOUNT}} {{CURRENCY}} ont été acquis. Voir email pour détails.",
      deeplink: "/dashboard/notifications",
    },
    inapp: {
      title: "Avis de déchéance",
      body: "Vos {{AMOUNT}} {{CURRENCY}} ont été acquis après 180 jours. Réclamation exceptionnelle possible.",
      priority: "high",
    },
  },
};

/**
 * Fonction callable pour initialiser les templates de fonds non réclamés
 */
export const initUnclaimedFundsTemplates = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 120,
  },
  async (request) => {
    // Vérifier l'authentification admin
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const userDoc = await admin.firestore().collection("users").doc(request.auth.uid).get();
    const userData = userDoc.data();

    if (!userData?.role || !["admin", "dev"].includes(userData.role)) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const db = admin.firestore();
    let created = 0;

    // Insérer templates EN
    for (const [eventId, template] of Object.entries(UNCLAIMED_FUNDS_TEMPLATES)) {
      await db.doc(`message_templates/en/items/${eventId}`).set(template, { merge: true });
      created++;
    }

    // Insérer templates FR
    for (const [eventId, template] of Object.entries(UNCLAIMED_FUNDS_TEMPLATES_FR)) {
      await db.doc(`message_templates/fr-FR/items/${eventId}`).set(template, { merge: true });
      created++;
    }

    console.log(`[SEED] Created ${created} unclaimed funds templates`);

    return {
      success: true,
      created,
      message: `${created} templates created/updated`,
    };
  }
);

// Export pour utilisation dans les tests
export { UNCLAIMED_FUNDS_TEMPLATES, UNCLAIMED_FUNDS_TEMPLATES_FR };
