// src/services/helpArticles/helpArticlesSituations.ts
// Articles pour la catégorie "Guides par Situation" - Contenu FR uniquement
// La traduction vers les 8 autres langues se fait à l'initialisation

import { HelpArticleData } from './helpArticlesClients';

// =============================================================================
// SOUS-CATÉGORIE 5.1: SITUATIONS D'URGENCE (15 articles)
// =============================================================================
const SITUATIONS_URGENCE: HelpArticleData[] = [
  {
    slug: "guide-arrestation-etranger",
    title: "Guide complet : Arrestation à l'étranger",
    excerpt: "Tout ce que vous devez savoir et faire si vous êtes arrêté dans un pays étranger.",
    content: `## Être arrêté à l'étranger : restez calme

Une arrestation dans un pays étranger est une situation stressante. Ce guide vous aide à y faire face.

## Vos droits universels

### Dans la plupart des pays
- Droit d'être informé des charges
- Droit à un avocat
- Droit de contacter votre ambassade
- Droit à un interprète

### Attention
Les droits varient selon les pays. Certains sont moins protecteurs que d'autres.

## Les 10 premiers réflexes

1. **Restez calme** - Ne résistez pas
2. **Demandez un avocat** - Insistez poliment
3. **Contactez votre ambassade** - C'est votre droit
4. **Ne signez rien** sans comprendre
5. **Notez tout** - Noms, heures, traitements
6. **Gardez le silence** sur les faits jusqu'à l'arrivée de l'avocat
7. **Utilisez SOS-Expat** dès que possible
8. **Prévenez un proche** via l'ambassade
9. **Conservez vos documents** d'identité
10. **Restez respectueux** envers les autorités

## Ce qu'il ne faut JAMAIS faire

- ❌ Résister physiquement
- ❌ Mentir aux autorités
- ❌ Tenter de corrompre (crime grave)
- ❌ S'énerver ou menacer
- ❌ Fuir ou tenter de fuir

## Rôle de l'ambassade

L'ambassade peut :
- Vous rendre visite
- Vérifier vos conditions de détention
- Fournir une liste d'avocats
- Informer votre famille
- S'assurer du respect de vos droits

L'ambassade NE peut PAS :
- Vous faire libérer
- Interférer avec la justice locale
- Payer votre caution
- Servir d'avocat

## Comment SOS-Expat aide

- Avocat local en moins de 5 minutes
- Communication dans votre langue
- Connaissance des procédures locales
- Suivi de votre dossier`,
    tags: ["arrestation", "détention", "droits", "étranger", "urgence"],
    faqSuggestions: [
      { question: "L'ambassade peut-elle me faire libérer ?", answer: "Non, l'ambassade ne peut pas interférer avec la justice locale. Elle veille au respect de vos droits mais ne peut pas vous libérer." },
      { question: "Dois-je parler à la police sans avocat ?", answer: "Dans la plupart des pays, vous pouvez garder le silence jusqu'à l'arrivée de votre avocat. Demandez ce droit." },
      { question: "Comment payer un avocat si je suis détenu ?", answer: "SOS-Expat permet à vos proches de payer les frais de mise en relation à distance pour vous." }
    ],
    seoKeywords: ["arrestation étranger", "détenu à l'étranger", "droits arrestation", "aide détention internationale"],
    subcategorySlug: "situations-urgence",
    order: 1
  },
  {
    slug: "guide-accident-route-etranger",
    title: "Guide complet : Accident de la route à l'étranger",
    excerpt: "Procédure à suivre en cas d'accident de voiture dans un pays étranger.",
    content: `## Accident à l'étranger : les étapes essentielles

Un accident de la route à l'étranger peut être déstabilisant. Voici comment réagir.

## Sécurité d'abord

### Immédiatement
1. Coupez le moteur
2. Allumez les warnings
3. Mettez le gilet de sécurité (si disponible)
4. Placez le triangle de signalisation
5. Éloignez-vous de la chaussée

### En cas de blessés
- Appelez les secours locaux
- Ne déplacez pas les blessés sauf danger immédiat
- Prodiguez les premiers secours si formé

## Documenter l'accident

### Photos à prendre
- Vue générale de la scène
- Dégâts sur tous les véhicules
- Plaques d'immatriculation
- Conditions de la route
- Panneaux de signalisation

### Informations à collecter
- Nom et coordonnées des autres conducteurs
- Numéros d'assurance
- Témoins et leurs coordonnées
- Rapport de police (numéro)

## Constat amiable

### Si disponible
Utilisez le constat européen (valable dans l'UE).

### Conseils
- Remplissez en deux exemplaires
- Soyez factuel, pas émotionnel
- Ne signez que ce que vous comprenez
- Gardez un exemplaire

## Appeler la police ?

### Obligatoire si
- Il y a des blessés
- Dégâts importants
- L'autre partie refuse de coopérer
- Vous êtes dans un pays où c'est la loi

### Rapport de police
Demandez toujours une copie ou un numéro de référence.

## Assurance et indemnisation

### À contacter
- Votre assurance auto
- L'assurance voyage si vous en avez une
- Votre protection juridique

### Documents nécessaires
- Constat d'accident
- Rapport de police
- Photos
- Factures des réparations

## Quand contacter un avocat ?

- Blessures graves
- Responsabilité contestée
- Délit de fuite de l'autre partie
- Procédure judiciaire engagée`,
    tags: ["accident", "route", "voiture", "constat", "assurance"],
    faqSuggestions: [
      { question: "Mon assurance française couvre-t-elle les accidents à l'étranger ?", answer: "Dans l'UE, la couverture minimale est obligatoire. Hors UE, vérifiez votre contrat ou prenez une extension." },
      { question: "Dois-je appeler la police pour un accrochage mineur ?", answer: "Cela dépend du pays. Dans certains pays, c'est obligatoire pour tout accident. Renseignez-vous sur les règles locales." },
      { question: "Que faire si je ne comprends pas le constat ?", answer: "Ne signez pas ce que vous ne comprenez pas. Demandez un interprète ou utilisez SOS-Expat pour une assistance." }
    ],
    seoKeywords: ["accident voiture étranger", "accident route international", "constat accident étranger", "assurance auto étranger"],
    subcategorySlug: "situations-urgence",
    order: 2
  },
  {
    slug: "guide-vol-agression-etranger",
    title: "Guide complet : Vol ou agression à l'étranger",
    excerpt: "Que faire immédiatement après avoir été victime d'un vol ou d'une agression.",
    content: `## Après un vol ou une agression

Être victime d'un crime à l'étranger est traumatisant. Voici les étapes à suivre.

## Sécurité immédiate

### Priorité absolue
- Éloignez-vous du danger
- Rendez-vous dans un lieu sûr
- Si blessé, cherchez des soins médicaux

### Ne prenez pas de risques
Ne poursuivez pas les agresseurs.

## Étapes à suivre

### 1. Portez plainte
- Rendez-vous au commissariat
- Demandez un interprète si nécessaire
- Obtenez une copie du dépôt de plainte

### 2. Contactez votre ambassade
- Assistance aux ressortissants
- Aide pour les documents perdus
- Support en cas de besoin

### 3. Prévenez vos banques
- Faites opposition sur vos cartes
- Bloquez vos comptes si nécessaire

### 4. Contactez vos assurances
- Assurance voyage
- Assurance habitation (parfois)
- Protection juridique

## Documents volés

### Passeport
- Ambassade pour un passeport d'urgence
- Déclaration de perte/vol à la police

### Cartes bancaires
- Opposition immédiate
- Numéros à avoir : notés séparément

### Téléphone
- Blocage via IMEI auprès de l'opérateur
- Localisation si activée

## Aide médicale

### En cas de blessure
- Urgences de l'hôpital le plus proche
- Conservez tous les documents médicaux
- Certificats pour l'assurance

### Traumatisme psychologique
- Ne négligez pas l'impact émotionnel
- Parlez-en à un professionnel
- Associations d'aide aux victimes

## Indemnisation

### Assurance voyage
Peut couvrir :
- Objets volés
- Frais médicaux
- Rapatriement si nécessaire

### Fonds de garantie
Certains pays ont des fonds pour les victimes étrangères.`,
    tags: ["vol", "agression", "victime", "plainte", "sécurité"],
    faqSuggestions: [
      { question: "Dois-je porter plainte même pour un petit vol ?", answer: "Oui, le dépôt de plainte est nécessaire pour l'assurance et peut aider la police à identifier les auteurs." },
      { question: "L'ambassade peut-elle me prêter de l'argent ?", answer: "L'ambassade peut aider à contacter vos proches pour un transfert, mais ne prête généralement pas d'argent." },
      { question: "Comment me faire rembourser par l'assurance ?", answer: "Conservez tous les justificatifs (plainte, factures, certificats médicaux) et déclarez le sinistre rapidement." }
    ],
    seoKeywords: ["vol étranger que faire", "agression voyage", "victime crime étranger", "plainte police étranger"],
    subcategorySlug: "situations-urgence",
    order: 3
  },
  {
    slug: "guide-urgence-medicale-etranger",
    title: "Guide complet : Urgence médicale à l'étranger",
    excerpt: "Comment réagir face à une urgence médicale quand on est expatrié.",
    content: `## Urgence médicale : agir vite et bien

Une urgence médicale à l'étranger nécessite des réflexes adaptés.

## Numéros d'urgence

### À connaître AVANT
- Numéro d'urgence local (équivalent du 15/112)
- Numéro de votre assurance santé
- Hôpital le plus proche

### Numéros utiles
- Europe : 112 (universel)
- États-Unis : 911
- Asie : variable selon les pays

## En cas d'urgence vitale

### Étapes
1. Appelez les secours locaux
2. Décrivez la situation simplement
3. Donnez votre localisation précise
4. Restez en ligne et suivez les instructions

### Si barrière linguistique
- Utilisez des mots simples
- "Emergency", "Help", "Hospital"
- Applications de traduction

## Choix de l'hôpital

### Critères
- Proximité en urgence vitale
- Qualité des soins
- Capacité à communiquer
- Acceptation de votre assurance

### Ressources
- Ambassade : liste d'hôpitaux recommandés
- Assurance : réseau de cliniques partenaires

## Assurance et paiement

### Carte européenne
- Valable dans l'UE/EEE
- Soins aux mêmes conditions que les locaux
- Ne couvre pas le rapatriement

### Assurance privée
- Appelez l'assistance dès que possible
- Numéro sur votre carte
- Ils peuvent :
  - Payer directement l'hôpital
  - Organiser un transfert
  - Vous guider dans les démarches

### Paiement sur place
- Conservez TOUTES les factures
- Demandez des documents détaillés
- Remboursement après retour

## Rapatriement médical

### Quand ?
- Soins locaux insuffisants
- Décision médicale
- Accord de l'assurance

### Organisation
- Via votre assurance
- Ambulance, avion médicalisé selon les cas
- Ne décidez pas seul

## Suivi après l'urgence

- Dossier médical traduit si nécessaire
- Transmission à votre médecin en France
- Suivi des soins`,
    tags: ["urgence médicale", "hôpital", "santé", "assurance", "rapatriement"],
    faqSuggestions: [
      { question: "Ma carte européenne suffit-elle pour les soins à l'étranger ?", answer: "Dans l'UE/EEE oui pour les soins courants, mais elle ne couvre pas le rapatriement. Une assurance complémentaire est recommandée." },
      { question: "Dois-je payer l'hôpital sur place ?", answer: "Cela dépend de l'hôpital et de votre assurance. Contactez votre assurance qui peut souvent payer directement." },
      { question: "Comment organiser un rapatriement ?", answer: "Via votre assurance qui évaluera la situation et organisera le transport adapté si nécessaire." }
    ],
    seoKeywords: ["urgence médicale étranger", "hôpital expatrié", "soins étranger", "rapatriement médical"],
    subcategorySlug: "situations-urgence",
    order: 4
  },
  {
    slug: "guide-perte-vol-passeport",
    title: "Guide complet : Perte ou vol de passeport à l'étranger",
    excerpt: "Procédure pour obtenir un nouveau passeport quand on est bloqué à l'étranger.",
    content: `## Passeport perdu ou volé : pas de panique

Perdre son passeport à l'étranger est stressant mais gérable.

## Étapes immédiates

### 1. Déclaration de perte/vol
- Au commissariat local
- Obtenez un récépissé
- Document essentiel pour la suite

### 2. Contactez votre ambassade/consulat
- Numéro d'urgence si hors heures
- Prenez rendez-vous

### 3. Préparez les documents
- Récépissé de déclaration de perte/vol
- Photos d'identité (ou sur place)
- Copie du passeport perdu (si vous avez)
- Autre pièce d'identité

## À l'ambassade/consulat

### Documents délivrés
- **Laissez-passer** : Pour rentrer en France uniquement
- **Passeport d'urgence** : Validité limitée, pour voyager

### Délais
- Laissez-passer : souvent le jour même
- Passeport d'urgence : quelques jours
- Passeport définitif : plusieurs semaines

### Coûts
Des frais consulaires s'appliquent (variables selon le document).

## Continuer son voyage ?

### Avec un laissez-passer
- Uniquement pour rentrer en France
- Pas pour visiter d'autres pays

### Avec un passeport d'urgence
- Peut permettre de continuer
- Vérifiez les exigences des pays visités
- Certains pays n'acceptent pas les passeports d'urgence

## Prévention

### Conseils
- Conservez une copie numérique de votre passeport
- Photo dans votre email ou cloud sécurisé
- Gardez le passeport en lieu sûr
- Ne le laissez pas dans un sac facile à voler

### Documents utiles à avoir
- Copie du passeport
- Carte d'identité (si vous en avez une)
- Permis de conduire
- Tout document avec photo

## Signaler le vol

### À faire aussi
- Opposition si chéquier dans le même sac
- Prévenir l'assurance
- Changer les mots de passe si téléphone volé aussi`,
    tags: ["passeport", "perte", "vol", "ambassade", "laissez-passer"],
    faqSuggestions: [
      { question: "Combien de temps pour avoir un nouveau passeport ?", answer: "Un laissez-passer peut être délivré le jour même. Un passeport d'urgence prend quelques jours. Un passeport définitif plusieurs semaines." },
      { question: "Puis-je voyager avec un laissez-passer ?", answer: "Le laissez-passer ne permet que le retour direct en France. Pour continuer à voyager, il faut un passeport d'urgence." },
      { question: "Que faire si l'ambassade est fermée ?", answer: "Les ambassades ont un numéro d'urgence pour les situations critiques. Appelez ce numéro." }
    ],
    seoKeywords: ["passeport perdu étranger", "vol passeport", "ambassade passeport", "laissez-passer"],
    subcategorySlug: "situations-urgence",
    order: 5
  },
  {
    slug: "guide-probleme-visa-immigration",
    title: "Guide : Problème de visa ou immigration",
    excerpt: "Que faire en cas de refus de visa, expiration ou problème avec les autorités d'immigration.",
    content: `## Problèmes de visa : comment réagir

Les problèmes de visa peuvent avoir des conséquences graves. Agissez rapidement.

## Types de problèmes courants

### Visa expiré
- Vous êtes en situation irrégulière
- Risques : amende, expulsion, interdiction de retour

### Refus de visa
- À l'ambassade avant le départ
- À la frontière à l'arrivée

### Problème à la frontière
- Documents manquants
- Visa non valide pour le motif de séjour

### Changement de situation
- Perte d'emploi (visa de travail)
- Fin d'études (visa étudiant)

## Visa expiré : que faire

### Immédiatement
1. Ne paniquez pas
2. Contactez un avocat spécialisé
3. Ne sortez pas du pays (risque d'interdiction de retour)

### Options possibles
- Régularisation (selon les pays)
- Départ volontaire (moins de conséquences)
- Demande de nouveau visa depuis le pays

### À éviter absolument
- Ignorer le problème (aggrave la situation)
- Travailler sans autorisation
- Voyager dans d'autres pays

## Refus de visa : recours

### À l'ambassade
- Demandez les motifs par écrit
- Recours gracieux possible
- Recours contentieux (tribunal administratif)

### À la frontière
- Demandez à parler à un supérieur
- Gardez votre calme
- Contactez votre ambassade si nécessaire

## Rôle d'un avocat

Un avocat en droit de l'immigration peut :
- Évaluer votre situation
- Préparer un dossier de régularisation
- Vous représenter
- Négocier avec les autorités

## Prévention

### Bonnes pratiques
- Surveillez les dates d'expiration
- Commencez les renouvellements à temps
- Conservez tous les documents
- Respectez les conditions du visa`,
    tags: ["visa", "immigration", "régularisation", "expiration", "frontière"],
    faqSuggestions: [
      { question: "Mon visa a expiré il y a quelques jours, est-ce grave ?", answer: "Oui, vous êtes en situation irrégulière. Consultez un avocat rapidement pour régulariser ou organiser votre départ." },
      { question: "Puis-je contester un refus de visa ?", answer: "Oui, des recours sont possibles. Demandez les motifs par écrit et consultez un avocat pour évaluer vos options." },
      { question: "Que risque-t-on avec un visa expiré ?", answer: "Amende, détention administrative, expulsion et potentiellement une interdiction de retour dans le pays." }
    ],
    seoKeywords: ["problème visa", "visa expiré", "refus visa", "immigration avocat", "régularisation"],
    subcategorySlug: "situations-urgence",
    order: 6
  },
  {
    slug: "guide-deces-proche-etranger",
    title: "Guide : Décès d'un proche à l'étranger",
    excerpt: "Démarches à suivre lors du décès d'un membre de la famille à l'étranger.",
    content: `## Faire face au décès d'un proche à l'étranger

Cette situation douloureuse nécessite de nombreuses démarches. Ce guide vous accompagne.

## Premiers contacts

### Ambassade/Consulat
- Déclaration du décès
- Aide aux formalités
- Transcription de l'acte de décès

### Autorités locales
- Certificat de décès local
- Formalités de police si nécessaire

### Assurances
- Assurance rapatriement
- Assurance décès si applicable

## Rapatriement du corps

### Options
- **Rapatriement** : retour du corps en France
- **Inhumation locale** : selon les souhaits du défunt
- **Crémation locale** : rapatriement des cendres possible

### Organisation
- Via l'assurance rapatriement
- Via une société de pompes funèbres internationales
- L'ambassade peut conseiller

### Coûts
- Variables selon la distance et le pays
- Souvent couverts par l'assurance
- Aides consulaires possibles en cas de difficulté

## Documents nécessaires

### À obtenir sur place
- Certificat de décès local
- Certificat médical de décès
- Autorisation de transport (si rapatriement)

### À l'ambassade
- Transcription de l'acte de décès
- Acte de décès français

## Formalités administratives

### En France
- Héritage et succession
- Banques et assurances
- Organismes sociaux

### Dans le pays
- Clôture de comptes
- Résiliation de contrats
- Succession locale si biens

## Soutien

### Psychologique
- Cette épreuve est difficile
- N'hésitez pas à demander de l'aide
- Associations d'aide aux personnes endeuillées

### Pratique
- L'ambassade peut orienter
- SOS-Expat pour les questions juridiques`,
    tags: ["décès", "rapatriement", "famille", "formalités", "deuil"],
    faqSuggestions: [
      { question: "Qui peut décider du rapatriement du corps ?", answer: "La famille proche du défunt, selon les règles de droit français. L'ambassade peut conseiller." },
      { question: "Combien coûte un rapatriement ?", answer: "De quelques milliers à plus de 10 000€ selon la distance. L'assurance rapatriement couvre souvent ces frais." },
      { question: "Peut-on être inhumé à l'étranger ?", answer: "Oui, c'est possible si c'était le souhait du défunt ou de la famille. Les formalités varient selon les pays." }
    ],
    seoKeywords: ["décès étranger", "rapatriement corps", "décès expatrié", "formalités décès international"],
    subcategorySlug: "situations-urgence",
    order: 7
  },
  {
    slug: "guide-litige-employeur-etranger",
    title: "Guide : Litige avec un employeur étranger",
    excerpt: "Vos droits et recours en cas de conflit avec votre employeur dans un pays étranger.",
    content: `## Conflit avec votre employeur à l'étranger

Le droit du travail varie selon les pays. Comprenez vos options.

## Identifier le droit applicable

### Quel droit s'applique ?
- Généralement le droit local
- Parfois le droit français (détachement)
- Le contrat peut préciser

### Points à vérifier
- Votre contrat de travail
- Conventions collectives locales
- Accords internationaux

## Types de litiges courants

### Licenciement
- Procédure locale à respecter
- Indemnités selon le pays
- Préavis variable

### Salaire impayé
- Mise en demeure
- Recours aux tribunaux locaux
- Possible intervention consulaire

### Harcèlement/Discrimination
- Lois locales protectrices (variables)
- Documentation essentielle

### Conditions de travail
- Normes locales applicables
- Inspection du travail locale

## Étapes recommandées

### 1. Documentation
- Conservez tous les documents
- Emails, contrats, fiches de paie
- Témoignages écrits si possible

### 2. Tentative de résolution
- Dialogue avec l'employeur
- Médiation si disponible
- Ressources humaines

### 3. Recours externe
- Inspection du travail locale
- Avocat spécialisé
- Tribunaux du travail

## Rôle d'un avocat

Un avocat en droit du travail local peut :
- Évaluer vos droits selon la loi locale
- Négocier avec l'employeur
- Vous représenter en justice
- Maximiser vos indemnités

## Protection sociale

### Chômage
- Droits variables selon les pays
- Conventions bilatérales avec la France
- Renseignez-vous auprès de Pôle Emploi

### Retraite
- Points acquis à l'étranger
- Conventions de totalisation
- Demande lors du départ en retraite`,
    tags: ["employeur", "travail", "licenciement", "litige", "droit du travail"],
    faqSuggestions: [
      { question: "Le droit français s'applique-t-il à mon contrat ?", answer: "Rarement, sauf en cas de détachement. Le droit local s'applique généralement. Vérifiez votre contrat." },
      { question: "Puis-je contester un licenciement à l'étranger ?", answer: "Oui, mais selon les procédures locales. Un avocat local est essentiel pour connaître vos droits." },
      { question: "Ai-je droit au chômage en rentrant en France ?", answer: "Cela dépend des conventions entre les pays. Contactez Pôle Emploi pour votre situation spécifique." }
    ],
    seoKeywords: ["litige employeur étranger", "licenciement expatrié", "droit du travail international", "conflit travail étranger"],
    subcategorySlug: "situations-urgence",
    order: 8
  },
  {
    slug: "guide-divorce-international",
    title: "Guide : Divorce international",
    excerpt: "Procédure et conseils pour divorcer quand on vit à l'étranger ou que le conjoint est étranger.",
    content: `## Divorcer à l'international

Un divorce impliquant des éléments internationaux est plus complexe.

## Questions préalables

### Quel tribunal est compétent ?
- Résidence habituelle des époux
- Nationalité
- Choix des parties (parfois)

### Quel droit s'applique ?
- Droit du for (tribunal saisi)
- Choix des parties (certains cas)
- Règlements européens (dans l'UE)

## Divorce dans l'Union Européenne

### Règlement Bruxelles II bis
- Harmonisation des compétences
- Reconnaissance automatique des jugements
- Plusieurs tribunaux potentiellement compétents

### Choix stratégique
Le choix du tribunal peut influencer :
- Les règles applicables
- Les délais
- Les conséquences financières

## Aspects à régler

### Garde des enfants
- Résidence habituelle de l'enfant
- Droit de visite international
- Enlèvement international (Convention de La Haye)

### Pension alimentaire
- Règles variables selon les pays
- Recouvrement international possible

### Partage des biens
- Régime matrimonial applicable
- Biens dans plusieurs pays

## Reconnaissance du divorce

### En France
- Divorce UE : reconnaissance automatique
- Hors UE : procédure d'exequatur parfois nécessaire

### À l'étranger
- Vérifiez les exigences locales
- Transcription possible

## Conseils pratiques

### Avant de commencer
- Consultez un avocat spécialisé
- Évaluez les différentes options
- Rassemblez les documents

### Pendant la procédure
- Respectez les obligations vis-à-vis des enfants
- Ne quittez pas le pays sans accord
- Maintenez le dialogue si possible`,
    tags: ["divorce", "international", "garde enfants", "séparation", "famille"],
    faqSuggestions: [
      { question: "Puis-je divorcer en France si je vis à l'étranger ?", answer: "Cela dépend de votre situation. Des critères de compétence s'appliquent. Un avocat peut évaluer vos options." },
      { question: "Mon divorce étranger est-il reconnu en France ?", answer: "Dans l'UE, généralement oui automatiquement. Hors UE, une procédure peut être nécessaire." },
      { question: "Que faire si mon conjoint veut emmener les enfants ?", answer: "C'est potentiellement un enlèvement international. Consultez immédiatement un avocat et signalez aux autorités." }
    ],
    seoKeywords: ["divorce international", "divorce expatrié", "garde internationale", "séparation étranger"],
    subcategorySlug: "situations-urgence",
    order: 9
  },
  {
    slug: "guide-catastrophe-naturelle-etranger",
    title: "Guide : Catastrophe naturelle à l'étranger",
    excerpt: "Comment réagir en cas de séisme, tsunami, ouragan ou autre catastrophe naturelle.",
    content: `## Face à une catastrophe naturelle

Les catastrophes naturelles nécessitent des réflexes adaptés.

## Types de catastrophes

### Séisme
- Protégez-vous sous une table solide
- Éloignez-vous des fenêtres
- Après : sortez en vérifiant la stabilité

### Tsunami
- Montez en hauteur immédiatement
- Éloignez-vous des côtes
- Ne revenez pas avant l'alerte levée

### Ouragan/Typhon
- Restez à l'intérieur
- Éloignez-vous des fenêtres
- Provisions d'eau et nourriture

### Inondation
- Montez aux étages supérieurs
- Ne traversez pas l'eau à pied ou en voiture
- Attendez les secours

## Réflexes universels

### Immédiatement
1. Protégez-vous et vos proches
2. Suivez les consignes locales
3. Gardez votre téléphone chargé
4. Ayez de l'eau et des provisions

### Après
1. Signalez-vous à l'ambassade
2. Contactez vos proches
3. Évaluez votre situation
4. Suivez les instructions des autorités

## Inscription Ariane

### Avant votre voyage
- Inscrivez-vous sur Ariane (France)
- L'ambassade peut vous localiser
- Alertes en cas de crise

### Pendant la crise
- L'ambassade organise l'aide
- Point de rassemblement possible
- Évacuation si nécessaire

## Évacuation

### Quand partir
- Sur ordre des autorités
- Si danger imminent
- Vers une zone sûre identifiée

### Documents essentiels
- Passeport
- Argent liquide
- Médicaments essentiels
- Téléphone et chargeur

## Après la catastrophe

### Formalités
- Documents perdus : ambassade
- Assurance : déclaration rapide
- Logement : solutions temporaires

### Aide psychologique
- Traumatisme possible
- Ne négligez pas l'impact émotionnel
- Ressources disponibles`,
    tags: ["catastrophe", "naturelle", "urgence", "évacuation", "sécurité"],
    faqSuggestions: [
      { question: "Comment être informé d'une catastrophe imminente ?", answer: "Inscrivez-vous sur Ariane, suivez les médias locaux, et téléchargez les apps d'alertes du pays." },
      { question: "L'ambassade peut-elle m'évacuer ?", answer: "En cas de crise majeure, l'ambassade peut organiser une évacuation. Signalez-vous auprès d'elle." },
      { question: "Mon assurance couvre-t-elle les catastrophes naturelles ?", answer: "Vérifiez votre contrat. Les assurances voyage couvrent souvent l'interruption de voyage mais pas tous les dommages." }
    ],
    seoKeywords: ["catastrophe naturelle étranger", "séisme expatrié", "évacuation urgence", "sécurité voyage"],
    subcategorySlug: "situations-urgence",
    order: 10
  },
  {
    slug: "guide-crise-politique-etranger",
    title: "Guide : Crise politique ou sécuritaire",
    excerpt: "Comment réagir en cas de troubles politiques, manifestations violentes ou conflit.",
    content: `## Face à une crise politique

Les troubles politiques peuvent dégénérer rapidement. Soyez préparé.

## Signes avant-coureurs

### À surveiller
- Manifestations importantes
- Tensions entre groupes
- Couvre-feu annoncé
- Fermetures de frontières
- Avis du ministère des Affaires étrangères

## Mesures préventives

### Avant la crise
- Inscription Ariane
- Kit d'urgence prêt
- Connaître les sorties du pays
- Photocopies des documents
- Argent liquide disponible

### Au quotidien
- Éviter les rassemblements
- Suivre les médias locaux
- Contact régulier avec la famille
- Connaître l'emplacement de l'ambassade

## En cas de troubles

### Immédiatement
1. Restez chez vous si possible
2. Éloignez-vous des manifestations
3. Suivez les consignes de l'ambassade
4. Gardez un profil bas

### Communication
- Informez l'ambassade de votre position
- Prévenez vos proches
- Réseaux sociaux avec prudence

## Évacuation

### Quand envisager de partir
- Situation qui se dégrade
- Conseils de l'ambassade
- Fermeture imminente des frontières
- Violence généralisée

### Comment partir
- Vol commercial si disponible
- Routes terrestres (vérifier la sécurité)
- Évacuation organisée par l'ambassade

### Documents essentiels
- Passeport
- Visa de sortie si nécessaire
- Argent liquide en devises
- Copie des documents importants

## Après la crise

### Si vous restez
- Évaluez la situation régulièrement
- Maintenez contact avec l'ambassade
- Adaptez votre comportement

### Si vous partez
- Informez l'ambassade
- Assurance pour les pertes
- Possibilité de retour plus tard`,
    tags: ["crise", "politique", "sécurité", "évacuation", "troubles"],
    faqSuggestions: [
      { question: "L'ambassade peut-elle me forcer à partir ?", answer: "Non, c'est votre décision. L'ambassade conseille et peut organiser une évacuation, mais ne force pas." },
      { question: "Que faire si les frontières ferment ?", answer: "Contactez l'ambassade immédiatement. Des solutions alternatives peuvent être trouvées." },
      { question: "Mon assurance couvre-t-elle les crises politiques ?", answer: "Certaines oui, d'autres excluent les zones de conflit. Vérifiez votre contrat." }
    ],
    seoKeywords: ["crise politique étranger", "troubles sécuritaires", "évacuation expatrié", "conflit voyage"],
    subcategorySlug: "situations-urgence",
    order: 11
  },
  {
    slug: "guide-probleme-logement-urgent",
    title: "Guide : Problème de logement urgent",
    excerpt: "Solutions en cas d'expulsion, logement insalubre ou perte de logement à l'étranger.",
    content: `## Urgence logement à l'étranger

Perdre son logement à l'étranger est une situation critique. Voici les solutions.

## Types de problèmes

### Expulsion
- Fin de bail non anticipée
- Loyers impayés
- Vente du logement

### Logement insalubre
- Problèmes de sécurité
- Infestations
- Pas de chauffage/eau

### Perte soudaine
- Catastrophe (incendie, inondation)
- Arnaque
- Séparation avec colocataire/conjoint

## Solutions immédiates

### Hébergement d'urgence
- Hôtel (court terme)
- Auberge de jeunesse
- Airbnb
- Famille/amis sur place

### Aides disponibles
- Associations d'aide aux expatriés
- Services sociaux locaux (selon pays)
- Communauté française locale

## En cas d'expulsion

### Vérifiez la légalité
- Procédure respectée ?
- Délai de préavis ?
- Motif valable ?

### Recours possibles
- Négociation avec le propriétaire
- Médiation
- Avocat si droits violés

### Droits du locataire
Varient selon les pays. Un avocat local peut vous conseiller.

## Trouver un nouveau logement

### Ressources
- Sites d'annonces locaux
- Groupes d'expatriés
- Agences immobilières
- Bouche-à-oreille

### Précautions
- Vérifiez le propriétaire
- Ne payez pas sans visiter
- Lisez le contrat attentivement
- Attention aux arnaques

## Prévention

### Bonnes pratiques
- Contrat écrit toujours
- Conservez tous les documents
- Photos à l'état des lieux
- Payez par virement (traçable)
- Connaissez vos droits locaux`,
    tags: ["logement", "expulsion", "urgence", "hébergement", "location"],
    faqSuggestions: [
      { question: "Mon propriétaire peut-il m'expulser sans préavis ?", answer: "Rarement légal. Les délais de préavis varient selon les pays. Consultez un avocat pour vos droits locaux." },
      { question: "Où dormir ce soir en urgence ?", answer: "Hôtel, auberge de jeunesse, Airbnb, ou contactez les associations d'aide aux expatriés de votre ville." },
      { question: "Mon logement est insalubre, que faire ?", answer: "Documentez les problèmes, demandez des réparations par écrit, et contactez l'inspection du logement si elle existe." }
    ],
    seoKeywords: ["problème logement étranger", "expulsion expatrié", "urgence logement", "hébergement urgent"],
    subcategorySlug: "situations-urgence",
    order: 12
  },
  {
    slug: "guide-probleme-bancaire-etranger",
    title: "Guide : Problème bancaire à l'étranger",
    excerpt: "Solutions en cas de carte bloquée, compte gelé ou problème d'accès à votre argent.",
    content: `## Problèmes bancaires à l'étranger

Ne plus avoir accès à son argent à l'étranger est une urgence. Voici comment réagir.

## Problèmes courants

### Carte bloquée
- Trop de tentatives de code PIN
- Activité suspecte détectée
- Plafonds dépassés

### Carte avalée par un distributeur
- Erreur technique
- Carte expirée
- Problème de lecture

### Compte gelé
- Suspicion de fraude
- Procédure judiciaire
- Problème administratif

### Vol/Perte de carte
- Faire opposition immédiatement

## Solutions immédiates

### Si carte bloquée
1. Appelez votre banque (numéro international)
2. Expliquez que vous êtes à l'étranger
3. Demandez le déblocage ou une nouvelle carte

### Si carte avalée
1. Notez le distributeur et l'heure
2. Contactez la banque du distributeur
3. Contactez votre banque

### Urgence argent
- Western Union / Money Gram
- Transfert bancaire express
- Ambassade (cas extrêmes)
- Famille/amis sur place

## Prévention

### Avant de partir
- Prévenez votre banque de votre voyage
- Notez les numéros internationaux
- Emportez une deuxième carte
- Ayez du liquide de dépannage

### Sur place
- Diversifiez vos moyens de paiement
- Ne gardez pas tout au même endroit
- Conservez les numéros d'urgence

## Contacts utiles

### Numéros d'opposition (France)
- Visa : +33 1 41 85 85 85
- Mastercard : +33 1 45 16 65 65
- American Express : +33 1 47 77 72 00

### Votre banque
Numéro international (souvent sur la carte).

## Remboursement des fraudes

- Signalez immédiatement
- Opposition sur la carte
- Déclaration de fraude
- Remboursement selon les conditions`,
    tags: ["bancaire", "carte", "argent", "compte", "urgence"],
    faqSuggestions: [
      { question: "Ma carte a été avalée par un distributeur étranger", answer: "Contactez la banque propriétaire du distributeur et votre banque. Faites opposition si vous ne récupérez pas la carte." },
      { question: "Comment recevoir de l'argent en urgence ?", answer: "Western Union, Money Gram, ou transfert bancaire express. Un proche peut vous envoyer de l'argent rapidement." },
      { question: "Mon compte est bloqué, que faire ?", answer: "Contactez votre banque immédiatement pour comprendre la raison et les étapes pour le débloquer." }
    ],
    seoKeywords: ["problème bancaire étranger", "carte bloquée voyage", "argent urgent étranger", "compte bloqué expatrié"],
    subcategorySlug: "situations-urgence",
    order: 13
  },
  {
    slug: "guide-enfant-disparu-etranger",
    title: "Guide : Enfant disparu ou enlevé à l'étranger",
    excerpt: "Procédure d'urgence en cas de disparition ou d'enlèvement parental international.",
    content: `## Enfant disparu : agir immédiatement

La disparition d'un enfant est une urgence absolue. Chaque minute compte.

## Disparition (cause inconnue)

### Immédiatement
1. Appelez la police locale
2. Fouillez les environs
3. Alertez les personnes autour
4. Contactez l'ambassade

### Informations à fournir
- Photo récente
- Description physique
- Vêtements portés
- Lieu et heure de disparition
- Circonstances

## Enlèvement parental international

### Définition
Quand un parent emmène l'enfant dans un autre pays sans l'accord de l'autre parent ou en violation d'une décision de justice.

### La Convention de La Haye
- Retour de l'enfant dans son pays de résidence
- Applicable entre pays signataires
- Procédure spécifique

### Étapes
1. Signalement à la police
2. Contact de l'Autorité Centrale française
3. Avocat spécialisé
4. Procédure de retour

## Contacts essentiels

### En France
- Autorité Centrale : Bureau de l'entraide civile et commerciale internationale
- 116 000 : Enfants disparus

### Sur place
- Police locale
- Ambassade de France
- Interpol (via la police)

## Prévention

### Si risque d'enlèvement
- Alertez les autorités
- Inscrivez l'enfant au fichier des personnes recherchées
- Opposition à la sortie du territoire
- Gardez les documents de l'enfant

## Après le retour

- Suivi psychologique
- Mesures judiciaires
- Prévention de récidive`,
    tags: ["enfant", "disparition", "enlèvement", "parental", "urgence"],
    faqSuggestions: [
      { question: "Que faire si l'autre parent a emmené mon enfant à l'étranger ?", answer: "Signalez immédiatement à la police et contactez l'Autorité Centrale française pour enclencher la procédure de La Haye." },
      { question: "La Convention de La Haye s'applique-t-elle à tous les pays ?", answer: "Non, seulement aux pays signataires. Pour les autres, des procédures diplomatiques sont nécessaires." },
      { question: "Puis-je empêcher mon enfant de quitter la France ?", answer: "Oui, via une opposition à la sortie du territoire. Contactez un avocat et le tribunal." }
    ],
    seoKeywords: ["enfant disparu étranger", "enlèvement parental international", "Convention La Haye", "disparition enfant voyage"],
    subcategorySlug: "situations-urgence",
    order: 14
  },
  {
    slug: "guide-arnaque-fraude-etranger",
    title: "Guide : Victime d'arnaque ou fraude à l'étranger",
    excerpt: "Comment réagir et quels recours en cas d'escroquerie à l'étranger.",
    content: `## Victime d'arnaque à l'étranger

Les arnaques ciblant les étrangers sont fréquentes. Voici comment réagir.

## Types d'arnaques courantes

### Arnaques au logement
- Faux propriétaires
- Logement inexistant
- Caution non remboursée

### Arnaques à l'emploi
- Offres d'emploi fictives
- Frais de dossier demandés
- Travail non payé

### Arnaques aux sentiments
- Fausses relations en ligne
- Demandes d'argent

### Arnaques touristiques
- Fausses excursions
- Change au noir
- Surforations

## Étapes à suivre

### 1. Arrêtez tout contact
Ne communiquez plus avec l'arnaqueur.

### 2. Documentez tout
- Emails, messages
- Reçus de paiement
- Profils, numéros de téléphone

### 3. Portez plainte
- Police locale
- Police française (si l'arnaqueur est en France)

### 4. Alertez votre banque
- Tentez un rappel de fonds
- Bloquez si paiements récurrents

### 5. Signalez
- Plateformes concernées (si en ligne)
- Ambassade (pour alerter d'autres compatriotes)

## Récupérer son argent

### Difficile mais pas impossible
- Contestation auprès de la banque
- Plainte et procédure judiciaire
- Assurance (si couverture)

### Réaliste
Plus le signalement est rapide, plus les chances sont élevées.

## Prévention

### Signaux d'alerte
- Trop beau pour être vrai
- Urgence artificielle
- Paiement par moyens non traçables
- Pression pour payer vite

### Bonnes pratiques
- Vérifiez les informations
- Ne payez pas à l'avance
- Utilisez des moyens de paiement traçables
- Écoutez votre instinct`,
    tags: ["arnaque", "fraude", "escroquerie", "victime", "recours"],
    faqSuggestions: [
      { question: "Puis-je récupérer l'argent d'une arnaque ?", answer: "C'est difficile mais parfois possible. Plus vous agissez vite, plus vous avez de chances. Contactez votre banque immédiatement." },
      { question: "La police locale peut-elle m'aider ?", answer: "Elle peut enregistrer une plainte, mais les enquêtes internationales sont complexes. Portez plainte quand même." },
      { question: "Comment éviter les arnaques au logement ?", answer: "Ne payez jamais sans visiter, vérifiez l'identité du propriétaire, et utilisez des plateformes connues." }
    ],
    seoKeywords: ["arnaque étranger", "fraude expatrié", "escroquerie voyage", "victime arnaque international"],
    subcategorySlug: "situations-urgence",
    order: 15
  }
];

// =============================================================================
// SOUS-CATÉGORIE 5.2: GUIDES PAR PAYS (10 articles)
// =============================================================================
const GUIDES_PAYS: HelpArticleData[] = [
  {
    slug: "guide-expatriation-allemagne",
    title: "Guide d'expatriation : Allemagne",
    excerpt: "Tout ce qu'il faut savoir pour s'expatrier en Allemagne : visa, logement, travail, administration.",
    content: `## S'expatrier en Allemagne

L'Allemagne est une destination prisée des expatriés francophones. Voici votre guide complet.

## Avant le départ

### Visa et séjour
- Citoyens UE : pas de visa nécessaire
- Hors UE : visa selon le motif (travail, études, famille)
- Anmeldung obligatoire (enregistrement de résidence)

### Assurance santé
- Obligatoire pour tous
- Système public (gesetzliche) ou privé (private)
- Choix selon revenus et statut

## S'installer

### Logement
- Marché tendu dans les grandes villes
- Caution élevée (2-3 mois)
- Schufa (équivalent fichier crédit) important
- WG (colocation) populaire

### Compte bancaire
- Nécessaire pour le logement et le travail
- Banques traditionnelles ou néobanques
- Documents : passeport, Anmeldung

### Anmeldung
- Enregistrement obligatoire sous 14 jours
- Au Bürgeramt (mairie)
- Nécessaire pour tout (banque, travail, etc.)

## Travailler

### Marché du travail
- Économie forte
- Allemand souvent requis
- Secteurs porteurs : ingénierie, IT, santé

### Contrat de travail
- Très protecteur pour l'employé
- Périodes d'essai encadrées
- Préavis importants

### Salaires et impôts
- Salaires compétitifs
- Impôts progressifs
- Classe fiscale (Steuerklasse) importante

## Vie quotidienne

### Langue
- L'allemand est indispensable
- Cours gratuits souvent disponibles
- Anglais répandu dans les grandes villes

### Culture
- Ponctualité importante
- Règles à respecter
- Vie associative riche

## Contacts utiles

- Ambassade de France en Allemagne
- Accueil des Français de l'étranger
- Chambres de commerce franco-allemandes`,
    tags: ["Allemagne", "expatriation", "guide pays", "Europe", "installation"],
    faqSuggestions: [
      { question: "Faut-il parler allemand pour travailler en Allemagne ?", answer: "Dans beaucoup d'emplois oui. L'IT et les startups sont plus flexibles, mais l'allemand reste un atout majeur." },
      { question: "Comment fonctionne l'Anmeldung ?", answer: "C'est l'enregistrement de votre adresse obligatoire sous 14 jours. Rendez-vous au Bürgeramt avec votre contrat de bail." },
      { question: "L'assurance santé est-elle obligatoire ?", answer: "Oui, pour tous les résidents. Vous devez choisir entre le système public et privé selon votre situation." }
    ],
    seoKeywords: ["expatriation Allemagne", "s'installer Allemagne", "vivre Allemagne", "guide Allemagne expatrié"],
    subcategorySlug: "guides-pays",
    order: 1
  },
  {
    slug: "guide-expatriation-espagne",
    title: "Guide d'expatriation : Espagne",
    excerpt: "Tout ce qu'il faut savoir pour s'expatrier en Espagne : NIE, logement, travail, santé.",
    content: `## S'expatrier en Espagne

L'Espagne attire de nombreux Français par son climat et sa qualité de vie.

## Avant le départ

### Visa et séjour
- Citoyens UE : libre circulation
- Séjour > 3 mois : NIE obligatoire
- Empadronamiento (inscription municipale)

### NIE (Número de Identidad de Extranjero)
- Numéro d'identification obligatoire
- Nécessaire pour travailler, louer, etc.
- Demande à la police nationale

## S'installer

### Logement
- Marché variable selon les villes
- Caution 1-2 mois
- Fianza (caution) et aval bancaire parfois demandés

### Compte bancaire
- Relativement facile à ouvrir
- NIE souvent requis
- Néobanques populaires

### Empadronamiento
- Inscription au registre municipal
- Obligatoire pour la résidence
- Démarche à la mairie (Ayuntamiento)

## Travailler

### Marché du travail
- Chômage plus élevé qu'en France
- Secteurs porteurs : tourisme, tech, santé
- Espagnol indispensable généralement

### Contrat de travail
- Types variés (indefinido, temporal)
- Protection sociale correcte
- Salaires souvent inférieurs à la France

## Vie quotidienne

### Santé
- Système public de qualité
- Carte sanitaire avec NIE et emploi
- Assurance privée courante

### Langue
- Espagnol (castillan) officiel
- Langues régionales (catalan, basque, galicien)

### Rythme de vie
- Horaires décalés (repas tard)
- Siesta dans certaines régions
- Vie sociale importante

## Contacts utiles

- Consulat de France
- Accueil français en Espagne
- Chambre de commerce France-Espagne`,
    tags: ["Espagne", "expatriation", "guide pays", "Europe", "NIE"],
    faqSuggestions: [
      { question: "Comment obtenir le NIE ?", answer: "Rendez-vous à la Comisaría de Policía Nacional avec passeport, formulaire et justificatif du motif de demande." },
      { question: "Est-il facile de trouver un logement en Espagne ?", answer: "Variable selon les villes. Madrid et Barcelone sont tendus. Idealista et Fotocasa sont les principaux sites." },
      { question: "Le système de santé espagnol est-il gratuit ?", answer: "Oui pour les résidents cotisants. Sinon, assurance privée recommandée." }
    ],
    seoKeywords: ["expatriation Espagne", "s'installer Espagne", "vivre Espagne", "guide Espagne expatrié"],
    subcategorySlug: "guides-pays",
    order: 2
  },
  {
    slug: "guide-expatriation-royaume-uni",
    title: "Guide d'expatriation : Royaume-Uni",
    excerpt: "S'expatrier au Royaume-Uni après le Brexit : visa, travail, logement, santé.",
    content: `## S'expatrier au Royaume-Uni post-Brexit

Le Brexit a changé les règles. Voici ce qu'il faut savoir.

## Visa et immigration

### Depuis le Brexit
- Visa obligatoire pour travailler
- Points-based system
- Skilled Worker Visa le plus courant

### Types de visas
- Skilled Worker : emploi qualifié
- Student : études
- Family : regroupement familial
- Global Talent : talents exceptionnels

### Conditions générales
- Offre d'emploi d'un sponsor
- Niveau d'anglais prouvé
- Salaire minimum requis

## S'installer

### Logement
- Marché très tendu à Londres
- Références requises
- Caution + loyer d'avance

### National Insurance Number
- Équivalent du numéro de sécu
- Nécessaire pour travailler
- Demande après arrivée

### Compte bancaire
- Plus difficile sans adresse
- Certaines banques plus flexibles
- Proof of address requis

## Travailler

### Marché du travail
- Dynamique mais exigeant
- Anglais courant indispensable
- Secteurs : finance, tech, santé

### Culture professionnelle
- Pragmatisme valorisé
- Hiérarchie moins marquée
- Networking important

## Santé

### NHS
- Gratuit pour les résidents
- Immigration Health Surcharge à payer avec le visa
- Délais parfois longs

## Vie quotidienne

### Coût de la vie
- Londres très cher
- Autres villes plus abordables
- Transport coûteux

### Culture
- Multiculturalisme
- Politesse importante
- Humour omniprésent

## Contacts utiles

- Ambassade de France au Royaume-Uni
- French Chamber of Great Britain
- Français à Londres (associations)`,
    tags: ["Royaume-Uni", "Angleterre", "Brexit", "visa", "expatriation"],
    faqSuggestions: [
      { question: "Puis-je travailler au Royaume-Uni avec un passeport français ?", answer: "Depuis le Brexit, un visa est obligatoire pour travailler. Le Skilled Worker Visa est le plus courant." },
      { question: "Comment fonctionne le NHS ?", answer: "Gratuit pour les résidents après paiement de l'Immigration Health Surcharge avec votre visa." },
      { question: "Est-ce difficile de trouver un logement à Londres ?", answer: "Oui, le marché est très tendu et cher. Préparez références et fonds à l'avance." }
    ],
    seoKeywords: ["expatriation Royaume-Uni", "visa UK", "travailler Angleterre", "Brexit expatrié"],
    subcategorySlug: "guides-pays",
    order: 3
  },
  {
    slug: "guide-expatriation-etats-unis",
    title: "Guide d'expatriation : États-Unis",
    excerpt: "S'expatrier aux États-Unis : types de visas, Green Card, travail, santé, vie quotidienne.",
    content: `## S'expatrier aux États-Unis

Le rêve américain nécessite une préparation minutieuse.

## Immigration

### Types de visas
- **B1/B2** : Tourisme/affaires (pas de travail)
- **H-1B** : Travail qualifié (sponsor requis)
- **L-1** : Transfert intra-entreprise
- **E-2** : Investisseur/entrepreneur
- **J-1** : Échange (stages, recherche)
- **F-1** : Études

### Green Card
- Résidence permanente
- Loterie (Diversity Visa) : gratuite, aléatoire
- Par l'emploi : sponsorship employeur
- Par la famille : conjoint/enfant de citoyen

### Processus
- Long et complexe
- Avocat immigration recommandé
- Coûts importants

## S'installer

### Logement
- Variable selon les villes
- Credit history important
- Social Security Number nécessaire

### Social Security Number
- Équivalent du numéro de sécu
- Nécessaire pour tout
- Demande après obtention du visa de travail

### Compte bancaire
- Relativement facile avec visa
- Credit history à construire

## Travailler

### Marché du travail
- Dynamique mais compétitif
- At-will employment (licenciement facile)
- Peu de congés par défaut

### Salaires
- Plus élevés qu'en France
- Mais moins de protection sociale

## Santé

### Pas de système universel
- Assurance par l'employeur (courant)
- Assurance privée
- Très coûteux sans assurance

### Coûts
- Consultations : $100-300
- Urgences : plusieurs milliers
- Assurance indispensable

## Vie quotidienne

### Coût de la vie
- Très variable selon les états
- NYC, SF, LA très chers
- Midwest plus abordable

### Culture
- Diversité régionale importante
- Pragmatisme et optimisme
- "Can-do attitude"

## États populaires

- Californie : tech, climat
- New York : finance, culture
- Texas : coût de vie, dynamisme
- Floride : retraités, pas d'impôt sur le revenu`,
    tags: ["États-Unis", "USA", "visa américain", "Green Card", "expatriation"],
    faqSuggestions: [
      { question: "Comment obtenir un visa de travail pour les USA ?", answer: "Il faut un employeur sponsor pour la plupart des visas. Le H-1B est le plus courant pour les travailleurs qualifiés." },
      { question: "La Green Card lottery est-elle vraiment gratuite ?", answer: "Oui, l'inscription est gratuite. Méfiez-vous des sites qui demandent un paiement." },
      { question: "L'assurance santé est-elle vraiment si chère ?", answer: "Oui, très. Sans assurance employeur, comptez plusieurs centaines de dollars par mois." }
    ],
    seoKeywords: ["expatriation USA", "visa États-Unis", "Green Card", "travailler États-Unis", "vivre Amérique"],
    subcategorySlug: "guides-pays",
    order: 4
  },
  {
    slug: "guide-expatriation-canada",
    title: "Guide d'expatriation : Canada",
    excerpt: "S'expatrier au Canada : immigration, travail, installation, vie quotidienne.",
    content: `## S'expatrier au Canada

Le Canada est une destination de choix avec une immigration organisée.

## Immigration

### Programmes principaux
- **Entrée express** : Programme fédéral par points
- **PNP** : Programmes des provinces
- **PVT** : Permis Vacances-Travail (18-35 ans)
- **Permis d'études** : Pour étudiants

### Entrée express
- Système de points (CRS)
- Profil en ligne
- Tirage régulier
- Facteurs : âge, études, langue, expérience

### PVT (Programme Vacances-Travail)
- 18-35 ans (France)
- 2 ans de séjour
- Tirage au sort
- Excellent tremplin

## S'installer

### Choisir sa province
- Québec : francophone, procédure spécifique
- Ontario : Toronto, économie diversifiée
- Colombie-Britannique : Vancouver, qualité de vie
- Alberta : Calgary, pétrole et montagne

### NAS (Numéro d'assurance sociale)
- Équivalent du numéro de sécu
- Nécessaire pour travailler
- Demande à Service Canada

### Logement
- Variable selon les villes
- Toronto et Vancouver très chers
- Crédit history se construit vite

## Travailler

### Marché du travail
- Taux de chômage bas
- Pénuries de main-d'œuvre
- Bilinguisme un atout

### Reconnaissance des diplômes
- Processus d'équivalence
- Ordres professionnels pour certains métiers

## Santé

### Système public
- Couverture provinciale (ex: RAMQ au Québec)
- Délai de carence possible (3 mois)
- Assurance privée recommandée initialement

## Vie quotidienne

### Climat
- Hivers rigoureux
- Équipement adapté nécessaire

### Culture
- Multiculturalisme officiel
- Société accueillante
- Qualité de vie élevée

## Québec spécificités

### Immigration
- CSQ (Certificat de sélection) requis
- Connaissance du français évaluée
- Procédure distincte

### Avantages
- Francophonie
- Communauté française importante
- Culture nord-américaine en français`,
    tags: ["Canada", "Québec", "immigration", "PVT", "expatriation"],
    faqSuggestions: [
      { question: "Comment fonctionne l'Entrée express ?", answer: "Système de points basé sur votre profil. Les candidats avec le plus de points reçoivent des invitations à immigrer." },
      { question: "Le PVT permet-il de rester ensuite ?", answer: "Le PVT est temporaire mais peut être un tremplin vers la résidence permanente via l'expérience canadienne." },
      { question: "Faut-il parler anglais et français ?", answer: "Dépend de la province. Au Québec, le français suffit. Ailleurs, l'anglais est essentiel." }
    ],
    seoKeywords: ["expatriation Canada", "immigrer Canada", "PVT Canada", "vivre Canada", "Québec expatrié"],
    subcategorySlug: "guides-pays",
    order: 5
  },
  {
    slug: "guide-expatriation-australie",
    title: "Guide d'expatriation : Australie",
    excerpt: "S'expatrier en Australie : visa, travail, installation, vie quotidienne.",
    content: `## S'expatrier en Australie

L'Australie fait rêver mais l'immigration est sélective.

## Immigration

### Types de visas
- **WHV (Working Holiday Visa)** : 18-35 ans, 1 an
- **Skilled visa** : Travailleurs qualifiés
- **Student visa** : Études
- **Employer sponsored** : Via un employeur

### WHV
- 18-35 ans (France)
- 1 an (extensible)
- Droit de travailler
- Excellent pour découvrir

### Skilled Migration
- Système de points
- Métiers en demande (SOL)
- Anglais requis (IELTS)
- Processus long

## S'installer

### Choix de la ville
- Sydney : dynamique, chère
- Melbourne : culturelle
- Brisbane : climat agréable
- Perth : isolée mais opportunités

### TFN (Tax File Number)
- Numéro fiscal obligatoire
- Demande en ligne
- Nécessaire pour travailler

### Logement
- Cher dans les grandes villes
- Colocation courante
- Bond (caution) important

## Travailler

### Marché du travail
- Dynamique
- Salaire minimum élevé
- Secteurs : mines, santé, tech, construction

### Culture professionnelle
- Décontractée mais professionnelle
- Work-life balance valorisé
- Networking important

## Santé

### Medicare
- Système public pour résidents permanents
- Accord France-Australie (certains soins)
- Assurance privée recommandée pour WHV

## Vie quotidienne

### Coût de la vie
- Élevé dans les grandes villes
- Salaires compensent souvent

### Climat
- Très variable selon les régions
- Soleil abondant
- Attention aux dangers naturels

### Culture
- Décontractée
- Sport et plein air
- BBQ et plages

## Particularités

### Faune et flore
- Animaux uniques (et parfois dangereux)
- Nature exceptionnelle

### Distances
- Pays continent
- Voyages intérieurs longs/coûteux`,
    tags: ["Australie", "WHV", "visa australien", "expatriation", "Océanie"],
    faqSuggestions: [
      { question: "Le WHV est-il facile à obtenir ?", answer: "Relativement oui pour les Français éligibles. C'est un visa presque automatique si vous remplissez les conditions." },
      { question: "Peut-on rester après le WHV ?", answer: "Possible via un visa de travail sponsorisé, études, ou immigration qualifiée. Le WHV seul est temporaire." },
      { question: "Le coût de la vie est-il vraiment élevé ?", answer: "Oui, surtout à Sydney et Melbourne. Mais les salaires sont aussi plus élevés qu'en France." }
    ],
    seoKeywords: ["expatriation Australie", "WHV Australie", "visa Australie", "vivre Australie", "travailler Australie"],
    subcategorySlug: "guides-pays",
    order: 6
  },
  {
    slug: "guide-expatriation-emirats",
    title: "Guide d'expatriation : Émirats Arabes Unis",
    excerpt: "S'expatrier aux Émirats (Dubaï, Abu Dhabi) : visa, travail, logement, vie quotidienne.",
    content: `## S'expatrier aux Émirats

Dubaï et Abu Dhabi attirent de nombreux expatriés français.

## Immigration

### Visa de résidence
- Via un employeur (le plus courant)
- Via création d'entreprise
- Via investissement immobilier
- Golden Visa pour profils exceptionnels

### Sponsorship (Kafala)
- L'employeur est votre sponsor
- Changement d'emploi encadré
- Réformes récentes plus flexibles

### Documents requis
- Passeport valide
- Certificats de diplômes attestés
- Tests médicaux
- Emirates ID

## S'installer

### Logement
- Offre abondante
- Loyer souvent payé d'avance (chèques)
- Pas de loi locataire-propriétaire stricte

### Compte bancaire
- Facile avec visa de résidence
- Nombreuses banques internationales
- Carte de crédit importante localement

### Permis de conduire
- Échange possible pour les Français
- Indispensable (transports limités)

## Travailler

### Marché du travail
- Dynamique
- Secteurs : finance, immobilier, tourisme, tech
- Packages incluant logement/avantages

### Salaires
- Généralement nets d'impôts
- Négociation du package importante
- Considérez les avantages (logement, école, etc.)

### Culture professionnelle
- Internationale
- Hiérarchie respectée
- Relations importantes

## Pas d'impôt sur le revenu

- Salaires nets
- TVA à 5%
- Cotisations sociales limitées

## Vie quotidienne

### Climat
- Très chaud en été (40-50°C)
- Climatisation partout
- Hiver agréable

### Culture et société
- Société multiculturelle
- Respect des traditions locales
- Alcool dans les lieux autorisés

### Coût de la vie
- Logement cher
- Écoles privées coûteuses
- Restaurants/sorties variables

## Points d'attention

### Lois locales
- Respecter les lois et coutumes
- Alcool réglementé
- Comportement public

### Fin de contrat
- Indemnité de fin de service
- Visa lié à l'emploi
- Période pour trouver un nouveau sponsor`,
    tags: ["Émirats", "Dubaï", "Abu Dhabi", "expatriation", "Golfe"],
    faqSuggestions: [
      { question: "Y a-t-il vraiment 0% d'impôt aux Émirats ?", answer: "Pas d'impôt sur le revenu des particuliers. TVA à 5%. Attention aux implications fiscales françaises selon votre situation." },
      { question: "Puis-je changer d'employeur facilement ?", answer: "Les règles se sont assouplies. Consultez les dernières réglementations car le système évolue." },
      { question: "La vie aux Émirats est-elle adaptée aux familles ?", answer: "Oui, très. Nombreuses écoles internationales (mais chères), sécurité élevée, infrastructures modernes." }
    ],
    seoKeywords: ["expatriation Émirats", "vivre Dubaï", "travail Abu Dhabi", "visa EAU", "expatrié Golfe"],
    subcategorySlug: "guides-pays",
    order: 7
  },
  {
    slug: "guide-expatriation-singapour",
    title: "Guide d'expatriation : Singapour",
    excerpt: "S'expatrier à Singapour : visa, travail, logement, vie quotidienne dans la cité-État.",
    content: `## S'expatrier à Singapour

Singapour est un hub international avec une forte communauté d'expatriés.

## Immigration

### Types de passes
- **Employment Pass (EP)** : Cadres et spécialistes
- **S Pass** : Techniciens qualifiés
- **Dependant's Pass** : Conjoint/enfants
- **EntrePass** : Entrepreneurs

### Employment Pass
- Salaire minimum requis (~5000 SGD)
- Diplôme universitaire généralement requis
- Employeur sponsor

### Évolution récente
- Critères plus stricts (COMPASS framework)
- Points bonus pour diversité
- Préférence pour locaux encadrée

## S'installer

### Logement
- Très cher
- HDB (public) généralement non accessible aux étrangers
- Condos et locations privées
- Colocation courante

### Banque et finances
- Facile avec Employment Pass
- Nombreuses banques internationales
- Gestion de patrimoine développée

## Travailler

### Marché du travail
- Compétitif
- Hub finance et tech
- Anglais langue de travail

### Culture professionnelle
- Mélange d'influences
- Performance valorisée
- Respect de la hiérarchie

## Fiscalité

### Impôts
- Progressifs mais modérés (0-24%)
- Pas d'impôt sur les revenus étrangers
- Système territorial

### CPF
- Système de retraite local
- Principalement pour résidents permanents

## Vie quotidienne

### Coût de la vie
- Élevé (logement, voitures, écoles)
- Transports publics abordables
- Nourriture locale bon marché

### Climat
- Tropical, chaud et humide toute l'année
- Pluies fréquentes
- Climatisation omniprésente

### Culture
- Multiculturelle (chinois, malais, indien)
- Lois strictes à respecter
- Société ordonnée

## Points forts

- Sécurité exceptionnelle
- Infrastructures parfaites
- Position stratégique en Asie
- Qualité de vie élevée

## Points d'attention

- Coût très élevé
- Taille réduite (contrainte)
- Lois strictes (amendes)`,
    tags: ["Singapour", "Asie", "Employment Pass", "expatriation", "hub"],
    faqSuggestions: [
      { question: "L'Employment Pass est-il difficile à obtenir ?", answer: "De plus en plus. Les critères se sont durcis. Un bon salaire et des qualifications sont essentiels." },
      { question: "Le coût de la vie est-il vraiment si élevé ?", answer: "Oui, surtout le logement. Mais les salaires compensent souvent, et la qualité de vie est excellente." },
      { question: "Quelles sont les lois à connaître ?", answer: "Interdiction de chewing-gum, amendes pour incivilités, lois strictes sur la drogue. Renseignez-vous." }
    ],
    seoKeywords: ["expatriation Singapour", "Employment Pass", "vivre Singapour", "travail Singapour", "expatrié Asie"],
    subcategorySlug: "guides-pays",
    order: 8
  },
  {
    slug: "guide-expatriation-suisse",
    title: "Guide d'expatriation : Suisse",
    excerpt: "S'expatrier en Suisse : permis, travail, logement, système de santé, vie quotidienne.",
    content: `## S'expatrier en Suisse

La Suisse offre qualité de vie et salaires élevés, avec ses spécificités.

## Immigration

### Permis de séjour
- **Permis L** : Court séjour (< 1 an)
- **Permis B** : Séjour (1 an renouvelable)
- **Permis C** : Établissement (après 5-10 ans)
- **Permis G** : Frontalier

### Pour les citoyens UE/AELE
- Libre circulation (avec restrictions ponctuelles)
- Permis automatique avec contrat de travail

### Processus
- Employeur effectue les démarches
- Inscription au contrôle des habitants
- Relativement simple pour les Européens

## S'installer

### Logement
- Très cher et tendu
- Dossier complet requis
- Caution importante (3 mois)
- Candidature comme pour un emploi

### Compte bancaire
- Facile avec permis de séjour
- Banques cantonales et grandes banques

### Assurance santé
- Obligatoire (LAMal)
- Choix de la caisse maladie
- Franchise et quote-part

## Travailler

### Marché du travail
- Très dynamique
- Salaires très élevés
- Secteurs : finance, pharma, horlogerie, tech

### Langues
- Allemand (Suisse alémanique)
- Français (Romandie)
- Italien (Tessin)
- Anglais dans le business

### Culture professionnelle
- Qualité et précision
- Ponctualité stricte
- Hiérarchie respectée

## Fiscalité

### Impôts
- Varient selon le canton
- Globalement plus bas qu'en France
- Imposition à la source pour certains permis

### AVS (retraite)
- 3 piliers : AVS, LPP, 3ème pilier
- Système robuste

## Vie quotidienne

### Coût de la vie
- Parmi les plus élevés au monde
- Salaires compensent
- Qualité exceptionnelle

### Culture
- Neutralité et discrétion
- Respect des règles
- Nature omniprésente

## Cantons francophones

- Genève : international, organisations
- Vaud : Lausanne, cadre de vie
- Valais : montagne
- Neuchâtel, Fribourg, Jura

## Points forts

- Qualité de vie exceptionnelle
- Salaires très élevés
- Nature préservée
- Stabilité politique et économique`,
    tags: ["Suisse", "permis B", "expatriation", "Genève", "Europe"],
    faqSuggestions: [
      { question: "Les salaires suisses sont-ils vraiment si élevés ?", answer: "Oui, mais le coût de la vie l'est aussi. Le pouvoir d'achat reste généralement supérieur à la France." },
      { question: "L'assurance santé est-elle chère ?", answer: "Oui, comptez 300-500 CHF/mois minimum. C'est une des principales dépenses." },
      { question: "Faut-il parler allemand pour travailler en Suisse ?", answer: "Dépend de la région. En Romandie, le français suffit. En Suisse alémanique, l'allemand est essentiel." }
    ],
    seoKeywords: ["expatriation Suisse", "permis B Suisse", "vivre Suisse", "travail Suisse", "Genève expatrié"],
    subcategorySlug: "guides-pays",
    order: 9
  },
  {
    slug: "guide-expatriation-portugal",
    title: "Guide d'expatriation : Portugal",
    excerpt: "S'expatrier au Portugal : NIF, logement, travail, fiscalité avantageuse, vie quotidienne.",
    content: `## S'expatrier au Portugal

Le Portugal séduit par son climat, son coût de vie et sa fiscalité.

## Immigration

### Citoyens UE
- Libre circulation
- Inscription après 3 mois obligatoire
- NIF (numéro fiscal) essentiel

### Hors UE
- Différents visas disponibles
- Visa D7 (revenus passifs)
- Golden Visa (investissement) - en évolution

### NIF (Número de Identificação Fiscal)
- Numéro fiscal obligatoire
- Pour tout : banque, téléphone, loyer
- Demande simple (Finanças)

## S'installer

### Logement
- Lisbonne et Porto en tension
- Prix en hausse mais inférieurs à Paris
- Intérieur plus abordable

### Compte bancaire
- Facile avec NIF et pièce d'identité
- Banques traditionnelles et en ligne

### NISS (Sécurité sociale)
- Numéro de sécurité sociale
- Nécessaire pour travailler

## Travailler

### Marché du travail
- En développement
- Salaires plus bas qu'en France
- Secteurs : tourisme, tech, services

### Télétravail populaire
- Nombreux digital nomads
- Espaces de coworking
- Qualité de vie recherchée

## Fiscalité

### Régime RNH (Résident Non Habituel)
- 10 ans d'avantages fiscaux
- En cours de révision
- Consultez un conseiller fiscal

### Impôts standards
- Progressifs jusqu'à 48%
- Conventions de non double imposition

## Santé

### SNS (Service National de Santé)
- Public et accessible
- Qualité correcte
- Délais parfois longs

### Assurance privée
- Populaire pour compléter
- Coût raisonnable

## Vie quotidienne

### Coût de la vie
- Inférieur à la France
- Lisbonne de plus en plus chère
- Intérieur très abordable

### Climat
- Doux toute l'année
- Soleil abondant
- Algarve très ensoleillée

### Culture
- Accueillante pour les étrangers
- Francophile historiquement
- "Saudade" et gastronomie

## Régions populaires

- Lisbonne : capitale dynamique
- Porto : charme et authenticité
- Algarve : soleil et plages
- Madère : île paradisiaque`,
    tags: ["Portugal", "NIF", "expatriation", "Lisbonne", "Europe"],
    faqSuggestions: [
      { question: "Le régime fiscal RNH existe-t-il encore ?", answer: "Il a été modifié/restreint. Consultez un conseiller fiscal pour votre situation spécifique car les règles évoluent." },
      { question: "Comment obtenir le NIF ?", answer: "Au bureau des Finanças avec passeport et justificatif. Certaines fintechs proposent le service en ligne." },
      { question: "Le portugais est-il difficile pour un Français ?", answer: "C'est une langue romane, donc accessible. L'anglais est largement parlé dans les zones touristiques." }
    ],
    seoKeywords: ["expatriation Portugal", "NIF Portugal", "vivre Portugal", "Lisbonne expatrié", "fiscal Portugal"],
    subcategorySlug: "guides-pays",
    order: 10
  }
];

// =============================================================================
// EXPORT DE TOUS LES ARTICLES GUIDES PAR SITUATION
// =============================================================================
export const HELP_ARTICLES_SITUATIONS: HelpArticleData[] = [
  ...SITUATIONS_URGENCE,
  ...GUIDES_PAYS
];

// Export par sous-catégorie pour référence
export const SITUATION_ARTICLES_BY_SUBCATEGORY = {
  situationsUrgence: SITUATIONS_URGENCE,
  guidesPays: GUIDES_PAYS
};
