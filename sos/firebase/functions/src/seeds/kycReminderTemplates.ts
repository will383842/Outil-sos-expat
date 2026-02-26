/**
 * Script de seed pour les templates de rappel KYC
 *
 * Exécuter avec:
 * npx ts-node src/seeds/kycReminderTemplates.ts
 *
 * Ou déployer la fonction initKYCReminderTemplates et l'appeler
 */

import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";

// Templates de rappel KYC
const KYC_TEMPLATES = {
  "kyc.reminder.first": {
    _meta: {
      description: "Premier rappel KYC - 24h après inscription",
      category: "kyc",
    },
    channels: {
      email: true,
      push: true,
      inapp: true,
      sms: false,
    },
    email: {
      subject: "Complete your verification to start receiving payments",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .btn { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Almost There!</h1>
    </div>
    <div class="content">
      <p>Hi {{FIRST_NAME}},</p>

      <p>Welcome to SOS Expat! You've taken the first step to help expatriates worldwide.</p>

      <p>To start receiving payments from clients, you need to complete your identity verification. This is a quick and secure process powered by Stripe.</p>

      <p><strong>Why is this important?</strong></p>
      <ul>
        <li>Receive payments directly to your bank account</li>
        <li>Build trust with potential clients</li>
        <li>Comply with international payment regulations</li>
      </ul>

      <p style="text-align: center;">
        <a href="{{ONBOARDING_LINK}}" class="btn">Complete Verification Now</a>
      </p>

      <p>The process takes about 5 minutes and requires:</p>
      <ul>
        <li>A valid ID document (passport or national ID)</li>
        <li>Your bank account details</li>
      </ul>

      <p>If you have any questions, our support team is here to help.</p>

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

Welcome to SOS Expat! To start receiving payments, please complete your identity verification.

Complete verification: {{ONBOARDING_LINK}}

The process takes about 5 minutes.

Best regards,
The SOS Expat Team`,
    },
    push: {
      title: "Complete your verification",
      body: "Complete your identity verification to start receiving payments from clients.",
      deeplink: "/dashboard/kyc",
    },
    inapp: {
      title: "Complete your verification",
      body: "Complete your identity verification to start receiving payments. Click here to continue.",
    },
  },

  "kyc.reminder.followup": {
    _meta: {
      description: "Rappel de suivi KYC - 3-7 jours",
      category: "kyc",
    },
    channels: {
      email: true,
      push: true,
      inapp: true,
      sms: false,
    },
    email: {
      subject: "Don't miss out - Complete your verification",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .btn { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .stats { background: white; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Clients Are Waiting!</h1>
    </div>
    <div class="content">
      <p>Hi {{FIRST_NAME}},</p>

      <p>It's been {{DAYS_SINCE_SIGNUP}} days since you joined SOS Expat, and we noticed you haven't completed your verification yet.</p>

      <div class="stats">
        <p><strong>Did you know?</strong></p>
        <p>Verified providers receive their first client request within an average of 48 hours!</p>
      </div>

      <p>Without verification, clients cannot book your services and you cannot receive payments.</p>

      <p style="text-align: center;">
        <a href="{{ONBOARDING_LINK}}" class="btn">Complete Verification</a>
      </p>

      <p>Need help? Reply to this email or contact our support team.</p>

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

It's been {{DAYS_SINCE_SIGNUP}} days since you joined SOS Expat.

Complete your verification to start receiving client requests: {{ONBOARDING_LINK}}

Need help? Reply to this email.

Best regards,
The SOS Expat Team`,
    },
    push: {
      title: "Clients are waiting!",
      body: "Complete your verification to receive client requests.",
      deeplink: "/dashboard/kyc",
    },
    inapp: {
      title: "Complete your verification",
      body: "You're missing out on client requests. Complete your verification now.",
    },
  },

  "kyc.reminder.urgent": {
    _meta: {
      description: "Rappel urgent KYC - 14-30 jours",
      category: "kyc",
    },
    channels: {
      email: true,
      push: true,
      inapp: true,
      sms: false,
    },
    email: {
      subject: "Final reminder - Your account may be deactivated",
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
    .btn { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .warning { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin: 20px 0; }
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

      <div class="warning">
        <p><strong>Important:</strong> This is your final reminder. Accounts without completed verification may be deactivated.</p>
      </div>

      <p>It's been {{DAYS_SINCE_SIGNUP}} days since you registered as a provider on SOS Expat, but your verification is still pending.</p>

      <p>To maintain an active and trusted community, we require all providers to complete their identity verification.</p>

      <p style="text-align: center;">
        <a href="{{ONBOARDING_LINK}}" class="btn">Complete Verification Now</a>
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

FINAL REMINDER: Your SOS Expat account verification is still pending after {{DAYS_SINCE_SIGNUP}} days.

Accounts without verification may be deactivated.

Complete now: {{ONBOARDING_LINK}}

Contact support if you need help.

Best regards,
The SOS Expat Team`,
    },
    push: {
      title: "Action Required",
      body: "Complete your verification now to keep your account active.",
      deeplink: "/dashboard/kyc",
    },
    inapp: {
      title: "Final verification reminder",
      body: "Your account may be deactivated. Complete verification now.",
    },
  },
};

// Templates en français
const KYC_TEMPLATES_FR = {
  "kyc.reminder.first": {
    _meta: {
      description: "Premier rappel KYC - 24h après inscription",
      category: "kyc",
    },
    channels: {
      email: true,
      push: true,
      inapp: true,
      sms: false,
    },
    email: {
      subject: "Finalisez votre vérification pour recevoir des paiements",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .btn { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Presque terminé !</h1>
    </div>
    <div class="content">
      <p>Bonjour {{FIRST_NAME}},</p>

      <p>Bienvenue sur SOS Expat ! Vous avez fait le premier pas pour aider les expatriés du monde entier.</p>

      <p>Pour commencer à recevoir des paiements, vous devez finaliser la vérification de votre identité. C'est un processus rapide et sécurisé via Stripe.</p>

      <p><strong>Pourquoi est-ce important ?</strong></p>
      <ul>
        <li>Recevez les paiements directement sur votre compte bancaire</li>
        <li>Inspirez confiance aux clients potentiels</li>
        <li>Respectez les réglementations internationales</li>
      </ul>

      <p style="text-align: center;">
        <a href="{{ONBOARDING_LINK}}" class="btn">Finaliser la vérification</a>
      </p>

      <p>Le processus prend environ 5 minutes et nécessite :</p>
      <ul>
        <li>Une pièce d'identité valide (passeport ou carte d'identité)</li>
        <li>Vos coordonnées bancaires</li>
      </ul>

      <p>Cordialement,<br>L'équipe SOS Expat</p>
    </div>
    <div class="footer">
      <p>SOS Expat - Connecter les Expatriés du Monde Entier</p>
    </div>
  </div>
</body>
</html>
      `,
      text: `Bonjour {{FIRST_NAME}},

Bienvenue sur SOS Expat ! Pour commencer à recevoir des paiements, finalisez votre vérification.

Lien : {{ONBOARDING_LINK}}

Le processus prend environ 5 minutes.

Cordialement,
L'équipe SOS Expat`,
    },
    push: {
      title: "Finalisez votre vérification",
      body: "Complétez la vérification pour recevoir des paiements clients.",
      deeplink: "/dashboard/kyc",
    },
    inapp: {
      title: "Finalisez votre vérification",
      body: "Complétez la vérification d'identité pour commencer à recevoir des paiements.",
    },
  },

  "kyc.reminder.followup": {
    _meta: {
      description: "Rappel de suivi KYC - 3-7 jours",
      category: "kyc",
    },
    channels: {
      email: true,
      push: true,
      inapp: true,
      sms: false,
    },
    email: {
      subject: "Ne manquez pas cette opportunité - Finalisez votre vérification",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .btn { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .stats { background: white; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Des clients vous attendent !</h1>
    </div>
    <div class="content">
      <p>Bonjour {{FIRST_NAME}},</p>

      <p>Cela fait {{DAYS_SINCE_SIGNUP}} jours que vous avez rejoint SOS Expat, et nous avons remarqué que votre vérification n'est pas encore terminée.</p>

      <div class="stats">
        <p><strong>Le saviez-vous ?</strong></p>
        <p>Les prestataires vérifiés reçoivent leur première demande client en moyenne sous 48 heures !</p>
      </div>

      <p>Sans vérification, les clients ne peuvent pas réserver vos services.</p>

      <p style="text-align: center;">
        <a href="{{ONBOARDING_LINK}}" class="btn">Finaliser la vérification</a>
      </p>

      <p>Besoin d'aide ? Répondez à cet email.</p>

      <p>Cordialement,<br>L'équipe SOS Expat</p>
    </div>
    <div class="footer">
      <p>SOS Expat - Connecter les Expatriés du Monde Entier</p>
    </div>
  </div>
</body>
</html>
      `,
      text: `Bonjour {{FIRST_NAME}},

Cela fait {{DAYS_SINCE_SIGNUP}} jours que vous êtes inscrit sur SOS Expat.

Finalisez votre vérification pour recevoir des demandes : {{ONBOARDING_LINK}}

Cordialement,
L'équipe SOS Expat`,
    },
    push: {
      title: "Des clients vous attendent !",
      body: "Finalisez votre vérification pour recevoir des demandes.",
      deeplink: "/dashboard/kyc",
    },
    inapp: {
      title: "Finalisez votre vérification",
      body: "Vous manquez des demandes clients. Finalisez votre vérification maintenant.",
    },
  },

  "kyc.reminder.urgent": {
    _meta: {
      description: "Rappel urgent KYC - 14-30 jours",
      category: "kyc",
    },
    channels: {
      email: true,
      push: true,
      inapp: true,
      sms: false,
    },
    email: {
      subject: "Dernier rappel - Votre compte risque d'être désactivé",
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
    .btn { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .warning { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Action Requise</h1>
    </div>
    <div class="content">
      <p>Bonjour {{FIRST_NAME}},</p>

      <div class="warning">
        <p><strong>Important :</strong> Ceci est votre dernier rappel. Les comptes sans vérification peuvent être désactivés.</p>
      </div>

      <p>Cela fait {{DAYS_SINCE_SIGNUP}} jours que vous êtes inscrit comme prestataire sur SOS Expat, mais votre vérification est toujours en attente.</p>

      <p style="text-align: center;">
        <a href="{{ONBOARDING_LINK}}" class="btn">Finaliser maintenant</a>
      </p>

      <p>Si vous rencontrez des difficultés, contactez notre support immédiatement.</p>

      <p>Cordialement,<br>L'équipe SOS Expat</p>
    </div>
    <div class="footer">
      <p>SOS Expat - Connecter les Expatriés du Monde Entier</p>
    </div>
  </div>
</body>
</html>
      `,
      text: `Bonjour {{FIRST_NAME}},

DERNIER RAPPEL : Votre vérification SOS Expat est toujours en attente après {{DAYS_SINCE_SIGNUP}} jours.

Les comptes non vérifiés peuvent être désactivés.

Finalisez maintenant : {{ONBOARDING_LINK}}

Cordialement,
L'équipe SOS Expat`,
    },
    push: {
      title: "Action Requise",
      body: "Finalisez votre vérification pour garder votre compte actif.",
      deeplink: "/dashboard/kyc",
    },
    inapp: {
      title: "Dernier rappel de vérification",
      body: "Votre compte risque d'être désactivé. Finalisez la vérification maintenant.",
    },
  },
};

/**
 * Fonction Cloud callable pour initialiser les templates KYC
 * À appeler une fois lors du setup
 */
export const initKYCReminderTemplates = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    cpu: 0.083,
  },
  async (request) => {
    // Vérifier l'authentification admin
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const db = admin.firestore();
    const userDoc = await db.collection("users").doc(request.auth.uid).get();
    const userData = userDoc.data();

    if (!userData?.role || userData.role !== "admin") {
      throw new HttpsError("permission-denied", "Only admins can initialize templates");
    }

    const batch = db.batch();

    // Ajouter templates EN
    for (const [eventId, template] of Object.entries(KYC_TEMPLATES)) {
      const ref = db.collection("message_templates").doc("en").collection("items").doc(eventId);
      batch.set(ref, template, { merge: true });
    }

    // Ajouter templates FR
    for (const [eventId, template] of Object.entries(KYC_TEMPLATES_FR)) {
      const ref = db.collection("message_templates").doc("fr-FR").collection("items").doc(eventId);
      batch.set(ref, template, { merge: true });
    }

    await batch.commit();

    return {
      success: true,
      message: "KYC reminder templates initialized",
      templates: Object.keys(KYC_TEMPLATES).length * 2, // EN + FR
    };
  }
);
