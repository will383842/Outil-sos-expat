/**
 * Templates d'emails pour le système de Dunning
 * SOS-Expat Platform
 *
 * Ces templates sont utilisés par le système de dunning pour envoyer
 * des emails automatiques lors des échecs de paiement.
 *
 * À configurer dans MailWizz/SendGrid avec les IDs correspondants.
 */

export interface DunningEmailContent {
  subject: {
    fr: string;
    en: string;
  };
  body: {
    fr: string;
    en: string;
  };
  cta: {
    fr: string;
    en: string;
  };
}

// ============================================================================
// TEMPLATE 1: Payment Failed (J+1)
// ============================================================================
export const PAYMENT_FAILED_TEMPLATE: DunningEmailContent = {
  subject: {
    fr: '[SOS-Expat] Problème avec votre paiement',
    en: '[SOS-Expat] Issue with your payment',
  },
  body: {
    fr: `Bonjour {{FNAME}},

Nous avons rencontré un problème lors du traitement de votre paiement de {{AMOUNT}} {{CURRENCY}} pour votre abonnement SOS-Expat.

Cela peut arriver pour plusieurs raisons :
• Fonds insuffisants sur votre compte
• Carte expirée
• Limite de paiement atteinte

Nous tenterons automatiquement un nouveau prélèvement dans 2 jours.

Pour éviter toute interruption de service, nous vous recommandons de mettre à jour vos informations de paiement dès maintenant.`,
    en: `Hello {{FNAME}},

We encountered an issue processing your payment of {{AMOUNT}} {{CURRENCY}} for your SOS-Expat subscription.

This can happen for several reasons:
• Insufficient funds
• Expired card
• Payment limit reached

We will automatically retry the payment in 2 days.

To avoid any service interruption, we recommend updating your payment information now.`,
  },
  cta: {
    fr: 'Mettre à jour mes informations de paiement',
    en: 'Update my payment information',
  },
};

// ============================================================================
// TEMPLATE 2: Action Required (J+3)
// ============================================================================
export const ACTION_REQUIRED_TEMPLATE: DunningEmailContent = {
  subject: {
    fr: '[SOS-Expat] Action requise - Mise à jour de paiement',
    en: '[SOS-Expat] Action required - Payment update needed',
  },
  body: {
    fr: `Bonjour {{FNAME}},

Malgré notre nouvelle tentative, nous n'avons toujours pas pu prélever le paiement de {{AMOUNT}} {{CURRENCY}} pour votre abonnement.

⚠️ Votre accès à l'outil IA pourrait être suspendu si le problème n'est pas résolu.

Veuillez mettre à jour vos informations de paiement dans les 48 heures pour continuer à bénéficier de :
• L'assistant IA Claude/GPT-4o
• La recherche web Perplexity
• Toutes les fonctionnalités de votre abonnement

Une dernière tentative sera effectuée dans 2 jours.`,
    en: `Hello {{FNAME}},

Despite our retry attempt, we still couldn't process your payment of {{AMOUNT}} {{CURRENCY}} for your subscription.

⚠️ Your access to the AI tool may be suspended if this issue is not resolved.

Please update your payment information within 48 hours to continue enjoying:
• Claude/GPT-4o AI assistant
• Perplexity web search
• All your subscription features

A final attempt will be made in 2 days.`,
  },
  cta: {
    fr: 'Résoudre maintenant',
    en: 'Resolve now',
  },
};

// ============================================================================
// TEMPLATE 3: Final Attempt (J+5)
// ============================================================================
export const FINAL_ATTEMPT_TEMPLATE: DunningEmailContent = {
  subject: {
    fr: '[SOS-Expat] Dernière tentative de paiement',
    en: '[SOS-Expat] Final payment attempt',
  },
  body: {
    fr: `Bonjour {{FNAME}},

🚨 DERNIÈRE TENTATIVE DE PAIEMENT

C'est notre dernière tentative pour prélever {{AMOUNT}} {{CURRENCY}} sur votre compte.

Si ce paiement échoue, votre compte sera suspendu dans 48 heures et vous perdrez l'accès à :
• L'outil IA SOS-Expat
• Vos conversations en cours
• Toutes les fonctionnalités premium

Pour éviter cela, mettez à jour vos informations de paiement MAINTENANT.`,
    en: `Hello {{FNAME}},

🚨 FINAL PAYMENT ATTEMPT

This is our last attempt to process {{AMOUNT}} {{CURRENCY}} from your account.

If this payment fails, your account will be suspended within 48 hours and you will lose access to:
• SOS-Expat AI tool
• Your ongoing conversations
• All premium features

To avoid this, update your payment information NOW.`,
  },
  cta: {
    fr: 'Mettre à jour maintenant',
    en: 'Update now',
  },
};

// ============================================================================
// TEMPLATE 4: Account Suspended (J+7)
// ============================================================================
export const ACCOUNT_SUSPENDED_TEMPLATE: DunningEmailContent = {
  subject: {
    fr: '[SOS-Expat] Votre compte a été suspendu',
    en: '[SOS-Expat] Your account has been suspended',
  },
  body: {
    fr: `Bonjour {{FNAME}},

Nous sommes désolés de vous informer que votre compte SOS-Expat a été suspendu suite à l'échec répété des paiements.

Montant impayé : {{AMOUNT}} {{CURRENCY}}

Ce que cela signifie :
❌ Accès à l'outil IA désactivé
❌ Nouvelles conversations impossibles
❌ Fonctionnalités premium indisponibles

Bonne nouvelle : Vous pouvez réactiver votre compte à tout moment en régularisant votre paiement. Vos données et conversations sont conservées.

Si vous souhaitez annuler définitivement votre abonnement, aucune action n'est requise.`,
    en: `Hello {{FNAME}},

We regret to inform you that your SOS-Expat account has been suspended due to repeated payment failures.

Outstanding amount: {{AMOUNT}} {{CURRENCY}}

What this means:
❌ AI tool access disabled
❌ New conversations unavailable
❌ Premium features inaccessible

Good news: You can reactivate your account at any time by completing your payment. Your data and conversations are preserved.

If you wish to permanently cancel your subscription, no action is required.`,
  },
  cta: {
    fr: 'Réactiver mon compte',
    en: 'Reactivate my account',
  },
};

// ============================================================================
// TEMPLATE IDs for MailWizz/SendGrid
// ============================================================================
export const DUNNING_TEMPLATE_IDS = {
  payment_failed: {
    fr: 'TR_PRV_dunning-payment-failed_fr',
    en: 'TR_PRV_dunning-payment-failed_en',
  },
  action_required: {
    fr: 'TR_PRV_dunning-action-required_fr',
    en: 'TR_PRV_dunning-action-required_en',
  },
  final_attempt: {
    fr: 'TR_PRV_dunning-final-attempt_fr',
    en: 'TR_PRV_dunning-final-attempt_en',
  },
  account_suspended: {
    fr: 'TR_PRV_dunning-account-suspended_fr',
    en: 'TR_PRV_dunning-account-suspended_en',
  },
};

// ============================================================================
// Variables disponibles dans les templates
// ============================================================================
export const DUNNING_TEMPLATE_VARIABLES = {
  FNAME: 'Prénom du prestataire',
  LNAME: 'Nom du prestataire',
  AMOUNT: 'Montant dû (ex: 49.00)',
  CURRENCY: 'Devise (EUR ou USD)',
  INVOICE_URL: 'URL de la facture Stripe',
  UPDATE_PAYMENT_URL: 'URL pour mettre à jour le paiement',
  SUBSCRIPTION_PLAN: 'Nom du plan (Basic, Standard, Pro, Illimité)',
  NEXT_RETRY_DATE: 'Date de la prochaine tentative',
};
