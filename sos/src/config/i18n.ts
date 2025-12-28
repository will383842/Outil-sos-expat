// src/config/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import subscriptionTranslations from '../i18n/locales/subscription.json';

// Merge subscription translations with main resources
const resources = {
  fr: {
    translation: {
      "availability": {
        "reminderMessage": "N'oubliez pas que vous êtes en ligne !",
        "reminder": {
          "title": "Rappel de disponibilité",
          "message": "Vous êtes toujours en ligne. Souhaitez-vous rester disponible ?",
          "actions": {
            "stayOnline": "Rester en ligne",
            "goOffline": "Passer hors ligne",
            "disableToday": "Ne plus me le rappeler aujourd'hui"
          }
        },
        "status": {
          "online": "En ligne",
          "offline": "Hors ligne"
        },
        "actions": {
          "goOnline": "Se mettre en ligne",
          "goOffline": "Se mettre hors ligne"
        },
        "errors": {
          "notApproved": "Votre profil n'est pas encore validé par l'administration.",
          "updateFailed": "Échec de la mise à jour du statut.",
          "syncFailed": "Échec de synchronisation avec Firestore."
        }
      },
      "common": {
        "refresh": "Rafraîchir",
        "back": "Retour",
        "client": "Client",
        "connecting": "Connexion...",
        "consultation": "Consultation",
        "days": "jours",
        "error": "Erreur",
        "loadMore": "Charger plus",
        "none": "Aucun",
        "retry": "Réessayer",
        "viewAll": "Voir tout"
      },
      "profileValidation": {
        "pending": {
          "title": "Profil en cours de validation",
          "description": "Votre profil est actuellement en cours d'examen par notre équipe. Cette étape est nécessaire pour garantir la qualité de notre plateforme et la sécurité de nos utilisateurs.",
          "whatHappensNow": "📋 Que se passe-t-il maintenant ?",
          "steps": {
            "teamVerifies": "Notre équipe vérifie les informations de votre profil",
            "emailNotification": "Vous recevrez un email dès que votre profil sera approuvé",
            "profileVisible": "Une fois approuvé, votre profil sera visible par tous les clients"
          },
          "validationTime": "Temps de validation habituel :"
        },
        "rejected": {
          "title": "Profil non validé",
          "description": "Malheureusement, votre profil n'a pas pu être approuvé pour le moment.",
          "rejectionReason": "📝 Raison du rejet :",
          "contactSupport": "Contacter le support",
          "editProfile": "Modifier mon profil"
        }
      },
      "kyc": {
        "verified": {
          "title": "Compte vérifié !",
          "description": "Vous pouvez maintenant recevoir des paiements de la part des clients."
        }
      },
      "admin": {
        "ia": {
          "title": "Outil IA",
          "description": "Gestion complète de l'assistant IA pour les prestataires",
          "tabs": {
            "dashboard": "Tableau de bord",
            "access": "Accès Prestataires",
            "quotas": "Quotas",
            "multiProviders": "Multi-Prestataires",
            "pricing": "Tarification",
            "trialConfig": "Config Essai",
            "logs": "Logs IA"
          },
          "dashboard": {
            "totalProviders": "Total prestataires",
            "inTrial": "En essai gratuit",
            "subscribers": "Abonnés payants",
            "mrr": "MRR",
            "tierDistribution": "Distribution par tier",
            "quickActions": "Actions rapides",
            "manageAccess": "Gérer les accès IA",
            "manageQuotas": "Modifier les quotas",
            "managePlans": "Gérer les plans"
          },
          "access": {
            "title": "Accès Prestataires",
            "description": "Gérer l'accès IA des prestataires",
            "searchPlaceholder": "Rechercher par nom ou email...",
            "filterAll": "Tous les accès",
            "filterSubscription": "Abonnement",
            "filterTrial": "Essai",
            "filterAdmin": "Accès admin",
            "filterNone": "Sans accès",
            "allTypes": "Tous les types",
            "lawyers": "Avocats",
            "expats": "Expatriés",
            "displayed": "prestataire(s) affiché(s)",
            "provider": "Prestataire",
            "type": "Type",
            "accessStatus": "Statut accès",
            "quota": "Quota IA",
            "adminAccess": "Accès admin",
            "actions": "Actions",
            "lawyer": "Avocat",
            "expat": "Expatrié",
            "subscription": "Abonnement",
            "trial": "Essai",
            "forced": "Accès admin",
            "none": "Aucun",
            "until": "jusqu'au",
            "grantAccess": "Donner accès admin",
            "revokeAccess": "Retirer accès admin",
            "grantTrial7": "Donner 7 jours d'essai",
            "grantTrial30": "Donner 30 jours d'essai",
            "accessGranted": "Accès accordé pour",
            "accessRevoked": "Accès retiré pour",
            "trialGranted": "Essai de {{days}} jours accordé à"
          },
          "quotas": {
            "title": "Quotas & Utilisation",
            "totalCalls": "Total appels IA",
            "activeProviders": "Prestataires actifs",
            "nearLimit": "Proche limite (>80%)",
            "exceeded": "Quota dépassé",
            "searchPlaceholder": "Rechercher par nom ou email...",
            "filterNearLimit": "Proche limite",
            "filterExceeded": "Dépassé",
            "provider": "Prestataire",
            "usage": "Usage",
            "limit": "Limite",
            "progress": "Progression",
            "lastCall": "Dernier appel",
            "quotaUpdated": "Quota mis à jour",
            "quotaReset": "Quota réinitialisé pour",
            "reset": "Reset"
          },
          "multiProviders": {
            "title": "Multi-Prestataires",
            "description": "Permet à un utilisateur de gérer plusieurs profils prestataires depuis un seul compte",
            "linkProvider": "Lier un prestataire",
            "accountsWithLinks": "Comptes avec liens",
            "multiProvider2": "Multi-prestataires (2+)",
            "multiProvider3": "3+ prestataires",
            "totalLinks": "Total liens",
            "minFilter": "Minimum :",
            "min1": "1+ prestataire",
            "min2": "2+ prestataires",
            "min3": "3+ prestataires",
            "accountsDisplayed": "compte(s) affiché(s)",
            "noAccounts": "Aucun compte multi-prestataires trouvé",
            "useButton": "Utilisez le bouton \"Lier un prestataire\" pour créer un lien",
            "linkedProviders": "Prestataires liés :",
            "addProvider": "Ajouter un prestataire",
            "active": "Actif",
            "setActive": "Définir actif",
            "unlinkProvider": "Délier ce prestataire",
            "step1": "Sélectionner le compte utilisateur",
            "step2": "Sélectionner le prestataire à lier",
            "searchUser": "Rechercher un utilisateur (compte principal)",
            "searchUserPlaceholder": "Email ou nom...",
            "searchProvider": "Rechercher un prestataire à lier",
            "searchProviderPlaceholder": "Nom du cabinet, email...",
            "selectedAccount": "Compte sélectionné :",
            "noResults": "Aucun résultat",
            "minChars": "Tapez au moins 2 caractères pour rechercher",
            "back": "Retour",
            "cancel": "Annuler",
            "linkThis": "Lier ce prestataire",
            "alreadyLinked": "Ce prestataire est déjà lié à ce compte",
            "linkSuccess": "Prestataire lié avec succès",
            "unlinkSuccess": "Prestataire délié",
            "cannotUnlinkLast": "Impossible de retirer le dernier prestataire",
            "activeUpdated": "Prestataire actif mis à jour"
          },
          "pricing": {
            "title": "Tarification",
            "cloudFunctionsWarning": "Cloud Functions non déployées",
            "cloudFunctionsDesc": "Les fonctions backend suivantes doivent être déployées pour activer les actions Stripe :",
            "cloudFunctionsNote": "Les données peuvent être consultées, mais les modifications via Stripe échoueront.",
            "saveSuccess": "Modifications enregistrées avec succès",
            "noPlans": "Aucun plan configuré. Cliquez pour initialiser les plans par défaut.",
            "initPlans": "Initialiser les plans",
            "stripeActions": "Actions Stripe",
            "createMonthly": "Créer prix mensuels Stripe",
            "createAnnual": "Créer prix annuels Stripe",
            "lawyerPlans": "Plans Avocats",
            "expatPlans": "Plans Expatriés Aidants",
            "noPlanConfigured": "Aucun plan configuré",
            "unlimited": "Illimité",
            "callsPerMonth": "appels/mois",
            "monthlyPrice": "Prix Mensuel",
            "annualPrice": "Prix Annuel",
            "customPrice": "Prix personnalisé",
            "annualEur": "EUR annuel (€)",
            "annualUsd": "USD annuel ($)",
            "savings": "Économie",
            "aiCallsLabel": "Nombre d'appels IA par mois (-1 = illimité)",
            "stripePriceIds": "Stripe Price IDs",
            "monthly": "Mensuel",
            "annual": "Annuel",
            "notConfigured": "Non configuré",
            "saveChanges": "Enregistrer les modifications"
          },
          "trialConfig": {
            "title": "Configuration Essai",
            "cloudFunctionWarning": "Cloud Function non déployée",
            "cloudFunctionDesc": "La fonction subscriptionUpdateTrialConfig doit être déployée pour sauvegarder la configuration d'essai.",
            "firestoreNote": "La remise annuelle peut être modifiée directement via Firestore.",
            "trialPeriod": "Période d'essai",
            "trialEnabled": "Essai gratuit activé",
            "trialDuration": "Durée de l'essai (jours)",
            "trialCalls": "Nombre d'appels IA gratuits",
            "currentConfig": "Configuration actuelle :",
            "days": "jours",
            "freeCalls": "appels gratuits",
            "enabled": "Activé",
            "disabled": "Désactivé",
            "lastModified": "Dernière modification :",
            "save": "Enregistrer",
            "annualDiscount": "Remise Annuelle",
            "discountPercent": "Pourcentage de remise (%)",
            "discountDesc": "Remise appliquée sur le prix mensuel x 12 pour l'abonnement annuel",
            "example": "Exemple avec un plan à 49€/mois :",
            "priceWithoutDiscount": "Prix annuel sans remise : 588€",
            "saveDiscount": "Enregistrer la remise"
          },
          "logs": {
            "title": "Logs d'utilisation IA",
            "today": "Aujourd'hui",
            "days7": "7 jours",
            "days30": "30 jours",
            "apply": "Appliquer",
            "totalCalls": "Total appels",
            "successful": "Réussis",
            "failed": "Échoués",
            "avgTime": "Temps moyen",
            "totalCost": "Coût total",
            "byProvider": "Par provider:",
            "date": "Date",
            "user": "User",
            "provider": "Provider",
            "tokens": "Tokens",
            "time": "Temps",
            "status": "Statut",
            "noLogs": "Aucun log pour cette période",
            "limitedDisplay": "Affichage limité aux 100 premiers résultats"
          },
          "common": {
            "loading": "Chargement...",
            "noResults": "Aucun résultat trouvé",
            "error": "Erreur",
            "errorLoading": "Erreur lors du chargement",
            "errorSaving": "Erreur lors de la sauvegarde",
            "errorUpdating": "Erreur lors de la mise à jour",
            "save": "Enregistrer",
            "cancel": "Annuler",
            "close": "Fermer",
            "search": "Rechercher",
            "searching": "Recherche..."
          }
        }
      },
      "subscription": {
        "title": "Mon Abonnement",
        "description": "Gérez votre abonnement et suivez votre utilisation",
        "plans": {
          "title": "Choisissez votre plan",
          "description": "Sélectionnez le plan qui correspond à vos besoins",
          "basic": "Basique",
          "standard": "Standard",
          "pro": "Professionnel",
          "unlimited": "Illimité"
        },
        "billing": {
          "monthly": "Mensuel",
          "yearly": "Annuel",
          "perMonth": "/mois",
          "perYear": "/an",
          "billedAnnually": "Facturé annuellement",
          "save": "Économisez"
        },
        "trial": {
          "title": "Essai gratuit",
          "description": "30 jours d'essai avec 3 appels IA gratuits",
          "startTrial": "Commencer l'essai gratuit",
          "noCreditCard": "Pas de carte de crédit requise",
          "daysRemaining": "jours restants"
        },
        "calls": {
          "thisMonth": "Appels ce mois",
          "total": "Total appels",
          "unlimited": "Illimité",
          "perMonth": "par mois"
        },
        "actions": {
          "upgrade": "Passer à ce plan",
          "downgrade": "Rétrograder",
          "current": "Plan actuel",
          "cancel": "Annuler l'abonnement",
          "reactivate": "Réactiver",
          "manageBilling": "Gérer la facturation"
        },
        "invoices": {
          "title": "Factures",
          "recent": "Factures récentes",
          "noInvoices": "Aucune facture",
          "period": "Période",
          "amount": "Montant",
          "status": "Statut",
          "paid": "Payée",
          "pending": "En attente",
          "download": "Télécharger"
        },
        "success": {
          "title": "Félicitations !",
          "description": "Votre abonnement est maintenant actif",
          "startUsing": "Commencer à utiliser l'IA",
          "viewSubscription": "Voir mon abonnement"
        }
      }
    }
  },
  en: {
    translation: {
      "availability": {
        "reminderMessage": "Don't forget you're online!",
        "reminder": {
          "title": "Availability Reminder",
          "message": "You're still online. Would you like to stay available?",
          "actions": {
            "stayOnline": "Stay Online",
            "goOffline": "Go Offline",
            "disableToday": "Don't remind me today"
          }
        },
        "status": {
          "online": "Online",
          "offline": "Offline"
        },
        "actions": {
          "goOnline": "Go Online",
          "goOffline": "Go Offline"
        },
        "errors": {
          "notApproved": "Your profile has not yet been approved by the administration.",
          "updateFailed": "Failed to update status.",
          "syncFailed": "Failed to sync with Firestore."
        }
      },
      "common": {
        "refresh": "Refresh",
        "back": "Back",
        "client": "Client",
        "connecting": "Connecting...",
        "consultation": "Consultation",
        "days": "days",
        "error": "Error",
        "loadMore": "Load more",
        "none": "None",
        "retry": "Retry",
        "viewAll": "View all"
      },
      "profileValidation": {
        "pending": {
          "title": "Profile Under Review",
          "description": "Your profile is currently being reviewed by our team. This step is necessary to ensure the quality of our platform and the security of our users.",
          "whatHappensNow": "📋 What happens now?",
          "steps": {
            "teamVerifies": "Our team verifies your profile information",
            "emailNotification": "You will receive an email as soon as your profile is approved",
            "profileVisible": "Once approved, your profile will be visible to all clients"
          },
          "validationTime": "Usual validation time:"
        },
        "rejected": {
          "title": "Profile Not Validated",
          "description": "Unfortunately, your profile could not be approved at this time.",
          "rejectionReason": "📝 Rejection reason:",
          "contactSupport": "Contact Support",
          "editProfile": "Edit My Profile"
        }
      },
      "kyc": {
        "verified": {
          "title": "Account Verified!",
          "description": "You can now receive payments from clients."
        }
      },
      "admin": {
        "ia": {
          "title": "AI Tool",
          "description": "Complete AI assistant management for providers",
          "tabs": {
            "dashboard": "Dashboard",
            "access": "Provider Access",
            "quotas": "Quotas",
            "multiProviders": "Multi-Providers",
            "pricing": "Pricing",
            "trialConfig": "Trial Config",
            "logs": "AI Logs"
          },
          "dashboard": {
            "totalProviders": "Total providers",
            "inTrial": "In free trial",
            "subscribers": "Paid subscribers",
            "mrr": "MRR",
            "tierDistribution": "Tier distribution",
            "quickActions": "Quick actions",
            "manageAccess": "Manage AI access",
            "manageQuotas": "Modify quotas",
            "managePlans": "Manage plans"
          },
          "access": {
            "title": "Provider Access",
            "description": "Manage provider AI access",
            "searchPlaceholder": "Search by name or email...",
            "filterAll": "All access",
            "filterSubscription": "Subscription",
            "filterTrial": "Trial",
            "filterAdmin": "Admin access",
            "filterNone": "No access",
            "allTypes": "All types",
            "lawyers": "Lawyers",
            "expats": "Expats",
            "displayed": "provider(s) displayed",
            "provider": "Provider",
            "type": "Type",
            "accessStatus": "Access status",
            "quota": "AI Quota",
            "adminAccess": "Admin access",
            "actions": "Actions",
            "lawyer": "Lawyer",
            "expat": "Expat",
            "subscription": "Subscription",
            "trial": "Trial",
            "forced": "Admin access",
            "none": "None",
            "until": "until",
            "grantAccess": "Grant admin access",
            "revokeAccess": "Revoke admin access",
            "grantTrial7": "Grant 7-day trial",
            "grantTrial30": "Grant 30-day trial",
            "accessGranted": "Access granted for",
            "accessRevoked": "Access revoked for",
            "trialGranted": "{{days}}-day trial granted to"
          },
          "quotas": {
            "title": "Quotas & Usage",
            "totalCalls": "Total AI calls",
            "activeProviders": "Active providers",
            "nearLimit": "Near limit (>80%)",
            "exceeded": "Quota exceeded",
            "searchPlaceholder": "Search by name or email...",
            "filterNearLimit": "Near limit",
            "filterExceeded": "Exceeded",
            "provider": "Provider",
            "usage": "Usage",
            "limit": "Limit",
            "progress": "Progress",
            "lastCall": "Last call",
            "quotaUpdated": "Quota updated",
            "quotaReset": "Quota reset for",
            "reset": "Reset"
          },
          "multiProviders": {
            "title": "Multi-Providers",
            "description": "Allows a user to manage multiple provider profiles from a single account",
            "linkProvider": "Link a provider",
            "accountsWithLinks": "Accounts with links",
            "multiProvider2": "Multi-providers (2+)",
            "multiProvider3": "3+ providers",
            "totalLinks": "Total links",
            "minFilter": "Minimum:",
            "min1": "1+ provider",
            "min2": "2+ providers",
            "min3": "3+ providers",
            "accountsDisplayed": "account(s) displayed",
            "noAccounts": "No multi-provider accounts found",
            "useButton": "Use the \"Link a provider\" button to create a link",
            "linkedProviders": "Linked providers:",
            "addProvider": "Add a provider",
            "active": "Active",
            "setActive": "Set active",
            "unlinkProvider": "Unlink this provider",
            "step1": "Select user account",
            "step2": "Select provider to link",
            "searchUser": "Search for a user (main account)",
            "searchUserPlaceholder": "Email or name...",
            "searchProvider": "Search for a provider to link",
            "searchProviderPlaceholder": "Firm name, email...",
            "selectedAccount": "Selected account:",
            "noResults": "No results",
            "minChars": "Type at least 2 characters to search",
            "back": "Back",
            "cancel": "Cancel",
            "linkThis": "Link this provider",
            "alreadyLinked": "This provider is already linked to this account",
            "linkSuccess": "Provider linked successfully",
            "unlinkSuccess": "Provider unlinked",
            "cannotUnlinkLast": "Cannot remove the last provider",
            "activeUpdated": "Active provider updated"
          },
          "pricing": {
            "title": "Pricing",
            "cloudFunctionsWarning": "Cloud Functions not deployed",
            "cloudFunctionsDesc": "The following backend functions must be deployed to enable Stripe actions:",
            "cloudFunctionsNote": "Data can be viewed, but Stripe modifications will fail.",
            "saveSuccess": "Changes saved successfully",
            "noPlans": "No plans configured. Click to initialize default plans.",
            "initPlans": "Initialize plans",
            "stripeActions": "Stripe Actions",
            "createMonthly": "Create monthly Stripe prices",
            "createAnnual": "Create annual Stripe prices",
            "lawyerPlans": "Lawyer Plans",
            "expatPlans": "Expat Helper Plans",
            "noPlanConfigured": "No plan configured",
            "unlimited": "Unlimited",
            "callsPerMonth": "calls/month",
            "monthlyPrice": "Monthly Price",
            "annualPrice": "Annual Price",
            "customPrice": "Custom price",
            "annualEur": "Annual EUR (€)",
            "annualUsd": "Annual USD ($)",
            "savings": "Savings",
            "aiCallsLabel": "AI calls per month (-1 = unlimited)",
            "stripePriceIds": "Stripe Price IDs",
            "monthly": "Monthly",
            "annual": "Annual",
            "notConfigured": "Not configured",
            "saveChanges": "Save changes"
          },
          "trialConfig": {
            "title": "Trial Configuration",
            "cloudFunctionWarning": "Cloud Function not deployed",
            "cloudFunctionDesc": "The subscriptionUpdateTrialConfig function must be deployed to save trial configuration.",
            "firestoreNote": "Annual discount can be modified directly via Firestore.",
            "trialPeriod": "Trial period",
            "trialEnabled": "Free trial enabled",
            "trialDuration": "Trial duration (days)",
            "trialCalls": "Number of free AI calls",
            "currentConfig": "Current configuration:",
            "days": "days",
            "freeCalls": "free calls",
            "enabled": "Enabled",
            "disabled": "Disabled",
            "lastModified": "Last modified:",
            "save": "Save",
            "annualDiscount": "Annual Discount",
            "discountPercent": "Discount percentage (%)",
            "discountDesc": "Discount applied to monthly price x 12 for annual subscription",
            "example": "Example with a plan at €49/month:",
            "priceWithoutDiscount": "Annual price without discount: €588",
            "saveDiscount": "Save discount"
          },
          "logs": {
            "title": "AI Usage Logs",
            "today": "Today",
            "days7": "7 days",
            "days30": "30 days",
            "apply": "Apply",
            "totalCalls": "Total calls",
            "successful": "Successful",
            "failed": "Failed",
            "avgTime": "Avg time",
            "totalCost": "Total cost",
            "byProvider": "By provider:",
            "date": "Date",
            "user": "User",
            "provider": "Provider",
            "tokens": "Tokens",
            "time": "Time",
            "status": "Status",
            "noLogs": "No logs for this period",
            "limitedDisplay": "Display limited to first 100 results"
          },
          "common": {
            "loading": "Loading...",
            "noResults": "No results found",
            "error": "Error",
            "errorLoading": "Error loading",
            "errorSaving": "Error saving",
            "errorUpdating": "Error updating",
            "save": "Save",
            "cancel": "Cancel",
            "close": "Close",
            "search": "Search",
            "searching": "Searching..."
          }
        }
      },
      "subscription": {
        "title": "My Subscription",
        "description": "Manage your subscription and track your usage",
        "plans": {
          "title": "Choose Your Plan",
          "description": "Select the plan that fits your needs",
          "basic": "Basic",
          "standard": "Standard",
          "pro": "Professional",
          "unlimited": "Unlimited"
        },
        "billing": {
          "monthly": "Monthly",
          "yearly": "Yearly",
          "perMonth": "/month",
          "perYear": "/year",
          "billedAnnually": "Billed annually",
          "save": "Save"
        },
        "trial": {
          "title": "Free Trial",
          "description": "30-day trial with 3 free AI calls",
          "startTrial": "Start Free Trial",
          "noCreditCard": "No credit card required",
          "daysRemaining": "days remaining"
        },
        "calls": {
          "thisMonth": "Calls this month",
          "total": "Total calls",
          "unlimited": "Unlimited",
          "perMonth": "per month"
        },
        "actions": {
          "upgrade": "Upgrade to this plan",
          "downgrade": "Downgrade",
          "current": "Current plan",
          "cancel": "Cancel subscription",
          "reactivate": "Reactivate",
          "manageBilling": "Manage billing"
        },
        "invoices": {
          "title": "Invoices",
          "recent": "Recent invoices",
          "noInvoices": "No invoices",
          "period": "Period",
          "amount": "Amount",
          "status": "Status",
          "paid": "Paid",
          "pending": "Pending",
          "download": "Download"
        },
        "success": {
          "title": "Congratulations!",
          "description": "Your subscription is now active",
          "startUsing": "Start using AI",
          "viewSubscription": "View my subscription"
        }
      }
    }
  },
  es: {
    translation: {
      "availability": {
        "reminderMessage": "¡No olvides que estás en línea!",
        "reminder": {
          "title": "Recordatorio de disponibilidad",
          "message": "Sigues en línea. ¿Deseas permanecer disponible?",
          "actions": {
            "stayOnline": "Permanecer en línea",
            "goOffline": "Pasar a desconectado",
            "disableToday": "No recordarme hoy"
          }
        },
        "status": {
          "online": "En línea",
          "offline": "Desconectado"
        },
        "actions": {
          "goOnline": "Ponerse en línea",
          "goOffline": "Pasar a desconectado"
        },
        "errors": {
          "notApproved": "Su perfil aún no ha sido aprobado por la administración.",
          "updateFailed": "Error al actualizar el estado.",
          "syncFailed": "Error de sincronización con Firestore."
        }
      },
      "common": {
        "refresh": "Actualizar",
        "back": "Volver",
        "client": "Cliente",
        "connecting": "Conectando...",
        "consultation": "Consulta",
        "days": "días",
        "error": "Error",
        "loadMore": "Cargar más",
        "none": "Ninguno",
        "retry": "Reintentar",
        "viewAll": "Ver todo"
      },
      "profileValidation": {
        "pending": {
          "title": "Perfil en proceso de validación",
          "description": "Su perfil está siendo revisado por nuestro equipo. Este paso es necesario para garantizar la calidad de nuestra plataforma y la seguridad de nuestros usuarios.",
          "whatHappensNow": "📋 ¿Qué sucede ahora?",
          "steps": {
            "teamVerifies": "Nuestro equipo verifica la información de su perfil",
            "emailNotification": "Recibirá un correo electrónico tan pronto como su perfil sea aprobado",
            "profileVisible": "Una vez aprobado, su perfil será visible para todos los clientes"
          },
          "validationTime": "Tiempo de validación habitual:"
        },
        "rejected": {
          "title": "Perfil no validado",
          "description": "Desafortunadamente, su perfil no pudo ser aprobado en este momento.",
          "rejectionReason": "📝 Razón del rechazo:",
          "contactSupport": "Contactar soporte",
          "editProfile": "Editar mi perfil"
        }
      },
      "kyc": {
        "verified": {
          "title": "¡Cuenta verificada!",
          "description": "Ahora puede recibir pagos de los clientes."
        }
      },
      "admin": {
        "ia": {
          "title": "Herramienta IA",
          "description": "Gestión completa del asistente IA para proveedores",
          "tabs": {
            "dashboard": "Panel",
            "access": "Acceso Proveedores",
            "quotas": "Cuotas",
            "multiProviders": "Multi-Proveedores",
            "pricing": "Precios",
            "trialConfig": "Config Prueba",
            "logs": "Logs IA"
          },
          "common": {
            "loading": "Cargando...",
            "noResults": "Sin resultados",
            "error": "Error",
            "errorLoading": "Error al cargar",
            "errorSaving": "Error al guardar",
            "save": "Guardar",
            "cancel": "Cancelar"
          }
        }
      },
      "subscription": {
        "title": "Mi Suscripción",
        "description": "Gestiona tu suscripción y controla tu uso",
        "plans": {
          "title": "Elige tu plan",
          "description": "Selecciona el plan que mejor se adapte a tus necesidades",
          "basic": "Básico",
          "standard": "Estándar",
          "pro": "Profesional",
          "unlimited": "Ilimitado"
        },
        "billing": {
          "monthly": "Mensual",
          "yearly": "Anual",
          "perMonth": "/mes",
          "perYear": "/año",
          "billedAnnually": "Facturado anualmente",
          "save": "Ahorra"
        },
        "trial": {
          "title": "Prueba gratuita",
          "description": "30 días de prueba con 3 llamadas IA gratis",
          "startTrial": "Iniciar prueba gratuita",
          "noCreditCard": "No se requiere tarjeta de crédito",
          "daysRemaining": "días restantes"
        },
        "calls": {
          "thisMonth": "Llamadas este mes",
          "total": "Total llamadas",
          "unlimited": "Ilimitado",
          "perMonth": "por mes"
        },
        "actions": {
          "upgrade": "Actualizar a este plan",
          "downgrade": "Bajar de plan",
          "current": "Plan actual",
          "cancel": "Cancelar suscripción",
          "reactivate": "Reactivar",
          "manageBilling": "Gestionar facturación"
        },
        "invoices": {
          "title": "Facturas",
          "recent": "Facturas recientes",
          "noInvoices": "Sin facturas",
          "period": "Período",
          "amount": "Monto",
          "status": "Estado",
          "paid": "Pagada",
          "pending": "Pendiente",
          "download": "Descargar"
        },
        "success": {
          "title": "¡Felicitaciones!",
          "description": "Tu suscripción está ahora activa",
          "startUsing": "Empezar a usar IA",
          "viewSubscription": "Ver mi suscripción"
        }
      }
    }
  },
  ru: {
    translation: {
      "availability": {
        "reminderMessage": "Не забудьте, что вы в сети!",
        "reminder": {
          "title": "Напоминание о доступности",
          "message": "Вы все еще в сети. Хотите остаться доступным?",
          "actions": {
            "stayOnline": "Остаться в сети",
            "goOffline": "Перейти в офлайн",
            "disableToday": "Не напоминать мне сегодня"
          }
        },
        "status": {
          "online": "В сети",
          "offline": "Не в сети"
        },
        "actions": {
          "goOnline": "Войти в сеть",
          "goOffline": "Выйти из сети"
        },
        "errors": {
          "notApproved": "Ваш профиль еще не одобрен администрацией.",
          "updateFailed": "Не удалось обновить статус.",
          "syncFailed": "Ошибка синхронизации с Firestore."
        }
      },
      "common": {
        "refresh": "Обновить",
        "back": "Назад",
        "client": "Клиент",
        "connecting": "Подключение...",
        "consultation": "Консультация",
        "days": "дней",
        "error": "Ошибка",
        "loadMore": "Загрузить ещё",
        "none": "Нет",
        "retry": "Повторить",
        "viewAll": "Смотреть все"
      },
      "profileValidation": {
        "pending": {
          "title": "Профиль на проверке",
          "description": "Ваш профиль в настоящее время проверяется нашей командой. Этот шаг необходим для обеспечения качества нашей платформы и безопасности наших пользователей.",
          "whatHappensNow": "📋 Что происходит сейчас?",
          "steps": {
            "teamVerifies": "Наша команда проверяет информацию вашего профиля",
            "emailNotification": "Вы получите электронное письмо, как только ваш профиль будет одобрен",
            "profileVisible": "После одобрения ваш профиль будет виден всем клиентам"
          },
          "validationTime": "Обычное время проверки:"
        },
        "rejected": {
          "title": "Профиль не подтвержден",
          "description": "К сожалению, ваш профиль не может быть одобрен в данный момент.",
          "rejectionReason": "📝 Причина отклонения:",
          "contactSupport": "Связаться с поддержкой",
          "editProfile": "Редактировать мой профиль"
        }
      },
      "kyc": {
        "verified": {
          "title": "Аккаунт подтвержден!",
          "description": "Теперь вы можете получать платежи от клиентов."
        }
      },
      "admin": {
        "ia": {
          "title": "Инструмент ИИ",
          "description": "Полное управление ИИ-ассистентом для провайдеров",
          "tabs": {
            "dashboard": "Панель",
            "access": "Доступ провайдеров",
            "quotas": "Квоты",
            "multiProviders": "Мульти-провайдеры",
            "pricing": "Цены",
            "trialConfig": "Настройка пробного периода",
            "logs": "Логи ИИ"
          },
          "common": {
            "loading": "Загрузка...",
            "noResults": "Результаты не найдены",
            "error": "Ошибка",
            "errorLoading": "Ошибка загрузки",
            "errorSaving": "Ошибка сохранения",
            "save": "Сохранить",
            "cancel": "Отмена"
          }
        }
      },
      "subscription": {
        "title": "Моя подписка",
        "description": "Управляйте подпиской и отслеживайте использование",
        "plans": {
          "title": "Выберите план",
          "description": "Выберите план, который соответствует вашим потребностям",
          "basic": "Базовый",
          "standard": "Стандартный",
          "pro": "Профессиональный",
          "unlimited": "Безлимитный"
        },
        "billing": {
          "monthly": "Ежемесячно",
          "yearly": "Ежегодно",
          "perMonth": "/месяц",
          "perYear": "/год",
          "billedAnnually": "Оплачивается ежегодно",
          "save": "Экономия"
        },
        "trial": {
          "title": "Бесплатная пробная версия",
          "description": "30-дневная пробная версия с 3 бесплатными вызовами ИИ",
          "startTrial": "Начать бесплатную пробную версию",
          "noCreditCard": "Кредитная карта не требуется",
          "daysRemaining": "дней осталось"
        },
        "calls": {
          "thisMonth": "Звонки в этом месяце",
          "total": "Всего звонков",
          "unlimited": "Неограниченно",
          "perMonth": "в месяц"
        },
        "actions": {
          "upgrade": "Перейти на этот план",
          "downgrade": "Понизить план",
          "current": "Текущий план",
          "cancel": "Отменить подписку",
          "reactivate": "Реактивировать",
          "manageBilling": "Управление оплатой"
        },
        "invoices": {
          "title": "Счета",
          "recent": "Последние счета",
          "noInvoices": "Нет счетов",
          "period": "Период",
          "amount": "Сумма",
          "status": "Статус",
          "paid": "Оплачено",
          "pending": "В ожидании",
          "download": "Скачать"
        },
        "success": {
          "title": "Поздравляем!",
          "description": "Ваша подписка теперь активна",
          "startUsing": "Начать использовать ИИ",
          "viewSubscription": "Посмотреть подписку"
        }
      }
    }
  },
  de: {
    translation: {
      "availability": {
        "reminderMessage": "Vergessen Sie nicht, dass Sie online sind!",
        "reminder": {
          "title": "Verfügbarkeitserinnerung",
          "message": "Sie sind noch online. Möchten Sie verfügbar bleiben?",
          "actions": {
            "stayOnline": "Online bleiben",
            "goOffline": "Offline gehen",
            "disableToday": "Heute nicht mehr erinnern"
          }
        },
        "status": {
          "online": "Online",
          "offline": "Offline"
        },
        "actions": {
          "goOnline": "Online gehen",
          "goOffline": "Offline gehen"
        },
        "errors": {
          "notApproved": "Ihr Profil wurde noch nicht von der Verwaltung genehmigt.",
          "updateFailed": "Status konnte nicht aktualisiert werden.",
          "syncFailed": "Fehler bei der Synchronisation mit Firestore."
        }
      },
      "common": {
        "refresh": "Aktualisieren",
        "back": "Zurück",
        "client": "Kunde",
        "connecting": "Verbinden...",
        "consultation": "Beratung",
        "days": "Tage",
        "error": "Fehler",
        "loadMore": "Mehr laden",
        "none": "Keine",
        "retry": "Wiederholen",
        "viewAll": "Alle anzeigen"
      },
      "profileValidation": {
        "pending": {
          "title": "Profil wird überprüft",
          "description": "Ihr Profil wird derzeit von unserem Team überprüft. Dieser Schritt ist notwendig, um die Qualität unserer Plattform und die Sicherheit unserer Benutzer zu gewährleisten.",
          "whatHappensNow": "📋 Was passiert jetzt?",
          "steps": {
            "teamVerifies": "Unser Team überprüft Ihre Profilinformationen",
            "emailNotification": "Sie erhalten eine E-Mail, sobald Ihr Profil genehmigt wurde",
            "profileVisible": "Nach der Genehmigung ist Ihr Profil für alle Kunden sichtbar"
          },
          "validationTime": "Übliche Validierungszeit:"
        },
        "rejected": {
          "title": "Profil nicht validiert",
          "description": "Leider konnte Ihr Profil derzeit nicht genehmigt werden.",
          "rejectionReason": "📝 Ablehnungsgrund:",
          "contactSupport": "Support kontaktieren",
          "editProfile": "Mein Profil bearbeiten"
        }
      },
      "kyc": {
        "verified": {
          "title": "Konto verifiziert!",
          "description": "Sie können jetzt Zahlungen von Kunden erhalten."
        }
      },
      "admin": {
        "ia": {
          "title": "KI-Werkzeug",
          "description": "Vollständige KI-Assistent-Verwaltung für Anbieter",
          "tabs": {
            "dashboard": "Dashboard",
            "access": "Anbieterzugang",
            "quotas": "Kontingente",
            "multiProviders": "Multi-Anbieter",
            "pricing": "Preise",
            "trialConfig": "Testversion-Konfig",
            "logs": "KI-Logs"
          },
          "common": {
            "loading": "Laden...",
            "noResults": "Keine Ergebnisse",
            "error": "Fehler",
            "errorLoading": "Fehler beim Laden",
            "errorSaving": "Fehler beim Speichern",
            "save": "Speichern",
            "cancel": "Abbrechen"
          }
        }
      },
      "subscription": {
        "title": "Mein Abonnement",
        "description": "Verwalten Sie Ihr Abonnement und verfolgen Sie Ihre Nutzung",
        "plans": {
          "title": "Wählen Sie Ihren Plan",
          "description": "Wählen Sie den Plan, der Ihren Bedürfnissen entspricht",
          "basic": "Basis",
          "standard": "Standard",
          "pro": "Professionell",
          "unlimited": "Unbegrenzt"
        },
        "billing": {
          "monthly": "Monatlich",
          "yearly": "Jährlich",
          "perMonth": "/Monat",
          "perYear": "/Jahr",
          "billedAnnually": "Jährlich abgerechnet",
          "save": "Sparen Sie"
        },
        "trial": {
          "title": "Kostenlose Testversion",
          "description": "30-tägige Testversion mit 3 kostenlosen KI-Anrufen",
          "startTrial": "Kostenlose Testversion starten",
          "noCreditCard": "Keine Kreditkarte erforderlich",
          "daysRemaining": "Tage verbleibend"
        },
        "calls": {
          "thisMonth": "Anrufe diesen Monat",
          "total": "Gesamtanrufe",
          "unlimited": "Unbegrenzt",
          "perMonth": "pro Monat"
        },
        "actions": {
          "upgrade": "Zu diesem Plan wechseln",
          "downgrade": "Herabstufen",
          "current": "Aktueller Plan",
          "cancel": "Abonnement kündigen",
          "reactivate": "Reaktivieren",
          "manageBilling": "Abrechnung verwalten"
        },
        "invoices": {
          "title": "Rechnungen",
          "recent": "Letzte Rechnungen",
          "noInvoices": "Keine Rechnungen",
          "period": "Zeitraum",
          "amount": "Betrag",
          "status": "Status",
          "paid": "Bezahlt",
          "pending": "Ausstehend",
          "download": "Herunterladen"
        },
        "success": {
          "title": "Herzlichen Glückwunsch!",
          "description": "Ihr Abonnement ist jetzt aktiv",
          "startUsing": "KI nutzen starten",
          "viewSubscription": "Mein Abonnement anzeigen"
        }
      }
    }
  },
  hi: {
    translation: {
      "availability": {
        "reminderMessage": "मत भूलें कि आप ऑनलाइन हैं!",
        "reminder": {
          "title": "उपलब्धता अनुस्मारक",
          "message": "आप अभी भी ऑनलाइन हैं। क्या आप उपलब्ध रहना चाहेंगे?",
          "actions": {
            "stayOnline": "ऑनलाइन रहें",
            "goOffline": "ऑफ़लाइन जाएं",
            "disableToday": "आज मुझे याद न दिलाएं"
          }
        },
        "status": {
          "online": "ऑनलाइन",
          "offline": "ऑफ़लाइन"
        },
        "actions": {
          "goOnline": "ऑनलाइन जाएं",
          "goOffline": "ऑफ़लाइन जाएं"
        },
        "errors": {
          "notApproved": "आपकी प्रोफ़ाइल अभी तक प्रशासन द्वारा अनुमोदित नहीं की गई है।",
          "updateFailed": "स्थिति अपडेट करने में विफल।",
          "syncFailed": "Firestore के साथ सिंक करने में विफल।"
        }
      },
      "common": {
        "refresh": "ताज़ा करें",
        "back": "वापस",
        "client": "ग्राहक",
        "connecting": "कनेक्ट हो रहा है...",
        "consultation": "परामर्श",
        "days": "दिन",
        "error": "त्रुटि",
        "loadMore": "और लोड करें",
        "none": "कोई नहीं",
        "retry": "पुनः प्रयास करें",
        "viewAll": "सभी देखें"
      },
      "profileValidation": {
        "pending": {
          "title": "प्रोफ़ाइल सत्यापनाधीन है",
          "description": "आपकी प्रोफ़ाइल वर्तमान में हमारी टीम द्वारा जांची जा रही है। यह कदम हमारे प्लेटफ़ॉर्म की गुणवत्ता और हमारे उपयोगकर्ताओं की सुरक्षा सुनिश्चित करने के लिए आवश्यक है।",
          "whatHappensNow": "📋 अब क्या होगा?",
          "steps": {
            "teamVerifies": "हमारी टीम आपकी प्रोफ़ाइल की जानकारी सत्यापित करती है",
            "emailNotification": "आपकी प्रोफ़ाइल स्वीकृत होते ही आपको एक ईमेल प्राप्त होगा",
            "profileVisible": "एक बार स्वीकृत होने के बाद, आपकी प्रोफ़ाइल सभी ग्राहकों को दिखाई देगी"
          },
          "validationTime": "सामान्य सत्यापन समय:"
        },
        "rejected": {
          "title": "प्रोफ़ाइल सत्यापित नहीं",
          "description": "दुर्भाग्य से, आपकी प्रोफ़ाइल इस समय स्वीकृत नहीं की जा सकी।",
          "rejectionReason": "📝 अस्वीकृति का कारण:",
          "contactSupport": "सहायता से संपर्क करें",
          "editProfile": "मेरी प्रोफ़ाइल संपादित करें"
        }
      },
      "kyc": {
        "verified": {
          "title": "खाता सत्यापित!",
          "description": "अब आप ग्राहकों से भुगतान प्राप्त कर सकते हैं।"
        }
      },
      "admin": {
        "ia": {
          "title": "AI उपकरण",
          "description": "प्रदाताओं के लिए संपूर्ण AI सहायक प्रबंधन",
          "tabs": {
            "dashboard": "डैशबोर्ड",
            "access": "प्रदाता पहुंच",
            "quotas": "कोटा",
            "multiProviders": "मल्टी-प्रदाता",
            "pricing": "मूल्य निर्धारण",
            "trialConfig": "परीक्षण कॉन्फ़िग",
            "logs": "AI लॉग"
          },
          "common": {
            "loading": "लोड हो रहा है...",
            "noResults": "कोई परिणाम नहीं",
            "error": "त्रुटि",
            "errorLoading": "लोड करने में त्रुटि",
            "errorSaving": "सहेजने में त्रुटि",
            "save": "सहेजें",
            "cancel": "रद्द करें"
          }
        }
      },
      "subscription": {
        "title": "मेरी सदस्यता",
        "description": "अपनी सदस्यता प्रबंधित करें और अपने उपयोग को ट्रैक करें",
        "plans": {
          "title": "अपनी योजना चुनें",
          "description": "वह योजना चुनें जो आपकी आवश्यकताओं के अनुरूप हो",
          "basic": "बेसिक",
          "standard": "स्टैंडर्ड",
          "pro": "प्रोफेशनल",
          "unlimited": "अनलिमिटेड"
        },
        "billing": {
          "monthly": "मासिक",
          "yearly": "वार्षिक",
          "perMonth": "/माह",
          "perYear": "/वर्ष",
          "billedAnnually": "वार्षिक बिलिंग",
          "save": "बचाएं"
        },
        "trial": {
          "title": "नि:शुल्क परीक्षण",
          "description": "3 मुफ्त AI कॉल के साथ 30-दिवसीय परीक्षण",
          "startTrial": "नि:शुल्क परीक्षण शुरू करें",
          "noCreditCard": "क्रेडिट कार्ड आवश्यक नहीं",
          "daysRemaining": "दिन बाकी"
        },
        "calls": {
          "thisMonth": "इस महीने कॉल",
          "total": "कुल कॉल",
          "unlimited": "असीमित",
          "perMonth": "प्रति माह"
        },
        "actions": {
          "upgrade": "इस योजना में अपग्रेड करें",
          "downgrade": "डाउनग्रेड",
          "current": "वर्तमान योजना",
          "cancel": "सदस्यता रद्द करें",
          "reactivate": "पुनः सक्रिय करें",
          "manageBilling": "बिलिंग प्रबंधित करें"
        },
        "invoices": {
          "title": "चालान",
          "recent": "हाल के चालान",
          "noInvoices": "कोई चालान नहीं",
          "period": "अवधि",
          "amount": "राशि",
          "status": "स्थिति",
          "paid": "भुगतान किया",
          "pending": "लंबित",
          "download": "डाउनलोड"
        },
        "success": {
          "title": "बधाई हो!",
          "description": "आपकी सदस्यता अब सक्रिय है",
          "startUsing": "AI का उपयोग शुरू करें",
          "viewSubscription": "मेरी सदस्यता देखें"
        }
      }
    }
  },
  pt: {
    translation: {
      "availability": {
        "reminderMessage": "Não se esqueça de que você está online!",
        "reminder": {
          "title": "Lembrete de disponibilidade",
          "message": "Você ainda está online. Gostaria de permanecer disponível?",
          "actions": {
            "stayOnline": "Permanecer online",
            "goOffline": "Ficar offline",
            "disableToday": "Não me lembrar hoje"
          }
        },
        "status": {
          "online": "Online",
          "offline": "Offline"
        },
        "actions": {
          "goOnline": "Ficar online",
          "goOffline": "Ficar offline"
        },
        "errors": {
          "notApproved": "Seu perfil ainda não foi aprovado pela administração.",
          "updateFailed": "Falha ao atualizar o status.",
          "syncFailed": "Falha na sincronização com Firestore."
        }
      },
      "common": {
        "refresh": "Atualizar",
        "back": "Voltar",
        "client": "Cliente",
        "connecting": "Conectando...",
        "consultation": "Consulta",
        "days": "dias",
        "error": "Erro",
        "loadMore": "Carregar mais",
        "none": "Nenhum",
        "retry": "Tentar novamente",
        "viewAll": "Ver tudo"
      },
      "profileValidation": {
        "pending": {
          "title": "Perfil em validação",
          "description": "Seu perfil está sendo revisado por nossa equipe. Esta etapa é necessária para garantir a qualidade de nossa plataforma e a segurança de nossos usuários.",
          "whatHappensNow": "📋 O que acontece agora?",
          "steps": {
            "teamVerifies": "Nossa equipe verifica as informações do seu perfil",
            "emailNotification": "Você receberá um e-mail assim que seu perfil for aprovado",
            "profileVisible": "Uma vez aprovado, seu perfil será visível para todos os clientes"
          },
          "validationTime": "Tempo de validação usual:"
        },
        "rejected": {
          "title": "Perfil não validado",
          "description": "Infelizmente, seu perfil não pôde ser aprovado no momento.",
          "rejectionReason": "📝 Motivo da rejeição:",
          "contactSupport": "Contatar suporte",
          "editProfile": "Editar meu perfil"
        }
      },
      "kyc": {
        "verified": {
          "title": "Conta verificada!",
          "description": "Agora você pode receber pagamentos de clientes."
        }
      },
      "admin": {
        "ia": {
          "title": "Ferramenta IA",
          "description": "Gestão completa do assistente IA para provedores",
          "tabs": {
            "dashboard": "Painel",
            "access": "Acesso Provedores",
            "quotas": "Cotas",
            "multiProviders": "Multi-Provedores",
            "pricing": "Preços",
            "trialConfig": "Config Teste",
            "logs": "Logs IA"
          },
          "common": {
            "loading": "Carregando...",
            "noResults": "Sem resultados",
            "error": "Erro",
            "errorLoading": "Erro ao carregar",
            "errorSaving": "Erro ao salvar",
            "save": "Salvar",
            "cancel": "Cancelar"
          }
        }
      },
      "subscription": {
        "title": "Minha Assinatura",
        "description": "Gerencie sua assinatura e acompanhe seu uso",
        "plans": {
          "title": "Escolha seu plano",
          "description": "Selecione o plano que atende às suas necessidades",
          "basic": "Básico",
          "standard": "Padrão",
          "pro": "Profissional",
          "unlimited": "Ilimitado"
        },
        "billing": {
          "monthly": "Mensal",
          "yearly": "Anual",
          "perMonth": "/mês",
          "perYear": "/ano",
          "billedAnnually": "Cobrado anualmente",
          "save": "Economize"
        },
        "trial": {
          "title": "Teste gratuito",
          "description": "30 dias de teste com 3 chamadas IA grátis",
          "startTrial": "Iniciar teste gratuito",
          "noCreditCard": "Não é necessário cartão de crédito",
          "daysRemaining": "dias restantes"
        },
        "calls": {
          "thisMonth": "Chamadas este mês",
          "total": "Total de chamadas",
          "unlimited": "Ilimitado",
          "perMonth": "por mês"
        },
        "actions": {
          "upgrade": "Atualizar para este plano",
          "downgrade": "Fazer downgrade",
          "current": "Plano atual",
          "cancel": "Cancelar assinatura",
          "reactivate": "Reativar",
          "manageBilling": "Gerenciar cobrança"
        },
        "invoices": {
          "title": "Faturas",
          "recent": "Faturas recentes",
          "noInvoices": "Sem faturas",
          "period": "Período",
          "amount": "Valor",
          "status": "Status",
          "paid": "Pago",
          "pending": "Pendente",
          "download": "Baixar"
        },
        "success": {
          "title": "Parabéns!",
          "description": "Sua assinatura está ativa",
          "startUsing": "Começar a usar IA",
          "viewSubscription": "Ver minha assinatura"
        }
      }
    }
  },
  ch: {
    translation: {
      "availability": {
        "reminderMessage": "不要忘记您在线！",
        "reminder": {
          "title": "可用性提醒",
          "message": "您仍然在线。您想保持可用吗？",
          "actions": {
            "stayOnline": "保持在线",
            "goOffline": "切换离线",
            "disableToday": "今天不再提醒我"
          }
        },
        "status": {
          "online": "在线",
          "offline": "离线"
        },
        "actions": {
          "goOnline": "上线",
          "goOffline": "离线"
        },
        "errors": {
          "notApproved": "您的个人资料尚未获得管理部门的批准。",
          "updateFailed": "更新状态失败。",
          "syncFailed": "与 Firestore 同步失败。"
        }
      },
      "common": {
        "refresh": "刷新",
        "back": "返回",
        "client": "客户",
        "connecting": "连接中...",
        "consultation": "咨询",
        "days": "天",
        "error": "错误",
        "loadMore": "加载更多",
        "none": "无",
        "retry": "重试",
        "viewAll": "查看全部"
      },
      "profileValidation": {
        "pending": {
          "title": "个人资料审核中",
          "description": "您的个人资料目前正在由我们的团队审核。此步骤对于确保我们平台的质量和用户的安全是必要的。",
          "whatHappensNow": "📋 现在会发生什么？",
          "steps": {
            "teamVerifies": "我们的团队正在验证您的个人资料信息",
            "emailNotification": "一旦您的个人资料获得批准，您将收到一封电子邮件",
            "profileVisible": "一旦获得批准，您的个人资料将对所有客户可见"
          },
          "validationTime": "通常验证时间："
        },
        "rejected": {
          "title": "个人资料未通过验证",
          "description": "很抱歉，您的个人资料目前无法获得批准。",
          "rejectionReason": "📝 拒绝原因：",
          "contactSupport": "联系支持",
          "editProfile": "编辑我的个人资料"
        }
      },
      "kyc": {
        "verified": {
          "title": "账户已验证！",
          "description": "您现在可以接收客户的付款。"
        }
      },
      "admin": {
        "ia": {
          "title": "AI工具",
          "description": "供应商的完整AI助手管理",
          "tabs": {
            "dashboard": "仪表板",
            "access": "供应商访问",
            "quotas": "配额",
            "multiProviders": "多供应商",
            "pricing": "定价",
            "trialConfig": "试用配置",
            "logs": "AI日志"
          },
          "common": {
            "loading": "加载中...",
            "noResults": "无结果",
            "error": "错误",
            "errorLoading": "加载错误",
            "errorSaving": "保存错误",
            "save": "保存",
            "cancel": "取消"
          }
        }
      },
      "subscription": {
        "title": "我的订阅",
        "description": "管理您的订阅并跟踪您的使用情况",
        "plans": {
          "title": "选择您的计划",
          "description": "选择适合您需求的计划",
          "basic": "基础版",
          "standard": "标准版",
          "pro": "专业版",
          "unlimited": "无限版"
        },
        "billing": {
          "monthly": "每月",
          "yearly": "每年",
          "perMonth": "/月",
          "perYear": "/年",
          "billedAnnually": "按年计费",
          "save": "节省"
        },
        "trial": {
          "title": "免费试用",
          "description": "30天试用，含3次免费AI通话",
          "startTrial": "开始免费试用",
          "noCreditCard": "无需信用卡",
          "daysRemaining": "天剩余"
        },
        "calls": {
          "thisMonth": "本月通话",
          "total": "总通话数",
          "unlimited": "无限制",
          "perMonth": "每月"
        },
        "actions": {
          "upgrade": "升级到此计划",
          "downgrade": "降级",
          "current": "当前计划",
          "cancel": "取消订阅",
          "reactivate": "重新激活",
          "manageBilling": "管理账单"
        },
        "invoices": {
          "title": "发票",
          "recent": "最近的发票",
          "noInvoices": "没有发票",
          "period": "期间",
          "amount": "金额",
          "status": "状态",
          "paid": "已付款",
          "pending": "待处理",
          "download": "下载"
        },
        "success": {
          "title": "恭喜！",
          "description": "您的订阅现已激活",
          "startUsing": "开始使用AI",
          "viewSubscription": "查看我的订阅"
        }
      }
    }
  },
  ar: {
    translation: {
      "availability": {
        "reminderMessage": "لا تنس أنك متصل!",
        "reminder": {
          "title": "تذكير التوفر",
          "message": "ما زلت متصلاً. هل تريد البقاء متاحاً؟",
          "actions": {
            "stayOnline": "البقاء متصلاً",
            "goOffline": "الانتقال إلى وضع عدم الاتصال",
            "disableToday": "لا تذكرني اليوم"
          }
        },
        "status": {
          "online": "متصل",
          "offline": "غير متصل"
        },
        "actions": {
          "goOnline": "الاتصال",
          "goOffline": "قطع الاتصال"
        },
        "errors": {
          "notApproved": "لم تتم الموافقة على ملفك الشخصي بعد من قبل الإدارة.",
          "updateFailed": "فشل تحديث الحالة.",
          "syncFailed": "فشل المزامنة مع Firestore."
        }
      },
      "common": {
        "refresh": "تحديث",
        "back": "رجوع",
        "client": "عميل",
        "connecting": "جاري الاتصال...",
        "consultation": "استشارة",
        "days": "أيام",
        "error": "خطأ",
        "loadMore": "تحميل المزيد",
        "none": "لا شيء",
        "retry": "إعادة المحاولة",
        "viewAll": "عرض الكل"
      },
      "profileValidation": {
        "pending": {
          "title": "الملف الشخصي قيد المراجعة",
          "description": "ملفك الشخصي قيد المراجعة حاليًا من قبل فريقنا. هذه الخطوة ضرورية لضمان جودة منصتنا وأمان مستخدمينا.",
          "whatHappensNow": "📋 ماذا يحدث الآن؟",
          "steps": {
            "teamVerifies": "فريقنا يتحقق من معلومات ملفك الشخصي",
            "emailNotification": "ستتلقى بريدًا إلكترونيًا بمجرد الموافقة على ملفك الشخصي",
            "profileVisible": "بمجرد الموافقة عليه، سيكون ملفك الشخصي مرئيًا لجميع العملاء"
          },
          "validationTime": "وقت التحقق المعتاد:"
        },
        "rejected": {
          "title": "الملف الشخصي غير معتمد",
          "description": "للأسف، لم يتم اعتماد ملفك الشخصي في هذا الوقت.",
          "rejectionReason": "📝 سبب الرفض:",
          "contactSupport": "اتصل بالدعم",
          "editProfile": "تعديل ملفي الشخصي"
        }
      },
      "kyc": {
        "verified": {
          "title": "تم التحقق من الحساب!",
          "description": "يمكنك الآن تلقي المدفوعات من العملاء."
        }
      },
      "admin": {
        "ia": {
          "title": "أداة الذكاء الاصطناعي",
          "description": "إدارة كاملة لمساعد الذكاء الاصطناعي للمزودين",
          "tabs": {
            "dashboard": "لوحة التحكم",
            "access": "وصول المزودين",
            "quotas": "الحصص",
            "multiProviders": "متعدد المزودين",
            "pricing": "التسعير",
            "trialConfig": "إعدادات التجربة",
            "logs": "سجلات AI"
          },
          "common": {
            "loading": "جاري التحميل...",
            "noResults": "لا توجد نتائج",
            "error": "خطأ",
            "errorLoading": "خطأ في التحميل",
            "errorSaving": "خطأ في الحفظ",
            "save": "حفظ",
            "cancel": "إلغاء"
          }
        }
      },
      "subscription": {
        "title": "اشتراكي",
        "description": "إدارة اشتراكك وتتبع استخدامك",
        "plans": {
          "title": "اختر خطتك",
          "description": "اختر الخطة التي تناسب احتياجاتك",
          "basic": "أساسي",
          "standard": "قياسي",
          "pro": "احترافي",
          "unlimited": "غير محدود"
        },
        "billing": {
          "monthly": "شهري",
          "yearly": "سنوي",
          "perMonth": "/شهر",
          "perYear": "/سنة",
          "billedAnnually": "يُفوتر سنويًا",
          "save": "وفّر"
        },
        "trial": {
          "title": "تجربة مجانية",
          "description": "30 يومًا تجريبيًا مع 3 مكالمات ذكاء اصطناعي مجانية",
          "startTrial": "ابدأ التجربة المجانية",
          "noCreditCard": "لا حاجة لبطاقة ائتمان",
          "daysRemaining": "أيام متبقية"
        },
        "calls": {
          "thisMonth": "المكالمات هذا الشهر",
          "total": "إجمالي المكالمات",
          "unlimited": "غير محدود",
          "perMonth": "شهريًا"
        },
        "actions": {
          "upgrade": "الترقية إلى هذه الخطة",
          "downgrade": "تخفيض الخطة",
          "current": "الخطة الحالية",
          "cancel": "إلغاء الاشتراك",
          "reactivate": "إعادة التفعيل",
          "manageBilling": "إدارة الفوترة"
        },
        "invoices": {
          "title": "الفواتير",
          "recent": "الفواتير الأخيرة",
          "noInvoices": "لا توجد فواتير",
          "period": "الفترة",
          "amount": "المبلغ",
          "status": "الحالة",
          "paid": "مدفوعة",
          "pending": "قيد الانتظار",
          "download": "تنزيل"
        },
        "success": {
          "title": "تهانينا!",
          "description": "اشتراكك نشط الآن",
          "startUsing": "ابدأ استخدام الذكاء الاصطناعي",
          "viewSubscription": "عرض اشتراكي"
        }
      }
    }
  }
};

// Merge subscription translations from external JSON file
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mergedResources: Record<string, { translation: any }> = {};
const langs = ['fr', 'en', 'es', 'ru', 'de', 'hi', 'pt', 'ch', 'ar'] as const;

for (const lang of langs) {
  const subTrans = (subscriptionTranslations as Record<string, { subscription?: object; aiAssistant?: object }>)[lang];
  mergedResources[lang] = {
    translation: {
      ...resources[lang].translation,
      // Merge subscription translations (more complete version from JSON)
      subscription: {
        ...resources[lang].translation.subscription,
        ...(subTrans?.subscription || {})
      },
      aiAssistant: subTrans?.aiAssistant || {}
    }
  };
}

// Add languages from subscription.json that are not in main resources (it, nl, etc.)
const additionalLangs = Object.keys(subscriptionTranslations).filter(
  lang => !langs.includes(lang as typeof langs[number])
);

for (const lang of additionalLangs) {
  const subTrans = (subscriptionTranslations as Record<string, { subscription?: object; aiAssistant?: object }>)[lang];
  mergedResources[lang] = {
    translation: {
      subscription: subTrans?.subscription || {},
      aiAssistant: subTrans?.aiAssistant || {}
    }
  };
}

i18n
  .use(initReactI18next)
  .init({
    resources: mergedResources,
    lng: 'fr',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
