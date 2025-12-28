// src/services/helpArticles/helpArticlesHelpers.ts
// Articles pour la catégorie "Prestataires Expat Aidant" - Contenu FR uniquement
// La traduction vers les 8 autres langues se fait à l'initialisation

import { HelpArticleData } from './helpArticlesClients';

// =============================================================================
// SOUS-CATÉGORIE 3.1: DEVENIR EXPAT AIDANT (5 articles)
// =============================================================================
const DEVENIR_EXPAT_AIDANT: HelpArticleData[] = [
  {
    slug: "pourquoi-devenir-expat-aidant",
    title: "Pourquoi devenir Expat Aidant sur SOS-Expat",
    excerpt: "Découvrez les avantages de partager votre expérience d'expatriation et d'aider d'autres expatriés.",
    content: `## Transformez votre expérience en opportunité

Vous vivez à l'étranger depuis des années ? Votre expérience est précieuse pour les nouveaux expatriés.

## Qu'est-ce qu'un Expat Aidant ?

Un Expat Aidant est une personne vivant ou ayant vécu à l'étranger qui :
- Partage son expérience pratique
- Guide les nouveaux arrivants
- Conseille sur la vie quotidienne locale
- Aide à s'adapter culturellement

## Avantages de devenir Expat Aidant

### Financiers
- Revenus complémentaires flexibles
- Tarifs que vous définissez
- Paiements sécurisés

### Personnels
- Valorisez votre parcours
- Aidez des personnes dans le besoin
- Échanges enrichissants
- Réseau international

### Pratiques
- Travaillez de chez vous
- Horaires flexibles
- Aucun engagement minimum
- Choisissez vos missions

## Qui peut devenir Expat Aidant ?

### Profils recherchés
- Expatriés depuis 2+ ans
- Bonne connaissance du pays d'accueil
- Maîtrise de 2+ langues
- Envie de partager et d'aider

### Ce qui n'est PAS requis
- Diplôme spécifique
- Expérience professionnelle particulière
- Être actuellement expatrié (anciens expatriés acceptés)

## Différence avec un avocat

| Expat Aidant | Avocat |
|--------------|--------|
| Conseils pratiques | Conseils juridiques |
| Expérience personnelle | Expertise légale |
| Vie quotidienne | Questions de droit |
| Adaptation culturelle | Procédures légales |`,
    tags: ["devenir", "expat aidant", "avantages", "inscription", "partager"],
    faqSuggestions: [
      { question: "Faut-il être encore expatrié pour devenir Expat Aidant ?", answer: "Non, les anciens expatriés peuvent aussi partager leur expérience, tant qu'elle est récente et pertinente." },
      { question: "Combien puis-je gagner en tant qu'Expat Aidant ?", answer: "Cela dépend de vos tarifs et de votre disponibilité. Les tarifs sont libres et vous choisissez vos missions." },
      { question: "Y a-t-il un engagement minimum ?", answer: "Non, vous êtes libre de votre disponibilité. Vous pouvez faire une mission par mois ou plusieurs par jour." }
    ],
    seoKeywords: ["devenir expat aidant", "aider expatriés", "partager expérience", "revenus expatriation"],
    subcategorySlug: "devenir-expat-aidant",
    order: 1
  },
  {
    slug: "processus-inscription-expat-aidant",
    title: "Processus d'inscription Expat Aidant",
    excerpt: "Guide complet pour créer votre profil et rejoindre le réseau des Expats Aidants.",
    content: `## Inscription en 4 étapes simples

Rejoindre SOS-Expat en tant qu'Expat Aidant est rapide et gratuit.

## Étape 1 : Créer votre compte

1. Cliquez sur "Devenir prestataire"
2. Sélectionnez "Expat Aidant"
3. Remplissez le formulaire de base
4. Confirmez votre email

## Étape 2 : Compléter votre profil

### Informations personnelles
- Nom et prénom
- Pays de résidence actuel
- Pays d'expatriation (actuel ou passé)
- Durée de l'expatriation

### Votre expérience
- Domaines d'expertise (logement, administration, etc.)
- Langues parlées
- Pays connus
- Ce qui vous motive à aider

### Photo et présentation
- Photo professionnelle mais naturelle
- Biographie engageante
- Votre parcours d'expatrié

## Étape 3 : Vérification

Documents requis :
- ✅ Pièce d'identité
- ✅ Justificatif de résidence/expatriation
- ✅ Photo de vérification

Délai : 24-48h

## Étape 4 : Configuration finale

- Définissez vos tarifs
- Configurez vos disponibilités
- Activez les notifications
- Vous êtes prêt !

## Après l'inscription

- Votre profil apparaît dans les recherches
- Vous recevez des demandes
- Commencez à aider et à gagner`,
    tags: ["inscription", "processus", "profil", "vérification", "étapes"],
    faqSuggestions: [
      { question: "Combien de temps prend l'inscription ?", answer: "La création du profil prend 10-15 minutes. La vérification prend 24 à 48 heures." },
      { question: "L'inscription est-elle payante ?", answer: "Non, l'inscription est entièrement gratuite. SOS-Expat prélève des frais de mise en relation sur les missions." },
      { question: "Puis-je modifier mon profil après inscription ?", answer: "Oui, vous pouvez modifier votre profil à tout moment depuis votre tableau de bord." }
    ],
    seoKeywords: ["inscription expat aidant", "créer profil", "rejoindre SOS-Expat", "devenir prestataire"],
    subcategorySlug: "devenir-expat-aidant",
    order: 2
  },
  {
    slug: "documents-requis-expat-aidant",
    title: "Documents requis pour l'inscription Expat Aidant",
    excerpt: "Liste des pièces justificatives nécessaires pour valider votre profil.",
    content: `## Documents nécessaires

La vérification garantit la qualité du réseau pour tous.

## Pièce d'identité

### Documents acceptés
- Passeport valide
- Carte d'identité nationale
- Permis de conduire (selon pays)

### Critères
- Document en cours de validité
- Scan couleur lisible
- Recto et verso

## Justificatif d'expatriation

### Pour les expatriés actuels
- Visa ou titre de séjour
- Facture récente à votre nom (utilité, téléphone)
- Contrat de location/propriété

### Pour les anciens expatriés
- Ancien visa/titre de séjour
- Documents prouvant votre séjour passé
- Attestation employeur (si applicable)

## Photo de vérification

### Processus
- Photo en temps réel via l'application
- Avec pièce d'identité visible
- Conditions de lumière correctes

### Objectif
Confirmer que vous êtes bien la personne sur les documents.

## Références (optionnel mais recommandé)

- Contacts professionnels
- Anciens clients (si applicable)
- Recommandations LinkedIn

## Conseils pour une validation rapide

✅ Documents lisibles et de bonne qualité
✅ Tous les coins visibles
✅ Informations cohérentes
✅ Photo récente et naturelle

## Délai de vérification

- Standard : 24-48h
- Avec documents supplémentaires : jusqu'à 5 jours`,
    tags: ["documents", "vérification", "justificatifs", "identité", "inscription"],
    faqSuggestions: [
      { question: "Je n'ai pas de titre de séjour, comment prouver mon expatriation ?", answer: "Vous pouvez fournir des factures à votre nom, un contrat de location, ou d'autres documents prouvant votre résidence." },
      { question: "Mes documents sont dans une langue étrangère", answer: "Nous acceptons les documents dans les 9 langues de la plateforme. Pour d'autres langues, une traduction peut être demandée." },
      { question: "La photo de vérification échoue, que faire ?", answer: "Assurez-vous d'avoir une bonne lumière, de tenir votre pièce d'identité visible, et de suivre les instructions à l'écran." }
    ],
    seoKeywords: ["documents expat aidant", "vérification inscription", "pièces justificatives", "validation profil"],
    subcategorySlug: "devenir-expat-aidant",
    order: 3
  },
  {
    slug: "creer-profil-attractif-expat-aidant",
    title: "Créer un profil attractif d'Expat Aidant",
    excerpt: "Conseils pour optimiser votre profil et attirer plus de clients.",
    content: `## Un bon profil fait la différence

Votre profil est votre vitrine. Voici comment le rendre irrésistible.

## La photo idéale

### À faire
- Photo naturelle et souriante
- Lumière naturelle
- Fond simple (pas de décor encombré)
- Tenue décontractée mais soignée

### À éviter
- Photos de vacances/fêtes
- Lunettes de soleil
- Photos de groupe (recadrées)
- Filtres excessifs

## La biographie parfaite

### Structure recommandée
1. **Accroche** - Qui êtes-vous en une phrase
2. **Parcours** - Votre histoire d'expatriation
3. **Expertise** - Ce que vous pouvez apporter
4. **Motivation** - Pourquoi vous aimez aider

### Exemple
"Française installée à Berlin depuis 8 ans, j'ai traversé toutes les étapes de l'expatriation : visa, logement, administration allemande, intégration... Je connais les difficultés et je suis là pour vous éviter mes erreurs ! Passionnée d'entraide, j'adore accompagner les nouveaux arrivants dans cette aventure."

## Domaines d'expertise

### Soyez précis
- ❌ "Vie quotidienne"
- ✅ "Recherche de logement à Berlin, démarches Anmeldung, ouverture compte bancaire"

### Mots-clés importants
Incluez les termes que les clients recherchent.

## Langues

- Indiquez votre niveau réel
- Les clients apprécient l'honnêteté
- Mentionnez les dialectes si pertinent

## Tarifs

### Conseils
- Commencez compétitif
- Augmentez avec les bons avis
- Restez transparent`,
    tags: ["profil", "optimisation", "biographie", "photo", "attractivité"],
    faqSuggestions: [
      { question: "Quelle longueur pour la biographie ?", answer: "Entre 100 et 250 mots. Assez pour montrer votre personnalité, pas trop pour rester lisible." },
      { question: "Dois-je mentionner mon métier actuel ?", answer: "Seulement si c'est pertinent pour vos conseils d'expatrié. Sinon, concentrez-vous sur votre expérience d'expatriation." },
      { question: "Puis-je avoir plusieurs photos ?", answer: "La photo principale est la plus importante. Des photos supplémentaires peuvent montrer votre environnement." }
    ],
    seoKeywords: ["profil expat aidant", "biographie expatrié", "optimiser profil", "attirer clients"],
    subcategorySlug: "devenir-expat-aidant",
    order: 4
  },
  {
    slug: "charte-expat-aidant",
    title: "Charte et engagements de l'Expat Aidant",
    excerpt: "Les règles et valeurs que chaque Expat Aidant s'engage à respecter.",
    content: `## Notre charte qualité

En devenant Expat Aidant, vous vous engagez à respecter ces principes.

## Valeurs fondamentales

### Bienveillance
- Accueillez chaque client avec empathie
- Rappelez-vous vos propres débuts
- Soyez patient et compréhensif

### Honnêteté
- Ne prétendez pas tout savoir
- Admettez vos limites
- Orientez vers un professionnel si nécessaire

### Respect
- De la culture locale
- Des différences individuelles
- De la confidentialité

### Qualité
- Donnez le meilleur de vous-même
- Préparez vos consultations
- Suivez vos engagements

## Engagements pratiques

### Ce que vous DEVEZ faire
- ✅ Répondre dans les délais annoncés
- ✅ Être disponible aux créneaux indiqués
- ✅ Donner des conseils basés sur votre expérience réelle
- ✅ Respecter la confidentialité des échanges
- ✅ Utiliser uniquement la plateforme pour les échanges

### Ce que vous NE DEVEZ PAS faire
- ❌ Donner des conseils juridiques (réservé aux avocats)
- ❌ Demander des paiements hors plateforme
- ❌ Partager des informations client
- ❌ Promettre des résultats garantis
- ❌ Discriminer qui que ce soit

## Limites de votre rôle

### Vous pouvez
- Partager votre expérience personnelle
- Donner des conseils pratiques
- Orienter vers des ressources
- Accompagner émotionnellement

### Vous ne pouvez PAS
- Donner des avis juridiques
- Remplir des documents officiels pour le client
- Vous substituer à un professionnel
- Garantir un résultat administratif

## Sanctions

En cas de non-respect :
1. Avertissement
2. Suspension temporaire
3. Exclusion définitive`,
    tags: ["charte", "engagements", "règles", "valeurs", "éthique"],
    faqSuggestions: [
      { question: "Puis-je aider sur des questions juridiques simples ?", answer: "Non, toute question juridique doit être orientée vers un avocat. Vous pouvez partager votre expérience mais pas donner d'avis légal." },
      { question: "Que faire si un client demande quelque chose d'inapproprié ?", answer: "Refusez poliment et signalez le comportement via la plateforme si nécessaire." },
      { question: "Les engagements sont-ils contractuels ?", answer: "Oui, la charte fait partie des conditions d'utilisation que vous acceptez en vous inscrivant." }
    ],
    seoKeywords: ["charte expat aidant", "engagements prestataire", "règles SOS-Expat", "éthique aide"],
    subcategorySlug: "devenir-expat-aidant",
    order: 5
  }
];

// =============================================================================
// SOUS-CATÉGORIE 3.2: GÉRER MES INTERVENTIONS (5 articles)
// =============================================================================
const GERER_INTERVENTIONS: HelpArticleData[] = [
  {
    slug: "recevoir-demandes-expat-aidant",
    title: "Recevoir et accepter des demandes d'aide",
    excerpt: "Comment fonctionne le système de demandes et comment maximiser vos interventions.",
    content: `## Flux des demandes

Comprenez comment les demandes arrivent pour mieux les gérer.

## Types de demandes

### Demande SOS (urgente)
- Client en besoin immédiat
- Notification instantanée
- Réponse attendue en minutes
- Idéal pour les conseils urgents

### Demande standard
- Client planifiant à l'avance
- Plus de temps pour répondre
- Souvent plus détaillée

### Demande directe
- Le client vous a choisi spécifiquement
- Basée sur votre profil
- Taux de conversion plus élevé

## Recevoir les notifications

### Canaux
- Push sur l'application
- Email
- SMS (si activé)

### Informations dans la demande
- Pays concerné
- Type de besoin (logement, admin, etc.)
- Langue souhaitée
- Niveau d'urgence

## Accepter ou refuser

### Pour accepter
1. Lisez les détails
2. Évaluez si vous pouvez aider
3. Cliquez sur "Accepter"
4. Préparez-vous à contacter le client

### Pour refuser
- Sélectionnez "Refuser"
- Choisissez un motif (optionnel)
- La demande va à un autre Expat Aidant

### Quand refuser
- Hors de votre expertise
- Indisponibilité
- Demande inappropriée

## Conseils pour plus de demandes

- Complétez bien votre profil
- Maintenez de bonnes évaluations
- Soyez réactif
- Élargissez vos domaines d'expertise`,
    tags: ["demandes", "acceptation", "notifications", "interventions", "clients"],
    faqSuggestions: [
      { question: "Combien de temps ai-je pour accepter ?", answer: "Pour les demandes SOS, quelques minutes. Pour les demandes standard, quelques heures." },
      { question: "Refuser affecte-t-il mon profil ?", answer: "Un taux de refus très élevé peut réduire votre visibilité, mais refuser occasionnellement est normal." },
      { question: "Puis-je voir le client avant d'accepter ?", answer: "Vous voyez un résumé du besoin. Les détails complets sont accessibles après acceptation." }
    ],
    seoKeywords: ["demandes expat aidant", "accepter interventions", "notifications clients", "recevoir demandes"],
    subcategorySlug: "gerer-interventions",
    order: 1
  },
  {
    slug: "mener-consultation-expat-aidant",
    title: "Mener une consultation réussie",
    excerpt: "Bonnes pratiques pour des échanges productifs et satisfaisants.",
    content: `## Préparer la consultation

Une bonne préparation fait toute la différence.

### Avant l'appel
1. Relisez la demande du client
2. Notez les questions à poser
3. Rassemblez vos ressources (liens, contacts)
4. Assurez-vous d'être au calme

## Déroulement type

### 1. Introduction (2-3 min)
- Présentez-vous brièvement
- Confirmez le besoin du client
- Expliquez comment vous allez l'aider

### 2. Écoute active (5-10 min)
- Laissez le client expliquer sa situation
- Posez des questions de clarification
- Prenez des notes

### 3. Conseils et partage (10-15 min)
- Partagez votre expérience pertinente
- Donnez des conseils concrets
- Proposez des ressources

### 4. Conclusion (2-3 min)
- Résumez les points clés
- Définissez les prochaines étapes
- Proposez un suivi si nécessaire

## Bonnes pratiques

### Communication
- Parlez clairement et calmement
- Adaptez votre vocabulaire
- Vérifiez la compréhension
- Soyez encourageant

### Contenu
- Basez-vous sur votre expérience réelle
- Soyez honnête sur vos limites
- Donnez des conseils actionnables
- Recommandez des professionnels si besoin

### Technique
- Connexion internet stable
- Environnement calme
- Casque recommandé

## Après la consultation

- Envoyez un message récapitulatif
- Partagez les liens/ressources promis
- Proposez de répondre aux questions
- Demandez un avis`,
    tags: ["consultation", "bonnes pratiques", "communication", "échange", "conseils"],
    faqSuggestions: [
      { question: "Quelle durée pour une consultation ?", answer: "Généralement 20-30 minutes, mais cela dépend du besoin et de vos tarifs." },
      { question: "Le client peut-il me rappeler après ?", answer: "Via la plateforme, oui. Évitez les échanges de coordonnées personnelles." },
      { question: "Que faire si je ne sais pas répondre ?", answer: "Soyez honnête et orientez vers les bonnes ressources ou un autre type de prestataire." }
    ],
    seoKeywords: ["consultation expat aidant", "bonnes pratiques", "mener échange", "conseils expatriation"],
    subcategorySlug: "gerer-interventions",
    order: 2
  },
  {
    slug: "gerer-disponibilites-expat-aidant",
    title: "Gérer vos disponibilités efficacement",
    excerpt: "Comment configurer vos horaires pour une activité équilibrée.",
    content: `## Importance des disponibilités

Des disponibilités bien gérées = une activité sereine et des clients satisfaits.

## Configurer vos créneaux

### Plages récurrentes
- Définissez vos jours/heures habituels
- Exemple : Lundi-Vendredi 18h-21h

### Disponibilités ponctuelles
- Ajoutez des créneaux exceptionnels
- Bloquez des périodes (vacances, etc.)

### Fuseau horaire
- Configurez votre fuseau principal
- Les clients voient l'heure dans leur fuseau

## Mode SOS

### Quand l'activer
- Vous êtes disponible immédiatement
- Vous pouvez répondre en < 5 minutes
- Vous êtes prêt à aider

### Quand le désactiver
- En réunion/occupé
- Pas devant votre téléphone
- Indisponible pour plusieurs heures

## Conseils d'optimisation

### Pour plus de missions
- Couvrez différents fuseaux horaires
- Soyez disponible en soirée/week-end
- Activez souvent le mode SOS

### Pour votre bien-être
- Définissez des limites claires
- Prenez des pauses
- N'acceptez pas plus que vous ne pouvez gérer

## Gérer les absences

### Courte absence (< 1 jour)
- Désactivez le mode SOS
- Marquez-vous "Occupé"

### Longue absence (vacances)
- Activez le mode "Vacances"
- Votre profil reste visible mais inactif
- Retour automatique à la date prévue`,
    tags: ["disponibilités", "planning", "horaires", "organisation", "gestion temps"],
    faqSuggestions: [
      { question: "Les clients peuvent-ils voir mes disponibilités ?", answer: "Ils voient quand vous êtes disponible pour les contacter, pas le détail de votre emploi du temps." },
      { question: "Que se passe-t-il si je rate une demande ?", answer: "La demande va à un autre Expat Aidant. Trop de demandes ratées peut réduire votre visibilité." },
      { question: "Puis-je être disponible 24/7 ?", answer: "Techniquement oui, mais nous recommandons des pauses pour votre bien-être et la qualité du service." }
    ],
    seoKeywords: ["disponibilités expat aidant", "gérer horaires", "planning prestataire", "organisation temps"],
    subcategorySlug: "gerer-interventions",
    order: 3
  },
  {
    slug: "suivi-interventions-expat-aidant",
    title: "Suivre et documenter vos interventions",
    excerpt: "Gardez une trace de vos échanges pour un meilleur suivi.",
    content: `## Pourquoi documenter ?

La documentation vous aide à :
- Assurer un suivi de qualité
- Vous souvenir des détails
- Améliorer votre pratique
- Gérer d'éventuelles réclamations

## Tableau de bord

### Vue d'ensemble
- Interventions en cours
- Interventions passées
- Évaluations reçues
- Revenus générés

### Détails par intervention
- Date et durée
- Client (prénom)
- Sujet abordé
- Notes personnelles

## Prendre des notes

### Pendant l'échange
- Points clés discutés
- Questions du client
- Conseils donnés
- Ressources partagées

### Après l'échange
- Ce qui a bien fonctionné
- Points à améliorer
- Suivi nécessaire

## Notes privées vs messages

### Notes privées
- Uniquement pour vous
- Non visibles par le client
- Stockées de manière sécurisée

### Messages
- Visibles par le client
- Pour le suivi et les ressources
- Conservés dans l'historique

## Export et statistiques

### Données exportables
- Historique des interventions
- Revenus par période
- Statistiques de performance

### Formats
- PDF pour archivage
- CSV pour analyse`,
    tags: ["suivi", "documentation", "historique", "notes", "organisation"],
    faqSuggestions: [
      { question: "Les clients voient-ils mes notes ?", answer: "Non, les notes privées ne sont visibles que par vous. Seuls les messages envoyés sont partagés." },
      { question: "Combien de temps sont conservées les données ?", answer: "L'historique est accessible pendant 3 ans, conformément à nos obligations légales." },
      { question: "Puis-je supprimer une intervention de mon historique ?", answer: "Non, l'historique est conservé pour la traçabilité, mais vous pouvez supprimer vos notes privées." }
    ],
    seoKeywords: ["suivi interventions", "documentation expat aidant", "historique consultations", "notes prestataire"],
    subcategorySlug: "gerer-interventions",
    order: 4
  },
  {
    slug: "gerer-situations-difficiles",
    title: "Gérer les situations difficiles avec les clients",
    excerpt: "Comment réagir face aux clients mécontents ou aux situations complexes.",
    content: `## Types de situations difficiles

### Client mécontent
- Attentes non satisfaites
- Malentendu sur le service
- Problème de communication

### Client exigeant
- Demandes hors périmètre
- Attentes irréalistes
- Insistance excessive

### Situation complexe
- Problème dépassant vos compétences
- Besoin d'un professionnel
- Urgence réelle (santé, sécurité)

## Techniques de gestion

### Écoute active
- Laissez le client s'exprimer
- Reformulez pour montrer que vous comprenez
- Ne vous mettez pas sur la défensive

### Empathie
- Reconnaissez les frustrations
- Montrez que vous comprenez
- Restez humain

### Solutions
- Proposez des alternatives
- Soyez créatif
- Orientez si nécessaire

## Quand et comment dire non

### Situations où refuser
- Demandes illégales ou contraires à l'éthique
- Questions juridiques (domaine des avocats)
- Hors de vos compétences
- Comportement inapproprié

### Comment refuser poliment
"Je comprends votre besoin, mais ce sujet dépasse mon expertise. Je vous recommande de consulter un [avocat/professionnel] pour cette question spécifique."

## Quand escalader

### Signalez à SOS-Expat si
- Comportement menaçant ou inapproprié
- Demande de contact hors plateforme
- Tentative de fraude
- Situation d'urgence réelle (santé, sécurité)

### Comment signaler
1. Terminez l'échange poliment
2. Utilisez le bouton "Signaler"
3. Décrivez la situation
4. Conservez les preuves

## Prendre soin de vous

Après une situation difficile :
- Prenez une pause
- Parlez-en si besoin
- Ne le prenez pas personnellement
- Apprenez de l'expérience`,
    tags: ["difficultés", "clients mécontents", "gestion conflits", "escalade", "situations complexes"],
    faqSuggestions: [
      { question: "Un client me demande mon numéro personnel, que faire ?", answer: "Refusez poliment et expliquez que tous les échanges doivent passer par la plateforme pour la sécurité de tous." },
      { question: "Le client est très en colère, comment réagir ?", answer: "Restez calme, écoutez, reconnaissez sa frustration, et proposez des solutions. Si le comportement devient inapproprié, mettez fin à l'échange." },
      { question: "Puis-je bloquer un client ?", answer: "Vous pouvez signaler un comportement inapproprié. SOS-Expat décidera des mesures à prendre." }
    ],
    seoKeywords: ["gérer difficultés", "clients mécontents", "situations complexes", "gestion conflits expat"],
    subcategorySlug: "gerer-interventions",
    order: 5
  }
];

// =============================================================================
// SOUS-CATÉGORIE 3.3: PAIEMENTS & REVENUS AIDANTS (5 articles)
// =============================================================================
const PAIEMENTS_REVENUS_AIDANT: HelpArticleData[] = [
  {
    slug: "remuneration-expat-aidant",
    title: "Comprendre votre rémunération d'Expat Aidant",
    excerpt: "Comment fonctionne le système de paiement pour les Expats Aidants.",
    content: `## Modèle de rémunération

Comprenez comment vous êtes rémunéré sur SOS-Expat.

## Structure des revenus

### Frais de mise en relation
- Payés par le client à SOS-Expat
- Permettent la connexion client-prestataire
- Vous ne payez rien à SOS-Expat

### Vos tarifs
- Vous les définissez librement
- Payés directement par le client
- Via la plateforme sécurisée

## Flux financier

1. Le client paie les frais de mise en relation à SOS-Expat
2. Vous êtes mis en contact
3. Vous convenez des modalités avec le client
4. Le client paie vos honoraires via Stripe
5. L'argent arrive sur votre compte Stripe Connect
6. Transfert vers votre compte bancaire

## Ce que vous gardez

| Élément | Détail |
|---------|--------|
| Vos honoraires | 100% pour vous |
| Frais Stripe | ~3% déduits |
| Commission SOS-Expat | 0€ sur vos honoraires |

## Exemple concret

Pour une consultation à 25€ :
- Vos honoraires : 25€
- Frais Stripe (~3%) : ~0,75€
- **Vous recevez : ~24,25€**

## Définir vos tarifs

### Conseils
- Étudiez le marché
- Commencez accessible
- Augmentez avec les bons avis
- Restez transparent`,
    tags: ["rémunération", "tarifs", "revenus", "paiement", "honoraires"],
    faqSuggestions: [
      { question: "SOS-Expat prend-il une commission sur mes gains ?", answer: "Non, SOS-Expat ne prélève aucune commission sur vos honoraires. Seuls les frais Stripe (~3%) s'appliquent." },
      { question: "Puis-je fixer n'importe quel tarif ?", answer: "Oui, vos tarifs sont entièrement libres. Nous recommandons de rester compétitif au début." },
      { question: "Comment sont calculés les frais Stripe ?", answer: "Environ 2,9% + 0,30€ par transaction, déduits automatiquement." }
    ],
    seoKeywords: ["rémunération expat aidant", "tarifs prestataire", "revenus SOS-Expat", "paiement consultation"],
    subcategorySlug: "paiements-revenus-aidants",
    order: 1
  },
  {
    slug: "configurer-stripe-expat-aidant",
    title: "Configurer Stripe Connect pour vos paiements",
    excerpt: "Guide de configuration pour recevoir vos revenus.",
    content: `## Pourquoi Stripe Connect ?

Stripe est la solution de paiement sécurisée pour recevoir vos revenus.

## Configuration étape par étape

### 1. Accéder à la configuration
- Tableau de bord → "Paiements"
- Cliquez sur "Configurer Stripe"

### 2. Créer ou connecter un compte
- Nouveau : suivez les instructions
- Existant : connectez-le

### 3. Informations requises
- Identité (pièce d'identité)
- Coordonnées bancaires (IBAN)
- Adresse

### 4. Vérification
Stripe vérifie vos informations (24-48h)

### 5. Activation
Une fois vérifié, vous pouvez recevoir des paiements.

## Documents nécessaires

- ✅ Pièce d'identité valide
- ✅ RIB/IBAN
- ✅ Justificatif de domicile

## Transferts vers votre compte

### Fréquence
- Automatique : selon votre configuration
- Manuel : sur demande

### Délais
- Stripe → Banque : 2-7 jours ouvrés

## Problèmes courants

### Vérification bloquée
- Documents de mauvaise qualité
- Informations incohérentes
→ Resoumettez des documents lisibles

### Transfert en attente
- Vérification en cours
- Nouveau compte (délai initial plus long)
→ Attendez ou contactez Stripe`,
    tags: ["Stripe", "configuration", "paiements", "compte", "transferts"],
    faqSuggestions: [
      { question: "Stripe est-il obligatoire ?", answer: "Oui, c'est le seul moyen de recevoir vos paiements sur SOS-Expat." },
      { question: "Combien de temps pour le premier transfert ?", answer: "Le premier transfert peut prendre 7-14 jours le temps que Stripe vérifie votre compte." },
      { question: "Puis-je utiliser un compte Stripe existant ?", answer: "Oui, vous pouvez connecter un compte Stripe existant à SOS-Expat." }
    ],
    seoKeywords: ["Stripe expat aidant", "configurer paiements", "recevoir revenus", "compte Stripe"],
    subcategorySlug: "paiements-revenus-aidants",
    order: 2
  },
  {
    slug: "suivre-revenus-expat-aidant",
    title: "Suivre vos revenus et statistiques",
    excerpt: "Accédez à vos statistiques de revenus et à l'historique de vos gains.",
    content: `## Tableau de bord financier

Suivez vos revenus en temps réel depuis votre tableau de bord.

## Informations disponibles

### Vue globale
- Revenus du mois
- Revenus de l'année
- Nombre d'interventions
- Revenu moyen par intervention

### Historique détaillé
- Chaque transaction
- Date et montant
- Client concerné
- Statut (payé, en attente)

## Graphiques et tendances

### Évolution mensuelle
- Comparaison mois par mois
- Tendances de croissance

### Répartition
- Par type d'intervention
- Par pays des clients

## Filtres disponibles

- Par période
- Par statut de paiement
- Par type de mission

## Export des données

### Formats
- PDF (pour comptabilité)
- CSV (pour tableur)

### Utilisations
- Déclaration de revenus
- Suivi personnel
- Facturation

## Accès Stripe Dashboard

Pour plus de détails :
- Historique complet des transactions
- Statut des transferts
- Paramètres de compte`,
    tags: ["revenus", "statistiques", "suivi", "historique", "tableau de bord"],
    faqSuggestions: [
      { question: "Comment exporter mes revenus pour mes impôts ?", answer: "Accédez à l'onglet Revenus, sélectionnez la période, et cliquez sur 'Exporter'." },
      { question: "Pourquoi mon solde Stripe diffère de mon tableau de bord ?", answer: "Le tableau de bord montre les revenus bruts, Stripe montre après frais et transferts." },
      { question: "Puis-je voir mes revenus des années précédentes ?", answer: "Oui, l'historique complet est disponible sans limite de temps." }
    ],
    seoKeywords: ["revenus expat aidant", "statistiques gains", "suivi paiements", "historique revenus"],
    subcategorySlug: "paiements-revenus-aidants",
    order: 3
  },
  {
    slug: "fixer-tarifs-expat-aidant",
    title: "Fixer vos tarifs : conseils pratiques",
    excerpt: "Comment définir des tarifs attractifs et rentables.",
    content: `## Liberté tarifaire

Vous êtes libre de fixer vos tarifs. Voici nos conseils.

## Facteurs à considérer

### Votre expertise
- Années d'expatriation
- Domaines maîtrisés
- Langues parlées
- Pays connus

### Le marché
- Tarifs des autres Expats Aidants
- Pays ciblés
- Type de service

### Vos objectifs
- Revenus complémentaires ?
- Activité principale ?
- Nombre d'heures disponibles

## Types de tarification

### À la consultation
- Prix fixe pour un échange
- Durée définie (ex: 30 min)
- Simple à comprendre

### À l'heure
- Flexibilité de durée
- Adapté aux besoins variables

## Stratégies de prix

### Pour démarrer
- Tarifs légèrement inférieurs au marché
- Obtenir des premiers avis
- Construire votre réputation

### Pour croître
- Augmentez progressivement
- Justifiez par vos évaluations
- Spécialisez-vous

## Fourchettes indicatives

Ces tarifs sont indicatifs et varient selon les profils :
- Conseil basique : 15-25€ / 30 min
- Accompagnement approfondi : 30-50€ / heure
- Spécialités rares : tarifs plus élevés

## Transparence

- Affichez clairement vos tarifs
- Précisez ce qui est inclus
- Pas de surprise pour le client`,
    tags: ["tarifs", "prix", "stratégie", "facturation", "honoraires"],
    faqSuggestions: [
      { question: "Comment savoir si mes tarifs sont corrects ?", answer: "Consultez les profils similaires sur la plateforme et ajustez selon votre positionnement et vos résultats." },
      { question: "Puis-je avoir des tarifs différents selon les clients ?", answer: "Vous pouvez adapter selon la complexité, mais restez cohérent et transparent." },
      { question: "Dois-je baisser mes prix si je n'ai pas de demandes ?", answer: "Pas nécessairement. Vérifiez d'abord votre profil, vos disponibilités et votre réactivité." }
    ],
    seoKeywords: ["tarifs expat aidant", "fixer prix", "stratégie tarifaire", "honoraires consultation"],
    subcategorySlug: "paiements-revenus-aidants",
    order: 4
  },
  {
    slug: "fiscalite-expat-aidant",
    title: "Fiscalité et déclarations pour les Expats Aidants",
    excerpt: "Vos obligations fiscales en tant que prestataire.",
    content: `## Vos obligations fiscales

Les revenus d'Expat Aidant sont imposables. Voici ce que vous devez savoir.

## Statut fiscal

### En France
- Revenus à déclarer
- Catégorie : BNC (Bénéfices Non Commerciaux) ou micro-entreprise

### À l'étranger
- Les règles varient selon votre pays de résidence fiscale
- Consultez un expert local

## Régimes possibles (France)

### Micro-entrepreneur
- Simple et adapté aux revenus modestes
- Charges sociales proportionnelles
- Plafond de chiffre d'affaires

### Profession libérale
- Pour les revenus plus importants
- Comptabilité plus complexe
- Plus de déductions possibles

## Ce que SOS-Expat fournit

### Documents disponibles
- Historique des revenus
- Export pour comptabilité
- Récapitulatif annuel (janvier)

### Ce que nous ne faisons PAS
- Conseil fiscal
- Déclarations à votre place
- Prélèvement à la source

## Conseils pratiques

### Bonne gestion
- Gardez une trace de vos revenus
- Mettez de côté pour les impôts
- Consultez un expert si nécessaire

### Erreurs à éviter
- Ne pas déclarer vos revenus
- Mélanger personnel et professionnel
- Attendre la dernière minute

## Note importante

Ce guide est informatif. Consultez un expert-comptable pour votre situation spécifique.`,
    tags: ["fiscalité", "impôts", "déclarations", "revenus", "obligations"],
    faqSuggestions: [
      { question: "Dois-je déclarer mes revenus SOS-Expat ?", answer: "Oui, tous les revenus sont imposables et doivent être déclarés selon les règles de votre pays." },
      { question: "Quel statut choisir en France ?", answer: "Le micro-entrepreneur est souvent adapté pour débuter. Consultez un expert-comptable pour votre situation." },
      { question: "SOS-Expat transmet-il mes revenus aux impôts ?", answer: "Non, c'est à vous de déclarer vos revenus. Nous fournissons les documents nécessaires." }
    ],
    seoKeywords: ["fiscalité expat aidant", "impôts prestataire", "déclaration revenus", "micro-entrepreneur"],
    subcategorySlug: "paiements-revenus-aidants",
    order: 5
  }
];

// =============================================================================
// SOUS-CATÉGORIE 3.4: DÉVELOPPER VOTRE ACTIVITÉ (4 articles)
// =============================================================================
const DEVELOPPER_ACTIVITE: HelpArticleData[] = [
  {
    slug: "augmenter-visibilite-expat-aidant",
    title: "Augmenter votre visibilité sur SOS-Expat",
    excerpt: "Stratégies pour apparaître en haut des résultats et attirer plus de clients.",
    content: `## Facteurs de visibilité

Comprenez comment fonctionne le classement pour optimiser votre position.

## Critères de classement

### Performance
- Note moyenne
- Taux de réponse
- Taux de satisfaction
- Nombre d'interventions

### Profil
- Complétude
- Qualité de la biographie
- Photo professionnelle
- Spécialités détaillées

### Activité
- Connexions régulières
- Réactivité
- Mode SOS activé

## Optimiser votre profil

### Photo
- Naturelle et souriante
- Professionnelle mais accessible
- Bonne qualité

### Biographie
- Engageante et personnelle
- Mots-clés pertinents
- Expérience mise en valeur

### Spécialités
- Précises et recherchées
- Correspondant à la demande réelle

## Améliorer votre performance

### Réactivité
- Répondez rapidement
- Activez le mode SOS régulièrement
- Gardez vos notifications activées

### Qualité
- Soignez chaque intervention
- Demandez des avis
- Assurez un suivi

## Badges et distinctions

### Badge "Réactif"
Temps de réponse < 5 min pendant 30 jours

### Badge "Top Aidant"
Note ≥ 4.8 + 10 avis minimum

Ces badges augmentent significativement votre visibilité.`,
    tags: ["visibilité", "classement", "profil", "optimisation", "croissance"],
    faqSuggestions: [
      { question: "Combien de temps pour voir des résultats ?", answer: "Avec un profil optimisé et de la réactivité, vous pouvez voir des améliorations en 2-4 semaines." },
      { question: "Le nombre d'interventions compte-t-il ?", answer: "Oui, les Expats Aidants actifs avec des missions régulières sont favorisés." },
      { question: "Puis-je payer pour plus de visibilité ?", answer: "Non, le classement est basé uniquement sur la performance et la qualité du profil." }
    ],
    seoKeywords: ["visibilité expat aidant", "classement SOS-Expat", "plus de clients", "optimiser profil"],
    subcategorySlug: "developper-activite",
    order: 1
  },
  {
    slug: "obtenir-avis-positifs-expat-aidant",
    title: "Obtenir des avis positifs de vos clients",
    excerpt: "Comment encourager les évaluations et bâtir votre réputation.",
    content: `## L'importance des avis

Les avis sont déterminants dans le choix des clients.

## Quand demander un avis

### Bon moment
- Fin d'une consultation réussie
- Client satisfait explicitement
- Problème résolu

### Comment demander
- Message post-consultation
- Naturellement en fin d'échange
- Sans insister

## Maximiser les chances

### Avant
- Soyez clair sur ce que vous offrez
- Gérez les attentes
- Préparez-vous

### Pendant
- Écoutez activement
- Donnez des conseils utiles
- Soyez humain et empathique

### Après
- Envoyez un récapitulatif
- Proposez des ressources
- Remerciez

## Demander poliment

"Merci pour cet échange ! Si mes conseils vous ont été utiles, un petit avis sur mon profil aiderait d'autres expatriés à me trouver. Cela prend moins d'une minute. 😊"

## Gérer les avis négatifs

### Ne paniquez pas
Un avis négatif parmi beaucoup de positifs est normal.

### Répondez professionnellement
- Restez courtois
- Reconnaissez les points valides
- Proposez une solution

### Apprenez
Utilisez les critiques pour vous améliorer.`,
    tags: ["avis", "évaluations", "réputation", "feedback", "clients"],
    faqSuggestions: [
      { question: "Combien d'avis pour être bien visible ?", answer: "Votre note apparaît dès 3 avis. Plus vous en avez, plus vous inspirez confiance." },
      { question: "Un avis négatif ruine-t-il mon profil ?", answer: "Non, si vous avez de nombreux avis positifs. Répondez professionnellement et apprenez de l'expérience." },
      { question: "Puis-je demander la suppression d'un avis ?", answer: "Seuls les avis contraires aux règles peuvent être supprimés après vérification." }
    ],
    seoKeywords: ["avis expat aidant", "évaluations positives", "réputation prestataire", "feedback clients"],
    subcategorySlug: "developper-activite",
    order: 2
  },
  {
    slug: "elargir-competences-expat-aidant",
    title: "Élargir vos compétences et domaines d'expertise",
    excerpt: "Comment diversifier vos services pour toucher plus de clients.",
    content: `## Diversification stratégique

Élargir vos compétences vous ouvre de nouvelles opportunités.

## Identifier de nouveaux domaines

### Analyser votre expérience
- Qu'avez-vous appris pendant votre expatriation ?
- Quels défis avez-vous surmontés ?
- Quelles ressources avez-vous découvertes ?

### Écouter les besoins
- Quelles questions reviennent souvent ?
- Quels sujets sont peu couverts ?
- Où pouvez-vous apporter de la valeur ?

## Domaines porteurs

### Très demandés
- Recherche de logement
- Démarches administratives
- Ouverture de compte bancaire
- Scolarité des enfants

### Spécialisations valorisantes
- Création d'entreprise
- Relocation professionnelle
- Adaptation culturelle
- Réseautage local

## Développer ses connaissances

### Se former
- Webinaires et formations
- Lectures spécialisées
- Expériences personnelles

### Documenter
- Créez vos ressources
- Rassemblez des contacts utiles
- Testez par vous-même

## Mettre à jour son profil

Quand vous ajoutez une compétence :
- Mettez à jour vos spécialités
- Enrichissez votre biographie
- Mentionnez votre expérience dans ce domaine`,
    tags: ["compétences", "expertise", "diversification", "spécialisation", "développement"],
    faqSuggestions: [
      { question: "Dois-je être expert pour ajouter un domaine ?", answer: "Vous devez avoir une expérience réelle et utile, mais pas nécessairement être expert. Soyez honnête sur votre niveau." },
      { question: "Comment trouver les domaines demandés ?", answer: "Observez les demandes que vous recevez et les profils des autres Expats Aidants." },
      { question: "Puis-je retirer un domaine de mon profil ?", answer: "Oui, vous pouvez modifier vos spécialités à tout moment depuis votre profil." }
    ],
    seoKeywords: ["compétences expat aidant", "élargir expertise", "diversification services", "spécialisation expatrié"],
    subcategorySlug: "developper-activite",
    order: 3
  },
  {
    slug: "statistiques-performance-expat-aidant",
    title: "Analyser vos statistiques de performance",
    excerpt: "Utilisez vos données pour améliorer continuellement votre activité.",
    content: `## Tableau de bord performance

Vos statistiques vous aident à progresser.

## Indicateurs clés

### Taux de réponse
- % de demandes auxquelles vous avez répondu
- Objectif : > 90%
- Impact sur la visibilité

### Temps de réponse moyen
- Délai pour répondre aux demandes
- Objectif SOS : < 5 minutes
- Objectif standard : < 2 heures

### Note moyenne
- Moyenne de vos évaluations
- Objectif : > 4.5/5
- Crucial pour le classement

### Taux de satisfaction
- % de clients satisfaits (note ≥ 4)
- Objectif : > 95%

## Analyser les tendances

### Questions à se poser
- Ma note évolue-t-elle positivement ?
- Mon temps de réponse s'améliore-t-il ?
- Mes revenus augmentent-ils ?

### Actions correctives
- Note en baisse → Qualité à améliorer
- Peu de demandes → Profil à optimiser
- Temps de réponse élevé → Disponibilités à revoir

## Fixer des objectifs

### Court terme (1 mois)
- Améliorer un indicateur spécifique
- Obtenir X avis supplémentaires

### Moyen terme (3-6 mois)
- Atteindre un badge
- Augmenter les revenus de X%

## Alertes

Vous êtes notifié si :
- Votre note baisse significativement
- Votre temps de réponse augmente
- Vous risquez de perdre un badge`,
    tags: ["statistiques", "performance", "analyse", "KPIs", "amélioration"],
    faqSuggestions: [
      { question: "Où voir mes statistiques ?", answer: "Dans votre tableau de bord prestataire, section 'Performance' ou 'Statistiques'." },
      { question: "Comment améliorer mon temps de réponse ?", answer: "Activez les notifications, gardez l'app accessible, et réservez des plages pour traiter les demandes." },
      { question: "Les statistiques sont-elles visibles par les clients ?", answer: "Seule la note moyenne est visible. Les autres statistiques sont pour votre usage personnel." }
    ],
    seoKeywords: ["statistiques expat aidant", "performance prestataire", "KPIs", "analyse activité"],
    subcategorySlug: "developper-activite",
    order: 4
  }
];

// =============================================================================
// EXPORT DE TOUS LES ARTICLES EXPATS AIDANTS
// =============================================================================
export const HELP_ARTICLES_HELPERS: HelpArticleData[] = [
  ...DEVENIR_EXPAT_AIDANT,
  ...GERER_INTERVENTIONS,
  ...PAIEMENTS_REVENUS_AIDANT,
  ...DEVELOPPER_ACTIVITE
];

// Export par sous-catégorie pour référence
export const HELPER_ARTICLES_BY_SUBCATEGORY = {
  devenirExpatAidant: DEVENIR_EXPAT_AIDANT,
  gererInterventions: GERER_INTERVENTIONS,
  paiementsRevenusAidant: PAIEMENTS_REVENUS_AIDANT,
  developperActivite: DEVELOPPER_ACTIVITE
};
