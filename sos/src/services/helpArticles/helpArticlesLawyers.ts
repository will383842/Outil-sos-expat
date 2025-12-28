// src/services/helpArticles/helpArticlesLawyers.ts
// Articles pour la catégorie "Prestataires Avocats" - Contenu FR uniquement
// La traduction vers les 8 autres langues se fait à l'initialisation

import { HelpArticleData } from './helpArticlesClients';

// =============================================================================
// SOUS-CATÉGORIE 2.1: REJOINDRE SOS-EXPAT (6 articles)
// =============================================================================
const REJOINDRE_AVOCAT: HelpArticleData[] = [
  {
    slug: "pourquoi-rejoindre-sos-expat-avocat",
    title: "Pourquoi rejoindre SOS-Expat en tant qu'avocat",
    excerpt: "Les avantages de devenir prestataire avocat sur la plateforme SOS-Expat.",
    content: `## Une opportunité unique pour les avocats

SOS-Expat connecte 304 millions d'expatriés dans 197 pays avec des avocats qualifiés comme vous.

## Avantages pour les avocats

### Développez votre clientèle internationale
- Accès à des clients expatriés du monde entier
- Diversification de votre portefeuille
- Visibilité dans votre pays d'exercice

### Flexibilité totale
- Choisissez vos horaires de disponibilité
- Travaillez depuis votre cabinet ou à distance
- Acceptez uniquement les missions qui vous intéressent

### Revenus complémentaires
- Tarifs que vous définissez vous-même
- Paiements sécurisés via Stripe
- Transferts réguliers sur votre compte

### Simplicité administrative
- Facturation automatisée
- Gestion client centralisée
- Support dédié aux prestataires

## Profil idéal

Nous recherchons des avocats :
- Inscrits à un barreau reconnu
- Parlant au moins 2 langues
- Disponibles pour des consultations à distance
- Motivés pour aider les expatriés

## Témoignages

*"SOS-Expat m'a permis de développer une clientèle internationale tout en restant dans mon cabinet."* - Maître Dupont, Paris

## Prochaine étape

Créez votre profil et rejoignez notre réseau de prestataires qualifiés.`,
    tags: ["rejoindre", "avocat", "avantages", "inscription", "prestataire"],
    faqSuggestions: [
      { question: "L'inscription est-elle payante ?", answer: "Non, l'inscription est entièrement gratuite. SOS-Expat prélève uniquement des frais de mise en relation sur les missions effectuées." },
      { question: "Puis-je définir mes propres tarifs ?", answer: "Oui, vous fixez librement vos honoraires. Les frais de mise en relation SOS-Expat sont séparés." },
      { question: "Combien de temps prend la vérification ?", answer: "La vérification de votre inscription au barreau prend généralement 24 à 72 heures." }
    ],
    seoKeywords: ["avocat rejoindre SOS-Expat", "devenir prestataire avocat", "avocat expatriés", "clientèle internationale avocat"],
    subcategorySlug: "rejoindre-sos-expat-avocat",
    order: 1
  },
  {
    slug: "processus-inscription-avocat",
    title: "Processus d'inscription pour les avocats",
    excerpt: "Guide étape par étape pour créer votre profil avocat sur SOS-Expat.",
    content: `## Inscription en 5 étapes

Le processus d'inscription est conçu pour être simple tout en garantissant la qualité.

## Étape 1 : Création du compte

1. Cliquez sur "Devenir prestataire"
2. Sélectionnez "Avocat"
3. Remplissez vos informations de base
4. Créez votre mot de passe sécurisé

## Étape 2 : Informations professionnelles

- Barreau d'inscription
- Numéro d'inscription
- Spécialisations
- Années d'expérience
- Langues parlées

## Étape 3 : Vérification des documents

Documents requis :
- ✅ Pièce d'identité
- ✅ Certificat d'inscription au barreau
- ✅ Attestation d'assurance professionnelle
- ✅ Photo professionnelle

## Étape 4 : Configuration du profil

- Rédigez votre biographie
- Définissez vos tarifs
- Configurez vos disponibilités
- Ajoutez vos spécialisations détaillées

## Étape 5 : Validation

Notre équipe vérifie :
- Authenticité des documents
- Inscription au barreau
- Conformité du profil

Délai : 24 à 72 heures

## Après validation

- Votre profil devient visible
- Vous pouvez recevoir des demandes
- Accès complet au tableau de bord prestataire`,
    tags: ["inscription", "processus", "vérification", "documents", "profil"],
    faqSuggestions: [
      { question: "Quels documents dois-je fournir ?", answer: "Pièce d'identité, certificat d'inscription au barreau, attestation d'assurance professionnelle et photo professionnelle." },
      { question: "Ma candidature peut-elle être refusée ?", answer: "Oui, si les documents sont incomplets ou si vous n'êtes pas inscrit à un barreau reconnu." },
      { question: "Puis-je modifier mon profil après validation ?", answer: "Oui, vous pouvez modifier votre profil à tout moment. Certains changements nécessitent une revalidation." }
    ],
    seoKeywords: ["inscription avocat SOS-Expat", "devenir avocat plateforme", "créer profil avocat", "vérification barreau"],
    subcategorySlug: "rejoindre-sos-expat-avocat",
    order: 2
  },
  {
    slug: "documents-requis-avocat",
    title: "Documents requis pour l'inscription avocat",
    excerpt: "Liste complète des documents nécessaires pour rejoindre SOS-Expat en tant qu'avocat.",
    content: `## Documents obligatoires

Pour garantir la qualité de notre réseau, nous vérifions l'authenticité de chaque avocat.

## Pièce d'identité

### Acceptés
- Passeport en cours de validité
- Carte d'identité nationale
- Permis de conduire (selon les pays)

### Format
- Scan couleur haute qualité
- Recto et verso
- Tous les coins visibles

## Certificat d'inscription au barreau

### Ce document doit indiquer
- Votre nom complet
- Numéro d'inscription
- Date d'inscription
- Barreau concerné

### Validité
- Document de moins de 3 mois
- Ou attestation récente de votre Ordre

## Attestation d'assurance professionnelle

### Informations requises
- Nom de l'assureur
- Numéro de police
- Montant de couverture
- Période de validité

### Note importante
L'assurance doit couvrir les consultations à distance.

## Photo professionnelle

### Critères
- Photo récente (moins de 6 mois)
- Fond neutre
- Tenue professionnelle
- Visage dégagé
- Format portrait

## Vérification

Notre équipe vérifie chaque document :
- Authenticité
- Cohérence des informations
- Validité des dates

Délai de vérification : 24-72h`,
    tags: ["documents", "inscription", "vérification", "barreau", "assurance"],
    faqSuggestions: [
      { question: "Mon certificat de barreau est en langue étrangère", answer: "Nous acceptons les documents dans les 9 langues de la plateforme. Pour les autres, une traduction certifiée peut être demandée." },
      { question: "Mon assurance ne couvre que mon pays d'exercice", answer: "Vérifiez avec votre assureur. Certaines polices incluent les consultations à distance sans limitation géographique." },
      { question: "Combien de temps mes documents sont-ils conservés ?", answer: "Les documents sont conservés de manière sécurisée pendant la durée de votre inscription et 3 ans après." }
    ],
    seoKeywords: ["documents avocat inscription", "pièces justificatives barreau", "vérification avocat", "attestation assurance avocat"],
    subcategorySlug: "rejoindre-sos-expat-avocat",
    order: 3
  },
  {
    slug: "configurer-profil-avocat",
    title: "Configurer votre profil avocat pour maximiser vos missions",
    excerpt: "Conseils pour créer un profil avocat attractif et recevoir plus de demandes.",
    content: `## Un profil optimisé = plus de clients

Votre profil est votre vitrine. Un profil bien configuré attire significativement plus de clients.

## Éléments clés d'un bon profil

### Photo professionnelle
- Première impression cruciale
- Sourire et regard direct
- Tenue professionnelle
- Qualité haute définition

### Biographie percutante
Structurez votre bio :
1. Votre expertise principale (1 phrase)
2. Années d'expérience et spécialisations
3. Pourquoi vous aimez aider les expatriés
4. Ce qui vous différencie

### Spécialisations précises
Soyez spécifique :
- ❌ "Droit des affaires"
- ✅ "Création de société pour expatriés, droit des contrats internationaux"

### Langues parlées
- Indiquez votre niveau réel
- Les clients apprécient l'honnêteté
- Mentionnez les dialectes si pertinent

## Tarification stratégique

### Recommandations
- Étudiez les tarifs du marché
- Commencez compétitif pour obtenir des avis
- Augmentez progressivement avec les bonnes évaluations

### Transparence
- Affichez clairement vos tarifs
- Précisez ce qui est inclus
- Évitez les surprises pour le client

## Disponibilités

### Conseils
- Indiquez des plages horaires réalistes
- Mettez à jour régulièrement
- Tenez compte des fuseaux horaires de vos clients cibles

## Réponses rapides

Les clients privilégient les avocats réactifs :
- Répondez dans l'heure si possible
- Activez les notifications
- Le badge "Réactif" augmente votre visibilité`,
    tags: ["profil", "configuration", "optimisation", "visibilité", "missions"],
    faqSuggestions: [
      { question: "Quelle longueur pour ma biographie ?", answer: "Entre 150 et 300 mots. Assez pour montrer votre expertise, pas trop pour rester lisible." },
      { question: "Dois-je afficher mes tarifs ?", answer: "Oui, la transparence est appréciée. Les profils avec tarifs visibles reçoivent plus de demandes." },
      { question: "Comment obtenir le badge 'Réactif' ?", answer: "Maintenez un temps de réponse moyen inférieur à 5 minutes pendant 30 jours." }
    ],
    seoKeywords: ["profil avocat optimisé", "attirer clients avocat", "configuration profil prestataire", "visibilité avocat"],
    subcategorySlug: "rejoindre-sos-expat-avocat",
    order: 4
  },
  {
    slug: "verification-barreau-avocat",
    title: "Comment SOS-Expat vérifie votre inscription au barreau",
    excerpt: "Notre processus de vérification pour garantir l'authenticité des avocats sur la plateforme.",
    content: `## Pourquoi cette vérification ?

La vérification de l'inscription au barreau est essentielle pour :
- Protéger les clients
- Garantir la qualité du réseau
- Respecter les règles déontologiques

## Notre processus

### Étape 1 : Réception des documents
Vous téléchargez votre certificat d'inscription au barreau.

### Étape 2 : Vérification automatisée
Notre système analyse :
- Format du document
- Cohérence des informations
- Détection de falsification

### Étape 3 : Vérification manuelle
Notre équipe :
- Examine chaque document
- Vérifie les données auprès des sources officielles
- Contacte le barreau si nécessaire

### Étape 4 : Validation ou rejet
- **Validé** : Profil activé
- **Documents incomplets** : Demande de complément
- **Rejeté** : Motif communiqué

## Barreaux vérifiables

Nous pouvons vérifier les inscriptions auprès de :
- Tous les barreaux européens
- Barreaux américains (ABA)
- Barreaux canadiens
- Et la plupart des barreaux internationaux

## Délais

- Vérification standard : 24-72h
- Cas nécessitant contact du barreau : jusqu'à 7 jours

## Confidentialité

Vos documents sont :
- Stockés de manière sécurisée
- Accessibles uniquement par notre équipe de vérification
- Jamais partagés avec des tiers

## Renouvellement

La vérification est renouvelée :
- Annuellement
- À chaque mise à jour de vos informations d'inscription`,
    tags: ["vérification", "barreau", "authentification", "inscription", "sécurité"],
    faqSuggestions: [
      { question: "Que se passe-t-il si mon barreau ne répond pas ?", answer: "Nous vous contactons pour trouver une solution alternative de vérification." },
      { question: "Mon inscription est récente, est-ce un problème ?", answer: "Non, tant que vous êtes inscrit au barreau, la date d'inscription n'est pas un critère d'exclusion." },
      { question: "Je suis inscrit à plusieurs barreaux, comment faire ?", answer: "Vous pouvez indiquer tous vos barreaux d'inscription et fournir les certificats correspondants." }
    ],
    seoKeywords: ["vérification barreau", "authentification avocat", "inscription barreau SOS-Expat", "contrôle avocat"],
    subcategorySlug: "rejoindre-sos-expat-avocat",
    order: 5
  },
  {
    slug: "charte-ethique-avocat",
    title: "Charte éthique des avocats SOS-Expat",
    excerpt: "Les engagements et règles déontologiques pour les avocats de notre réseau.",
    content: `## Notre charte éthique

En rejoignant SOS-Expat, vous vous engagez à respecter cette charte en plus des règles déontologiques de votre barreau.

## Engagements fondamentaux

### 1. Compétence
- N'accepter que les missions dans votre domaine de compétence
- Orienter le client vers un confrère si nécessaire
- Maintenir vos connaissances à jour

### 2. Disponibilité
- Respecter vos engagements horaires
- Informer rapidement en cas d'indisponibilité
- Répondre dans les délais annoncés

### 3. Transparence
- Tarifs clairs et affichés
- Information complète sur les services
- Aucune promesse de résultat

### 4. Confidentialité
- Respect absolu du secret professionnel
- Protection des données client
- Discrétion sur les consultations

### 5. Intégrité
- Aucun conflit d'intérêts
- Refus de toute corruption
- Honnêteté dans les communications

## Interdictions

### Strictement interdit
- ❌ Demander des paiements hors plateforme
- ❌ Solliciter des clients directement
- ❌ Partager des informations confidentielles
- ❌ Faire de la publicité mensongère
- ❌ Discriminer les clients

## Sanctions

En cas de non-respect :
1. **Avertissement** - Premier manquement mineur
2. **Suspension temporaire** - Manquement répété
3. **Exclusion définitive** - Manquement grave
4. **Signalement** - À votre Ordre si nécessaire

## Acceptation

En vous inscrivant, vous acceptez cette charte. Elle complète, sans remplacer, les règles de votre barreau.`,
    tags: ["éthique", "déontologie", "charte", "engagements", "règles"],
    faqSuggestions: [
      { question: "Cette charte remplace-t-elle les règles de mon barreau ?", answer: "Non, elle s'y ajoute. Vous devez respecter à la fois notre charte et les règles de votre barreau." },
      { question: "Que se passe-t-il si je suis sanctionné ?", answer: "Les sanctions vont de l'avertissement à l'exclusion selon la gravité. Un recours est possible." },
      { question: "Puis-je refuser un client ?", answer: "Oui, si vous avez un motif légitime (conflit d'intérêts, hors compétence, etc.)." }
    ],
    seoKeywords: ["charte éthique avocat", "déontologie SOS-Expat", "règles avocats plateforme", "engagements professionnels"],
    subcategorySlug: "rejoindre-sos-expat-avocat",
    order: 6
  }
];

// =============================================================================
// SOUS-CATÉGORIE 2.2: GÉRER MES MISSIONS (6 articles)
// =============================================================================
const GERER_MISSIONS_AVOCAT: HelpArticleData[] = [
  {
    slug: "recevoir-accepter-demandes-avocat",
    title: "Recevoir et accepter des demandes de clients",
    excerpt: "Comment gérer les demandes entrantes et optimiser votre taux d'acceptation.",
    content: `## Flux des demandes

Comprendre comment fonctionnent les demandes vous aide à maximiser vos missions.

## Types de demandes

### Demande SOS (urgente)
- Notification immédiate
- Délai de réponse : quelques minutes
- Client en attente active
- Frais de mise en relation plus élevés pour le client

### Demande standard
- Notification par email et push
- Délai de réponse : quelques heures
- Le client consulte plusieurs profils

### Demande directe
- Le client vous a choisi spécifiquement
- Basé sur votre profil ou recommandation
- Taux d'acceptation plus élevé attendu

## Comment recevoir les demandes

### Notifications
- Push sur l'application
- Email instantané
- SMS (si activé)

### Informations fournies
- Type de besoin
- Pays du client
- Langue souhaitée
- Niveau d'urgence
- Budget indicatif (si communiqué)

## Accepter une demande

1. Consultez les détails de la demande
2. Évaluez si vous pouvez aider
3. Cliquez sur "Accepter"
4. Préparez-vous à contacter le client

## Refuser une demande

Vous pouvez refuser si :
- Hors de votre domaine de compétence
- Indisponibilité temporaire
- Conflit d'intérêts potentiel

Un taux de refus trop élevé peut affecter votre visibilité.

## Conseils pour optimiser

- Maintenez vos disponibilités à jour
- Répondez rapidement aux demandes SOS
- Spécialisez-vous pour recevoir des demandes ciblées`,
    tags: ["demandes", "acceptation", "missions", "notifications", "clients"],
    faqSuggestions: [
      { question: "Combien de temps ai-je pour accepter une demande SOS ?", answer: "Les demandes SOS sont attribuées au premier avocat qui répond. Répondez en quelques minutes maximum." },
      { question: "Puis-je voir les détails avant d'accepter ?", answer: "Oui, vous voyez un résumé du besoin. Les détails complets sont disponibles après acceptation." },
      { question: "Que se passe-t-il si je refuse trop de demandes ?", answer: "Un taux de refus élevé peut réduire votre visibilité dans les résultats de recherche." }
    ],
    seoKeywords: ["accepter demandes avocat", "missions avocat", "clients SOS-Expat", "demandes urgentes avocat"],
    subcategorySlug: "gerer-missions-avocat",
    order: 1
  },
  {
    slug: "contacter-clients-avocat",
    title: "Comment contacter vos clients efficacement",
    excerpt: "Bonnes pratiques pour établir le premier contact et mener vos consultations.",
    content: `## Le premier contact

Le premier échange est déterminant pour la relation client.

## Modes de contact disponibles

### Appel téléphonique
- Mode principal pour les consultations
- Via la plateforme (numéro masqué)
- Qualité audio professionnelle

### Messagerie sécurisée
- Pour les échanges écrits
- Partage de documents
- Historique conservé

### Visioconférence
- Pour les consultations visuelles
- Partage d'écran possible
- Intégré à la plateforme

## Préparer le premier appel

### Avant l'appel
1. Relisez la demande du client
2. Préparez vos questions
3. Assurez-vous d'être dans un lieu calme
4. Vérifiez votre connexion

### Pendant l'appel
1. Présentez-vous professionnellement
2. Confirmez le besoin du client
3. Expliquez comment vous pouvez aider
4. Définissez les prochaines étapes

### Après l'appel
1. Envoyez un récapitulatif écrit
2. Indiquez les documents nécessaires
3. Confirmez les honoraires si applicable

## Bonnes pratiques

### À faire
- ✅ Être ponctuel
- ✅ Écouter activement
- ✅ Parler clairement
- ✅ Adapter votre vocabulaire
- ✅ Résumer les points clés

### À éviter
- ❌ Jargon juridique excessif
- ❌ Interruptions fréquentes
- ❌ Promesses de résultat
- ❌ Bruit de fond

## Barrière linguistique

Si le client parle mal votre langue commune :
- Parlez lentement et clairement
- Confirmez la compréhension régulièrement
- Utilisez des phrases simples
- Proposez un support écrit en complément`,
    tags: ["contact", "communication", "appel", "client", "consultation"],
    faqSuggestions: [
      { question: "Le client voit-il mon numéro de téléphone ?", answer: "Non, les appels passent par la plateforme. Votre numéro reste confidentiel." },
      { question: "Puis-je contacter le client en dehors de la plateforme ?", answer: "Non, toutes les communications doivent passer par SOS-Expat pour votre protection mutuelle." },
      { question: "Que faire si le client ne répond pas ?", answer: "Réessayez après quelques minutes, puis envoyez un message via la plateforme. Signalez si le problème persiste." }
    ],
    seoKeywords: ["contacter client avocat", "premier appel consultation", "communication avocat client", "consultation téléphonique"],
    subcategorySlug: "gerer-missions-avocat",
    order: 2
  },
  {
    slug: "gerer-disponibilites-avocat",
    title: "Gérer vos disponibilités et votre planning",
    excerpt: "Comment configurer vos horaires pour recevoir les bonnes demandes au bon moment.",
    content: `## Importance des disponibilités

Des disponibilités bien configurées = des missions adaptées à votre emploi du temps.

## Configuration des disponibilités

### Plages horaires récurrentes
Définissez vos horaires habituels :
- Jours de la semaine
- Heures de début et fin
- Pauses éventuelles

### Disponibilités ponctuelles
Ajoutez ou retirez des créneaux :
- Jours fériés
- Congés
- Disponibilités exceptionnelles

### Fuseau horaire
- Configurez votre fuseau horaire principal
- Les clients voient vos disponibilités dans leur fuseau

## Mode SOS

### Activation
- Activez le mode SOS quand vous êtes disponible immédiatement
- Recevez les demandes urgentes en priorité

### Désactivation
- Désactivez quand vous ne pouvez pas répondre dans les 5 minutes
- Évite les demandes urgentes non traitées

## Gestion des absences

### Absence courte (< 1 jour)
- Désactivez le mode SOS
- Marquez-vous comme "Occupé"

### Absence longue (> 1 jour)
- Utilisez le mode "Vacances"
- Vos disponibilités sont masquées
- Vous restez visible mais non contactable

## Conseils d'optimisation

### Pour plus de missions
- Élargissez vos plages horaires
- Couvrez plusieurs fuseaux horaires
- Restez disponible en soirée/week-end

### Pour une meilleure qualité de vie
- Définissez des limites claires
- Utilisez le mode "Ne pas déranger"
- Planifiez vos pauses`,
    tags: ["disponibilités", "planning", "horaires", "SOS", "gestion"],
    faqSuggestions: [
      { question: "Que se passe-t-il si je reçois une demande hors de mes disponibilités ?", answer: "Les demandes standard peuvent arriver à tout moment, mais le client comprend que vous répondrez selon vos horaires affichés." },
      { question: "Puis-je être disponible 24/7 ?", answer: "Techniquement oui, mais nous recommandons des pauses pour maintenir la qualité de service." },
      { question: "Comment gérer les fuseaux horaires différents ?", answer: "Vos disponibilités s'affichent automatiquement dans le fuseau horaire du client." }
    ],
    seoKeywords: ["disponibilités avocat", "planning prestataire", "horaires consultation", "gestion temps avocat"],
    subcategorySlug: "gerer-missions-avocat",
    order: 3
  },
  {
    slug: "suivi-missions-avocat",
    title: "Suivre et documenter vos missions",
    excerpt: "Comment garder une trace de vos interventions et assurer un suivi de qualité.",
    content: `## Importance du suivi

Un bon suivi des missions vous aide à :
- Assurer un service de qualité
- Éviter les oublis
- Gérer les réclamations éventuelles
- Améliorer votre pratique

## Tableau de bord prestataire

### Vue d'ensemble
- Missions en cours
- Missions terminées
- Évaluations reçues
- Revenus du mois

### Filtres disponibles
- Par statut (en cours, terminée, annulée)
- Par date
- Par type de mission
- Par client

## Documenter une mission

### Pendant la mission
- Notes privées (non visibles par le client)
- Points clés discutés
- Documents échangés

### Après la mission
- Résumé de la consultation
- Actions recommandées
- Suivi nécessaire

## Statuts de mission

1. **Nouvelle** - Demande reçue
2. **Acceptée** - Vous avez accepté
3. **En cours** - Consultation active
4. **Terminée** - Mission complétée
5. **Annulée** - Annulation (client ou prestataire)

## Bonnes pratiques

### Organisation
- Mettez à jour les statuts en temps réel
- Complétez les notes après chaque échange
- Archivez les documents importants

### Suivi client
- Envoyez un message de suivi si approprié
- Proposez une nouvelle consultation si nécessaire
- Restez disponible pour les questions

## Conservation des données

- Historique accessible pendant 3 ans
- Export possible en PDF/CSV
- Respect du secret professionnel`,
    tags: ["suivi", "missions", "documentation", "tableau de bord", "organisation"],
    faqSuggestions: [
      { question: "Les clients voient-ils mes notes privées ?", answer: "Non, les notes privées sont uniquement pour votre usage. Seuls les messages envoyés sont visibles par le client." },
      { question: "Combien de temps sont conservées les données ?", answer: "Les données sont accessibles pendant 3 ans, conformément aux obligations légales." },
      { question: "Puis-je exporter mon historique de missions ?", answer: "Oui, vous pouvez exporter votre historique en format PDF ou CSV depuis le tableau de bord." }
    ],
    seoKeywords: ["suivi missions avocat", "tableau de bord prestataire", "documentation consultation", "gestion clients avocat"],
    subcategorySlug: "gerer-missions-avocat",
    order: 4
  },
  {
    slug: "annuler-mission-avocat",
    title: "Comment annuler une mission (et les conséquences)",
    excerpt: "Procédure d'annulation et impact sur votre profil prestataire.",
    content: `## Quand annuler ?

L'annulation doit rester exceptionnelle et justifiée.

## Motifs légitimes d'annulation

### Acceptés
- ✅ Conflit d'intérêts découvert
- ✅ Urgence personnelle grave
- ✅ Client ne répondant pas
- ✅ Demande hors compétence (erreur d'acceptation)

### Non acceptés
- ❌ Autre mission plus intéressante
- ❌ Changement d'avis sans motif
- ❌ Désaccord sur les honoraires (après acceptation)

## Procédure d'annulation

### Avant le premier contact
1. Accédez à la mission
2. Cliquez sur "Annuler"
3. Sélectionnez le motif
4. Confirmez l'annulation

### Après le premier contact
1. Prévenez le client par message
2. Proposez une alternative si possible
3. Procédez à l'annulation
4. Le client est remboursé des frais de mise en relation

## Conséquences

### Sur votre profil
- Taux d'annulation visible (en interne)
- Taux élevé = moins de visibilité
- Possible suspension en cas d'abus

### Financières
- Pas de frais pour le prestataire
- Le client est remboursé
- Aucune facturation possible

### Sur votre réputation
- Le client peut laisser un commentaire
- Impact potentiel sur vos évaluations

## Alternatives à l'annulation

Avant d'annuler, considérez :
- Reporter la consultation
- Transférer à un confrère (avec accord du client)
- Adapter le format de l'échange`,
    tags: ["annulation", "mission", "conséquences", "procédure", "motifs"],
    faqSuggestions: [
      { question: "Combien d'annulations sont tolérées ?", answer: "Un taux d'annulation supérieur à 10% peut entraîner une réduction de visibilité. Au-delà de 20%, une suspension est possible." },
      { question: "Le client peut-il me laisser un avis négatif si j'annule ?", answer: "Oui, mais nous modérons les avis injustifiés si l'annulation était légitime." },
      { question: "Puis-je recommander un confrère au lieu d'annuler ?", answer: "Oui, c'est même encouragé. Proposez au client un autre avocat qui pourrait l'aider." }
    ],
    seoKeywords: ["annuler mission avocat", "annulation consultation", "motifs annulation", "conséquences annulation"],
    subcategorySlug: "gerer-missions-avocat",
    order: 5
  },
  {
    slug: "gerer-reclamations-client",
    title: "Gérer les réclamations de clients",
    excerpt: "Comment répondre aux plaintes et résoudre les conflits avec professionnalisme.",
    content: `## Approche professionnelle

Une réclamation bien gérée peut transformer un client mécontent en ambassadeur.

## Types de réclamations courantes

### Qualité du service
- Conseil jugé insuffisant
- Manque de disponibilité
- Communication difficile

### Facturation
- Honoraires contestés
- Durée de consultation disputée
- Services non compris dans le tarif

### Résultats
- Attentes non satisfaites
- Promesses perçues comme non tenues

## Processus de réclamation

### 1. Notification
Vous êtes informé de la réclamation par email et sur votre tableau de bord.

### 2. Réponse
Vous avez 48h pour répondre avec :
- Votre version des faits
- Pièces justificatives
- Proposition de résolution

### 3. Médiation
Si désaccord, SOS-Expat peut intervenir en médiation.

### 4. Résolution
- Accord trouvé
- Ou décision de SOS-Expat

## Conseils pour répondre

### À faire
- ✅ Répondre rapidement
- ✅ Rester professionnel
- ✅ Reconnaître les points valides
- ✅ Proposer une solution
- ✅ Fournir des preuves

### À éviter
- ❌ Ton défensif ou agressif
- ❌ Accusations envers le client
- ❌ Ignorer la réclamation
- ❌ Réponse tardive

## Prévenir les réclamations

- Clarifiez les attentes dès le départ
- Documentez vos échanges
- Communiquez régulièrement
- Soyez transparent sur les honoraires`,
    tags: ["réclamations", "conflits", "médiation", "clients", "résolution"],
    faqSuggestions: [
      { question: "Une réclamation affecte-t-elle ma note ?", answer: "Une réclamation résolue positivement peut même améliorer votre réputation. Seules les réclamations non résolues impactent négativement." },
      { question: "Puis-je contester une réclamation injustifiée ?", answer: "Oui, présentez votre version des faits avec preuves. SOS-Expat tranche en cas de désaccord." },
      { question: "Que se passe-t-il si je ne réponds pas ?", answer: "Une absence de réponse sous 48h est considérée comme une acceptation des faits reprochés." }
    ],
    seoKeywords: ["réclamation client avocat", "gestion conflits", "médiation client", "plainte consultation"],
    subcategorySlug: "gerer-missions-avocat",
    order: 6
  }
];

// =============================================================================
// SOUS-CATÉGORIE 2.3: PAIEMENTS & REVENUS AVOCATS (6 articles)
// =============================================================================
const PAIEMENTS_REVENUS_AVOCAT: HelpArticleData[] = [
  {
    slug: "comprendre-remuneration-avocat",
    title: "Comprendre votre rémunération sur SOS-Expat",
    excerpt: "Explication du modèle de rémunération et des flux financiers pour les avocats.",
    content: `## Modèle de rémunération

Comprenez comment fonctionne votre rémunération sur SOS-Expat.

## Deux sources de revenus

### 1. Frais de mise en relation (payés par le client à SOS-Expat)
- Le client paie pour être mis en contact avec vous
- Ces frais restent à SOS-Expat (couvrent la plateforme)
- Vous n'avez rien à payer à SOS-Expat

### 2. Vos honoraires (payés par le client directement à vous)
- Vous définissez librement vos tarifs
- Négociation directe avec le client
- Paiement via Stripe Connect

## Flux financier

1. Client paie les frais de mise en relation à SOS-Expat
2. Vous êtes mis en contact
3. Vous convenez de vos honoraires avec le client
4. Le client paie vos honoraires via la plateforme
5. L'argent arrive sur votre compte Stripe Connect
6. Transfert vers votre compte bancaire

## Ce que vous gardez

- 100% de vos honoraires vous reviennent
- Stripe prélève des frais de transaction (~2.9% + 0.30€)
- Aucune commission SOS-Expat sur vos honoraires

## Exemple concret

| Élément | Montant | Qui reçoit |
|---------|---------|------------|
| Frais de mise en relation | Variable | SOS-Expat |
| Vos honoraires | 150€ | Vous |
| Frais Stripe (~3%) | ~4.50€ | Stripe |
| **Vous recevez** | **~145.50€** | Votre compte |

## Avantages du modèle

- Tarifs libres
- Pas de commission sur vos honoraires
- Paiements sécurisés
- Facturation automatique`,
    tags: ["rémunération", "honoraires", "revenus", "paiement", "modèle économique"],
    faqSuggestions: [
      { question: "SOS-Expat prend-il une commission sur mes honoraires ?", answer: "Non, SOS-Expat ne prend aucune commission sur vos honoraires. Seuls les frais Stripe (~3%) s'appliquent." },
      { question: "Puis-je fixer mes tarifs librement ?", answer: "Oui, vous définissez entièrement vos honoraires. Il n'y a pas de tarif minimum ou maximum imposé." },
      { question: "Comment sont calculés les frais Stripe ?", answer: "Stripe prélève environ 2.9% + 0.30€ par transaction. Ces frais sont déduits automatiquement." }
    ],
    seoKeywords: ["rémunération avocat SOS-Expat", "honoraires plateforme", "revenus avocat", "modèle paiement"],
    subcategorySlug: "paiements-revenus-avocats",
    order: 1
  },
  {
    slug: "configurer-stripe-connect-avocat",
    title: "Configurer Stripe Connect pour recevoir vos paiements",
    excerpt: "Guide de configuration de votre compte Stripe Connect pour les transferts de revenus.",
    content: `## Pourquoi Stripe Connect ?

Stripe Connect est la solution de paiement sécurisée utilisée par SOS-Expat pour verser vos revenus.

## Avantages de Stripe

- Utilisé par des millions d'entreprises
- Sécurité maximale
- Transferts rapides
- Support international

## Configuration étape par étape

### Étape 1 : Initier la configuration
1. Accédez à votre tableau de bord prestataire
2. Cliquez sur "Configurer les paiements"
3. Vous êtes redirigé vers Stripe

### Étape 2 : Créer ou connecter votre compte Stripe
- Nouveau compte : suivez le processus de création
- Compte existant : connectez-le à SOS-Expat

### Étape 3 : Informations requises
- Identité (pièce d'identité)
- Coordonnées bancaires (IBAN)
- Informations fiscales
- Adresse professionnelle

### Étape 4 : Vérification
Stripe vérifie vos informations (24-48h généralement)

### Étape 5 : Activation
Une fois vérifié, vous pouvez recevoir des paiements.

## Informations à préparer

- ✅ Pièce d'identité valide
- ✅ RIB/IBAN de votre compte professionnel
- ✅ Numéro SIRET ou équivalent
- ✅ Justificatif de domicile récent

## Problèmes courants

### Vérification en attente
- Attendez 48h
- Vérifiez que tous les documents sont fournis
- Contactez Stripe si le problème persiste

### Document refusé
- Vérifiez la qualité (lisible, non coupé)
- Assurez-vous que le document est valide
- Utilisez un autre type de document si possible`,
    tags: ["Stripe", "configuration", "paiements", "compte", "transferts"],
    faqSuggestions: [
      { question: "Stripe est-il obligatoire ?", answer: "Oui, Stripe Connect est le seul moyen de recevoir vos paiements sur SOS-Expat." },
      { question: "Puis-je utiliser mon compte Stripe personnel ?", answer: "Pour les avocats, un compte Stripe professionnel est recommandé pour la conformité fiscale." },
      { question: "Combien de temps pour la première vérification ?", answer: "Généralement 24 à 48 heures. Des documents supplémentaires peuvent être demandés." }
    ],
    seoKeywords: ["Stripe Connect avocat", "configurer paiements", "compte Stripe prestataire", "recevoir paiements"],
    subcategorySlug: "paiements-revenus-avocats",
    order: 2
  },
  {
    slug: "consulter-revenus-historique",
    title: "Consulter vos revenus et historique de paiements",
    excerpt: "Comment accéder à vos statistiques de revenus et à l'historique de vos transactions.",
    content: `## Tableau de bord financier

Votre tableau de bord vous donne une vue complète de vos revenus.

## Accéder à vos revenus

1. Connectez-vous à votre espace prestataire
2. Cliquez sur "Revenus" ou "Paiements"
3. Consultez vos statistiques

## Informations disponibles

### Vue d'ensemble
- Revenus du mois en cours
- Revenus de l'année
- Nombre de consultations
- Revenu moyen par consultation

### Graphiques
- Évolution mensuelle
- Comparaison avec les mois précédents
- Répartition par type de mission

### Détail des transactions
- Date et heure
- Client (anonymisé si souhaité)
- Montant brut
- Frais Stripe
- Montant net

## Filtres disponibles

- Par période (jour, semaine, mois, année, personnalisé)
- Par type de mission
- Par statut (payé, en attente, remboursé)

## Export des données

### Formats disponibles
- PDF (pour comptabilité)
- CSV (pour tableur)
- Relevé récapitulatif

### Utilisation
- Déclarations fiscales
- Comptabilité
- Suivi d'activité

## Stripe Dashboard

Pour plus de détails, accédez directement à votre Stripe Dashboard :
- Historique complet des transactions
- Prévisions de transferts
- Paramètres de compte`,
    tags: ["revenus", "historique", "statistiques", "paiements", "tableau de bord"],
    faqSuggestions: [
      { question: "Comment exporter mes revenus pour ma comptabilité ?", answer: "Accédez à l'onglet Revenus et cliquez sur 'Exporter'. Choisissez le format PDF ou CSV." },
      { question: "Les montants affichés incluent-ils les frais Stripe ?", answer: "Le tableau de bord affiche les montants bruts et nets. Les frais Stripe sont détaillés." },
      { question: "Puis-je voir les revenus des années précédentes ?", answer: "Oui, l'historique complet est disponible sans limite de temps." }
    ],
    seoKeywords: ["revenus avocat SOS-Expat", "historique paiements", "statistiques prestataire", "tableau de bord financier"],
    subcategorySlug: "paiements-revenus-avocats",
    order: 3
  },
  {
    slug: "fixer-honoraires-avocat",
    title: "Fixer vos honoraires : conseils et bonnes pratiques",
    excerpt: "Comment définir vos tarifs de manière compétitive tout en valorisant votre expertise.",
    content: `## Liberté tarifaire

Sur SOS-Expat, vous fixez librement vos honoraires. Voici nos conseils.

## Facteurs à considérer

### Votre expertise
- Années d'expérience
- Spécialisation rare
- Résultats passés
- Réputation

### Le marché
- Tarifs pratiqués par vos confrères
- Pays d'exercice
- Spécialité concernée

### Vos coûts
- Charges professionnelles
- Temps passé
- Formation continue

## Structures tarifaires

### Tarif horaire
- Le plus courant
- Facile à comprendre
- Adaptable selon la complexité

### Forfait par consultation
- Prix fixe quel que soit le temps
- Attractif pour le client
- Risque de dépassement pour vous

### Tarif par type de service
- Différent selon la prestation
- Exemple : consultation simple vs rédaction de contrat

## Conseils stratégiques

### Pour démarrer
- Commencez légèrement en dessous du marché
- Obtenez des avis positifs
- Augmentez progressivement

### Pour croître
- Justifiez vos tarifs par votre expertise
- Créez des offres packagées
- Différenciez urgence et standard

### À éviter
- ❌ Prix trop bas (perception de faible qualité)
- ❌ Prix trop élevés sans justification
- ❌ Changements fréquents de tarifs

## Transparence

- Affichez clairement vos tarifs
- Expliquez ce qui est inclus
- Pas de frais surprises pour le client`,
    tags: ["honoraires", "tarifs", "prix", "stratégie", "facturation"],
    faqSuggestions: [
      { question: "Dois-je afficher mes tarifs sur mon profil ?", answer: "C'est fortement recommandé. Les profils avec tarifs affichés reçoivent plus de demandes." },
      { question: "Puis-je avoir des tarifs différents selon les clients ?", answer: "Vous pouvez adapter vos honoraires selon la complexité, mais évitez la discrimination injustifiée." },
      { question: "Comment savoir si mes tarifs sont compétitifs ?", answer: "Consultez les profils d'avocats similaires sur la plateforme et ajustez selon votre positionnement." }
    ],
    seoKeywords: ["honoraires avocat", "fixer tarifs", "prix consultation", "stratégie tarifaire avocat"],
    subcategorySlug: "paiements-revenus-avocats",
    order: 4
  },
  {
    slug: "factures-fiscalite-avocat",
    title: "Factures et fiscalité pour les avocats",
    excerpt: "Gérer votre facturation et vos obligations fiscales en tant que prestataire.",
    content: `## Facturation automatisée

SOS-Expat génère automatiquement vos factures pour simplifier votre gestion.

## Factures générées

### Pour chaque mission
- Facture détaillée automatique
- Conforme aux normes légales
- Téléchargeable en PDF

### Informations incluses
- Vos coordonnées professionnelles
- Numéro SIRET/équivalent
- Détail de la prestation
- Montant HT et TTC
- TVA applicable

## TVA et obligations fiscales

### En France
- Soumis à la TVA selon votre régime
- Déclaration selon votre périodicité
- Factures conformes au CGI

### À l'international
- Vérifiez les règles de TVA intracommunautaire
- Autoliquidation possible selon les cas
- Consultez votre expert-comptable

## Déclaration de revenus

### À déclarer
- Tous vos revenus SOS-Expat
- Comme revenus d'activité libérale
- BNC ou IS selon votre structure

### Documents utiles
- Récapitulatif annuel (disponible en janvier)
- Export de l'historique
- Relevé Stripe

## Conseils pratiques

### Organisation
- Exportez vos revenus mensuellement
- Conservez toutes les factures
- Rapprochez avec vos relevés Stripe

### Comptabilité
- Intégrez les exports à votre comptabilité
- Distinguez les frais Stripe
- Provisionnez pour les impôts

## Note importante

SOS-Expat ne fournit pas de conseil fiscal. Consultez un expert-comptable pour votre situation spécifique.`,
    tags: ["factures", "fiscalité", "TVA", "comptabilité", "déclaration"],
    faqSuggestions: [
      { question: "Les factures générées sont-elles conformes ?", answer: "Oui, nos factures respectent les normes légales françaises et européennes." },
      { question: "Comment gérer la TVA sur les clients étrangers ?", answer: "Les règles varient selon les pays. Consultez un expert-comptable pour les cas internationaux." },
      { question: "Où trouver mon récapitulatif annuel ?", answer: "Le récapitulatif annuel est disponible dans l'onglet Revenus à partir de janvier de l'année suivante." }
    ],
    seoKeywords: ["factures avocat", "fiscalité prestataire", "TVA consultation", "comptabilité avocat"],
    subcategorySlug: "paiements-revenus-avocats",
    order: 5
  },
  {
    slug: "problemes-paiement-avocat",
    title: "Résoudre les problèmes de paiement",
    excerpt: "Solutions aux problèmes courants de paiement et transfert de revenus.",
    content: `## Problèmes courants et solutions

Voici les problèmes de paiement les plus fréquents et comment les résoudre.

## Paiement en attente

### Causes possibles
- Vérification Stripe en cours
- Documents manquants
- Compte non vérifié

### Solutions
1. Vérifiez votre Stripe Dashboard
2. Complétez les informations demandées
3. Attendez la fin de la vérification

## Transfert non reçu

### Délai normal
- Stripe → Compte bancaire : 2-7 jours ouvrés
- Variable selon votre banque et pays

### Si délai dépassé
1. Vérifiez vos coordonnées bancaires
2. Consultez le statut dans Stripe
3. Contactez votre banque
4. Contactez le support Stripe si nécessaire

## Montant incorrect

### Vérifications à faire
- Frais Stripe déduits (~3%)
- Taux de change (si devise différente)
- Remboursements éventuels

### Si erreur confirmée
1. Documentez le problème
2. Contactez notre support
3. Enquête sous 48h

## Client n'a pas payé

### Avant le service
- Ne fournissez pas le service sans paiement via la plateforme

### Après le service
- Rare si le paiement est fait via SOS-Expat
- Contactez le support pour assistance

## Compte Stripe suspendu

### Causes possibles
- Activité inhabituelle
- Documents expirés
- Violation des conditions

### Solutions
1. Connectez-vous à Stripe
2. Suivez les instructions de résolution
3. Fournissez les documents demandés
4. Contactez Stripe si nécessaire

## Contact support

Pour tout problème non résolu :
- Support SOS-Expat : pour les questions liées à la plateforme
- Support Stripe : pour les questions de transfert`,
    tags: ["problèmes", "paiement", "transfert", "Stripe", "support"],
    faqSuggestions: [
      { question: "Mon transfert est bloqué, que faire ?", answer: "Vérifiez d'abord votre Stripe Dashboard pour identifier le problème, puis complétez les actions demandées." },
      { question: "Stripe me demande des documents supplémentaires", answer: "C'est normal pour les vérifications de conformité. Fournissez les documents demandés rapidement." },
      { question: "Puis-je accélérer les transferts ?", answer: "Les délais dépendent de Stripe et de votre banque. Certains pays permettent des transferts instantanés moyennant des frais." }
    ],
    seoKeywords: ["problème paiement avocat", "transfert bloqué", "Stripe problème", "paiement non reçu"],
    subcategorySlug: "paiements-revenus-avocats",
    order: 6
  }
];

// =============================================================================
// SOUS-CATÉGORIE 2.4: PERFORMANCE & VISIBILITÉ (5 articles)
// =============================================================================
const PERFORMANCE_VISIBILITE_AVOCAT: HelpArticleData[] = [
  {
    slug: "ameliorer-visibilite-profil-avocat",
    title: "Améliorer la visibilité de votre profil avocat",
    excerpt: "Stratégies pour apparaître en haut des résultats et attirer plus de clients.",
    content: `## Facteurs de visibilité

Comprenez comment SOS-Expat classe les profils pour optimiser le vôtre.

## Critères de classement

### Performance
- Note moyenne
- Taux de réponse
- Taux d'acceptation
- Taux de satisfaction

### Profil
- Complétude du profil
- Qualité de la biographie
- Photo professionnelle
- Spécialisations détaillées

### Activité
- Connexions régulières
- Réactivité aux demandes
- Missions récentes

## Optimiser votre profil

### Photo
- Professionnelle et récente
- Bonne qualité
- Regard direct

### Biographie
- Claire et structurée
- Mots-clés pertinents
- Valeur ajoutée visible

### Spécialisations
- Précises et pertinentes
- Correspondant à la demande
- Pas trop génériques

## Améliorer votre performance

### Réactivité
- Répondez rapidement aux demandes
- Maintenez le mode SOS actif
- Notifications activées

### Qualité
- Consultations de qualité
- Suivi des clients
- Demandez des évaluations

### Régularité
- Connectez-vous régulièrement
- Mettez à jour vos disponibilités
- Restez actif sur la plateforme

## Badges de visibilité

### Badge "Excellent"
Note ≥ 4.8 + 10 avis minimum

### Badge "Réactif"
Temps de réponse moyen < 5 min

### Badge "Expert"
Spécialisation reconnue + résultats`,
    tags: ["visibilité", "classement", "profil", "optimisation", "référencement"],
    faqSuggestions: [
      { question: "Comment monter dans le classement ?", answer: "Améliorez votre note, votre réactivité et la complétude de votre profil. Ces trois facteurs sont déterminants." },
      { question: "Le nombre de missions impacte-t-il ma visibilité ?", answer: "Oui, les avocats actifs avec des missions régulières sont favorisés dans le classement." },
      { question: "Puis-je payer pour plus de visibilité ?", answer: "Non, le classement est basé uniquement sur la performance et la qualité du profil." }
    ],
    seoKeywords: ["visibilité avocat", "classement SOS-Expat", "optimiser profil", "attirer clients avocat"],
    subcategorySlug: "performance-visibilite-avocat",
    order: 1
  },
  {
    slug: "obtenir-avis-positifs-avocat",
    title: "Obtenir des avis positifs de vos clients",
    excerpt: "Comment encourager les évaluations et bâtir une réputation solide.",
    content: `## Importance des avis

Les avis sont le premier critère de choix des clients sur SOS-Expat.

## Quand demander un avis

### Le bon moment
- Juste après une consultation réussie
- Quand le client exprime sa satisfaction
- Après avoir résolu son problème

### Comment demander
1. Via la messagerie plateforme
2. À la fin de la consultation
3. De manière professionnelle

## Message type

"Merci pour notre échange. Si ma consultation vous a été utile, un avis sur mon profil aiderait d'autres expatriés à me trouver. Cela prend moins d'une minute."

## Maximiser les avis positifs

### Avant la consultation
- Définissez clairement les attentes
- Soyez transparent sur vos compétences
- Annoncez ce que vous pouvez apporter

### Pendant
- Soyez à l'écoute
- Expliquez clairement
- Répondez aux questions
- Soyez professionnel

### Après
- Envoyez un récapitulatif
- Proposez un suivi
- Demandez un avis

## Gérer les avis négatifs

### Ne paniquez pas
Un avis négatif n'est pas la fin du monde.

### Répondez professionnellement
- Restez courtois
- Reconnaissez les points valides
- Expliquez votre position
- Proposez une solution

### Apprenez
- Analysez les critiques constructives
- Améliorez vos points faibles

## À éviter

- ❌ Acheter des avis
- ❌ Demander des avis en échange de faveurs
- ❌ Harceler pour obtenir un avis
- ❌ Créer de faux avis`,
    tags: ["avis", "évaluations", "réputation", "feedback", "clients"],
    faqSuggestions: [
      { question: "Combien d'avis faut-il pour être visible ?", answer: "Votre note est affichée à partir de 3 avis. Plus vous en avez, plus votre profil inspire confiance." },
      { question: "Puis-je faire supprimer un avis négatif ?", answer: "Seuls les avis injurieux ou contraires à nos règles peuvent être supprimés après vérification." },
      { question: "Les avis anciens comptent-ils autant ?", answer: "Les avis récents ont plus de poids dans le calcul de votre note moyenne." }
    ],
    seoKeywords: ["avis positifs avocat", "évaluations clients", "réputation avocat", "feedback consultation"],
    subcategorySlug: "performance-visibilite-avocat",
    order: 2
  },
  {
    slug: "statistiques-performance-avocat",
    title: "Comprendre vos statistiques de performance",
    excerpt: "Analysez vos indicateurs clés pour améliorer votre activité sur SOS-Expat.",
    content: `## Tableau de bord performance

Votre tableau de bord vous donne des insights précieux sur votre activité.

## Indicateurs clés (KPIs)

### Taux de réponse
- % de demandes auxquelles vous avez répondu
- Objectif : > 90%
- Impact : visibilité dans les recherches

### Temps de réponse moyen
- Délai moyen pour répondre aux demandes
- Objectif SOS : < 5 minutes
- Objectif standard : < 2 heures

### Taux d'acceptation
- % de demandes acceptées
- Objectif : > 80%
- Trop bas = moins de demandes

### Note moyenne
- Moyenne de vos évaluations
- Objectif : > 4.5
- Impacte fortement votre classement

### Taux de satisfaction
- % de clients satisfaits (note ≥ 4)
- Objectif : > 95%

## Graphiques disponibles

### Évolution temporelle
- Note moyenne par mois
- Revenus par mois
- Nombre de missions

### Comparaison
- Par rapport à la moyenne de la plateforme
- Par rapport au mois précédent

## Utiliser les statistiques

### Identifier les problèmes
- Baisse de note → qualité à améliorer
- Temps de réponse élevé → réactivité à travailler
- Peu de demandes → profil à optimiser

### Fixer des objectifs
- Basez-vous sur vos statistiques actuelles
- Progressez par paliers
- Célébrez les améliorations

## Alertes automatiques

Vous êtes alerté si :
- Votre note baisse significativement
- Votre temps de réponse augmente
- Vous risquez de perdre un badge`,
    tags: ["statistiques", "performance", "KPIs", "analyse", "amélioration"],
    faqSuggestions: [
      { question: "Comment améliorer mon temps de réponse ?", answer: "Activez les notifications, gardez l'app ouverte, et réservez des plages pour traiter les demandes." },
      { question: "Ma note a baissé, que faire ?", answer: "Analysez les avis récents, identifiez les problèmes récurrents, et travaillez sur ces points." },
      { question: "Les statistiques sont-elles visibles par les clients ?", answer: "Seules la note moyenne et certains badges sont visibles. Les statistiques détaillées sont privées." }
    ],
    seoKeywords: ["statistiques avocat", "performance prestataire", "KPIs SOS-Expat", "analyse activité"],
    subcategorySlug: "performance-visibilite-avocat",
    order: 3
  },
  {
    slug: "badges-distinctions-avocat",
    title: "Badges et distinctions : comment les obtenir",
    excerpt: "Critères pour obtenir les badges qui augmentent votre crédibilité et visibilité.",
    content: `## Système de badges

Les badges récompensent votre excellence et augmentent votre visibilité.

## Badges disponibles

### Badge "Excellent"
**Critères :**
- Note moyenne ≥ 4.8/5
- Minimum 10 évaluations
- Pas d'avis 1 étoile récent (3 mois)

**Avantages :**
- Position prioritaire dans les recherches
- Label visible sur le profil
- Confiance accrue des clients

### Badge "Réactif"
**Critères :**
- Temps de réponse moyen < 5 minutes
- Sur les 30 derniers jours
- Minimum 5 demandes traitées

**Avantages :**
- Priorité sur les demandes SOS
- Badge visible
- Clients rassurés sur la rapidité

### Badge "Vérifié Pro"
**Critères :**
- Documents professionnels à jour
- Assurance vérifiée
- Barreau confirmé

**Avantages :**
- Crédibilité maximale
- Mention "Profil vérifié"

### Badge "Expert [Domaine]"
**Critères :**
- Spécialisation déclarée et documentée
- Missions réussies dans ce domaine
- Reconnaissance par les pairs (optionnel)

**Avantages :**
- Visibilité dans les recherches spécialisées
- Crédibilité d'expert

## Maintenir ses badges

### Badge "Excellent"
- Maintenez votre qualité de service
- Surveillez votre note moyenne

### Badge "Réactif"
- Restez connecté régulièrement
- Répondez rapidement aux demandes

### Perte de badge
- Notification si critères non remplis
- Période de grâce de 30 jours
- Possibilité de regagner le badge`,
    tags: ["badges", "distinctions", "récompenses", "excellence", "crédibilité"],
    faqSuggestions: [
      { question: "Combien de temps pour obtenir un badge ?", answer: "Selon le badge : 'Réactif' peut être obtenu en 30 jours, 'Excellent' nécessite 10 avis minimum." },
      { question: "Puis-je perdre un badge ?", answer: "Oui, si vous ne remplissez plus les critères pendant 30 jours consécutifs." },
      { question: "Les badges augmentent-ils mes revenus ?", answer: "Indirectement oui : plus de visibilité = plus de demandes = plus de revenus potentiels." }
    ],
    seoKeywords: ["badges avocat", "distinctions SOS-Expat", "certification prestataire", "excellence avocat"],
    subcategorySlug: "performance-visibilite-avocat",
    order: 4
  },
  {
    slug: "repondre-demandes-sos-efficacement",
    title: "Répondre efficacement aux demandes SOS",
    excerpt: "Maximisez votre taux de conversion sur les demandes urgentes.",
    content: `## L'importance des demandes SOS

Les demandes SOS sont les plus rémunératrices et les plus impactantes pour votre réputation.

## Caractéristiques des demandes SOS

### Urgence
- Client en situation critique
- Besoin d'une réponse immédiate
- Prêt à payer le premium

### Visibilité
- Envoyées à plusieurs avocats
- Premier arrivé, premier servi
- Temps de réponse crucial

## Optimiser vos chances

### Préparation
- Activez le mode SOS quand disponible
- Notifications push activées
- Téléphone chargé et à portée

### Au moment de la demande
1. Lisez rapidement la demande
2. Évaluez si vous pouvez aider
3. Acceptez immédiatement si oui
4. Préparez votre appel

### Temps de réponse idéal
- < 1 minute : excellent
- 1-3 minutes : bon
- 3-5 minutes : acceptable
- > 5 minutes : risque de perdre la mission

## Pendant la consultation SOS

### Structure recommandée
1. Rassurez le client
2. Écoutez la situation
3. Posez les questions essentielles
4. Donnez les premiers conseils
5. Définissez la suite

### Attitude
- Calme et professionnel
- Empathique mais factuel
- Rassurant sans promettre

## Après la consultation SOS

- Envoyez un récapitulatif
- Proposez un suivi si nécessaire
- Demandez un avis
- Documentez l'intervention

## Gérer le stress

Les demandes SOS peuvent être stressantes :
- Prenez une respiration avant l'appel
- Ayez vos ressources à portée
- Ne vous engagez pas sur l'impossible`,
    tags: ["SOS", "urgence", "réponse rapide", "efficacité", "conversion"],
    faqSuggestions: [
      { question: "Puis-je refuser une demande SOS ?", answer: "Oui, si vous n'êtes pas compétent ou disponible. Mais un refus fréquent affecte votre visibilité SOS." },
      { question: "Les demandes SOS paient-elles plus ?", answer: "Les frais de mise en relation sont plus élevés pour le client, ce qui attire des clients prêts à payer vos honoraires." },
      { question: "Comment gérer plusieurs demandes SOS simultanées ?", answer: "Acceptez celle où vous pouvez le plus aider. Les autres seront traitées par d'autres avocats." }
    ],
    seoKeywords: ["demandes SOS avocat", "urgences juridiques", "réponse rapide", "consultations urgentes"],
    subcategorySlug: "performance-visibilite-avocat",
    order: 5
  }
];

// =============================================================================
// SOUS-CATÉGORIE 2.5: DÉONTOLOGIE & CONFORMITÉ (4 articles)
// =============================================================================
const DEONTOLOGIE_CONFORMITE_AVOCAT: HelpArticleData[] = [
  {
    slug: "regles-deontologiques-avocat-plateforme",
    title: "Règles déontologiques pour les avocats sur la plateforme",
    excerpt: "Comment concilier les règles de votre barreau avec l'utilisation de SOS-Expat.",
    content: `## Déontologie et plateformes numériques

L'utilisation de SOS-Expat est compatible avec vos obligations déontologiques.

## Principes fondamentaux maintenus

### Secret professionnel
- Échanges confidentiels via la plateforme
- Aucun accès de SOS-Expat au contenu
- Cryptage de bout en bout

### Indépendance
- Vous restez maître de vos conseils
- Aucune interférence de la plateforme
- Liberté de refuser une mission

### Compétence
- N'acceptez que les missions dans votre domaine
- Formation continue encouragée
- Orientation vers un confrère si nécessaire

### Loyauté
- Envers vos clients
- Envers vos confrères
- Envers la profession

## Points d'attention

### Publicité
- Votre profil est conforme aux règles de publicité
- Pas de promesse de résultat
- Mentions obligatoires respectées

### Conflit d'intérêts
- Vérifiez l'absence de conflit avant d'accepter
- Déclarez tout conflit potentiel
- Refusez si nécessaire

### Honoraires
- Tarifs conformes aux usages
- Convention d'honoraires recommandée
- Transparence totale

## Conformité des barreaux

### Barreaux français
SOS-Expat respecte le RIN (Règlement Intérieur National).

### Barreaux européens
Conformité avec les règles CCBE.

### Autres barreaux
Vérifiez les règles spécifiques de votre juridiction.

## En cas de doute

- Consultez votre Ordre
- Contactez notre service juridique
- Nous pouvons adapter notre service si nécessaire`,
    tags: ["déontologie", "règles", "barreau", "conformité", "profession"],
    faqSuggestions: [
      { question: "SOS-Expat est-il approuvé par les barreaux ?", answer: "SOS-Expat est conçu pour respecter les règles déontologiques. Certains barreaux ont émis des avis favorables." },
      { question: "Puis-je utiliser SOS-Expat si mon barreau l'interdit ?", answer: "Si votre barreau interdit les plateformes, vous devrez vous conformer. Nous pouvons fournir une attestation de conformité si nécessaire." },
      { question: "Comment gérer la convention d'honoraires ?", answer: "Vous pouvez envoyer votre convention standard via la messagerie sécurisée avant de commencer." }
    ],
    seoKeywords: ["déontologie avocat plateforme", "règles barreau SOS-Expat", "conformité avocat", "éthique professionnelle"],
    subcategorySlug: "deontologie-conformite",
    order: 1
  },
  {
    slug: "secret-professionnel-consultations-distance",
    title: "Secret professionnel dans les consultations à distance",
    excerpt: "Garantir la confidentialité de vos échanges avec les clients en ligne.",
    content: `## Le secret professionnel à l'ère numérique

Le secret professionnel s'applique pleinement aux consultations à distance.

## Garanties techniques de SOS-Expat

### Communications
- Appels via serveurs sécurisés
- Pas d'enregistrement des conversations
- Connexions cryptées

### Messages
- Chiffrement de bout en bout
- Stockage sécurisé
- Accès restreint

### Documents
- Transfert sécurisé
- Stockage temporaire
- Suppression possible

## Vos responsabilités

### Environnement de travail
- Lieu privé pour les appels
- Écran non visible par des tiers
- Casque recommandé

### Appareils
- Ordinateur/téléphone sécurisé
- Antivirus à jour
- Connexion Wi-Fi sécurisée

### Comportement
- Ne partagez pas d'informations client
- Déconnectez-vous après usage
- Protégez vos identifiants

## Limites du secret

Le secret professionnel peut être levé :
- Sur autorisation du client
- Par ordonnance judiciaire
- Pour prévenir un crime grave imminent
- Dans le cadre de votre propre défense

## En cas de violation suspectée

1. Évaluez l'étendue du problème
2. Informez le client concerné
3. Signalez à votre Ordre
4. Contactez SOS-Expat
5. Documentez l'incident

## Formation et sensibilisation

SOS-Expat propose :
- Guide de bonnes pratiques
- Webinaires sur la cybersécurité
- Support technique dédié`,
    tags: ["secret professionnel", "confidentialité", "sécurité", "distance", "cryptage"],
    faqSuggestions: [
      { question: "SOS-Expat peut-il accéder à mes conversations ?", answer: "Non, les communications sont cryptées de bout en bout. SOS-Expat n'a pas accès au contenu." },
      { question: "Les appels sont-ils enregistrés ?", answer: "Non, les appels ne sont jamais enregistrés par la plateforme." },
      { question: "Comment sécuriser mon environnement de travail ?", answer: "Utilisez un lieu privé, un casque, et assurez-vous que votre écran n'est pas visible par des tiers." }
    ],
    seoKeywords: ["secret professionnel distance", "confidentialité avocat en ligne", "sécurité consultation", "cryptage communications"],
    subcategorySlug: "deontologie-conformite",
    order: 2
  },
  {
    slug: "assurance-professionnelle-avocat-plateforme",
    title: "Assurance professionnelle et consultations en ligne",
    excerpt: "Vérifier et adapter votre couverture d'assurance pour les activités sur SOS-Expat.",
    content: `## L'assurance professionnelle obligatoire

Tout avocat doit disposer d'une assurance responsabilité civile professionnelle.

## Couverture pour les activités en ligne

### Vérifiez votre contrat actuel
Votre assurance couvre-t-elle :
- Les consultations à distance ?
- Les clients internationaux ?
- Les activités via plateforme ?

### Cas courants
- **Inclus** : La plupart des contrats modernes couvrent le distanciel
- **À vérifier** : Couverture internationale
- **Extension possible** : Si exclusion explicite

## Ce que SOS-Expat exige

### Document obligatoire
- Attestation d'assurance valide
- Montant de couverture conforme aux exigences du barreau
- Renouvellement annuel

### Vérification
- À l'inscription
- Annuellement
- Sur demande

## Questions à poser à votre assureur

1. Ma police couvre-t-elle les consultations par téléphone/visio ?
2. Suis-je couvert pour des clients basés à l'étranger ?
3. L'utilisation d'une plateforme de mise en relation est-elle incluse ?
4. Y a-t-il des exclusions spécifiques ?

## En cas de sinistre

### Procédure
1. Informez immédiatement votre assureur
2. Documentez l'incident
3. Prévenez SOS-Expat
4. Coopérez avec l'enquête

### Ce que couvre généralement l'assurance
- Erreurs de conseil
- Négligences professionnelles
- Pertes subies par le client
- Frais de défense

## Recommandations

- Relisez votre contrat annuellement
- Adaptez la couverture si nécessaire
- Conservez une copie accessible
- Informez-vous des évolutions`,
    tags: ["assurance", "responsabilité civile", "couverture", "sinistre", "protection"],
    faqSuggestions: [
      { question: "Mon assurance actuelle suffit-elle ?", answer: "Probablement oui pour les contrats récents, mais vérifiez les clauses sur le distanciel et l'international." },
      { question: "SOS-Expat propose-t-il une assurance ?", answer: "Non, vous devez avoir votre propre assurance. Nous vérifions son existence mais ne la fournissons pas." },
      { question: "Que se passe-t-il si mon assurance expire ?", answer: "Votre profil est désactivé jusqu'au renouvellement de votre attestation d'assurance." }
    ],
    seoKeywords: ["assurance avocat en ligne", "responsabilité civile plateforme", "couverture consultation distance", "assurance professionnelle"],
    subcategorySlug: "deontologie-conformite",
    order: 3
  },
  {
    slug: "conflits-interets-avocat-plateforme",
    title: "Gérer les conflits d'intérêts sur SOS-Expat",
    excerpt: "Comment identifier et gérer les situations de conflit d'intérêts potentiels.",
    content: `## Le conflit d'intérêts en bref

Un conflit d'intérêts existe quand vos intérêts (ou ceux d'un autre client) sont incompatibles avec ceux du nouveau client.

## Types de conflits

### Direct
- Vous avez déjà conseillé la partie adverse
- Intérêt personnel dans l'affaire
- Relation avec la partie adverse

### Indirect
- Conflit avec un associé/collaborateur
- Client d'un précédent cabinet
- Situation créant une apparence de conflit

## Détection sur SOS-Expat

### Avant d'accepter
- Lisez attentivement la demande
- Vérifiez les parties mentionnées
- Recherchez dans vos dossiers passés

### Informations fournies
Le résumé de demande inclut :
- Pays concerné
- Type de problème
- Parties identifiées (si communiquées)

## Procédure en cas de conflit

### 1. Identification
Vous détectez un conflit potentiel.

### 2. Refus de la mission
Cliquez sur "Refuser" avec le motif "Conflit d'intérêts".

### 3. Confidentialité
Ne divulguez pas la nature du conflit au client.

### 4. Orientation
Proposez au client de solliciter un autre avocat.

## Cas particuliers sur SOS-Expat

### Client anonyme dans la demande
- Acceptez provisoirement
- Vérifiez le conflit au premier échange
- Annulez si conflit découvert

### Doute sur le conflit
- En cas de doute, refusez
- Consultez votre Ordre si nécessaire

## Documentation

Gardez une trace de :
- Vos vérifications de conflit
- Les refus pour conflit
- La procédure suivie`,
    tags: ["conflits d'intérêts", "éthique", "vérification", "refus", "déontologie"],
    faqSuggestions: [
      { question: "Dois-je expliquer le conflit au client ?", answer: "Non, vous ne devez pas révéler la nature du conflit ni l'identité des parties concernées." },
      { question: "Un conflit annulé affecte-t-il mon profil ?", answer: "Non, un refus pour conflit d'intérêts est un motif légitime qui n'affecte pas votre statistique." },
      { question: "Comment vérifier les conflits sur des demandes anonymes ?", answer: "Vérifiez dès le premier échange les identités des parties avant de donner tout conseil substantiel." }
    ],
    seoKeywords: ["conflit intérêts avocat", "éthique professionnelle", "vérification conflit", "déontologie avocat"],
    subcategorySlug: "deontologie-conformite",
    order: 4
  }
];

// =============================================================================
// EXPORT DE TOUS LES ARTICLES AVOCATS
// =============================================================================
export const HELP_ARTICLES_LAWYERS: HelpArticleData[] = [
  ...REJOINDRE_AVOCAT,
  ...GERER_MISSIONS_AVOCAT,
  ...PAIEMENTS_REVENUS_AVOCAT,
  ...PERFORMANCE_VISIBILITE_AVOCAT,
  ...DEONTOLOGIE_CONFORMITE_AVOCAT
];

// Export par sous-catégorie pour référence
export const LAWYER_ARTICLES_BY_SUBCATEGORY = {
  rejoindreAvocat: REJOINDRE_AVOCAT,
  gererMissionsAvocat: GERER_MISSIONS_AVOCAT,
  paiementsRevenusAvocat: PAIEMENTS_REVENUS_AVOCAT,
  performanceVisibiliteAvocat: PERFORMANCE_VISIBILITE_AVOCAT,
  deontologieConformiteAvocat: DEONTOLOGIE_CONFORMITE_AVOCAT
};
