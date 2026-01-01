// src/services/helpArticles/helpArticlesClients.ts
// Articles pour la catégorie "Clients Expatriés" - Contenu FR uniquement
// La traduction vers les 8 autres langues se fait à l'initialisation

export interface HelpArticleData {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  tags: string[];
  faqSuggestions: { question: string; answer: string }[];
  seoKeywords: string[];
  subcategorySlug: string;
  order: number;
}

// =============================================================================
// SOUS-CATÉGORIE 1.1: URGENCES & PREMIERS PAS (7 articles)
// =============================================================================
const URGENCES_PREMIERS_PAS: HelpArticleData[] = [
  {
    slug: "contacter-avocat-urgence",
    title: "Comment contacter un avocat en urgence via SOS-Expat",
    excerpt: "Guide complet pour obtenir une assistance juridique immédiate en cas d'urgence à l'étranger.",
    content: `## Pourquoi utiliser le service d'urgence SOS-Expat ?

Lorsque vous êtes expatrié et faites face à une situation juridique urgente, chaque minute compte. SOS-Expat vous permet de contacter un avocat qualifié en moins de 5 minutes, 24h/24, 7j/7.

## Comment fonctionne le service d'urgence

1. **Cliquez sur le bouton SOS** visible sur toutes les pages
2. **Décrivez brièvement votre situation** pour orienter votre demande
3. **Un avocat disponible vous rappelle** dans les minutes qui suivent
4. **Échangez directement** dans votre langue

## Types de situations couvertes

- Arrestation ou garde à vue
- Accident grave nécessitant une assistance juridique
- Problème de visa urgent
- Litige commercial critique
- Urgence familiale (divorce, garde d'enfants)

## Tarification transparente

Les frais de mise en relation pour une urgence sont clairement affichés avant confirmation. Aucun frais caché. Vous payez uniquement si un avocat accepte votre demande.

## Conseils pour une prise en charge rapide

- Ayez votre passeport à portée de main
- Préparez un résumé en 2-3 phrases de votre situation
- Indiquez votre localisation précise
- Mentionnez les langues que vous parlez`,
    tags: ["urgence", "avocat", "SOS", "assistance juridique", "24/7"],
    faqSuggestions: [
      { question: "Combien de temps pour avoir un avocat en urgence ?", answer: "Un avocat vous rappelle généralement en moins de 5 minutes après votre demande SOS." },
      { question: "Le service d'urgence est-il disponible la nuit ?", answer: "Oui, le service SOS fonctionne 24h/24, 7j/7, y compris les week-ends et jours fériés." },
      { question: "Puis-je choisir la langue de l'avocat ?", answer: "Oui, vous pouvez spécifier votre langue préférée parmi les 9 langues disponibles sur la plateforme." }
    ],
    seoKeywords: ["avocat urgence expatrié", "assistance juridique urgente", "SOS avocat étranger", "aide juridique 24/7"],
    subcategorySlug: "urgences-premiers-pas",
    order: 1
  },
  {
    slug: "arrete-etranger-que-faire",
    title: "Que faire si je suis arrêté à l'étranger",
    excerpt: "Les étapes essentielles et vos droits en cas d'arrestation dans un pays étranger.",
    content: `## Gardez votre calme

Une arrestation à l'étranger est stressante, mais garder son calme est essentiel. Vos droits varient selon le pays, mais certains principes universels s'appliquent.

## Vos droits fondamentaux

1. **Droit à un avocat** - Demandez immédiatement un avocat
2. **Droit de contacter votre ambassade/consulat** - C'est un droit reconnu internationalement
3. **Droit de connaître les charges** - Vous devez être informé des raisons de votre arrestation
4. **Droit à un interprète** - Si vous ne comprenez pas la langue locale

## Les premiers gestes à faire

1. **Restez calme et poli** avec les autorités
2. **Demandez à contacter votre ambassade** immédiatement
3. **Ne signez rien** que vous ne comprenez pas parfaitement
4. **Utilisez SOS-Expat** pour contacter un avocat local qui parle votre langue

## Ce qu'il ne faut PAS faire

- Ne résistez pas physiquement
- Ne mentez pas aux autorités
- Ne faites pas de déclarations sans avocat
- Ne tentez pas de corruption (crime grave dans de nombreux pays)

## Comment SOS-Expat peut vous aider

Notre réseau d'avocats locaux peut intervenir rapidement pour :
- Vous assister pendant les interrogatoires
- Communiquer avec votre ambassade
- Négocier votre libération sous caution
- Assurer votre défense`,
    tags: ["arrestation", "droits", "étranger", "garde à vue", "ambassade"],
    faqSuggestions: [
      { question: "Puis-je refuser de répondre aux questions ?", answer: "Dans la plupart des pays, vous avez le droit de garder le silence jusqu'à l'arrivée de votre avocat." },
      { question: "L'ambassade peut-elle me faire libérer ?", answer: "L'ambassade peut vous assister et s'assurer que vos droits sont respectés, mais ne peut pas interférer avec la justice locale." },
      { question: "Comment payer un avocat si je suis détenu ?", answer: "SOS-Expat permet à vos proches de payer les frais de mise en relation à distance pour vous." }
    ],
    seoKeywords: ["arrêté à l'étranger", "droits arrestation expatrié", "aide juridique détention", "avocat garde à vue étranger"],
    subcategorySlug: "urgences-premiers-pas",
    order: 2
  },
  {
    slug: "accident-etranger-reflexes",
    title: "Premiers réflexes en cas d'accident à l'étranger",
    excerpt: "Guide pratique des actions immédiates à entreprendre en cas d'accident hors de votre pays.",
    content: `## Sécurité d'abord

En cas d'accident à l'étranger, votre sécurité et celle des autres est prioritaire.

## Les 5 premiers réflexes

1. **Mettez-vous en sécurité** - Éloignez-vous du danger immédiat
2. **Appelez les secours locaux** - Numéro d'urgence du pays
3. **Documentez la scène** - Photos, témoins, circonstances
4. **Contactez votre assurance** - Numéro d'assistance internationale
5. **Utilisez SOS-Expat** - Pour une assistance juridique si nécessaire

## Documents à rassembler

- Constat d'accident (si applicable)
- Rapport de police
- Certificats médicaux
- Coordonnées des témoins
- Photos de la scène et des dégâts

## Quand contacter un avocat

Un avocat est recommandé si :
- Il y a des blessés graves
- Votre responsabilité est mise en cause
- L'autre partie refuse de coopérer
- Les autorités locales vous retiennent
- Vous ne comprenez pas les procédures locales

## Protection juridique avec SOS-Expat

Nos prestataires peuvent vous aider à :
- Comprendre vos droits locaux
- Communiquer avec les assurances
- Gérer les démarches administratives
- Vous défendre si nécessaire`,
    tags: ["accident", "étranger", "urgence", "assurance", "premiers secours"],
    faqSuggestions: [
      { question: "Dois-je appeler la police pour un accident mineur ?", answer: "Dans de nombreux pays, un rapport de police est obligatoire pour tout accident, même mineur. Consultez les règles locales." },
      { question: "Mon assurance française couvre-t-elle les accidents à l'étranger ?", answer: "Cela dépend de votre contrat. Vérifiez les clauses internationales et contactez votre assureur." },
      { question: "Que faire si je ne parle pas la langue locale ?", answer: "Utilisez SOS-Expat pour être mis en relation avec un prestataire qui parle votre langue et connaît les procédures locales." }
    ],
    seoKeywords: ["accident étranger que faire", "aide accident expatrié", "assurance accident international", "avocat accident étranger"],
    subcategorySlug: "urgences-premiers-pas",
    order: 3
  },
  {
    slug: "bouton-sos-fonctionnement",
    title: "Comment fonctionne le bouton SOS",
    excerpt: "Explication détaillée du système d'urgence SOS-Expat pour une assistance immédiate.",
    content: `## Le bouton SOS : votre ligne directe vers l'aide

Le bouton SOS est le moyen le plus rapide d'obtenir une assistance sur SOS-Expat. Visible sur toutes les pages, il vous connecte à un prestataire disponible en quelques minutes.

## Étapes d'utilisation

### 1. Cliquez sur le bouton SOS
Le bouton rouge "SOS" est visible en permanence sur le site et l'application.

### 2. Décrivez votre situation
Un formulaire rapide vous permet de :
- Sélectionner le type d'urgence
- Décrire brièvement votre besoin
- Indiquer votre localisation
- Choisir votre langue préférée

### 3. Confirmez votre demande
Les frais de mise en relation sont affichés clairement. Vous confirmez et payez de manière sécurisée.

### 4. Recevez l'appel
Un prestataire disponible vous rappelle dans les minutes qui suivent.

## Types de prestataires disponibles

- **Avocats** - Pour les urgences juridiques graves
- **Expats Aidants** - Pour l'accompagnement et les conseils pratiques

## Disponibilité

Le service SOS est actif :
- 24 heures sur 24
- 7 jours sur 7
- 365 jours par an
- Dans 197 pays

## Tarification

Les frais de mise en relation varient selon le type de prestataire et l'urgence. Le tarif exact est toujours affiché avant confirmation.`,
    tags: ["SOS", "bouton urgence", "fonctionnement", "aide rapide", "assistance"],
    faqSuggestions: [
      { question: "Le bouton SOS est-il payant ?", answer: "Oui, des frais de mise en relation s'appliquent et sont affichés avant confirmation de votre demande." },
      { question: "Puis-je annuler après avoir cliqué sur SOS ?", answer: "Vous pouvez annuler avant qu'un prestataire n'accepte votre demande. Après acceptation, les frais de mise en relation sont dus." },
      { question: "Combien de temps avant d'être rappelé ?", answer: "En moyenne, un prestataire vous rappelle en moins de 5 minutes." }
    ],
    seoKeywords: ["bouton SOS expatrié", "urgence expatrié", "aide immédiate étranger", "assistance SOS"],
    subcategorySlug: "urgences-premiers-pas",
    order: 4
  },
  {
    slug: "delais-reponse-urgence",
    title: "Délais de réponse des prestataires en situation d'urgence",
    excerpt: "Comprendre les temps de réponse et comment optimiser votre demande d'aide urgente.",
    content: `## Nos engagements de réponse

SOS-Expat s'engage à vous mettre en relation avec un prestataire qualifié le plus rapidement possible.

## Délais moyens constatés

| Type de demande | Délai moyen |
|----------------|-------------|
| SOS Urgence | < 5 minutes |
| Demande standard | < 2 heures |
| Rendez-vous planifié | Selon disponibilité |

## Facteurs influençant le délai

### Ce qui accélère la réponse
- Description claire et concise de votre besoin
- Localisation précise
- Disponibilité immédiate pour recevoir l'appel
- Flexibilité sur la langue

### Ce qui peut ralentir
- Demande dans une zone peu couverte
- Spécialité très spécifique requise
- Horaires nocturnes dans certaines régions
- Période de forte demande

## Comment optimiser votre demande

1. **Soyez précis** - Décrivez votre situation en quelques phrases claires
2. **Indiquez l'urgence** - Niveau de priorité de votre demande
3. **Restez joignable** - Gardez votre téléphone à portée
4. **Préparez vos documents** - Pour gagner du temps lors de l'échange

## Que faire si aucun prestataire ne répond

Dans de rares cas où aucun prestataire n'est disponible immédiatement :
- Vous êtes informé du délai estimé
- Vous pouvez élargir vos critères
- Le support SOS-Expat peut intervenir pour trouver une solution`,
    tags: ["délais", "réponse", "urgence", "temps d'attente", "disponibilité"],
    faqSuggestions: [
      { question: "Que se passe-t-il si personne ne répond en 5 minutes ?", answer: "Votre demande reste active et vous êtes notifié dès qu'un prestataire est disponible. Vous pouvez aussi élargir vos critères." },
      { question: "Les délais sont-ils garantis ?", answer: "Les délais indiqués sont des moyennes constatées. En cas d'urgence critique, notre support peut intervenir." },
      { question: "Puis-je demander un prestataire spécifique en urgence ?", answer: "En mode SOS, vous êtes mis en relation avec le premier prestataire disponible correspondant à vos critères." }
    ],
    seoKeywords: ["délai réponse avocat", "temps attente urgence", "rapidité SOS-Expat", "disponibilité prestataires"],
    subcategorySlug: "urgences-premiers-pas",
    order: 5
  },
  {
    slug: "sos-expat-vs-ambassade",
    title: "Quand utiliser SOS-Expat vs ambassade/consulat",
    excerpt: "Guide pour choisir entre l'assistance SOS-Expat et les services consulaires selon votre situation.",
    content: `## Deux ressources complémentaires

SOS-Expat et les services consulaires ont des rôles différents mais complémentaires pour les expatriés en difficulté.

## Quand contacter votre ambassade/consulat

L'ambassade ou le consulat est votre recours pour :
- **Documents officiels** - Passeport perdu ou volé
- **Assistance consulaire** - En cas d'arrestation (droit de visite)
- **Rapatriement** - Situations de crise majeure
- **Décès d'un proche** - Formalités administratives
- **Élections** - Vote depuis l'étranger

## Quand utiliser SOS-Expat

SOS-Expat est plus adapté pour :
- **Assistance juridique immédiate** - Avocat en moins de 5 minutes
- **Conseils pratiques locaux** - De la part d'expatriés expérimentés
- **Problèmes du quotidien** - Logement, travail, administration
- **Urgences hors heures** - 24/7, contrairement aux consulats
- **Barrière linguistique** - Prestataires multilingues

## Tableau comparatif

| Situation | Ambassade | SOS-Expat |
|-----------|-----------|-----------|
| Passeport perdu | ✅ | ❌ |
| Arrestation | ✅ (visite) | ✅ (avocat) |
| Avocat urgent | ❌ | ✅ |
| Conseil juridique | ❌ | ✅ |
| Aide administrative locale | ❌ | ✅ |
| Disponibilité 24/7 | ❌ | ✅ |

## Notre recommandation

En cas de doute, contactez les deux ! L'ambassade pour les aspects officiels, SOS-Expat pour l'assistance pratique et juridique immédiate.`,
    tags: ["ambassade", "consulat", "comparaison", "assistance", "choix"],
    faqSuggestions: [
      { question: "L'ambassade peut-elle me trouver un avocat ?", answer: "L'ambassade peut fournir une liste d'avocats mais ne peut pas en recommander un spécifiquement. SOS-Expat vous met directement en relation." },
      { question: "Le consulat est-il ouvert le week-end ?", answer: "La plupart des consulats sont fermés le week-end. SOS-Expat est disponible 24/7." },
      { question: "Dois-je informer l'ambassade si j'utilise SOS-Expat ?", answer: "Ce n'est pas obligatoire, mais en cas de problème grave, il est recommandé d'informer votre ambassade également." }
    ],
    seoKeywords: ["ambassade vs avocat", "consulat expatrié aide", "quand contacter ambassade", "assistance consulaire"],
    subcategorySlug: "urgences-premiers-pas",
    order: 6
  },
  {
    slug: "checklist-urgence-expatrie",
    title: "Checklist d'urgence expatrié : documents à avoir sur soi",
    excerpt: "Liste complète des documents essentiels à garder sur vous en tant qu'expatrié.",
    content: `## Pourquoi une checklist d'urgence ?

En cas de problème à l'étranger, avoir les bons documents peut faire la différence entre une résolution rapide et des complications majeures.

## Documents essentiels (toujours sur vous)

### Identité
- ✅ Passeport (original)
- ✅ Carte d'identité nationale
- ✅ Visa/titre de séjour
- ✅ Permis de conduire international

### Santé
- ✅ Carte d'assurance maladie internationale
- ✅ Carnet de vaccination
- ✅ Ordonnances pour médicaments réguliers
- ✅ Groupe sanguin (carte)

### Contacts d'urgence
- ✅ Numéro de l'ambassade/consulat
- ✅ Contact SOS-Expat
- ✅ Numéro d'urgence assurance
- ✅ Contact famille en France

## Documents à garder en copie (numérique + papier)

- Acte de naissance
- Livret de famille
- Contrat de travail
- Bail de location
- Relevés bancaires récents
- Attestation d'assurance habitation

## Où stocker vos copies

1. **Cloud sécurisé** - Google Drive, iCloud, Dropbox
2. **Email** - Envoyez-vous les copies
3. **Coffre-fort numérique** - Application dédiée
4. **Proche de confiance** - En France

## Application pratique

Créez un dossier "URGENCE" sur votre téléphone avec :
- Photos de tous vos documents
- Numéros d'urgence
- Adresses importantes
- Informations médicales`,
    tags: ["checklist", "documents", "urgence", "préparation", "expatrié"],
    faqSuggestions: [
      { question: "Dois-je toujours avoir mon passeport original sur moi ?", answer: "Cela dépend du pays. Dans certains pays, c'est obligatoire. Renseignez-vous sur les lois locales." },
      { question: "Comment sécuriser mes documents numériques ?", answer: "Utilisez un gestionnaire de mots de passe et activez l'authentification à deux facteurs sur vos comptes cloud." },
      { question: "Que faire si je perds tous mes documents ?", answer: "Contactez immédiatement votre ambassade pour obtenir un passeport d'urgence, et utilisez SOS-Expat pour assistance." }
    ],
    seoKeywords: ["documents expatrié", "checklist urgence", "papiers voyage", "préparation expatriation"],
    subcategorySlug: "urgences-premiers-pas",
    order: 7
  }
];

// =============================================================================
// SOUS-CATÉGORIE 1.2: PAIEMENTS & FRAIS (8 articles)
// =============================================================================
const PAIEMENTS_FRAIS: HelpArticleData[] = [
  {
    slug: "payer-consultation-sos-expat",
    title: "Comment payer une consultation sur SOS-Expat",
    excerpt: "Guide complet des méthodes de paiement acceptées et du processus de règlement.",
    content: `## Méthodes de paiement acceptées

SOS-Expat accepte plusieurs moyens de paiement sécurisés pour votre confort.

## Cartes bancaires

- Visa
- Mastercard
- American Express
- Cartes de débit

## Processus de paiement

### 1. Sélectionnez un prestataire
Choisissez le prestataire correspondant à votre besoin.

### 2. Vérifiez le tarif
Les frais de mise en relation sont clairement affichés.

### 3. Entrez vos informations de paiement
Formulaire sécurisé avec cryptage SSL.

### 4. Confirmez le paiement
Vous recevez une confirmation par email.

## Sécurité des paiements

Tous les paiements sont :
- Cryptés en SSL 256 bits
- Traités par Stripe (leader mondial)
- Conformes aux normes PCI-DSS
- Sans stockage de vos données bancaires sur nos serveurs

## Factures et reçus

Après chaque paiement :
- Reçu instantané par email
- Facture disponible dans votre espace client
- Export possible en PDF

## En cas de problème

Si votre paiement échoue :
1. Vérifiez vos informations bancaires
2. Contactez votre banque (blocage international ?)
3. Essayez une autre carte
4. Contactez notre support`,
    tags: ["paiement", "carte bancaire", "consultation", "sécurité", "facture"],
    faqSuggestions: [
      { question: "Mes données bancaires sont-elles sécurisées ?", answer: "Oui, nous utilisons Stripe et le cryptage SSL. Vos données bancaires ne sont jamais stockées sur nos serveurs." },
      { question: "Puis-je payer en plusieurs fois ?", answer: "Actuellement, le paiement se fait en une seule fois au moment de la mise en relation." },
      { question: "Comment obtenir une facture ?", answer: "Vos factures sont automatiquement disponibles dans votre espace client, section 'Historique'." }
    ],
    seoKeywords: ["paiement consultation avocat", "payer SOS-Expat", "carte bancaire expatrié", "facturation consultation"],
    subcategorySlug: "paiements-frais",
    order: 1
  },
  {
    slug: "comprendre-frais-mise-en-relation",
    title: "Comprendre les frais de mise en relation",
    excerpt: "Explication transparente de notre modèle de tarification et de ce qui est inclus.",
    content: `## Qu'est-ce que les frais de mise en relation ?

Les frais de mise en relation sont le coût du service SOS-Expat pour vous connecter avec un prestataire qualifié.

## Ce qui est inclus

✅ **Recherche du prestataire** adapté à votre besoin
✅ **Vérification des qualifications** du prestataire
✅ **Mise en contact** rapide et sécurisée
✅ **Support client** en cas de problème
✅ **Plateforme sécurisée** pour vos échanges

## Ce qui n'est PAS inclus

❌ Les honoraires du prestataire (négociés directement avec lui)
❌ Les frais administratifs externes
❌ Les déplacements éventuels

## Tarification transparente

Les frais de mise en relation :
- Sont affichés AVANT confirmation
- Varient selon le type de prestataire
- Sont fixes (pas de surprise)
- Incluent la TVA applicable

## Différence avec les honoraires du prestataire

| Frais de mise en relation | Honoraires prestataire |
|--------------------------|------------------------|
| Payés à SOS-Expat | Payés au prestataire |
| Fixes et affichés | Négociés directement |
| Pour la connexion | Pour la prestation |

## Notre engagement

Aucun frais caché. Le montant affiché est le montant payé. Point final.`,
    tags: ["frais", "mise en relation", "tarification", "transparence", "honoraires"],
    faqSuggestions: [
      { question: "Les frais de mise en relation sont-ils remboursables ?", answer: "Les frais sont remboursables si aucun prestataire n'accepte votre demande. Consultez notre politique de remboursement." },
      { question: "Pourquoi payer des frais de mise en relation ?", answer: "Ces frais couvrent la vérification des prestataires, la plateforme sécurisée et le support client." },
      { question: "Les frais sont-ils les mêmes pour tous les prestataires ?", answer: "Les frais peuvent varier selon le type de prestataire (avocat vs expat aidant) et le niveau d'urgence." }
    ],
    seoKeywords: ["frais mise en relation", "coût SOS-Expat", "tarif plateforme", "prix consultation"],
    subcategorySlug: "paiements-frais",
    order: 2
  },
  {
    slug: "moyens-paiement-par-pays",
    title: "Moyens de paiement acceptés par pays",
    excerpt: "Liste des options de paiement disponibles selon votre pays de résidence.",
    content: `## Paiements internationaux

SOS-Expat est conçu pour les expatriés du monde entier. Nos options de paiement s'adaptent à votre localisation.

## Méthodes universelles

Ces méthodes fonctionnent partout dans le monde :
- **Visa** - Acceptée dans 197 pays
- **Mastercard** - Acceptée dans 197 pays
- **American Express** - Large couverture internationale

## Par région

### Europe
- Cartes bancaires européennes
- SEPA (pour certains pays)

### Amérique du Nord
- Cartes américaines et canadiennes
- Toutes les grandes banques

### Asie-Pacifique
- Cartes internationales
- JCB (Japon)

### Autres régions
- Cartes Visa/Mastercard internationales

## Devises

- Les prix sont affichés en EUR
- La conversion est automatique
- Votre banque applique son taux de change

## Problèmes courants et solutions

### Paiement refusé
- Vérifiez les plafonds internationaux de votre carte
- Contactez votre banque pour autoriser la transaction
- Essayez une autre carte

### Frais bancaires
- Certaines banques facturent des frais pour les transactions internationales
- Utilisez une carte sans frais à l'étranger si possible`,
    tags: ["paiement", "international", "carte bancaire", "devise", "pays"],
    faqSuggestions: [
      { question: "Puis-je payer avec une carte locale ?", answer: "Si votre carte est compatible Visa ou Mastercard, elle fonctionnera généralement. Contactez votre banque en cas de doute." },
      { question: "Y a-t-il des frais de change ?", answer: "SOS-Expat ne facture pas de frais de change, mais votre banque peut en appliquer." },
      { question: "Ma carte est refusée, que faire ?", answer: "Contactez votre banque pour vérifier les restrictions internationales, puis réessayez ou utilisez une autre carte." }
    ],
    seoKeywords: ["paiement international", "carte bancaire étranger", "devises expatrié", "payer depuis étranger"],
    subcategorySlug: "paiements-frais",
    order: 3
  },
  {
    slug: "politique-remboursement-annulation",
    title: "Politique de remboursement et annulation",
    excerpt: "Conditions et procédures pour les annulations et demandes de remboursement.",
    content: `## Notre politique de remboursement

SOS-Expat s'engage pour votre satisfaction. Voici nos conditions de remboursement.

## Cas de remboursement automatique

Vous êtes remboursé intégralement si :
- ✅ Aucun prestataire n'accepte votre demande
- ✅ Problème technique empêchant la mise en relation
- ✅ Annulation avant l'acceptation par un prestataire

## Annulation par le client

### Avant acceptation du prestataire
- Remboursement intégral
- Instantané

### Après acceptation, avant l'appel
- Remboursement partiel possible
- Étudié au cas par cas

### Après l'appel
- Pas de remboursement des frais de mise en relation
- Les honoraires du prestataire suivent ses propres conditions

## Annulation par le prestataire

Si un prestataire annule :
- Remboursement intégral des frais de mise en relation
- Possibilité d'être mis en relation avec un autre prestataire

## Comment demander un remboursement

1. Connectez-vous à votre espace client
2. Accédez à l'historique des transactions
3. Sélectionnez la transaction concernée
4. Cliquez sur "Demander un remboursement"
5. Expliquez brièvement la raison

## Délais de remboursement

- Traitement : 24-48h ouvrées
- Crédit sur votre compte : 5-10 jours ouvrés (selon votre banque)`,
    tags: ["remboursement", "annulation", "politique", "conditions", "réclamation"],
    faqSuggestions: [
      { question: "Puis-je annuler à tout moment ?", answer: "Vous pouvez annuler avant qu'un prestataire n'accepte votre demande pour un remboursement intégral." },
      { question: "Combien de temps pour être remboursé ?", answer: "Le traitement prend 24-48h, puis 5-10 jours ouvrés pour le crédit sur votre compte." },
      { question: "Que faire si je ne suis pas satisfait de la consultation ?", answer: "Contactez notre support avec les détails. Chaque cas est étudié individuellement." }
    ],
    seoKeywords: ["remboursement SOS-Expat", "annulation consultation", "politique annulation", "réclamation paiement"],
    subcategorySlug: "paiements-frais",
    order: 4
  },
  {
    slug: "obtenir-facture",
    title: "Comment obtenir une facture",
    excerpt: "Procédure pour accéder à vos factures et les télécharger pour vos notes de frais.",
    content: `## Accès à vos factures

Toutes vos factures sont automatiquement générées et disponibles dans votre espace client.

## Où trouver vos factures

1. Connectez-vous à votre compte SOS-Expat
2. Accédez à "Mon compte" → "Historique"
3. Sélectionnez la transaction
4. Cliquez sur "Télécharger la facture"

## Informations sur la facture

Chaque facture contient :
- Numéro de facture unique
- Date de la transaction
- Détail des frais de mise en relation
- TVA applicable
- Vos coordonnées
- Coordonnées de SOS-Expat

## Format disponible

- PDF téléchargeable
- Envoi par email sur demande

## Pour vos notes de frais

Nos factures sont conformes aux exigences comptables et peuvent être utilisées pour :
- Notes de frais professionnelles
- Déclarations fiscales
- Remboursement employeur

## Factures pour entreprises

Si vous utilisez SOS-Expat pour votre entreprise :
- Ajoutez vos informations de facturation dans les paramètres
- Numéro de TVA intracommunautaire (si applicable)
- Adresse de facturation professionnelle

## Support facturation

Pour toute question sur vos factures :
- Consultez la FAQ
- Contactez le support client
- Délai de réponse : 24-48h`,
    tags: ["facture", "téléchargement", "notes de frais", "comptabilité", "TVA"],
    faqSuggestions: [
      { question: "Puis-je modifier les informations sur ma facture ?", answer: "Vous pouvez mettre à jour vos informations de facturation dans les paramètres avant une transaction." },
      { question: "La facture inclut-elle la TVA ?", answer: "Oui, la TVA applicable est détaillée sur chaque facture." },
      { question: "Puis-je recevoir mes factures par email automatiquement ?", answer: "Oui, activez cette option dans les paramètres de notification de votre compte." }
    ],
    seoKeywords: ["facture consultation", "télécharger facture", "notes de frais expatrié", "justificatif paiement"],
    subcategorySlug: "paiements-frais",
    order: 5
  },
  {
    slug: "tarification-transparente",
    title: "Tarification transparente : ce qui est inclus",
    excerpt: "Détail complet de notre grille tarifaire et des services inclus dans chaque offre.",
    content: `## Notre engagement de transparence

Chez SOS-Expat, nous croyons en une tarification claire et sans surprise.

## Structure des frais

### Frais de mise en relation
C'est le seul montant que vous payez à SOS-Expat. Il comprend :
- La mise en relation avec un prestataire vérifié
- L'accès à la plateforme sécurisée
- Le support client
- La garantie de service

### Honoraires du prestataire
Négociés directement avec le prestataire. SOS-Expat n'intervient pas dans cette négociation.

## Ce qui est TOUJOURS inclus

✅ Vérification du prestataire
✅ Plateforme d'échange sécurisée
✅ Support client disponible
✅ Historique de vos échanges
✅ Factures conformes
✅ Protection des données

## Ce qui n'est JAMAIS facturé

❌ Frais d'inscription
❌ Abonnement mensuel
❌ Frais de dossier
❌ Frais cachés

## Grille tarifaire indicative

Les frais de mise en relation varient selon :
- Le type de prestataire (avocat, expat aidant)
- Le niveau d'urgence (standard, SOS)
- La disponibilité

Le tarif exact est TOUJOURS affiché avant confirmation.

## Notre promesse

Le prix affiché = le prix payé. Aucune exception.`,
    tags: ["tarification", "transparence", "prix", "inclus", "grille tarifaire"],
    faqSuggestions: [
      { question: "Y a-t-il des frais cachés ?", answer: "Non, absolument aucun. Le montant affiché avant confirmation est le montant exact que vous paierez." },
      { question: "Pourquoi les prix varient-ils ?", answer: "Les frais de mise en relation varient selon le type de prestataire et le niveau d'urgence de votre demande." },
      { question: "Dois-je payer un abonnement ?", answer: "Non, SOS-Expat fonctionne sans abonnement. Vous payez uniquement lorsque vous utilisez le service." }
    ],
    seoKeywords: ["tarif transparent", "prix SOS-Expat", "coût consultation", "grille tarifaire expatrié"],
    subcategorySlug: "paiements-frais",
    order: 6
  },
  {
    slug: "paiements-securises-protection-donnees",
    title: "Paiements sécurisés et protection des données bancaires",
    excerpt: "Comment nous protégeons vos informations bancaires et garantissons la sécurité de vos paiements.",
    content: `## Sécurité maximale pour vos paiements

La sécurité de vos données bancaires est notre priorité absolue.

## Notre partenaire de paiement : Stripe

SOS-Expat utilise Stripe, le leader mondial du paiement en ligne :
- Utilisé par des millions d'entreprises
- Certifié PCI-DSS niveau 1
- Cryptage de bout en bout

## Mesures de protection

### Cryptage SSL 256 bits
Toutes les communications sont cryptées avec le plus haut niveau de sécurité.

### Pas de stockage de vos données
Vos numéros de carte ne sont JAMAIS stockés sur nos serveurs.

### Authentification 3D Secure
Pour les cartes compatibles, une vérification supplémentaire est demandée.

### Détection des fraudes
Système automatique de détection des transactions suspectes.

## Vos droits

- Vous pouvez supprimer vos moyens de paiement enregistrés à tout moment
- Accès à l'historique complet de vos transactions
- Notification pour chaque transaction

## En cas de problème

Si vous suspectez une utilisation frauduleuse :
1. Contactez immédiatement notre support
2. Contactez votre banque
3. Nous enquêtons et prenons les mesures nécessaires

## Conformité réglementaire

SOS-Expat est conforme à :
- RGPD (protection des données)
- DSP2 (directive européenne sur les paiements)
- Normes PCI-DSS`,
    tags: ["sécurité", "paiement", "données bancaires", "protection", "cryptage"],
    faqSuggestions: [
      { question: "Mes données de carte sont-elles stockées ?", answer: "Non, vos données bancaires sont traitées par Stripe et ne sont jamais stockées sur nos serveurs." },
      { question: "Qu'est-ce que le 3D Secure ?", answer: "C'est une vérification supplémentaire (code SMS, application bancaire) pour sécuriser les paiements en ligne." },
      { question: "Que faire si je vois une transaction suspecte ?", answer: "Contactez immédiatement notre support et votre banque. Nous enquêterons sur la transaction." }
    ],
    seoKeywords: ["paiement sécurisé", "protection données bancaires", "Stripe sécurité", "transaction sécurisée"],
    subcategorySlug: "paiements-frais",
    order: 7
  },
  {
    slug: "litige-paiement-que-faire",
    title: "Que faire en cas de litige sur un paiement",
    excerpt: "Procédure à suivre si vous contestez un paiement ou rencontrez un problème de facturation.",
    content: `## Types de litiges courants

Les litiges de paiement peuvent survenir pour plusieurs raisons :
- Double facturation
- Montant incorrect
- Service non rendu
- Transaction non reconnue

## Étapes pour résoudre un litige

### Étape 1 : Vérifiez votre historique
Connectez-vous et vérifiez les détails de la transaction dans votre espace client.

### Étape 2 : Rassemblez les informations
- Date et heure de la transaction
- Montant concerné
- Numéro de transaction
- Description du problème

### Étape 3 : Contactez notre support
Utilisez le formulaire de contact ou l'email support avec :
- Votre numéro de transaction
- La description du problème
- Les pièces justificatives si disponibles

### Étape 4 : Attendez notre réponse
Délai de traitement : 24-48h ouvrées

## Résolution des litiges

Selon la nature du litige :
- **Erreur de notre part** → Remboursement intégral
- **Malentendu** → Explication et solution adaptée
- **Litige avec le prestataire** → Médiation possible

## Si le litige persiste

Si vous n'êtes pas satisfait de notre réponse :
1. Demandez une révision du dossier
2. Contactez votre banque pour une procédure de chargeback
3. Saisissez un médiateur si nécessaire

## Prévention des litiges

- Vérifiez toujours le montant avant de confirmer
- Gardez une copie de vos confirmations
- Contactez-nous au moindre doute`,
    tags: ["litige", "contestation", "paiement", "réclamation", "problème"],
    faqSuggestions: [
      { question: "Combien de temps pour résoudre un litige ?", answer: "La plupart des litiges sont résolus en 24-48h. Les cas complexes peuvent prendre jusqu'à 5 jours ouvrés." },
      { question: "Puis-je faire un chargeback ?", answer: "Nous vous encourageons à nous contacter d'abord. Si le litige persiste, vous pouvez contacter votre banque." },
      { question: "Comment éviter les doubles facturations ?", answer: "Attendez la confirmation avant de cliquer à nouveau. En cas de doute, vérifiez votre historique avant de retenter." }
    ],
    seoKeywords: ["litige paiement", "contestation facture", "problème transaction", "réclamation SOS-Expat"],
    subcategorySlug: "paiements-frais",
    order: 8
  }
];

// =============================================================================
// SOUS-CATÉGORIE 1.3: MON COMPTE CLIENT (6 articles)
// =============================================================================
const MON_COMPTE: HelpArticleData[] = [
  {
    slug: "creer-configurer-compte-client",
    title: "Créer et configurer mon compte client",
    excerpt: "Guide pas à pas pour créer votre compte SOS-Expat et le configurer selon vos besoins.",
    content: `## Création de votre compte

Créer un compte SOS-Expat est simple et gratuit.

## Étapes de création

### 1. Accédez à l'inscription
Cliquez sur "S'inscrire" en haut de la page.

### 2. Choisissez votre méthode
- Email + mot de passe
- Connexion Google
- Connexion Apple

### 3. Complétez votre profil
- Prénom et nom
- Pays de résidence
- Langue préférée
- Numéro de téléphone (pour les rappels)

### 4. Vérifiez votre email
Cliquez sur le lien de confirmation envoyé à votre adresse.

## Configuration recommandée

### Informations essentielles
- Photo de profil (optionnel mais recommandé)
- Fuseau horaire
- Préférences de notification

### Préférences de contact
- Langue de communication préférée
- Meilleurs horaires pour être contacté
- Mode de contact préféré

## Avantages d'un compte configuré

✅ Mise en relation plus rapide
✅ Historique de vos consultations
✅ Prestataires recommandés selon votre profil
✅ Factures automatiques
✅ Support prioritaire`,
    tags: ["compte", "inscription", "configuration", "profil", "création"],
    faqSuggestions: [
      { question: "L'inscription est-elle payante ?", answer: "Non, la création de compte est entièrement gratuite. Vous payez uniquement lors de l'utilisation du service." },
      { question: "Puis-je m'inscrire sans numéro de téléphone ?", answer: "Le numéro de téléphone est nécessaire pour recevoir les appels des prestataires." },
      { question: "Comment changer mon adresse email ?", answer: "Accédez aux paramètres de votre compte pour modifier votre adresse email." }
    ],
    seoKeywords: ["créer compte SOS-Expat", "inscription plateforme", "configurer profil", "compte expatrié"],
    subcategorySlug: "mon-compte-client",
    order: 1
  },
  {
    slug: "modifier-informations-personnelles",
    title: "Modifier mes informations personnelles",
    excerpt: "Comment mettre à jour vos coordonnées, préférences et informations de profil.",
    content: `## Accéder à vos informations

Toutes vos informations personnelles sont modifiables depuis votre espace client.

## Ce que vous pouvez modifier

### Informations de base
- Prénom et nom
- Photo de profil
- Date de naissance

### Coordonnées
- Adresse email (vérification requise)
- Numéro de téléphone
- Adresse postale

### Préférences
- Langue de l'interface
- Fuseau horaire
- Préférences de notification

## Comment modifier

1. Connectez-vous à votre compte
2. Cliquez sur votre profil en haut à droite
3. Sélectionnez "Paramètres"
4. Modifiez les informations souhaitées
5. Cliquez sur "Enregistrer"

## Modifications nécessitant une vérification

Certaines modifications requièrent une confirmation :
- Changement d'email → Email de confirmation
- Changement de téléphone → SMS de vérification
- Changement de mot de passe → Ancien mot de passe requis

## Informations de facturation

Pour modifier vos informations de facturation :
1. Accédez à "Paramètres" → "Facturation"
2. Mettez à jour les informations
3. Les prochaines factures utiliseront ces nouvelles informations`,
    tags: ["modification", "profil", "informations", "paramètres", "coordonnées"],
    faqSuggestions: [
      { question: "Puis-je changer mon nom ?", answer: "Oui, vous pouvez modifier votre nom dans les paramètres de votre profil." },
      { question: "Comment changer mon numéro de téléphone ?", answer: "Accédez aux paramètres, modifiez le numéro, puis validez avec le code SMS reçu sur le nouveau numéro." },
      { question: "Mes anciennes factures seront-elles modifiées ?", answer: "Non, les factures déjà émises conservent les informations au moment de l'émission." }
    ],
    seoKeywords: ["modifier profil", "changer informations", "mise à jour compte", "paramètres profil"],
    subcategorySlug: "mon-compte-client",
    order: 2
  },
  {
    slug: "gerer-preferences-notification",
    title: "Gérer mes préférences de notification",
    excerpt: "Personnalisez les notifications que vous recevez par email, SMS et push.",
    content: `## Types de notifications

SOS-Expat vous envoie différents types de notifications pour vous tenir informé.

## Notifications disponibles

### Transactionnelles (obligatoires)
- Confirmation de paiement
- Mise en relation avec un prestataire
- Rappels de rendez-vous

### Informatives (personnalisables)
- Nouveaux prestataires dans votre région
- Conseils et actualités pour expatriés
- Promotions et offres spéciales

## Canaux de notification

### Email
- Résumés de consultations
- Factures et reçus
- Newsletter (si activée)

### SMS
- Rappels de rendez-vous
- Alertes urgentes

### Push (application)
- Réponses des prestataires
- Messages importants

## Comment personnaliser

1. Accédez à "Paramètres" → "Notifications"
2. Activez/désactivez chaque type
3. Choisissez le canal préféré
4. Définissez la fréquence

## Recommandations

Nous recommandons de garder activées :
- ✅ Notifications transactionnelles
- ✅ Rappels de rendez-vous
- ✅ Alertes de sécurité`,
    tags: ["notifications", "email", "SMS", "préférences", "alertes"],
    faqSuggestions: [
      { question: "Puis-je désactiver toutes les notifications ?", answer: "Les notifications transactionnelles (paiements, mises en relation) sont obligatoires. Les autres sont personnalisables." },
      { question: "Comment arrêter la newsletter ?", answer: "Cliquez sur 'Se désabonner' en bas de la newsletter ou désactivez-la dans les paramètres." },
      { question: "Je ne reçois pas les SMS, que faire ?", answer: "Vérifiez votre numéro de téléphone et que votre opérateur ne bloque pas les SMS automatiques." }
    ],
    seoKeywords: ["notifications SOS-Expat", "préférences email", "alertes SMS", "gérer notifications"],
    subcategorySlug: "mon-compte-client",
    order: 3
  },
  {
    slug: "historique-consultations-missions",
    title: "Historique de mes consultations et missions",
    excerpt: "Accédez à l'historique complet de vos échanges avec les prestataires.",
    content: `## Votre historique complet

SOS-Expat conserve l'historique de toutes vos interactions pour votre suivi.

## Ce que contient l'historique

### Pour chaque consultation
- Date et heure
- Prestataire concerné
- Durée de l'échange
- Montant payé
- Statut (complétée, annulée, etc.)

### Documents associés
- Factures téléchargeables
- Notes de la consultation (si disponibles)
- Évaluation laissée

## Accéder à l'historique

1. Connectez-vous à votre compte
2. Cliquez sur "Mes consultations" ou "Historique"
3. Utilisez les filtres pour rechercher

## Filtres disponibles

- Par date (du... au...)
- Par prestataire
- Par type (avocat, expat aidant)
- Par statut

## Export des données

Vous pouvez exporter votre historique :
- Format PDF (pour impression)
- Format CSV (pour tableur)

## Durée de conservation

Votre historique est conservé :
- Consultations : 3 ans minimum
- Factures : 10 ans (obligation légale)
- Messages : selon les paramètres de confidentialité`,
    tags: ["historique", "consultations", "suivi", "factures", "archive"],
    faqSuggestions: [
      { question: "Puis-je supprimer mon historique ?", answer: "Les factures sont conservées pour des raisons légales. Les autres données peuvent être supprimées sur demande." },
      { question: "Comment retrouver une ancienne consultation ?", answer: "Utilisez les filtres de date et de prestataire dans la section Historique." },
      { question: "L'historique est-il partagé avec les prestataires ?", answer: "Non, votre historique est privé. Seules les informations de votre consultation commune sont visibles par le prestataire concerné." }
    ],
    seoKeywords: ["historique consultations", "suivi missions", "archive SOS-Expat", "mes consultations"],
    subcategorySlug: "mon-compte-client",
    order: 4
  },
  {
    slug: "supprimer-compte-donnees",
    title: "Supprimer mon compte et mes données",
    excerpt: "Procédure pour fermer votre compte et exercer votre droit à l'effacement des données.",
    content: `## Votre droit à l'effacement

Conformément au RGPD, vous pouvez demander la suppression de votre compte et de vos données personnelles.

## Avant de supprimer

Assurez-vous d'avoir :
- ✅ Téléchargé vos factures (conservez-les pour vos impôts)
- ✅ Terminé toute consultation en cours
- ✅ Réglé tout paiement en attente
- ✅ Exporté votre historique si nécessaire

## Procédure de suppression

### Option 1 : Depuis votre compte
1. Accédez à "Paramètres" → "Compte"
2. Cliquez sur "Supprimer mon compte"
3. Confirmez votre identité (mot de passe)
4. Expliquez la raison (optionnel)
5. Confirmez la suppression

### Option 2 : Par email
Envoyez une demande à notre support avec :
- Votre adresse email de compte
- "Demande de suppression de compte" en objet
- Une pièce d'identité pour vérification

## Ce qui est supprimé

- Votre profil et informations personnelles
- Vos préférences et paramètres
- Votre historique de consultations (sauf obligations légales)

## Ce qui est conservé

Pour des raisons légales, nous conservons :
- Les factures (10 ans)
- Les logs de transactions (5 ans)
- Les données anonymisées pour statistiques

## Délai de traitement

- Suppression automatique : immédiat à 48h
- Demande manuelle : 30 jours maximum (RGPD)`,
    tags: ["suppression", "compte", "RGPD", "données", "effacement"],
    faqSuggestions: [
      { question: "Puis-je récupérer mon compte après suppression ?", answer: "Non, la suppression est définitive. Vous devrez créer un nouveau compte si vous souhaitez revenir." },
      { question: "Mes factures seront-elles supprimées ?", answer: "Les factures sont conservées 10 ans pour des raisons légales, mais dissociées de votre identité." },
      { question: "Combien de temps prend la suppression ?", answer: "La suppression est effective sous 48h, avec un délai légal maximum de 30 jours." }
    ],
    seoKeywords: ["supprimer compte", "effacer données", "RGPD suppression", "fermer compte SOS-Expat"],
    subcategorySlug: "mon-compte-client",
    order: 5
  },
  {
    slug: "recuperer-acces-compte",
    title: "Récupérer l'accès à mon compte",
    excerpt: "Solutions pour récupérer votre compte en cas de mot de passe oublié ou problème de connexion.",
    content: `## Problèmes de connexion courants

Plusieurs situations peuvent vous empêcher d'accéder à votre compte.

## Mot de passe oublié

### Procédure de réinitialisation
1. Cliquez sur "Mot de passe oublié" sur la page de connexion
2. Entrez votre adresse email
3. Consultez votre boîte mail (et les spams)
4. Cliquez sur le lien reçu
5. Créez un nouveau mot de passe

### Le lien ne fonctionne pas ?
- Les liens expirent après 24h
- Demandez un nouveau lien
- Vérifiez que vous utilisez le bon email

## Email oublié

Si vous ne vous souvenez plus de l'email utilisé :
1. Contactez notre support
2. Fournissez des informations de vérification :
   - Nom complet
   - Date approximative d'inscription
   - Dernière consultation effectuée

## Compte bloqué

Votre compte peut être bloqué pour :
- Trop de tentatives de connexion échouées
- Activité suspecte détectée
- Non-paiement

### Solution
Contactez notre support avec une pièce d'identité pour débloquer votre compte.

## Connexion Google/Apple

Si vous avez utilisé Google ou Apple :
1. Assurez-vous d'utiliser le même compte
2. Vérifiez que l'accès n'a pas été révoqué
3. Reconnectez les comptes si nécessaire

## Sécurité

Après récupération de votre compte :
- Changez immédiatement votre mot de passe
- Vérifiez l'historique des connexions
- Activez l'authentification à deux facteurs`,
    tags: ["récupération", "mot de passe", "connexion", "accès", "compte bloqué"],
    faqSuggestions: [
      { question: "Je ne reçois pas l'email de réinitialisation", answer: "Vérifiez vos spams, attendez quelques minutes, puis réessayez. Contactez le support si le problème persiste." },
      { question: "Mon compte a été piraté, que faire ?", answer: "Contactez immédiatement notre support avec une pièce d'identité pour sécuriser votre compte." },
      { question: "Puis-je avoir plusieurs comptes ?", answer: "Non, un seul compte par personne est autorisé. Utilisez la récupération plutôt que de créer un nouveau compte." }
    ],
    seoKeywords: ["récupérer compte", "mot de passe oublié", "accès compte", "connexion SOS-Expat"],
    subcategorySlug: "mon-compte-client",
    order: 6
  }
];

// =============================================================================
// SOUS-CATÉGORIE 1.4: ÉVALUATIONS & QUALITÉ (5 articles)
// =============================================================================
const EVALUATIONS_QUALITE: HelpArticleData[] = [
  {
    slug: "evaluer-prestataire-apres-mission",
    title: "Comment évaluer un prestataire après une mission",
    excerpt: "Guide pour laisser une évaluation utile et constructive après votre consultation.",
    content: `## Pourquoi évaluer ?

Vos évaluations aident :
- Les autres expatriés à choisir
- Les prestataires à s'améliorer
- La communauté SOS-Expat à grandir

## Quand pouvez-vous évaluer ?

L'évaluation est disponible :
- Après la fin de votre consultation
- Pendant 30 jours
- Une seule fois par consultation

## Critères d'évaluation

### Note globale (1 à 5 étoiles)
Votre satisfaction générale.

### Critères détaillés
- **Réactivité** - Rapidité de réponse
- **Expertise** - Qualité des conseils
- **Communication** - Clarté des explications
- **Professionnalisme** - Attitude et sérieux

### Commentaire écrit
Décrivez votre expérience en quelques phrases.

## Comment évaluer

1. Accédez à votre historique de consultations
2. Sélectionnez la consultation concernée
3. Cliquez sur "Laisser un avis"
4. Remplissez l'évaluation
5. Validez

## Bonnes pratiques

✅ Soyez spécifique et factuel
✅ Mentionnez ce qui a bien fonctionné
✅ Suggérez des améliorations constructives
❌ Évitez les propos diffamatoires
❌ Ne divulguez pas d'informations confidentielles`,
    tags: ["évaluation", "avis", "notation", "feedback", "qualité"],
    faqSuggestions: [
      { question: "Mon évaluation est-elle anonyme ?", answer: "Votre prénom est affiché avec votre avis, mais pas votre nom complet ni vos coordonnées." },
      { question: "Puis-je modifier mon évaluation ?", answer: "Vous pouvez modifier votre évaluation dans les 7 jours suivant sa publication." },
      { question: "Le prestataire peut-il contester mon avis ?", answer: "Le prestataire peut répondre à votre avis, mais ne peut pas le supprimer." }
    ],
    seoKeywords: ["évaluer prestataire", "laisser avis", "noter consultation", "feedback avocat"],
    subcategorySlug: "evaluations-qualite",
    order: 1
  },
  {
    slug: "systeme-notation-sos-expat",
    title: "Comprendre le système de notation SOS-Expat",
    excerpt: "Explication du fonctionnement des notes et évaluations sur la plateforme.",
    content: `## Le système de notation

SOS-Expat utilise un système de notation transparent pour vous aider à choisir vos prestataires.

## Échelle de notation

### Étoiles (1 à 5)
- ⭐ 1 étoile : Très insatisfait
- ⭐⭐ 2 étoiles : Insatisfait
- ⭐⭐⭐ 3 étoiles : Correct
- ⭐⭐⭐⭐ 4 étoiles : Satisfait
- ⭐⭐⭐⭐⭐ 5 étoiles : Très satisfait

### Note moyenne affichée
La note affichée est une moyenne de toutes les évaluations reçues.

## Calcul de la note

La note moyenne prend en compte :
- Toutes les évaluations vérifiées
- Pondération par récence (avis récents plus importants)
- Minimum d'avis pour affichage (3 avis minimum)

## Badges de qualité

### Badge "Excellent"
- Note moyenne ≥ 4.8
- Minimum 10 avis
- Aucun avis négatif récent

### Badge "Vérifié"
- Identité vérifiée
- Qualifications confirmées

### Badge "Réactif"
- Temps de réponse moyen < 5 min
- Taux d'acceptation élevé

## Fiabilité des avis

Nous garantissons des avis authentiques :
- Seuls les clients ayant utilisé le service peuvent évaluer
- Système de détection des faux avis
- Modération des contenus inappropriés`,
    tags: ["notation", "étoiles", "badges", "moyenne", "fiabilité"],
    faqSuggestions: [
      { question: "Comment est calculée la note moyenne ?", answer: "C'est une moyenne pondérée de toutes les évaluations, avec plus de poids aux avis récents." },
      { question: "Pourquoi certains prestataires n'ont pas de note ?", answer: "Une note n'est affichée qu'après avoir reçu au minimum 3 évaluations vérifiées." },
      { question: "Les avis sont-ils modérés ?", answer: "Oui, les avis sont vérifiés pour s'assurer qu'ils sont authentiques et respectent nos règles." }
    ],
    seoKeywords: ["système notation", "étoiles SOS-Expat", "badges qualité", "avis vérifiés"],
    subcategorySlug: "evaluations-qualite",
    order: 2
  },
  {
    slug: "signaler-comportement-inapproprie",
    title: "Signaler un comportement inapproprié",
    excerpt: "Comment signaler un prestataire ou un comportement problématique sur la plateforme.",
    content: `## Notre engagement

SOS-Expat ne tolère aucun comportement inapproprié. Nous prenons chaque signalement au sérieux.

## Comportements à signaler

### Urgents (signalement immédiat)
- Harcèlement ou menaces
- Demande de paiement hors plateforme
- Usurpation d'identité
- Conseils manifestement dangereux

### À signaler
- Non-respect des engagements
- Manque de professionnalisme grave
- Communication inappropriée
- Surfacturation injustifiée

## Comment signaler

### Pendant la consultation
- Bouton "Signaler" dans l'interface d'appel
- Interrompt l'échange si nécessaire

### Après la consultation
1. Accédez à votre historique
2. Sélectionnez la consultation concernée
3. Cliquez sur "Signaler un problème"
4. Décrivez la situation en détail
5. Joignez des preuves si disponibles

### En urgence
Contactez directement notre support via le chat ou par téléphone.

## Traitement des signalements

1. **Réception** - Accusé de réception sous 24h
2. **Enquête** - Investigation approfondie
3. **Décision** - Mesures appropriées
4. **Suivi** - Information sur les suites données

## Mesures possibles

Selon la gravité :
- Avertissement au prestataire
- Suspension temporaire
- Exclusion définitive de la plateforme
- Signalement aux autorités si nécessaire`,
    tags: ["signalement", "comportement", "inapproprié", "réclamation", "sécurité"],
    faqSuggestions: [
      { question: "Mon signalement est-il confidentiel ?", answer: "Oui, votre identité est protégée pendant l'enquête. Le prestataire n'est pas informé de qui a signalé." },
      { question: "Que se passe-t-il après mon signalement ?", answer: "Nous enquêtons et vous informons des suites données, dans le respect de la confidentialité." },
      { question: "Puis-je être remboursé après un signalement ?", answer: "Selon la nature du problème et les conclusions de l'enquête, un remboursement peut être accordé." }
    ],
    seoKeywords: ["signaler prestataire", "comportement inapproprié", "réclamation SOS-Expat", "problème consultation"],
    subcategorySlug: "evaluations-qualite",
    order: 3
  },
  {
    slug: "selection-prestataires",
    title: "Comment sont sélectionnés nos prestataires",
    excerpt: "Découvrez notre processus rigoureux de vérification et de sélection des prestataires.",
    content: `## Notre processus de sélection

Chaque prestataire sur SOS-Expat passe par un processus de vérification rigoureux.

## Vérifications effectuées

### Pour les avocats
- ✅ Diplôme de droit vérifié
- ✅ Inscription au barreau confirmée
- ✅ Assurance professionnelle vérifiée
- ✅ Casier judiciaire vérifié
- ✅ Entretien de validation

### Pour les expats aidants
- ✅ Identité vérifiée
- ✅ Expérience d'expatriation confirmée
- ✅ Références vérifiées
- ✅ Entretien de validation
- ✅ Formation aux standards SOS-Expat

## Critères d'acceptation

### Obligatoires
- Documents d'identité valides
- Qualifications vérifiables
- Maîtrise d'au moins 2 langues
- Engagement envers notre charte éthique

### Évalués
- Expérience professionnelle
- Spécialisations
- Disponibilité
- Motivation

## Suivi continu

Une fois acceptés, les prestataires sont suivis :
- Évaluations des clients analysées
- Formation continue proposée
- Contrôles qualité réguliers
- Renouvellement annuel des vérifications

## Exclusion

Un prestataire peut être exclu pour :
- Faux documents
- Évaluations négatives répétées
- Non-respect de la charte
- Comportement inapproprié`,
    tags: ["sélection", "vérification", "qualité", "prestataires", "critères"],
    faqSuggestions: [
      { question: "Tous les avocats sont-ils vérifiés ?", answer: "Oui, 100% des avocats ont leur inscription au barreau et leurs qualifications vérifiées avant acceptation." },
      { question: "Comment vérifiez-vous les expats aidants ?", answer: "Nous vérifions leur identité, leur expérience d'expatriation et contactons leurs références." },
      { question: "Un prestataire peut-il être exclu ?", answer: "Oui, en cas de non-respect de nos standards ou de plaintes graves et vérifiées." }
    ],
    seoKeywords: ["sélection prestataires", "vérification avocats", "qualité SOS-Expat", "critères acceptation"],
    subcategorySlug: "evaluations-qualite",
    order: 4
  },
  {
    slug: "garantie-qualite-sos-expat",
    title: "Garantie qualité SOS-Expat",
    excerpt: "Nos engagements de qualité et ce que nous garantissons à nos utilisateurs.",
    content: `## Nos engagements qualité

SOS-Expat s'engage à vous offrir un service de qualité avec des garanties concrètes.

## Ce que nous garantissons

### Prestataires vérifiés
- 100% des prestataires passent notre processus de vérification
- Qualifications et identités confirmées
- Suivi continu de la qualité

### Réponse rapide
- SOS Urgence : réponse en moins de 5 minutes
- Demande standard : réponse sous 2 heures
- Support client : réponse sous 24h

### Tarification transparente
- Prix affichés avant confirmation
- Aucun frais caché
- Factures conformes

### Sécurité des données
- Cryptage SSL
- Conformité RGPD
- Aucune revente de données

## Satisfaction ou solution

Si vous n'êtes pas satisfait :
1. Contactez-nous dans les 48h
2. Expliquez le problème rencontré
3. Nous proposons une solution :
   - Nouvelle mise en relation gratuite
   - Remboursement partiel ou total
   - Médiation avec le prestataire

## Amélioration continue

Nous utilisons vos retours pour :
- Améliorer nos processus
- Former nos prestataires
- Développer de nouveaux services

## Limites de la garantie

Notre garantie couvre la mise en relation et la plateforme.
Les prestations elles-mêmes (conseils juridiques, etc.) sont de la responsabilité du prestataire.`,
    tags: ["garantie", "qualité", "engagement", "satisfaction", "sécurité"],
    faqSuggestions: [
      { question: "Que couvre exactement la garantie ?", answer: "La garantie couvre la qualité de la mise en relation et le respect de nos standards. Les conseils du prestataire sont de sa responsabilité." },
      { question: "Comment activer la garantie satisfaction ?", answer: "Contactez notre support dans les 48h suivant votre consultation avec les détails du problème." },
      { question: "Puis-je être remboursé si je ne suis pas satisfait ?", answer: "Selon la situation, nous proposons une nouvelle mise en relation ou un remboursement." }
    ],
    seoKeywords: ["garantie qualité", "engagement SOS-Expat", "satisfaction client", "service garanti"],
    subcategorySlug: "evaluations-qualite",
    order: 5
  }
];

// =============================================================================
// SOUS-CATÉGORIE 1.5: SÉCURITÉ & CONFIDENTIALITÉ (5 articles)
// =============================================================================
const SECURITE_CONFIDENTIALITE: HelpArticleData[] = [
  {
    slug: "protection-donnees-personnelles",
    title: "Protection de vos données personnelles",
    excerpt: "Comment SOS-Expat protège et utilise vos données personnelles conformément au RGPD.",
    content: `## Notre engagement RGPD

SOS-Expat est pleinement conforme au Règlement Général sur la Protection des Données (RGPD).

## Données collectées

### Données d'identification
- Nom et prénom
- Email et téléphone
- Adresse (optionnel)

### Données d'utilisation
- Historique des consultations
- Préférences de service
- Interactions avec la plateforme

### Données de paiement
- Traitées par Stripe (pas stockées par nous)

## Utilisation de vos données

Vos données sont utilisées pour :
- ✅ Fournir le service demandé
- ✅ Améliorer votre expérience
- ✅ Communications essentielles
- ✅ Obligations légales

Vos données ne sont JAMAIS :
- ❌ Vendues à des tiers
- ❌ Utilisées pour de la publicité ciblée
- ❌ Partagées sans votre consentement

## Vos droits

Vous avez le droit de :
- Accéder à vos données
- Les rectifier
- Les supprimer (droit à l'oubli)
- Les porter vers un autre service
- Retirer votre consentement

## Exercer vos droits

1. Accédez à "Paramètres" → "Mes données"
2. Ou contactez notre DPO : dpo@sos-expat.com
3. Délai de réponse : 30 jours maximum

## Durée de conservation

- Données de compte : durée du compte + 3 ans
- Factures : 10 ans (obligation légale)
- Logs : 1 an`,
    tags: ["RGPD", "données personnelles", "protection", "vie privée", "confidentialité"],
    faqSuggestions: [
      { question: "Mes données sont-elles vendues ?", answer: "Non, jamais. Vos données ne sont utilisées que pour fournir le service et ne sont jamais vendues à des tiers." },
      { question: "Comment demander la suppression de mes données ?", answer: "Contactez notre DPO ou utilisez l'option 'Supprimer mon compte' dans les paramètres." },
      { question: "Qui a accès à mes données ?", answer: "Seuls les employés autorisés et les prestataires concernés par vos consultations ont un accès limité et nécessaire." }
    ],
    seoKeywords: ["protection données", "RGPD SOS-Expat", "vie privée", "confidentialité données"],
    subcategorySlug: "securite-confidentialite",
    order: 1
  },
  {
    slug: "confidentialite-echanges-prestataires",
    title: "Confidentialité des échanges avec les prestataires",
    excerpt: "Comment sont protégées vos communications avec les avocats et expats aidants.",
    content: `## Secret professionnel

Les échanges avec nos prestataires sont protégés.

## Pour les avocats

### Secret professionnel
Les avocats sont tenus au secret professionnel par la loi. Vos échanges sont :
- Confidentiels par nature
- Protégés par le secret avocat-client
- Non divulgables même en justice (sauf exceptions légales)

### Ce que cela signifie
L'avocat ne peut pas révéler :
- Le contenu de vos échanges
- Les documents partagés
- Même le fait que vous l'avez consulté

## Pour les expats aidants

### Engagement de confidentialité
Tous les expats aidants signent un engagement de confidentialité :
- Non-divulgation de vos informations
- Protection de votre vie privée
- Sanctions en cas de violation

## Sur la plateforme

### Communications sécurisées
- Échanges cryptés de bout en bout
- Pas d'enregistrement des appels
- Messages supprimés après la période légale

### Accès restreint
- Seuls vous et le prestataire avez accès
- Support SOS-Expat uniquement sur demande explicite

## Limitations

La confidentialité peut être levée :
- Sur ordonnance judiciaire
- En cas de danger imminent
- Pour prévenir un crime grave

Ces cas sont exceptionnels et encadrés par la loi.`,
    tags: ["confidentialité", "secret professionnel", "échanges", "avocat", "protection"],
    faqSuggestions: [
      { question: "Mes échanges avec l'avocat sont-ils enregistrés ?", answer: "Non, les appels ne sont pas enregistrés. Les messages écrits sont stockés de manière sécurisée et cryptée." },
      { question: "SOS-Expat peut-il lire mes messages ?", answer: "Non, sauf sur votre demande explicite pour résoudre un litige." },
      { question: "L'expat aidant a-t-il les mêmes obligations qu'un avocat ?", answer: "Non, mais il signe un engagement de confidentialité strict. Pour des sujets très sensibles, préférez un avocat." }
    ],
    seoKeywords: ["confidentialité échanges", "secret professionnel avocat", "protection communications", "vie privée consultation"],
    subcategorySlug: "securite-confidentialite",
    order: 2
  },
  {
    slug: "verification-identite-prestataires",
    title: "Comment SOS-Expat vérifie l'identité des prestataires",
    excerpt: "Notre processus de vérification pour garantir l'authenticité de nos prestataires.",
    content: `## Processus de vérification

Chaque prestataire passe par un processus de vérification rigoureux avant de rejoindre la plateforme.

## Documents vérifiés

### Pour tous les prestataires
- ✅ Pièce d'identité officielle (passeport, carte d'identité)
- ✅ Photo de vérification en temps réel
- ✅ Adresse de résidence
- ✅ Numéro de téléphone vérifié

### Pour les avocats (supplémentaire)
- ✅ Diplôme de droit
- ✅ Certificat d'inscription au barreau
- ✅ Attestation d'assurance professionnelle
- ✅ Extrait de casier judiciaire

### Pour les expats aidants (supplémentaire)
- ✅ Justificatif d'expatriation
- ✅ Références professionnelles
- ✅ Entretien téléphonique

## Méthodes de vérification

### Vérification automatisée
- Scan des documents
- Reconnaissance faciale
- Vérification des données

### Vérification manuelle
- Analyse par notre équipe
- Appel de confirmation si nécessaire
- Vérification des références

### Vérifications externes
- Bases de données des barreaux
- Registres officiels
- Partenaires de vérification d'identité

## Renouvellement

Les vérifications sont renouvelées :
- Annuellement pour les documents professionnels
- À chaque mise à jour significative du profil
- Sur signalement ou doute`,
    tags: ["vérification", "identité", "sécurité", "authentification", "prestataires"],
    faqSuggestions: [
      { question: "Comment êtes-vous sûrs que l'avocat est inscrit au barreau ?", answer: "Nous vérifions directement auprès des barreaux et consultons les registres officiels." },
      { question: "Les documents sont-ils vérifiés manuellement ?", answer: "Oui, après une première vérification automatisée, notre équipe analyse manuellement chaque dossier." },
      { question: "Que se passe-t-il si un prestataire utilise de faux documents ?", answer: "Il est immédiatement exclu de la plateforme et peut faire l'objet de poursuites judiciaires." }
    ],
    seoKeywords: ["vérification identité", "authentification prestataires", "sécurité plateforme", "contrôle avocats"],
    subcategorySlug: "securite-confidentialite",
    order: 3
  },
  {
    slug: "signaler-fraude-arnaque",
    title: "Signaler une fraude ou tentative d'arnaque",
    excerpt: "Que faire si vous suspectez une fraude et comment nous aider à protéger la communauté.",
    content: `## Reconnaître une tentative de fraude

Soyez vigilant face à ces signaux d'alerte.

## Signaux d'alerte

### Demandes suspectes
- ⚠️ Paiement hors de la plateforme
- ⚠️ Demande d'informations bancaires
- ⚠️ Urgence excessive pour vous faire payer
- ⚠️ Offres trop belles pour être vraies

### Comportements anormaux
- ⚠️ Prestataire qui refuse d'utiliser la plateforme
- ⚠️ Communication uniquement par messages privés externes
- ⚠️ Demande de virement bancaire direct

## Comment signaler

### Signalement immédiat
1. Arrêtez toute communication
2. Ne payez rien hors plateforme
3. Cliquez sur "Signaler" dans la conversation
4. Décrivez la situation

### Signalement détaillé
Envoyez à security@sos-expat.com :
- Captures d'écran des échanges
- Description chronologique
- Tout élément utile

## Ce que nous faisons

1. **Investigation immédiate** - Analyse du signalement
2. **Suspension préventive** - Si doute sérieux
3. **Enquête approfondie** - Vérification des faits
4. **Action** - Exclusion si fraude confirmée
5. **Signalement** - Aux autorités si nécessaire

## Protection

Si vous avez été victime :
- Signalez immédiatement
- Contactez votre banque
- Portez plainte si nécessaire
- Nous vous assistons dans vos démarches`,
    tags: ["fraude", "arnaque", "signalement", "sécurité", "protection"],
    faqSuggestions: [
      { question: "Un prestataire me demande de payer en dehors de la plateforme", answer: "C'est une violation de nos règles. Signalez immédiatement et ne payez jamais en dehors de SOS-Expat." },
      { question: "J'ai été victime d'une arnaque, que faire ?", answer: "Signalez-nous, contactez votre banque, et portez plainte. Nous vous assistons dans vos démarches." },
      { question: "Comment puis-je être sûr qu'un prestataire est légitime ?", answer: "Tous nos prestataires sont vérifiés. Méfiez-vous de toute demande de paiement hors plateforme." }
    ],
    seoKeywords: ["signaler fraude", "arnaque expatrié", "sécurité paiement", "protection arnaque"],
    subcategorySlug: "securite-confidentialite",
    order: 4
  },
  {
    slug: "droits-rgpd-sos-expat",
    title: "Vos droits RGPD sur SOS-Expat",
    excerpt: "Comprendre et exercer vos droits sur vos données personnelles selon le RGPD.",
    content: `## Le RGPD en bref

Le Règlement Général sur la Protection des Données vous donne des droits sur vos données personnelles.

## Vos 7 droits principaux

### 1. Droit d'accès
Vous pouvez demander une copie de toutes les données que nous avons sur vous.

### 2. Droit de rectification
Vous pouvez corriger toute donnée inexacte ou incomplète.

### 3. Droit à l'effacement (oubli)
Vous pouvez demander la suppression de vos données (avec certaines limites légales).

### 4. Droit à la limitation
Vous pouvez demander de restreindre le traitement de vos données.

### 5. Droit à la portabilité
Vous pouvez récupérer vos données dans un format lisible par machine.

### 6. Droit d'opposition
Vous pouvez vous opposer à certains traitements de vos données.

### 7. Droit de retirer le consentement
Vous pouvez retirer votre consentement à tout moment.

## Comment exercer vos droits

### En ligne
Accédez à "Paramètres" → "Mes données" → "Exercer mes droits"

### Par email
Contactez notre DPO : dpo@sos-expat.com

### Par courrier
SOS-Expat - DPO
[Adresse postale]

## Délais de réponse

- Accusé de réception : 48h
- Réponse complète : 30 jours maximum
- Prolongation possible : +60 jours (cas complexes, vous serez informé)

## Recours

Si vous n'êtes pas satisfait :
- Contactez notre DPO pour réexamen
- Saisissez la CNIL (autorité française)`,
    tags: ["RGPD", "droits", "données", "vie privée", "réglementation"],
    faqSuggestions: [
      { question: "Comment obtenir une copie de mes données ?", answer: "Accédez à vos paramètres ou contactez notre DPO. Vous recevrez vos données sous 30 jours." },
      { question: "Puis-je demander l'effacement total de mes données ?", answer: "Oui, sauf pour les données que nous devons conserver légalement (factures, logs de transactions)." },
      { question: "Que faire si ma demande RGPD n'est pas traitée ?", answer: "Contactez d'abord notre DPO pour réexamen, puis vous pouvez saisir la CNIL si nécessaire." }
    ],
    seoKeywords: ["droits RGPD", "protection données", "vie privée", "exercer droits RGPD"],
    subcategorySlug: "securite-confidentialite",
    order: 5
  }
];

// =============================================================================
// EXPORT DE TOUS LES ARTICLES CLIENTS
// =============================================================================
export const HELP_ARTICLES_CLIENTS: HelpArticleData[] = [
  ...URGENCES_PREMIERS_PAS,
  ...PAIEMENTS_FRAIS,
  ...MON_COMPTE,
  ...EVALUATIONS_QUALITE,
  ...SECURITE_CONFIDENTIALITE
];

// Export par sous-catégorie pour référence
export const CLIENT_ARTICLES_BY_SUBCATEGORY = {
  urgencesPremiersPas: URGENCES_PREMIERS_PAS,
  paiementsFrais: PAIEMENTS_FRAIS,
  monCompte: MON_COMPTE,
  evaluationsQualite: EVALUATIONS_QUALITE,
  securiteConfidentialite: SECURITE_CONFIDENTIALITE
};
