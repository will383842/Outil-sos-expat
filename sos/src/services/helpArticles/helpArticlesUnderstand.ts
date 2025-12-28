// src/services/helpArticles/helpArticlesUnderstand.ts
// Articles pour la catégorie "Comprendre SOS-Expat" - Contenu FR uniquement
// La traduction vers les 8 autres langues se fait à l'initialisation

import { HelpArticleData } from './helpArticlesClients';

// =============================================================================
// SOUS-CATÉGORIE 4.1: PRÉSENTATION (5 articles)
// =============================================================================
const PRESENTATION: HelpArticleData[] = [
  {
    slug: "qu-est-ce-que-sos-expat",
    title: "Qu'est-ce que SOS-Expat ?",
    excerpt: "Découvrez la plateforme qui connecte 304 millions d'expatriés avec des professionnels dans 197 pays.",
    content: `## Notre mission

SOS-Expat est la plateforme de référence pour l'assistance aux expatriés dans le monde entier.

## Le problème que nous résolvons

Être expatrié, c'est formidable mais aussi plein de défis :
- Barrière linguistique
- Méconnaissance des procédures locales
- Urgences loin de chez soi
- Solitude face aux problèmes administratifs

## Notre solution

SOS-Expat vous connecte en quelques minutes avec :

### Des avocats qualifiés
- Inscrits à un barreau
- Vérifiés par nos équipes
- Experts en droit international et local

### Des Expats Aidants
- Expatriés expérimentés
- Connaissance pratique du terrain
- Conseils basés sur l'expérience

## Nos chiffres

- **197 pays** couverts
- **304 millions** d'expatriés potentiellement aidés
- **9 langues** disponibles
- **< 5 minutes** de mise en relation en urgence

## Ce qui nous différencie

### Rapidité
Réponse en moins de 5 minutes pour les urgences.

### Multilingue
Interface et prestataires dans 9 langues.

### Couverture mondiale
Où que vous soyez, nous avons des prestataires.

### Sécurité
Paiements sécurisés, prestataires vérifiés.`,
    tags: ["présentation", "mission", "plateforme", "expatriés", "assistance"],
    faqSuggestions: [
      { question: "SOS-Expat est-il disponible dans mon pays ?", answer: "SOS-Expat opère dans 197 pays. Si vous êtes expatrié quelque part dans le monde, nous pouvons probablement vous aider." },
      { question: "En quelles langues puis-je être assisté ?", answer: "Nos services sont disponibles en 9 langues : français, anglais, espagnol, allemand, portugais, russe, chinois, hindi et arabe." },
      { question: "SOS-Expat remplace-t-il une assurance ?", answer: "Non, SOS-Expat est un service de mise en relation complémentaire. Nous vous connectons avec des professionnels, mais ne remplaçons pas une assurance." }
    ],
    seoKeywords: ["SOS-Expat présentation", "aide expatriés", "plateforme expatriation", "assistance internationale"],
    subcategorySlug: "presentation",
    order: 1
  },
  {
    slug: "comment-fonctionne-sos-expat",
    title: "Comment fonctionne SOS-Expat",
    excerpt: "Explication du fonctionnement de la plateforme en 4 étapes simples.",
    content: `## Fonctionnement en 4 étapes

SOS-Expat est conçu pour être simple et rapide.

## Étape 1 : Décrivez votre besoin

### Comment
- Cliquez sur "Besoin d'aide" ou le bouton SOS
- Décrivez brièvement votre situation
- Indiquez votre pays et langue préférée

### Ce que nous avons besoin de savoir
- Type de problème (juridique, administratif, pratique)
- Niveau d'urgence
- Informations de base

## Étape 2 : Choisissez un prestataire

### Options
- **Recommandé par nous** : basé sur votre besoin
- **Votre choix** : parcourez les profils

### Informations sur les prestataires
- Photo et biographie
- Spécialités
- Note et avis
- Tarifs

## Étape 3 : Payez de manière sécurisée

### Frais de mise en relation
- Affichés avant confirmation
- Paiement par carte bancaire
- Sécurisé par Stripe

### Honoraires du prestataire
- Négociés avec le prestataire
- Payés via la plateforme

## Étape 4 : Échangez avec votre prestataire

### Modes de contact
- Appel téléphonique (via la plateforme)
- Messagerie sécurisée
- Visioconférence (si disponible)

### Après l'échange
- Évaluez le prestataire
- Consultez l'historique
- Recontactez si besoin`,
    tags: ["fonctionnement", "étapes", "processus", "utilisation", "guide"],
    faqSuggestions: [
      { question: "Combien de temps pour être mis en relation ?", answer: "En mode SOS : moins de 5 minutes. En mode standard : quelques heures selon la disponibilité." },
      { question: "Puis-je choisir mon prestataire ?", answer: "Oui, vous pouvez parcourir les profils et choisir, ou accepter notre recommandation basée sur votre besoin." },
      { question: "Le paiement est-il sécurisé ?", answer: "Oui, nous utilisons Stripe, le leader mondial du paiement en ligne, avec cryptage SSL." }
    ],
    seoKeywords: ["fonctionnement SOS-Expat", "comment ça marche", "étapes utilisation", "processus plateforme"],
    subcategorySlug: "presentation",
    order: 2
  },
  {
    slug: "types-prestataires-sos-expat",
    title: "Les types de prestataires sur SOS-Expat",
    excerpt: "Comprenez la différence entre avocats et Expats Aidants pour choisir le bon accompagnement.",
    content: `## Deux types de prestataires

SOS-Expat propose deux types de prestataires pour répondre à tous vos besoins.

## Avocats

### Qui sont-ils ?
- Professionnels du droit inscrits à un barreau
- Diplômés et vérifiés
- Assurés professionnellement

### Quand les consulter ?
- Questions juridiques
- Problèmes légaux
- Arrestation ou garde à vue
- Litiges
- Procédures officielles

### Ce qu'ils peuvent faire
- Conseils juridiques
- Rédaction de documents légaux
- Représentation (selon les cas)
- Défense de vos droits

### Ce qu'ils ne font pas
- Conseils pratiques du quotidien
- Accompagnement non juridique

## Expats Aidants

### Qui sont-ils ?
- Expatriés expérimentés
- Connaissance pratique du terrain
- Vérifiés par SOS-Expat

### Quand les consulter ?
- Installation dans un nouveau pays
- Démarches administratives courantes
- Conseils pratiques
- Intégration culturelle

### Ce qu'ils peuvent faire
- Partager leur expérience
- Guider dans les démarches
- Recommander des ressources
- Accompagner émotionnellement

### Ce qu'ils ne font pas
- Conseils juridiques
- Représentation légale

## Tableau comparatif

| Critère | Avocat | Expat Aidant |
|---------|--------|--------------|
| Expertise | Juridique | Pratique |
| Diplôme | Requis | Non requis |
| Conseils légaux | Oui | Non |
| Expérience terrain | Variable | Oui |
| Tarif | Plus élevé | Plus accessible |`,
    tags: ["prestataires", "avocats", "expats aidants", "différences", "choix"],
    faqSuggestions: [
      { question: "Comment savoir si j'ai besoin d'un avocat ou d'un Expat Aidant ?", answer: "Pour toute question juridique ou légale, consultez un avocat. Pour des conseils pratiques sur la vie quotidienne, un Expat Aidant suffit." },
      { question: "Un Expat Aidant peut-il me conseiller sur mon visa ?", answer: "Il peut partager son expérience, mais pour des questions légales sur les visas, consultez un avocat." },
      { question: "Les Expats Aidants sont-ils moins fiables ?", answer: "Non, ils sont vérifiés par SOS-Expat. Leur expertise est différente : pratique plutôt que juridique." }
    ],
    seoKeywords: ["types prestataires", "avocat vs expat aidant", "choisir prestataire", "différence avocat"],
    subcategorySlug: "presentation",
    order: 3
  },
  {
    slug: "couverture-geographique-sos-expat",
    title: "Notre couverture géographique : 197 pays",
    excerpt: "SOS-Expat est présent partout où vous pouvez être expatrié.",
    content: `## Une couverture mondiale

SOS-Expat opère dans 197 pays, couvrant la quasi-totalité du globe.

## Répartition par continent

### Europe
Tous les pays européens sont couverts, avec une forte présence de prestataires francophones, anglophones et germanophones.

### Amérique du Nord
États-Unis, Canada, Mexique avec des prestataires multilingues.

### Amérique Latine
Couverture complète avec des prestataires hispanophones et lusophones.

### Asie
De la Chine au Japon en passant par l'Inde et l'Asie du Sud-Est.

### Afrique
Couverture des principales destinations d'expatriation africaines.

### Moyen-Orient
Émirats, Arabie Saoudite et autres pays du Golfe.

### Océanie
Australie, Nouvelle-Zélande et îles du Pacifique.

## Comment ça fonctionne

### Prestataires locaux
- Avocats inscrits au barreau local
- Expats Aidants résidant sur place

### Prestataires à distance
- Experts connaissant bien un pays
- Consultations par téléphone/visio

## Langues disponibles

- Français
- Anglais
- Espagnol
- Allemand
- Portugais
- Russe
- Chinois (Mandarin)
- Hindi
- Arabe

## Zones à forte présence

Nos prestataires sont particulièrement nombreux dans :
- Grandes capitales mondiales
- Destinations d'expatriation populaires
- Pays francophones et anglophones`,
    tags: ["couverture", "géographie", "pays", "monde", "international"],
    faqSuggestions: [
      { question: "Et si aucun prestataire n'est disponible dans mon pays ?", answer: "C'est rare mais possible. Dans ce cas, nous pouvons vous mettre en relation avec un prestataire expert de votre pays depuis l'étranger." },
      { question: "Les prestataires sont-ils tous sur place ?", answer: "Beaucoup sont locaux, mais certains peuvent conseiller depuis l'étranger grâce à leur expertise du pays." },
      { question: "Puis-je avoir un prestataire d'un autre pays ?", answer: "Oui, ce qui compte c'est la compétence et la langue, pas forcément la localisation." }
    ],
    seoKeywords: ["couverture SOS-Expat", "197 pays", "présence mondiale", "expatriation internationale"],
    subcategorySlug: "presentation",
    order: 4
  },
  {
    slug: "langues-disponibles-sos-expat",
    title: "Les 9 langues disponibles sur SOS-Expat",
    excerpt: "Notre plateforme et nos prestataires parlent votre langue.",
    content: `## Une plateforme multilingue

SOS-Expat est entièrement disponible en 9 langues.

## Langues de l'interface

### Français 🇫🇷
Langue d'origine de la plateforme.

### Anglais 🇬🇧
Langue internationale par excellence.

### Espagnol 🇪🇸
Pour l'Espagne et l'Amérique latine.

### Allemand 🇩🇪
Pour l'Allemagne, l'Autriche, la Suisse.

### Portugais 🇵🇹🇧🇷
Portugal et Brésil.

### Russe 🇷🇺
Russie et pays russophones.

### Chinois (Mandarin) 🇨🇳
Chine et communautés chinoises.

### Hindi 🇮🇳
Inde.

### Arabe 🇸🇦
Moyen-Orient et pays arabophones.

## Comment ça fonctionne

### Interface
- Sélectionnez votre langue
- Navigation entièrement traduite
- Contenu d'aide dans votre langue

### Prestataires
- Filtrez par langue parlée
- Échangez dans votre langue
- Documentation traduite

## Correspondance automatique

Quand vous créez une demande :
1. Indiquez votre langue préférée
2. Nous cherchons des prestataires parlant cette langue
3. Vous êtes mis en relation dans votre langue

## Traduction

- L'interface est traduite professionnellement
- Les profils des prestataires peuvent être traduits automatiquement
- Les messages restent dans leur langue d'origine`,
    tags: ["langues", "multilingue", "traduction", "international", "communication"],
    faqSuggestions: [
      { question: "Puis-je changer la langue de l'interface ?", answer: "Oui, à tout moment via le sélecteur de langue en haut de la page." },
      { question: "Les prestataires parlent-ils tous plusieurs langues ?", answer: "La plupart parlent au moins 2 langues. Vous pouvez filtrer par langue dans la recherche." },
      { question: "Et si je parle une langue non listée ?", answer: "Contactez-nous. Nous travaillons à étendre notre couverture linguistique." }
    ],
    seoKeywords: ["langues SOS-Expat", "multilingue", "9 langues", "traduction plateforme"],
    subcategorySlug: "presentation",
    order: 5
  }
];

// =============================================================================
// SOUS-CATÉGORIE 4.2: FAQ GÉNÉRALE (4 articles)
// =============================================================================
const FAQ_GENERALE: HelpArticleData[] = [
  {
    slug: "questions-frequentes-clients",
    title: "Questions fréquentes des clients",
    excerpt: "Réponses aux questions les plus posées par les utilisateurs de SOS-Expat.",
    content: `## Questions les plus fréquentes

Voici les réponses aux questions que nous recevons le plus souvent.

## Sur le service

### SOS-Expat est-il gratuit ?
L'inscription est gratuite. Vous payez des frais de mise en relation et les honoraires du prestataire uniquement lorsque vous utilisez le service.

### En combien de temps suis-je mis en relation ?
- Mode SOS (urgence) : moins de 5 minutes
- Mode standard : quelques heures selon la disponibilité

### Puis-je annuler une demande ?
Oui, avant qu'un prestataire n'accepte. Après acceptation, les frais de mise en relation sont dus.

## Sur les prestataires

### Comment sont vérifiés les avocats ?
Nous vérifions leur inscription au barreau, leur assurance professionnelle et leur identité.

### Puis-je choisir mon prestataire ?
Oui, vous pouvez parcourir les profils et choisir, ou accepter notre recommandation.

### Et si je ne suis pas satisfait ?
Contactez notre support. Nous proposons des solutions selon la situation (remédiation, remboursement).

## Sur les paiements

### Quels moyens de paiement acceptez-vous ?
Cartes bancaires Visa, Mastercard et American Express.

### Les paiements sont-ils sécurisés ?
Oui, nous utilisons Stripe avec cryptage SSL et conformité PCI-DSS.

### Comment obtenir une facture ?
Les factures sont automatiquement disponibles dans votre espace client.

## Sur la confidentialité

### Mes échanges sont-ils confidentiels ?
Oui, les échanges sont cryptés et protégés par le secret professionnel (pour les avocats).

### Mes données sont-elles vendues ?
Jamais. Nous sommes conformes au RGPD et ne vendons aucune donnée.`,
    tags: ["FAQ", "questions", "clients", "réponses", "aide"],
    faqSuggestions: [
      { question: "Comment contacter le support ?", answer: "Via le formulaire de contact, le chat en ligne ou par email. Délai de réponse : 24-48h." },
      { question: "SOS-Expat est-il disponible 24/7 ?", answer: "La plateforme est accessible 24/7. Les prestataires sont disponibles selon leurs horaires." },
      { question: "Puis-je utiliser SOS-Expat depuis n'importe quel pays ?", answer: "Oui, la plateforme est accessible mondialement avec une couverture dans 197 pays." }
    ],
    seoKeywords: ["FAQ SOS-Expat", "questions fréquentes", "aide utilisateurs", "réponses clients"],
    subcategorySlug: "faq-generale",
    order: 1
  },
  {
    slug: "questions-frequentes-prestataires",
    title: "Questions fréquentes des prestataires",
    excerpt: "Réponses aux questions courantes des avocats et Expats Aidants.",
    content: `## Questions des prestataires

Les réponses aux questions que se posent les avocats et Expats Aidants.

## Inscription et profil

### L'inscription est-elle payante ?
Non, l'inscription est entièrement gratuite. SOS-Expat ne prend pas de commission sur vos honoraires.

### Combien de temps pour être accepté ?
24 à 72 heures pour la vérification des documents.

### Puis-je modifier mon profil après inscription ?
Oui, à tout moment depuis votre tableau de bord.

## Missions et clients

### Comment recevoir des demandes ?
Complétez votre profil, définissez vos disponibilités et activez les notifications.

### Puis-je refuser une mission ?
Oui, mais un taux de refus élevé peut affecter votre visibilité.

### Comment sont attribuées les demandes SOS ?
Au premier prestataire disponible qui correspond aux critères du client.

## Paiements

### Comment suis-je payé ?
Via Stripe Connect, directement sur votre compte bancaire.

### Quels sont les délais de paiement ?
Après réception du paiement client : 2-7 jours ouvrés pour le transfert.

### Y a-t-il des frais ?
Stripe prélève environ 3% par transaction. SOS-Expat ne prend pas de commission sur vos honoraires.

## Performance

### Comment améliorer ma visibilité ?
Profil complet, bonne note, réactivité et disponibilité régulière.

### Que se passe-t-il si je reçois un avis négatif ?
Vous pouvez répondre. Un avis négatif parmi des positifs n'est pas dramatique.`,
    tags: ["FAQ", "prestataires", "avocats", "expats aidants", "questions"],
    faqSuggestions: [
      { question: "Puis-je travailler sur SOS-Expat à temps plein ?", answer: "Oui, certains prestataires en font leur activité principale. C'est vous qui décidez de votre volume." },
      { question: "Comment me différencier des autres prestataires ?", answer: "Profil bien rédigé, photo professionnelle, spécialisations uniques et excellentes évaluations." },
      { question: "Que faire si un client pose problème ?", answer: "Signalez via la plateforme. Nous intervenons pour résoudre les situations difficiles." }
    ],
    seoKeywords: ["FAQ prestataires", "questions avocats", "aide expats aidants", "réponses prestataires"],
    subcategorySlug: "faq-generale",
    order: 2
  },
  {
    slug: "tarification-expliquee",
    title: "La tarification SOS-Expat expliquée simplement",
    excerpt: "Comprenez notre modèle de prix transparent et sans surprise.",
    content: `## Notre modèle de tarification

SOS-Expat utilise un modèle simple et transparent.

## Ce que paie le client

### 1. Frais de mise en relation
- Payés à SOS-Expat
- Couvrent la plateforme et le service
- Affichés avant confirmation
- Varient selon le type de prestataire et l'urgence

### 2. Honoraires du prestataire
- Payés au prestataire
- Fixés librement par chaque prestataire
- Négociés directement si nécessaire

## Ce que reçoit le prestataire

- 100% de ses honoraires
- Moins les frais Stripe (~3%)
- Aucune commission SOS-Expat

## Pourquoi ce modèle ?

### Transparence
- Vous savez exactement ce que vous payez
- Pas de frais cachés
- Prix affichés avant confirmation

### Qualité
- Les frais de mise en relation financent la vérification des prestataires
- Maintien de la plateforme
- Support client

### Équité
- Les prestataires gardent leurs honoraires
- Pas de commission sur le travail effectué

## Exemples concrets

### Consultation avocat
- Frais de mise en relation : affichés selon urgence
- Honoraires avocat : selon le profil (ex: 80€/h)
- **Total client** : frais + honoraires

### Consultation Expat Aidant
- Frais de mise en relation : affichés selon urgence
- Honoraires aidant : selon le profil (ex: 25€/30min)
- **Total client** : frais + honoraires`,
    tags: ["tarification", "prix", "frais", "honoraires", "transparence"],
    faqSuggestions: [
      { question: "Y a-t-il des frais cachés ?", answer: "Non, absolument aucun. Le montant affiché avant confirmation est le montant exact." },
      { question: "Pourquoi les frais de mise en relation varient ?", answer: "Ils varient selon le type de prestataire (avocat vs expat aidant) et le niveau d'urgence (SOS vs standard)." },
      { question: "Puis-je négocier les honoraires du prestataire ?", answer: "C'est possible, mais les tarifs affichés sont généralement fixes. Discutez directement avec le prestataire." }
    ],
    seoKeywords: ["tarification SOS-Expat", "prix expliqués", "frais mise en relation", "honoraires prestataires"],
    subcategorySlug: "faq-generale",
    order: 3
  },
  {
    slug: "differences-avec-autres-services",
    title: "Différences avec les autres services d'aide aux expatriés",
    excerpt: "Ce qui distingue SOS-Expat des autres solutions disponibles.",
    content: `## SOS-Expat vs les alternatives

Comprenez ce qui nous différencie des autres options.

## SOS-Expat vs Assurances voyage

| SOS-Expat | Assurance voyage |
|-----------|-----------------|
| Mise en relation immédiate | Souvent des délais |
| Avocats locaux | Réseau limité |
| Conseils pratiques | Focus médical/rapatriement |
| Paiement à l'usage | Cotisation annuelle |

**Conclusion** : Complémentaires, pas substituables.

## SOS-Expat vs Forums d'expatriés

| SOS-Expat | Forums |
|-----------|--------|
| Réponse garantie | Réponse aléatoire |
| Professionnels vérifiés | Anonymes |
| Conseils personnalisés | Conseils généraux |
| Confidentialité | Public |

**Conclusion** : Forums utiles pour des questions générales, SOS-Expat pour des besoins spécifiques.

## SOS-Expat vs Recherche Google

| SOS-Expat | Recherche seul |
|-----------|----------------|
| Professionnel adapté | Chercher dans la masse |
| Vérifié et noté | Qualité inconnue |
| Rapide | Potentiellement long |
| Support si problème | Seul face aux difficultés |

**Conclusion** : Google aide à s'informer, SOS-Expat à agir.

## SOS-Expat vs Ambassade

| SOS-Expat | Ambassade |
|-----------|-----------|
| 24/7 | Horaires de bureau |
| Avocat en 5 min | Pas de recommandation |
| Conseils pratiques | Services administratifs |
| Payant | Gratuit |

**Conclusion** : Ambassade pour les documents officiels, SOS-Expat pour l'assistance active.

## Notre valeur ajoutée

- Rapidité (< 5 min en urgence)
- Couverture mondiale (197 pays)
- Prestataires vérifiés
- 9 langues
- Support 24/7`,
    tags: ["comparaison", "différences", "alternatives", "avantages", "concurrence"],
    faqSuggestions: [
      { question: "Ai-je besoin de SOS-Expat si j'ai une bonne assurance ?", answer: "Oui, les services sont complémentaires. L'assurance couvre les frais, SOS-Expat apporte l'expertise locale immédiate." },
      { question: "Les forums gratuits ne suffisent-ils pas ?", answer: "Pour des questions générales oui. Pour des conseils personnalisés et fiables, un professionnel vérifié est préférable." },
      { question: "Pourquoi payer si l'ambassade aide gratuitement ?", answer: "L'ambassade ne fournit pas d'avocat ni de conseils pratiques personnalisés, et n'est pas disponible 24/7." }
    ],
    seoKeywords: ["SOS-Expat vs assurance", "comparaison services expatriés", "avantages SOS-Expat", "différences plateformes"],
    subcategorySlug: "faq-generale",
    order: 4
  }
];

// =============================================================================
// SOUS-CATÉGORIE 4.3: NOUS CONTACTER (4 articles)
// =============================================================================
const NOUS_CONTACTER: HelpArticleData[] = [
  {
    slug: "contacter-support-sos-expat",
    title: "Comment contacter le support SOS-Expat",
    excerpt: "Toutes les façons de joindre notre équipe d'assistance.",
    content: `## Nos canaux de contact

Plusieurs moyens pour nous joindre selon votre besoin.

## Email

### Adresse
support@sos-expat.com

### Délai de réponse
24-48 heures ouvrées

### Idéal pour
- Questions non urgentes
- Demandes détaillées
- Envoi de documents

## Formulaire de contact

### Accès
Site web → Centre d'aide → "Nous contacter"

### Avantages
- Formulaire guidé
- Catégorisation automatique
- Suivi de ticket

## Chat en ligne

### Disponibilité
Lundi-Vendredi, 9h-18h (heure de Paris)

### Idéal pour
- Questions rapides
- Aide à la navigation
- Problèmes techniques immédiats

## Réseaux sociaux

### Présence
- Twitter/X
- Facebook
- LinkedIn

### Note
Pour les questions privées, privilégiez l'email ou le formulaire.

## Selon votre besoin

### Urgence technique
→ Chat en ligne (si disponible) ou email avec "URGENT" en objet

### Question générale
→ Centre d'aide d'abord, puis email si besoin

### Réclamation
→ Formulaire de contact avec section "Réclamation"

### Suggestion
→ Email ou formulaire avec section "Suggestion"`,
    tags: ["contact", "support", "aide", "assistance", "email"],
    faqSuggestions: [
      { question: "Quel est le délai de réponse du support ?", answer: "24-48 heures ouvrées pour les emails. Le chat est en temps réel pendant les heures d'ouverture." },
      { question: "Le support est-il disponible 24/7 ?", answer: "Le chat est disponible en heures ouvrées. L'email est consultable en continu avec réponse sous 24-48h." },
      { question: "Puis-je appeler le support par téléphone ?", answer: "Actuellement, nous privilégions l'écrit pour un meilleur suivi. Le chat est disponible pour des échanges en temps réel." }
    ],
    seoKeywords: ["contacter SOS-Expat", "support client", "aide assistance", "email support"],
    subcategorySlug: "nous-contacter",
    order: 1
  },
  {
    slug: "signaler-probleme-bug",
    title: "Signaler un problème ou bug technique",
    excerpt: "Comment nous informer d'un dysfonctionnement de la plateforme.",
    content: `## Signaler un problème technique

Aidez-nous à améliorer la plateforme en signalant les bugs.

## Informations à fournir

### Essentielles
- Description du problème
- Étapes pour reproduire
- Ce que vous attendiez vs ce qui s'est passé

### Utiles
- Appareil utilisé (ordinateur, téléphone)
- Navigateur et version
- Captures d'écran
- Messages d'erreur

## Comment signaler

### Via le formulaire
1. Centre d'aide → "Signaler un bug"
2. Remplissez le formulaire détaillé
3. Joignez des captures d'écran
4. Envoyez

### Via email
Envoyez à support@sos-expat.com avec :
- Objet : [BUG] Description courte
- Corps : Détails complets
- Pièces jointes : captures d'écran

## Problèmes courants et solutions

### Page qui ne charge pas
- Rafraîchissez la page
- Videz le cache du navigateur
- Essayez un autre navigateur

### Paiement qui échoue
- Vérifiez vos informations bancaires
- Contactez votre banque
- Essayez une autre carte

### Impossible de se connecter
- Vérifiez vos identifiants
- Utilisez "Mot de passe oublié"
- Videz les cookies

## Suivi de votre signalement

- Accusé de réception automatique
- Mise à jour par email si nécessaire
- Notification quand résolu`,
    tags: ["bug", "problème", "technique", "signalement", "erreur"],
    faqSuggestions: [
      { question: "Comment faire une capture d'écran ?", answer: "Sur Windows : touche Impr écran. Sur Mac : Cmd+Shift+4. Sur mobile : boutons volume + power." },
      { question: "Mon signalement est-il traité ?", answer: "Oui, tous les signalements sont examinés. Vous recevez un accusé de réception et des mises à jour." },
      { question: "Puis-je voir les bugs connus ?", answer: "Les bugs majeurs sont communiqués sur notre page de statut si disponible, ou via email aux utilisateurs concernés." }
    ],
    seoKeywords: ["signaler bug", "problème technique", "erreur plateforme", "support technique"],
    subcategorySlug: "nous-contacter",
    order: 2
  },
  {
    slug: "faire-suggestion-amelioration",
    title: "Faire une suggestion d'amélioration",
    excerpt: "Vos idées comptent ! Comment nous proposer des améliorations.",
    content: `## Vos idées sont précieuses

SOS-Expat évolue grâce aux retours de ses utilisateurs.

## Comment suggérer

### Via le formulaire
1. Centre d'aide → "Suggestion"
2. Décrivez votre idée
3. Expliquez le problème qu'elle résout
4. Envoyez

### Via email
support@sos-expat.com avec :
- Objet : [SUGGESTION] Titre de l'idée
- Corps : Description détaillée

## Ce qui fait une bonne suggestion

### Contexte
- Quel problème rencontrez-vous ?
- Dans quelle situation ?
- Comment cela vous impacte ?

### Proposition
- Votre idée de solution
- Comment elle fonctionnerait
- Les avantages attendus

### Exemples
Référez-vous à d'autres services si pertinent.

## Ce qui se passe ensuite

1. **Réception** - Accusé de réception
2. **Analyse** - Évaluation par l'équipe
3. **Priorisation** - Classement avec les autres suggestions
4. **Implémentation** - Si retenue, développement
5. **Communication** - Vous êtes informé si votre idée est mise en place

## Types de suggestions bienvenues

- Nouvelles fonctionnalités
- Améliorations d'ergonomie
- Nouveaux pays/langues
- Services complémentaires
- Simplifications de processus

## Note

Nous ne pouvons pas implémenter toutes les suggestions, mais chacune est lue et considérée.`,
    tags: ["suggestion", "amélioration", "feedback", "idées", "évolution"],
    faqSuggestions: [
      { question: "Ma suggestion sera-t-elle forcément implémentée ?", answer: "Non, mais chaque suggestion est lue et évaluée. Nous priorisons selon l'impact et la faisabilité." },
      { question: "Suis-je informé si mon idée est retenue ?", answer: "Oui, nous contactons les auteurs des suggestions implémentées." },
      { question: "Puis-je voter pour des suggestions d'autres utilisateurs ?", answer: "Pas actuellement, mais c'est une fonctionnalité envisagée pour le futur." }
    ],
    seoKeywords: ["suggestion SOS-Expat", "amélioration plateforme", "feedback utilisateur", "idées évolution"],
    subcategorySlug: "nous-contacter",
    order: 3
  },
  {
    slug: "reclamation-plainte",
    title: "Déposer une réclamation",
    excerpt: "Procédure pour signaler un problème grave ou déposer une plainte formelle.",
    content: `## Procédure de réclamation

Si vous rencontrez un problème sérieux, voici comment procéder.

## Quand déposer une réclamation

### Situations concernées
- Problème non résolu avec un prestataire
- Litige sur un paiement
- Comportement inapproprié
- Non-respect des engagements
- Tout préjudice subi

### Ce qui n'est PAS une réclamation
- Questions générales → Support
- Bugs techniques → Signalement bug
- Suggestions → Formulaire suggestion

## Comment déposer

### Étape 1 : Préparez votre dossier
- Description chronologique des faits
- Preuves (messages, captures d'écran)
- Références (numéros de transaction, dates)

### Étape 2 : Soumettez via le formulaire
Centre d'aide → "Réclamation"

### Étape 3 : Attendez notre réponse
Délai : 5 jours ouvrés maximum

## Traitement de votre réclamation

1. **Réception** - Accusé sous 24h
2. **Analyse** - Examen du dossier
3. **Investigation** - Contact des parties
4. **Décision** - Résolution proposée
5. **Suivi** - Mise en œuvre

## Solutions possibles

Selon la situation :
- Médiation entre les parties
- Remboursement partiel ou total
- Sanction du prestataire
- Explication et excuses
- Geste commercial

## Si vous n'êtes pas satisfait

- Demandez un réexamen
- Contactez le médiateur de la consommation
- Saisissez les tribunaux compétents

## Confidentialité

Votre réclamation est traitée de manière confidentielle.`,
    tags: ["réclamation", "plainte", "litige", "problème", "résolution"],
    faqSuggestions: [
      { question: "Quel délai pour traiter ma réclamation ?", answer: "Accusé de réception sous 24h, réponse complète sous 5 jours ouvrés maximum." },
      { question: "Ma réclamation est-elle confidentielle ?", answer: "Oui, elle est traitée de manière confidentielle par notre équipe dédiée." },
      { question: "Puis-je être remboursé suite à une réclamation ?", answer: "C'est possible selon la nature du problème et les conclusions de l'enquête." }
    ],
    seoKeywords: ["réclamation SOS-Expat", "plainte client", "litige résolution", "problème prestataire"],
    subcategorySlug: "nous-contacter",
    order: 4
  }
];

// =============================================================================
// SOUS-CATÉGORIE 4.4: INFORMATIONS LÉGALES (4 articles)
// =============================================================================
const INFORMATIONS_LEGALES: HelpArticleData[] = [
  {
    slug: "mentions-legales-sos-expat",
    title: "Mentions légales de SOS-Expat",
    excerpt: "Informations légales sur l'éditeur et l'hébergeur de la plateforme.",
    content: `## Éditeur du site

### Informations société
- Nom : SOS-Expat (WorldExpat OÜ)
- Forme juridique : [À compléter]
- Capital social : [À compléter]
- Siège social : [À compléter]
- Numéro RCS : [À compléter]
- Numéro TVA intracommunautaire : [À compléter]

### Contact
- Email : contact@sos-expat.com
- Téléphone : [À compléter]

### Directeur de la publication
[Nom du directeur de publication]

## Hébergement

### Hébergeur
- Nom : Firebase (Google Cloud Platform)
- Adresse : Google LLC, 1600 Amphitheatre Parkway, Mountain View, CA 94043, USA

## Propriété intellectuelle

### Contenus
Tous les contenus du site (textes, images, logos, etc.) sont la propriété de SOS-Expat ou de ses partenaires et sont protégés par le droit d'auteur.

### Marques
SOS-Expat est une marque déposée. Toute reproduction est interdite sans autorisation.

### Utilisation
Toute reproduction, représentation ou diffusion, totale ou partielle, du contenu de ce site par quelque procédé que ce soit, sans l'autorisation de SOS-Expat, est interdite.

## Responsabilité

SOS-Expat s'efforce de fournir des informations exactes et à jour, mais ne peut garantir l'absence d'erreurs. SOS-Expat est un service de mise en relation et n'est pas responsable des prestations fournies par les prestataires indépendants.

## Droit applicable

Le présent site est soumis au droit français. En cas de litige, les tribunaux français seront seuls compétents.`,
    tags: ["mentions légales", "éditeur", "hébergeur", "propriété intellectuelle", "droit"],
    faqSuggestions: [
      { question: "Qui édite le site SOS-Expat ?", answer: "SOS-Expat est édité par WorldExpat OÜ. Les coordonnées complètes sont disponibles sur cette page." },
      { question: "Où sont hébergées mes données ?", answer: "Les données sont hébergées sur Firebase (Google Cloud Platform), avec des serveurs en Europe." },
      { question: "Puis-je réutiliser le contenu du site ?", answer: "Non, le contenu est protégé par le droit d'auteur. Toute reproduction nécessite une autorisation." }
    ],
    seoKeywords: ["mentions légales SOS-Expat", "éditeur site", "informations légales", "hébergeur"],
    subcategorySlug: "informations-legales",
    order: 1
  },
  {
    slug: "conditions-generales-utilisation",
    title: "Conditions générales d'utilisation (CGU)",
    excerpt: "Les règles d'utilisation de la plateforme SOS-Expat.",
    content: `## Conditions Générales d'Utilisation

### Article 1 - Objet
Les présentes CGU définissent les conditions d'utilisation de la plateforme SOS-Expat.

### Article 2 - Acceptation
L'utilisation de la plateforme implique l'acceptation des présentes CGU.

### Article 3 - Services proposés
SOS-Expat est une plateforme de mise en relation entre :
- Des utilisateurs (clients expatriés)
- Des prestataires (avocats et Expats Aidants)

### Article 4 - Inscription
L'inscription est gratuite et réservée aux personnes majeures. Les informations fournies doivent être exactes.

### Article 5 - Utilisation du service
Les utilisateurs s'engagent à :
- Utiliser le service de manière légale
- Ne pas usurper d'identité
- Respecter les autres utilisateurs
- Ne pas contourner le système de paiement

### Article 6 - Responsabilités
SOS-Expat :
- Assure la mise en relation
- Vérifie les prestataires
- Ne garantit pas le résultat des prestations

Les prestataires sont des indépendants responsables de leurs prestations.

### Article 7 - Paiements
Les paiements sont effectués via la plateforme. Toute demande de paiement en dehors est interdite.

### Article 8 - Données personnelles
Voir notre Politique de confidentialité.

### Article 9 - Modification des CGU
SOS-Expat peut modifier les CGU. Les utilisateurs seront informés des modifications.

### Article 10 - Droit applicable
Les présentes CGU sont soumises au droit français.

Pour les CGU complètes, consultez la page dédiée sur notre site.`,
    tags: ["CGU", "conditions utilisation", "règles", "service", "légal"],
    faqSuggestions: [
      { question: "Où trouver les CGU complètes ?", answer: "Les CGU complètes sont disponibles sur la page dédiée accessible depuis le pied de page du site." },
      { question: "Les CGU peuvent-elles changer ?", answer: "Oui, nous pouvons les modifier. Vous serez informé des changements significatifs." },
      { question: "Que se passe-t-il si je viole les CGU ?", answer: "Des sanctions peuvent s'appliquer, allant de l'avertissement à la suspension du compte." }
    ],
    seoKeywords: ["CGU SOS-Expat", "conditions utilisation", "règles plateforme", "termes service"],
    subcategorySlug: "informations-legales",
    order: 2
  },
  {
    slug: "politique-confidentialite-rgpd",
    title: "Politique de confidentialité et RGPD",
    excerpt: "Comment nous collectons, utilisons et protégeons vos données personnelles.",
    content: `## Politique de confidentialité

### Notre engagement
SOS-Expat s'engage à protéger vos données personnelles conformément au RGPD.

### Données collectées

**Données d'identification**
- Nom, prénom
- Email, téléphone
- Adresse (optionnel)

**Données d'utilisation**
- Historique des consultations
- Préférences
- Interactions avec la plateforme

**Données de paiement**
- Traitées par Stripe
- Non stockées sur nos serveurs

### Utilisation des données

Vos données sont utilisées pour :
- ✅ Fournir le service
- ✅ Améliorer l'expérience utilisateur
- ✅ Communications essentielles
- ✅ Obligations légales

Vos données ne sont JAMAIS :
- ❌ Vendues à des tiers
- ❌ Utilisées pour de la publicité ciblée externe

### Vos droits (RGPD)

- Accès à vos données
- Rectification
- Effacement (droit à l'oubli)
- Portabilité
- Opposition
- Retrait du consentement

### Exercer vos droits

- Paramètres de votre compte
- Email : dpo@sos-expat.com
- Délai de réponse : 30 jours max

### Conservation des données

- Données de compte : durée du compte + 3 ans
- Factures : 10 ans (obligation légale)
- Logs : 1 an

### Contact DPO

Pour toute question sur vos données :
dpo@sos-expat.com`,
    tags: ["confidentialité", "RGPD", "données personnelles", "vie privée", "protection"],
    faqSuggestions: [
      { question: "Mes données sont-elles vendues ?", answer: "Non, jamais. Nous ne vendons aucune donnée personnelle à des tiers." },
      { question: "Comment supprimer mes données ?", answer: "Via les paramètres de votre compte ou en contactant notre DPO." },
      { question: "Combien de temps gardez-vous mes données ?", answer: "Durée du compte + 3 ans, sauf obligations légales (factures : 10 ans)." }
    ],
    seoKeywords: ["confidentialité SOS-Expat", "RGPD", "protection données", "vie privée"],
    subcategorySlug: "informations-legales",
    order: 3
  },
  {
    slug: "politique-cookies",
    title: "Politique des cookies",
    excerpt: "Comment nous utilisons les cookies et comment les gérer.",
    content: `## Politique des cookies

### Qu'est-ce qu'un cookie ?
Un cookie est un petit fichier texte déposé sur votre appareil lors de la visite d'un site web.

### Cookies utilisés par SOS-Expat

**Cookies essentiels**
- Authentification
- Sécurité
- Préférences de base

Ces cookies sont nécessaires au fonctionnement du site.

**Cookies de performance**
- Analyse du trafic (Google Analytics)
- Amélioration de l'expérience
- Détection des problèmes

**Cookies fonctionnels**
- Langue préférée
- Préférences d'affichage
- Personnalisation

### Durée de conservation

| Type | Durée |
|------|-------|
| Session | Fermeture du navigateur |
| Persistants | 1 à 12 mois |

### Gérer les cookies

**Via notre bannière**
Lors de votre première visite, acceptez ou personnalisez vos choix.

**Via votre navigateur**
- Chrome : Paramètres → Confidentialité
- Firefox : Options → Vie privée
- Safari : Préférences → Confidentialité

**Conséquences du refus**
Le refus des cookies essentiels peut empêcher certaines fonctionnalités.

### Cookies tiers

Nous utilisons des services tiers qui peuvent déposer des cookies :
- Google Analytics (analyse)
- Stripe (paiement)
- Firebase (hébergement)

### Mise à jour

Cette politique peut être mise à jour. La date de dernière modification est indiquée en bas de page.`,
    tags: ["cookies", "traceurs", "navigation", "préférences", "RGPD"],
    faqSuggestions: [
      { question: "Puis-je refuser tous les cookies ?", answer: "Vous pouvez refuser les cookies non essentiels. Les cookies essentiels sont nécessaires au fonctionnement du site." },
      { question: "Les cookies collectent-ils mes données personnelles ?", answer: "Certains cookies collectent des données anonymisées d'utilisation. Aucune donnée personnelle identifiable n'est vendue." },
      { question: "Comment modifier mes préférences de cookies ?", answer: "Via les paramètres de votre navigateur ou en cliquant sur 'Gérer les cookies' dans le pied de page." }
    ],
    seoKeywords: ["cookies SOS-Expat", "politique cookies", "traceurs", "gestion cookies"],
    subcategorySlug: "informations-legales",
    order: 4
  }
];

// =============================================================================
// EXPORT DE TOUS LES ARTICLES COMPRENDRE SOS-EXPAT
// =============================================================================
export const HELP_ARTICLES_UNDERSTAND: HelpArticleData[] = [
  ...PRESENTATION,
  ...FAQ_GENERALE,
  ...NOUS_CONTACTER,
  ...INFORMATIONS_LEGALES
];

// Export par sous-catégorie pour référence
export const UNDERSTAND_ARTICLES_BY_SUBCATEGORY = {
  presentation: PRESENTATION,
  faqGenerale: FAQ_GENERALE,
  nousContacter: NOUS_CONTACTER,
  informationsLegales: INFORMATIONS_LEGALES
};
