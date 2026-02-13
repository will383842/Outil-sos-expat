#!/usr/bin/env node
/**
 * ADD INFLUENCER MISSING TRANSLATIONS
 *
 * Ajoute les 124 clés manquantes dans les 9 langues (FR, EN, ES, DE, RU, PT, CH, HI, AR)
 * Basé sur l'audit INFLUENCER_MISSING_KEYS.json
 */

const fs = require('fs');
const path = require('path');

const HELPER_DIR = path.join(__dirname, '..', 'src', 'helper');
const MISSING_KEYS_PATH = path.join(__dirname, '..', '..', 'INFLUENCER_MISSING_KEYS.json');

const LANGUAGES = ['fr', 'en', 'es', 'de', 'ru', 'pt', 'ch', 'hi', 'ar'];

// Traductions de référence (FR et EN)
const NEW_TRANSLATIONS = {
  // === ACTIVITY ===
  "influencer.activity.empty": {
    fr: "Aucune activité récente",
    en: "No recent activity",
  },
  "influencer.activity.emptyHint": {
    fr: "Vos dernières commissions apparaîtront ici",
    en: "Your recent commissions will appear here",
  },
  "influencer.activity.footer": {
    fr: "Voir l'historique complet",
    en: "View full history",
  },
  "influencer.activity.subtitle": {
    fr: "Vos dernières commissions en temps réel",
    en: "Your latest commissions in real-time",
  },
  "influencer.activity.title": {
    fr: "Activité récente",
    en: "Recent Activity",
  },

  // === DASHBOARD ===
  "influencer.dashboard.actions.leaderboard": {
    fr: "Classement",
    en: "Leaderboard",
  },
  "influencer.dashboard.bonusActive": {
    fr: "Bonus Top 3 actif : x{multiplier}",
    en: "Top 3 Bonus active: x{multiplier}",
  },
  "influencer.dashboard.info.partner": {
    fr: "par appel de vos partenaires (6 mois)",
    en: "per call from your partners (6 months)",
  },
  "influencer.dashboard.startSharing": {
    fr: "Commencer à partager",
    en: "Start Sharing",
  },

  // === EARNINGS ===
  "influencer.earnings.breakdownSubtitle": {
    fr: "Répartition de vos revenus par source",
    en: "Revenue breakdown by source",
  },
  "influencer.earnings.breakdownTitle": {
    fr: "Répartition des gains",
    en: "Earnings Breakdown",
  },
  "influencer.earnings.empty": {
    fr: "Aucune commission pour le moment",
    en: "No commissions yet",
  },
  "influencer.earnings.emptyDescription": {
    fr: "Commencez à partager vos liens pour gagner vos premières commissions",
    en: "Start sharing your links to earn your first commissions",
  },
  "influencer.earnings.emptyTitle": {
    fr: "Pas encore de gains",
    en: "No earnings yet",
  },
  "influencer.earnings.table.description": {
    fr: "Description",
    en: "Description",
  },

  // === HERO ===
  "influencer.hero.trust.4": {
    fr: "Pas de minimum abonnés",
    en: "No Min Followers",
  },

  // === LANDING VALUE ===
  "influencer.landing.seo.description": {
    fr: "Devenez Influenceur SOS-Expat et gagnez $10 par client référé. Outils promo, bannières et widgets inclus. Inscrivez-vous gratuitement.",
    en: "Become a SOS-Expat Influencer and earn $10 per referred client. Promo tools, banners, and widgets included. Sign up for free.",
  },
  "influencer.landing.seo.title": {
    fr: "Programme Influenceur SOS-Expat | Gagnez $10 par client",
    en: "SOS-Expat Influencer Program | Earn $10 per client",
  },
  "influencer.landing.value.badge": {
    fr: "Gagnant-Gagnant",
    en: "Win-Win",
  },
  "influencer.landing.value.problem1.desc": {
    fr: "Follower stressé : visa compliqué, ne comprend pas les documents, risque de refus.",
    en: "Stressed follower: complex visa, doesn't understand documents, risk of rejection.",
  },
  "influencer.landing.value.problem1.solution": {
    fr: "Votre vidéo explique les bases + lien vers avocat spécialisé pour aide détaillée. Follower guidé.",
    en: "Your video explains the basics + link to specialized lawyer for detailed help. Follower guided.",
  },
  "influencer.landing.value.problem1.title": {
    fr: "Bloqué dans démarches visa",
    en: "Stuck in visa process",
  },
  "influencer.landing.value.problem2.desc": {
    fr: "Follower vient d'arriver dans nouveau pays, tout est flou, ne sait pas par où commencer.",
    en: "Follower just arrived in new country, everything's unclear, doesn't know where to start.",
  },
  "influencer.landing.value.problem2.solution": {
    fr: "Votre content rassure + donne tips pratiques. Accès aide 24/7 + 5% réduction. Follower rassuré.",
    en: "Your content reassures + gives practical tips. 24/7 help access + 5% discount. Follower reassured.",
  },
  "influencer.landing.value.problem2.title": {
    fr: "Nouveau expat perdu",
    en: "Lost new expat",
  },
  "influencer.landing.value.problem3.desc": {
    fr: "Follower panique : contrôle demain, documents pas en règle, stress maximum.",
    en: "Follower panics: inspection tomorrow, documents not in order, maximum stress.",
  },
  "influencer.landing.value.problem3.solution": {
    fr: "Vous partagez votre expérience. Communauté + experts accessibles via votre lien. Urgence résolue.",
    en: "You share your experience. Community + experts accessible via your link. Emergency resolved.",
  },
  "influencer.landing.value.problem3.title": {
    fr: "Urgence administrative",
    en: "Administrative emergency",
  },
  "influencer.landing.value.problem4.desc": {
    fr: "Follower besoin aide légale mais cabinet classique = 500$/heure (trop cher).",
    en: "Follower needs legal help but traditional firm = $500/hour (too expensive).",
  },
  "influencer.landing.value.problem4.solution": {
    fr: "Tips gratuits dans vos vidéos + 5% réduction via VOTRE lien. Aide pro accessible. Follower reconnaissant.",
    en: "Free tips in your videos + 5% discount via YOUR link. Affordable pro help. Grateful follower.",
  },
  "influencer.landing.value.problem4.title": {
    fr: "Budget serré",
    en: "Tight budget",
  },
  "influencer.landing.value.solution": {
    fr: "Votre solution",
    en: "Your solution",
  },
  "influencer.landing.value.subtitle": {
    fr: "Vous ne vendez pas, vous AIDEZ. Votre contenu guide vos followers dans leur vie d'expat.",
    en: "You don't sell, you HELP. Your content guides your followers in their expat life.",
  },
  "influencer.landing.value.title": {
    fr: "Vous apportez de la VRAIE valeur",
    en: "You bring REAL value",
  },
  "influencer.landing.value.winwin.desc": {
    fr: "Chaque follower aidé = problème résolu + tips gratuits + 5% économisés + 10$ gagnés pour vous. Tout le monde gagne.",
    en: "Each follower helped = problem solved + free tips + 5% saved + $10 earned for you. Everyone wins.",
  },
  "influencer.landing.value.winwin.tag": {
    fr: "Contenu utile + Revenus récurrents",
    en: "Useful content + Recurring revenue",
  },
  "influencer.landing.value.winwin.title": {
    fr: "🎯 Vous créez du contenu utile. Vous aidez ET gagnez.",
    en: "🎯 You create useful content. You help AND earn.",
  },

  // === LEADERBOARD ===
  "influencer.leaderboard.bonus.rank1": {
    fr: "Bonus Top 1",
    en: "Top 1 bonus",
  },
  "influencer.leaderboard.bonus.rank2": {
    fr: "Bonus Top 2",
    en: "Top 2 bonus",
  },
  "influencer.leaderboard.bonus.rank3": {
    fr: "Bonus Top 3",
    en: "Top 3 bonus",
  },
  "influencer.leaderboard.clients": {
    fr: " clients",
    en: " clients",
  },
  "influencer.leaderboard.clientsShort": {
    fr: " réf.",
    en: " ref.",
  },
  "influencer.leaderboard.empty": {
    fr: "Pas encore de classement pour ce mois",
    en: "No rankings yet for this month",
  },
  "influencer.leaderboard.subtitle": {
    fr: "Top 10 des influenceurs - {month}",
    en: "Top 10 influencers - {month}",
  },
  "influencer.leaderboard.thisMonth": {
    fr: " ce mois",
    en: " this month",
  },
  "influencer.leaderboard.title": {
    fr: "Classement mensuel",
    en: "Monthly Leaderboard",
  },
  "influencer.leaderboard.you": {
    fr: "Vous",
    en: "You",
  },
  "influencer.leaderboard.yourPosition": {
    fr: "Votre position",
    en: "Your Position",
  },

  // === LEVEL ===
  "influencer.level.badges": {
    fr: "Badges débloqués",
    en: "Unlocked badges",
  },
  "influencer.level.maxReached": {
    fr: "Niveau maximum atteint !",
    en: "Maximum level reached!",
  },
  "influencer.level.progress": {
    fr: "Progression",
    en: "Progress",
  },
  "influencer.level.remaining": {
    fr: "{amount} restants pour le niveau {level}",
    en: "{amount} remaining for level {level}",
  },
  "influencer.level.title": {
    fr: "Votre niveau",
    en: "Your Level",
  },
  "influencer.level.totalEarned": {
    fr: "Total gagné",
    en: "Total Earned",
  },

  // === MENU ===
  "influencer.menu.resources": {
    fr: "Ressources",
    en: "Resources",
  },

  // === MOTIVATION ===
  "influencer.motivation.achievement.consistency": {
    fr: "🔥 Activité constante ! Continue comme ça.",
    en: "🔥 Consistent activity! Keep it up.",
  },
  "influencer.motivation.motivation.growth": {
    fr: "📈 Progression exceptionnelle ce mois-ci !",
    en: "📈 Outstanding progress this month!",
  },
  "influencer.motivation.next.ten": {
    fr: "Prochain palier : 10 clients (${amount})",
    en: "Next milestone: 10 clients (${amount})",
  },
  "influencer.motivation.protip.pinned": {
    fr: "💡 Épinglez votre lien en commentaire pour plus de visibilité",
    en: "💡 Pin your link in comments for more visibility",
  },
  "influencer.motivation.protip.youtube": {
    fr: "💡 Pro tip : Ajoutez votre lien dans les 3 premières lignes de description",
    en: "💡 Pro tip: Add your link in the first 3 lines of description",
  },
  "influencer.motivation.stat.weekly": {
    fr: "Moyenne hebdomadaire : {count} nouveaux clients",
    en: "Weekly average: {count} new clients",
  },
  "influencer.motivation.tip.instagram.bio": {
    fr: "💡 Astuce : Mettez votre lien en bio Instagram",
    en: "💡 Tip: Put your link in Instagram bio",
  },
  "influencer.motivation.tip.linktree": {
    fr: "💡 Utilisez Linktree pour centraliser vos liens",
    en: "💡 Use Linktree to centralize your links",
  },
  "influencer.motivation.tip.qr": {
    fr: "💡 Téléchargez votre QR code pour vos stories",
    en: "💡 Download your QR code for your stories",
  },
  "influencer.motivation.tip.stories": {
    fr: "💡 Partagez vos gains en stories pour motiver votre audience",
    en: "💡 Share your earnings in stories to motivate your audience",
  },

  // === PAYMENTS ===
  "influencer.payments.addMethod": {
    fr: "Ajouter une méthode de paiement",
    en: "Add a payment method",
  },
  "influencer.payments.addMethodHint": {
    fr: "Ajoutez une méthode pour pouvoir effectuer des retraits",
    en: "Add a method to make withdrawals",
  },
  "influencer.payments.addPaymentMethod": {
    fr: "Ajouter une méthode de paiement",
    en: "Add Payment Method",
  },
  "influencer.payments.availableBalance": {
    fr: "Disponible",
    en: "Available",
  },
  "influencer.payments.default": {
    fr: "Par défaut",
    en: "Default",
  },
  "influencer.payments.delete": {
    fr: "Supprimer",
    en: "Delete",
  },
  "influencer.payments.noMethods": {
    fr: "Aucune méthode de paiement enregistrée",
    en: "No payment method registered",
  },
  "influencer.payments.noTrackingData": {
    fr: "Impossible de charger les détails",
    en: "Unable to load details",
  },
  "influencer.payments.noWithdrawals": {
    fr: "Aucun retrait effectué",
    en: "No withdrawals made",
  },
  "influencer.payments.pendingBalance": {
    fr: "En attente",
    en: "Pending",
  },
  "influencer.payments.pendingWithdrawal": {
    fr: "Retrait en cours",
    en: "Withdrawal in progress",
  },
  "influencer.payments.selectWithdrawal": {
    fr: "Sélectionnez un retrait pour voir les détails",
    en: "Select a withdrawal to view details",
  },
  "influencer.payments.setDefault": {
    fr: "Définir par défaut",
    en: "Set as default",
  },
  "influencer.payments.subtitle": {
    fr: "Gérez vos gains et retraits",
    en: "Manage your earnings and withdrawals",
  },
  "influencer.payments.tab.history": {
    fr: "Historique",
    en: "History",
  },
  "influencer.payments.tab.methods": {
    fr: "Méthodes",
    en: "Methods",
  },
  "influencer.payments.tab.withdraw": {
    fr: "Retirer",
    en: "Withdraw",
  },
  "influencer.payments.title": {
    fr: "Mes paiements",
    en: "My Payments",
  },
  "influencer.payments.totalEarned": {
    fr: "Total gagné",
    en: "Total Earned",
  },
  "influencer.payments.trackWithdrawal": {
    fr: "Suivre",
    en: "Track",
  },
  "influencer.payments.trackingDetails": {
    fr: "Détails du suivi",
    en: "Tracking Details",
  },
  "influencer.payments.validatedBalance": {
    fr: "Validé",
    en: "Validated",
  },
  "influencer.payments.withdrawalHistory": {
    fr: "Historique des retraits",
    en: "Withdrawal History",
  },

  // === PROFILE ===
  "influencer.profile.bio": {
    fr: "Bio",
    en: "Bio",
  },
  "influencer.profile.clientCode": {
    fr: "Code client (5% remise)",
    en: "Client code (5% off)",
  },
  "influencer.profile.codes": {
    fr: "Codes d'affiliation",
    en: "Affiliate Codes",
  },
  "influencer.profile.country": {
    fr: "Pays",
    en: "Country",
  },
  "influencer.profile.email": {
    fr: "Email",
    en: "Email",
  },
  "influencer.profile.language": {
    fr: "Langue",
    en: "Language",
  },
  "influencer.profile.name": {
    fr: "Nom",
    en: "Name",
  },
  "influencer.profile.payment": {
    fr: "Paramètres de paiement",
    en: "Payment Settings",
  },
  "influencer.profile.paymentInfo": {
    fr: "Configurez votre méthode de paiement lors de votre première demande de retrait.",
    en: "Configure your payment method during your first withdrawal request.",
  },
  "influencer.profile.personal": {
    fr: "Informations personnelles",
    en: "Personal Information",
  },
  "influencer.profile.platforms": {
    fr: "Plateformes",
    en: "Platforms",
  },
  "influencer.profile.recruitCode": {
    fr: "Code recrutement",
    en: "Recruitment Code",
  },
  "influencer.profile.subtitle": {
    fr: "Gérez vos informations personnelles et paramètres de paiement",
    en: "Manage your personal information and payment settings",
  },
  "influencer.profile.title": {
    fr: "Mon profil",
    en: "My Profile",
  },

  // === REFERRALS ===
  "influencer.referrals.active": {
    fr: "Actif",
    en: "Active",
  },
  "influencer.referrals.activeCount": {
    fr: "Actifs",
    en: "Active",
  },
  "influencer.referrals.anonymous": {
    fr: "Prestataire",
    en: "Provider",
  },
  "influencer.referrals.calls": {
    fr: "appels",
    en: "calls",
  },
  "influencer.referrals.daysLeft": {
    fr: "jours",
    en: "days",
  },
  "influencer.referrals.duration": {
    fr: "pendant 6 mois après l'inscription",
    en: "for 6 months after registration",
  },
  "influencer.referrals.earned": {
    fr: "gagnés",
    en: "earned",
  },
  "influencer.referrals.empty.description": {
    fr: "Recrutez des avocats et helpers pour gagner $5 par appel qu'ils reçoivent pendant 6 mois !",
    en: "Recruit lawyers and helpers to earn $5 per call they receive for 6 months!",
  },
  "influencer.referrals.empty.title": {
    fr: "Aucun filleul pour le moment",
    en: "No referrals yet",
  },
  "influencer.referrals.expired": {
    fr: "Expiré",
    en: "Expired",
  },
  "influencer.referrals.listTitle": {
    fr: "Vos {count} filleuls",
    en: "Your {count} referrals",
  },
  "influencer.referrals.perCall": {
    fr: "par appel",
    en: "per call",
  },
  "influencer.referrals.shareLink": {
    fr: "Partagez votre lien de recrutement :",
    en: "Share your recruitment link:",
  },
  "influencer.referrals.shareLinkDesc": {
    fr: "Partagez ce lien pour recruter des prestataires et gagner des commissions sur leurs appels.",
    en: "Share this link to recruit providers and earn commissions on their calls.",
  },
  "influencer.referrals.since": {
    fr: "depuis",
    en: "since",
  },
  "influencer.referrals.subtitle": {
    fr: "Prestataires recrutés via votre lien",
    en: "Providers recruited via your link",
  },
  "influencer.referrals.title": {
    fr: "Mes filleuls",
    en: "My Referrals",
  },
  "influencer.referrals.total": {
    fr: "Total filleuls",
    en: "Total Referrals",
  },
  "influencer.referrals.totalCalls": {
    fr: "Appels générés",
    en: "Calls Generated",
  },
  "influencer.referrals.totalEarned": {
    fr: "Total gagné",
    en: "Total Earned",
  },
  "influencer.referrals.windowProgress": {
    fr: "Fenêtre de commission",
    en: "Commission Window",
  },
  "influencer.referrals.yourLink": {
    fr: "Votre lien de recrutement",
    en: "Your Recruitment Link",
  },

  // === RECRUITMENT ===
  "influencer.recruitment.viewInvitationPage": {
    fr: "Voir la page d'invitation",
    en: "View invitation page",
  },

  // === REGISTER ===
  "influencer.register.alreadyRegistered": {
    fr: "Déjà inscrit ?",
    en: "Already registered?",
  },
  "influencer.register.benefit1": {
    fr: "$10 par appel référé",
    en: "$10 per referred call",
  },
  "influencer.register.benefit2.v3": {
    fr: "$5 par appel à vos partenaires avocats ou expatriés aidants",
    en: "$5 per call to your lawyer or expat helper partners",
  },
  "influencer.register.benefit3": {
    fr: "Bannières, widgets, QR codes inclus",
    en: "Banners, widgets, QR codes included",
  },
  "influencer.register.benefit4": {
    fr: "Activation immédiate (pas de quiz)",
    en: "Immediate activation (no quiz)",
  },
  "influencer.register.benefits.title": {
    fr: "Ce que vous obtenez",
    en: "What you get",
  },
  "influencer.register.emailExists.hint": {
    fr: "Connectez-vous pour continuer.",
    en: "Log in to continue.",
  },
  "influencer.register.emailExists.loginButton": {
    fr: "Se connecter",
    en: "Log in",
  },
  "influencer.register.emailExists.message": {
    fr: "L'email {email} est déjà enregistré.",
    en: "The email {email} is already registered.",
  },
  "influencer.register.emailExists.title": {
    fr: "Vous avez déjà un compte !",
    en: "You already have an account!",
  },
  "influencer.register.emailExists.tryDifferent": {
    fr: "Utiliser un autre email",
    en: "Use a different email",
  },
  "influencer.register.info": {
    fr: "L'inscription est gratuite. Votre compte sera activé immédiatement.",
    en: "Registration is free. Your account will be activated immediately.",
  },
  "influencer.register.loginLink": {
    fr: "Connectez-vous ici",
    en: "Log in here",
  },
  "influencer.register.referralCode.applied": {
    fr: "Code de parrainage {code} sera appliqué automatiquement",
    en: "Referral code {code} will be applied automatically",
  },
  "influencer.register.referralDetected": {
    fr: "Vous avez été parrainé !",
    en: "You've been referred!",
  },
  "influencer.register.roleConflict.button": {
    fr: "Aller à mon tableau de bord",
    en: "Go to My Dashboard",
  },
  "influencer.register.roleConflict.message": {
    fr: "Vous êtes déjà enregistré en tant que {role}. Chaque compte ne peut avoir qu'un seul rôle.",
    en: "You are already registered as {role}. Each account can only have one role.",
  },
  "influencer.register.roleConflict.title": {
    fr: "Inscription non autorisée",
    en: "Registration Not Allowed",
  },
  "influencer.register.seo.description": {
    fr: "Inscrivez-vous au programme Influenceur SOS-Expat.",
    en: "Sign up for the SOS-Expat Influencer program.",
  },
  "influencer.register.seo.title": {
    fr: "Inscription Influenceur SOS-Expat",
    en: "SOS-Expat Influencer Registration",
  },
  "influencer.register.subtitle": {
    fr: "Créez votre compte et commencez à gagner immédiatement",
    en: "Create your account and start earning immediately",
  },
  "influencer.register.title": {
    fr: "Devenir Influenceur SOS-Expat",
    en: "Become a SOS-Expat Influencer",
  },

  // === RESOURCES ===
  "influencer.resources.copy": {
    fr: "Copier",
    en: "Copy",
  },
  "influencer.resources.copied": {
    fr: "Copié !",
    en: "Copied!",
  },
  "influencer.resources.download": {
    fr: "Télécharger",
    en: "Download",
  },
  "influencer.resources.empty": {
    fr: "Aucune ressource disponible pour cette catégorie",
    en: "No resources available for this category",
  },
  "influencer.resources.files": {
    fr: "Fichiers téléchargeables",
    en: "Downloadable Files",
  },
  "influencer.resources.guidelines.1": {
    fr: "Ces ressources sont réservées aux influenceurs partenaires",
    en: "These resources are reserved for partner influencers",
  },
  "influencer.resources.guidelines.2": {
    fr: "Utilisez-les uniquement pour promouvoir SOS-Expat",
    en: "Use them only to promote SOS-Expat",
  },
  "influencer.resources.guidelines.3": {
    fr: "Ne modifiez pas les logos sans autorisation",
    en: "Do not modify logos without authorization",
  },
  "influencer.resources.guidelines.4": {
    fr: "Incluez toujours votre lien d'affiliation avec le contenu",
    en: "Always include your affiliate link with the content",
  },
  "influencer.resources.guidelines.title": {
    fr: "Conditions d'utilisation",
    en: "Terms of Use",
  },
  "influencer.resources.noResults": {
    fr: "Aucun résultat pour cette recherche",
    en: "No results for this search",
  },
  "influencer.resources.search": {
    fr: "Rechercher...",
    en: "Search...",
  },
  "influencer.resources.subtitle": {
    fr: "Logos, images et textes prêts à l'emploi pour vos promotions",
    en: "Ready-to-use logos, images, and texts for your promotions",
  },
  "influencer.resources.texts": {
    fr: "Textes à copier",
    en: "Texts to Copy",
  },
  "influencer.resources.title": {
    fr: "Ressources",
    en: "Resources",
  },

  // === SCROLL ===
  "influencer.scroll": {
    fr: "Découvrir",
    en: "Discover",
  },

  // === STATS ===
  "influencer.stats.countries": {
    fr: "Pays",
    en: "Countries",
  },
  "influencer.stats.influencers": {
    fr: "Influenceurs actifs",
    en: "Active Influencers",
  },
  "influencer.stats.paid": {
    fr: "Payés ce mois",
    en: "Paid This Month",
  },

  // === STICKY ===
  "influencer.sticky.cta": {
    fr: "Commencer maintenant",
    en: "Start Earning Now",
  },

  // === SUSPENDED ===
  "influencer.suspended.contact": {
    fr: "Contacter le support",
    en: "Contact Support",
  },
  "influencer.suspended.message": {
    fr: "Votre compte influenceur a été suspendu. Si vous pensez qu'il s'agit d'une erreur, veuillez contacter notre équipe support.",
    en: "Your influencer account has been suspended. If you think this is an error, please contact our support team.",
  },
  "influencer.suspended.reason": {
    fr: "Motif :",
    en: "Reason:",
  },
  "influencer.suspended.title": {
    fr: "Compte suspendu",
    en: "Account Suspended",
  },

  // === TEAM ===
  "influencer.team.calls": {
    fr: "appels",
    en: "calls",
  },
  "influencer.team.empty.description": {
    fr: "Recrutez des avocats et helpers pour gagner des commissions passives",
    en: "Recruit lawyers and helpers to earn passive commissions",
  },
  "influencer.team.empty.title": {
    fr: "Aucun membre dans votre équipe",
    en: "No team members yet",
  },
  "influencer.team.members": {
    fr: "membres",
    en: "members",
  },
  "influencer.team.stats.active": {
    fr: "Actifs",
    en: "Active",
  },
  "influencer.team.stats.earnings": {
    fr: "Gains totaux",
    en: "Total Earnings",
  },
  "influencer.team.stats.total": {
    fr: "Total",
    en: "Total",
  },
  "influencer.team.title": {
    fr: "Mon équipe",
    en: "My Team",
  },
  "influencer.team.type.helper": {
    fr: "Helper",
    en: "Helper",
  },
  "influencer.team.type.influencer": {
    fr: "Influenceur",
    en: "Influencer",
  },
  "influencer.team.type.lawyer": {
    fr: "Avocat",
    en: "Lawyer",
  },
  "influencer.team.viewAll": {
    fr: "Voir tout",
    en: "View All",
  },

  // === REGISTER ADDITIONAL ===
  "influencer.register.acceptTerms": {
    fr: "J'accepte les conditions générales",
    en: "I accept the terms and conditions",
  },
  "influencer.register.section.community.desc": {
    fr: "Informations sur votre audience",
    en: "Information about your audience",
  },
  "influencer.register.section.personal.desc": {
    fr: "Vos informations personnelles",
    en: "Your personal information",
  },

  // === TOOLS ===
  "influencer.tools.copyCode": {
    fr: "Copier le code",
    en: "Copy Code",
  },
  "influencer.tools.copyText": {
    fr: "Copier",
    en: "Copy",
  },
  "influencer.tools.links.title": {
    fr: "Vos liens de parrainage",
    en: "Your Referral Links",
  },
  "influencer.tools.qrcode.desc": {
    fr: "Scannez pour accéder à votre lien de parrainage",
    en: "Scan to access your referral link",
  },
  "influencer.tools.qrcode.download": {
    fr: "Télécharger le QR Code",
    en: "Download QR Code",
  },
  "influencer.tools.qrcode.title": {
    fr: "QR Code personnalisé",
    en: "Custom QR Code",
  },
  "influencer.tools.subtitle": {
    fr: "Bannières, widgets et textes pour promouvoir SOS-Expat",
    en: "Banners, widgets, and texts to promote SOS-Expat",
  },
  "influencer.tools.tabs.banners": {
    fr: "Bannières",
    en: "Banners",
  },
  "influencer.tools.tabs.links": {
    fr: "Liens",
    en: "Links",
  },
  "influencer.tools.tabs.qrcode": {
    fr: "QR Code",
    en: "QR Code",
  },
  "influencer.tools.tabs.texts": {
    fr: "Textes",
    en: "Texts",
  },
  "influencer.tools.tabs.widgets": {
    fr: "Widgets",
    en: "Widgets",
  },
  "influencer.tools.texts.bio": {
    fr: "Bio/Description",
    en: "Bio/Description",
  },
  "influencer.tools.texts.long": {
    fr: "Description longue",
    en: "Long Description",
  },
  "influencer.tools.texts.social": {
    fr: "Post réseaux sociaux",
    en: "Social Media Post",
  },
  "influencer.tools.texts.title": {
    fr: "Textes promotionnels",
    en: "Promotional Texts",
  },
  "influencer.tools.title": {
    fr: "Outils promotionnels",
    en: "Promotional Tools",
  },
  "influencer.tools.widgets.search": {
    fr: "Widget de recherche",
    en: "Search Widget",
  },
  "influencer.tools.widgets.searchDesc": {
    fr: "Permet à vos visiteurs de rechercher des experts directement depuis votre site",
    en: "Allows your visitors to search for experts directly from your site",
  },
  "influencer.tools.widgets.title": {
    fr: "Widgets interactifs",
    en: "Interactive Widgets",
  },
  "influencer.tools.banners.title": {
    fr: "Bannières prêtes à l'emploi",
    en: "Ready-to-use Banners",
  },
};

// ============================================================================
// FONCTION PRINCIPALE
// ============================================================================

function addMissingTranslations() {
  console.log('🔧 ADDING INFLUENCER MISSING TRANSLATIONS\n');

  // Charger les clés manquantes
  if (!fs.existsSync(MISSING_KEYS_PATH)) {
    console.error(`❌ File not found: ${MISSING_KEYS_PATH}`);
    console.error('   Please run analyze-influencer-translations.cjs first.');
    process.exit(1);
  }

  const missingData = JSON.parse(fs.readFileSync(MISSING_KEYS_PATH, 'utf-8'));
  const missingKeys = missingData.missingKeys.fr; // Toutes les langues ont les mêmes clés manquantes

  console.log(`📋 ${missingKeys.length} clés manquantes trouvées\n`);

  // Vérifier que toutes les clés ont des traductions
  const notInDict = missingKeys.filter(k => !NEW_TRANSLATIONS[k]);
  if (notInDict.length > 0) {
    console.warn(`⚠️  ${notInDict.length} clés manquent dans le dictionnaire NEW_TRANSLATIONS:`);
    notInDict.forEach(k => console.warn(`   - ${k}`));
    console.warn('');
  }

  // Ajouter les traductions à chaque langue
  let totalAdded = 0;

  for (const lang of LANGUAGES) {
    const filePath = path.join(HELPER_DIR, `${lang}.json`);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  File not found: ${filePath} - skipping`);
      continue;
    }

    const translations = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    let added = 0;

    for (const key of missingKeys) {
      if (NEW_TRANSLATIONS[key]) {
        const value = NEW_TRANSLATIONS[key][lang] || NEW_TRANSLATIONS[key].en;
        if (!translations[key]) {
          translations[key] = value;
          added++;
          totalAdded++;
        }
      }
    }

    // Trier les clés
    const sorted = {};
    Object.keys(translations).sort().forEach(k => {
      sorted[k] = translations[k];
    });

    // Sauvegarder
    fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2) + '\n', 'utf-8');
    console.log(`✅ ${lang.toUpperCase()}: ${added} clés ajoutées`);
  }

  console.log(`\n🎉 Total: ${totalAdded} traductions ajoutées dans ${LANGUAGES.length} langues`);
  console.log('✅ Terminé !');
}

// ============================================================================
// EXÉCUTION
// ============================================================================

try {
  addMissingTranslations();
} catch (error) {
  console.error('❌ Erreur:', error.message);
  console.error(error.stack);
  process.exit(1);
}
