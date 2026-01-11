/**
 * ============================================================================
 * CONFIGURATION CENTRALE - AUDIT DE SÉCURITÉ FIREBASE
 * ============================================================================
 *
 * Ce fichier contient toutes les configurations pour l'audit de sécurité.
 * Modifiez les valeurs selon votre projet.
 */

export const CONFIG = {
  // -------------------------------------------------------------------------
  // PROJET FIREBASE
  // -------------------------------------------------------------------------
  firebase: {
    projectId: 'sos-urgently-ac307',
    region: 'europe-west1', // Région de vos Cloud Functions
  },

  // -------------------------------------------------------------------------
  // SERVICES TIERS À VÉRIFIER
  // -------------------------------------------------------------------------
  thirdPartyServices: [
    {
      name: 'Stripe',
      envKeys: ['STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY', 'STRIPE_WEBHOOK_SECRET'],
      consoleUrl: 'https://dashboard.stripe.com/apikeys',
      rotationGuide: 'Créez de nouvelles clés dans Developers > API keys',
    },
    {
      name: 'PayPal',
      envKeys: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'],
      consoleUrl: 'https://developer.paypal.com/dashboard/applications',
      rotationGuide: 'Créez une nouvelle app ou régénérez les credentials',
    },
    {
      name: 'Twilio',
      envKeys: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'],
      consoleUrl: 'https://console.twilio.com/us1/account/keys-credentials/api-keys',
      rotationGuide: 'Générez un nouveau Auth Token dans Account > Keys & Credentials',
    },
    {
      name: 'Zoho',
      envKeys: ['ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET', 'ZOHO_REFRESH_TOKEN'],
      consoleUrl: 'https://api-console.zoho.com/',
      rotationGuide: 'Créez un nouveau client dans API Console',
    },
    {
      name: 'SendGrid',
      envKeys: ['SENDGRID_API_KEY'],
      consoleUrl: 'https://app.sendgrid.com/settings/api_keys',
      rotationGuide: 'Créez une nouvelle API Key et supprimez l\'ancienne',
    },
    {
      name: 'Firebase Admin',
      envKeys: ['FIREBASE_SERVICE_ACCOUNT', 'GOOGLE_APPLICATION_CREDENTIALS'],
      consoleUrl: 'https://console.firebase.google.com/project/sos-urgently-ac307/settings/serviceaccounts/adminsdk',
      rotationGuide: 'Générez une nouvelle clé privée pour le service account',
    },
  ],

  // -------------------------------------------------------------------------
  // FICHIERS À VÉRIFIER
  // -------------------------------------------------------------------------
  filesToCheck: [
    '../sos/.env',
    '../sos/.env.local',
    '../sos/.env.production',
    '../functions/.env',
    '../functions/.env.local',
  ],

  // -------------------------------------------------------------------------
  // LIENS UTILES FIREBASE/GOOGLE CLOUD
  // -------------------------------------------------------------------------
  consoleUrls: {
    firebaseConsole: 'https://console.firebase.google.com/project/sos-urgently-ac307',
    iamAdmin: 'https://console.cloud.google.com/iam-admin/iam?project=sos-urgently-ac307',
    serviceAccounts: 'https://console.cloud.google.com/iam-admin/serviceaccounts?project=sos-urgently-ac307',
    apiCredentials: 'https://console.cloud.google.com/apis/credentials?project=sos-urgently-ac307',
    appCheck: 'https://console.firebase.google.com/project/sos-urgently-ac307/appcheck',
    auditLogs: 'https://console.cloud.google.com/logs/query?project=sos-urgently-ac307',
    securityRules: 'https://console.firebase.google.com/project/sos-urgently-ac307/firestore/rules',
  },

  // -------------------------------------------------------------------------
  // CHEMINS DES FICHIERS
  // -------------------------------------------------------------------------
  paths: {
    reports: './reports',
    backups: './backups',
    templates: './templates',
  },
};

export default CONFIG;
