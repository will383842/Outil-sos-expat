/**
 * =============================================================================
 * SOS EXPAT — Templates de prompts réutilisables
 * =============================================================================
 *
 * Templates communs et fonctions de formatage pour les prompts.
 * Conçu pour servir des expatriés, voyageurs et vacanciers du monde entier,
 * de toutes nationalités et langues.
 */

import type { AIRequestContext, UrgencyLevel } from "../core/types";

// =============================================================================
// FORMATAGE DU CONTEXTE
// =============================================================================

export function formatContextBlock(context: AIRequestContext): string {
  const parts: string[] = [];

  if (context.clientName) {
    parts.push(`CLIENT: ${context.clientName}`);
  }

  if (context.nationality) {
    parts.push(`NATIONALITÉ: ${context.nationality}`);
  }

  if (context.country) {
    parts.push(`PAYS DE RÉSIDENCE/DESTINATION: ${context.country}`);
  }

  if (context.originCountry) {
    parts.push(`PAYS D'ORIGINE: ${context.originCountry}`);
  }

  if (context.providerLanguage) {
    parts.push(`🔴 LANGUE DE RÉPONSE OBLIGATOIRE: ${context.providerLanguage.toUpperCase()}`);
  }

  if (context.language) {
    parts.push(`Langue du client: ${context.language}`);
  }

  if (context.category) {
    parts.push(`CATÉGORIE: ${context.category}`);
  }

  if (context.urgency) {
    parts.push(`URGENCE: ${formatUrgency(context.urgency)}`);
  }

  if (context.specialties && context.specialties.length > 0) {
    parts.push(`SPÉCIALITÉS: ${context.specialties.join(", ")}`);
  }

  if (context.bookingTitle) {
    parts.push(`SUJET: ${context.bookingTitle}`);
  }

  if (context.tripType) {
    parts.push(`TYPE: ${context.tripType}`);
  }

  if (parts.length === 0) return "";

  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTEXTE DE LA CONSULTATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${parts.join("\n")}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}

// =============================================================================
// FORMATAGE DE L'URGENCE
// =============================================================================

export function formatUrgency(urgency: UrgencyLevel): string {
  const urgencyMap: Record<UrgencyLevel, string> = {
    low: "🟢 Faible - Peut attendre quelques jours",
    medium: "🟡 Moyenne - À traiter dans la semaine",
    high: "🟠 Haute - À traiter sous 24-48h",
    critical: "🔴 CRITIQUE - Action immédiate requise"
  };
  return urgencyMap[urgency] || urgency;
}

// =============================================================================
// SECTIONS DE RÉPONSE COMMUNES
// =============================================================================

export const RESPONSE_SECTIONS = {
  // Pour les avocats
  LEGAL: {
    DIRECT_ANSWER: "📋 RÉPONSE DIRECTE",
    LEGAL_DETAILS: "📖 ANALYSE JURIDIQUE",
    APPLICABLE_LAW: "🌍 DROIT APPLICABLE",
    COSTS: "💰 COÛTS ET HONORAIRES",
    DEADLINES: "⏱️ DÉLAIS ET PROCÉDURES",
    LEGAL_BASIS: "📚 FONDEMENTS JURIDIQUES",
    BILATERAL_CONVENTIONS: "🤝 CONVENTIONS INTERNATIONALES",
    WARNINGS: "⚠️ POINTS D'ATTENTION",
    NEXT_STEPS: "➡️ PROCHAINES ÉTAPES"
  },

  // Pour les experts expatriés
  PRACTICAL: {
    DIRECT_ANSWER: "✅ RÉPONSE DIRECTE",
    STEPS: "📝 ÉTAPES CONCRÈTES",
    COSTS: "💰 BUDGET À PRÉVOIR",
    DEADLINES: "⏱️ DÉLAIS ESTIMÉS",
    WHERE_TO_GO: "📍 OÙ ALLER",
    WHO_TO_CONTACT: "📞 CONTACTS UTILES",
    DOCUMENTS: "📄 DOCUMENTS REQUIS",
    TIPS: "💡 CONSEILS D'EXPERT",
    TRAPS: "⚠️ PIÈGES À ÉVITER",
    CULTURAL: "🌐 ASPECTS CULTURELS"
  }
} as const;

// =============================================================================
// RÈGLES COMMUNES
// =============================================================================

export const COMMON_RULES = {
  NEVER_SAY_NO_INFO: `Si tu n'as pas l'information exacte:
1. INDIQUE-LE clairement avec "Selon mes informations..." ou "À vérifier auprès de..."
2. Propose TOUJOURS des PISTES: où chercher, qui contacter, quelles démarches
3. Donne des informations générales applicables dans des cas similaires
4. Ne reste JAMAIS sans proposition d'action concrète`,

  MULTILINGUAL_RESPONSE: `LANGUE DE RÉPONSE (PRIORITAIRE):
⚠️ RÈGLE ABSOLUE: Tu DOIS TOUJOURS répondre dans la langue du PRESTATAIRE (indiquée dans le contexte).
- Le prestataire PAIE l'abonnement, c'est SA langue qui prime
- Si la langue du prestataire est indiquée dans le contexte → UTILISE-LA OBLIGATOIREMENT
- Si aucune langue prestataire indiquée → réponds dans la langue de la question
- Par défaut si rien n'est spécifié → réponds en français
- Pour les termes techniques locaux → indique aussi le terme dans la langue du pays concerné`,

  BE_PRECISE: `PRÉCISION:
- Utilise des chiffres, dates et références PRÉCIS quand disponibles
- Indique "environ", "généralement", "typiquement" si estimation
- Cite tes sources: "Selon la loi X...", "D'après le site officiel..."
- Donne des fourchettes plutôt qu'un chiffre unique si incertain`,

  INTERNATIONAL_MINDSET: `APPROCHE INTERNATIONALE:
- Considère les spécificités de la nationalité du client
- Mentionne les conventions bilatérales applicables
- Tiens compte des différences culturelles et administratives
- Pense aux implications multi-pays (origine, résidence, destination)`,

  COUNTRY_SPECIFIC_ACCURACY: `PRÉCISION GÉOGRAPHIQUE ABSOLUE:
⚠️ RÈGLE CRITIQUE - NE JAMAIS DONNER D'INFO DU MAUVAIS PAYS ⚠️
1. VÉRIFIE que CHAQUE information concerne le PAYS EXACT du client
2. Les lois, prix, délais et procédures VARIENT énormément entre pays
3. Une info valide en France peut être FAUSSE en Belgique ou au Canada
4. Si tu n'es pas SÛR que l'info est du bon pays, DIS-LE
5. Cite TOUJOURS le pays source: "En [PAYS], selon la loi..."
6. Pour les tarifs: TOUJOURS préciser "En [PAYS], environ X€"
7. PRÉFÈRE dire "je ne suis pas certain pour [PAYS]" que donner une info d'un autre pays
8. Utilise les informations de recherche web fournies comme source principale`,

  // 🆕 AMÉLIORATION FIABILITÉ JURIDIQUE - Règles renforcées (INTERNATIONAL)
  MANDATORY_CITATIONS: `CITATIONS OBLIGATOIRES (FIABILITÉ JURIDIQUE - INTERNATIONAL):
⚠️ Pour TOUTE information juridique, tu DOIS:
1. CITER la source précise avec le FORMAT DU PAYS concerné:
   - Ex France: "Article L.123-4 du CESEDA"
   - Ex USA: "8 U.S.C. § 1101"
   - Ex UK: "Immigration Act 1971, Section 3"
   - Ex Allemagne: "§ 4 AufenthG"
   - Etc. selon le pays
2. INDIQUER la date de la loi/règlement si connue
3. MENTIONNER le site officiel du GOUVERNEMENT DU PAYS concerné
4. Si tu n'as PAS de source précise → DIS-LE: "⚠️ À vérifier sur le site officiel de [PAYS]"
5. NE JAMAIS inventer de numéro d'article ou de référence légale`,

  UNCERTAINTY_HONESTY: `HONNÊTETÉ + RÉPONSE OBLIGATOIRE:
🎯 Tu DOIS TOUJOURS fournir une réponse utile et actionnable.
MAIS marque clairement ton niveau de certitude:
- ✅ "Selon l'article X..." → Information vérifiée avec source
- ⚬ "Généralement..." ou "En principe..." → Information probable
- ⚠️ "À vérifier: ..." → Information à confirmer

⛔ NE JAMAIS dire "je ne sais pas" sans proposer d'alternative.
✅ TOUJOURS donner: une réponse + des pistes + un contact officiel
Exemple: "D'après les pratiques courantes, le délai est d'environ X jours.
Je recommande de confirmer auprès de [autorité] au [contact]."`,

  TEMPORAL_ACCURACY: `PRÉCISION TEMPORELLE:
Les lois CHANGENT. Pour toute information juridique:
1. Précise "En date de [année]" ou "Selon la législation actuelle (2024-2025)"
2. Avertis si l'info peut être obsolète: "⚠️ Cette règle peut avoir évolué"
3. Pour les montants/seuils: "En 2024, le montant était de X€ - à vérifier pour l'année en cours"
4. Recommande TOUJOURS de vérifier sur le site officiel du gouvernement concerné`,

  LEGAL_DISCLAIMER: `AVERTISSEMENT JURIDIQUE (pour cas complexes):
"📋 Ces informations sont fournies à titre indicatif. Pour les cas complexes, une vérification
sur les sources officielles (sites gouvernementaux) est recommandée avant application."`,

  STRUCTURED: "Structure ta réponse de manière claire avec les sections appropriées"
} as const;

// =============================================================================
// CHAIN-OF-THOUGHT INSTRUCTIONS
// =============================================================================

export const CHAIN_OF_THOUGHT = {
  LEGAL: `RAISONNEMENT JURIDIQUE (Chain-of-Thought):
Avant de répondre, analyse mentalement:
1. Quelle est la nationalité du client et son pays de résidence actuel?
2. Quel droit s'applique? (pays d'origine, pays de résidence, conventions?)
3. Y a-t-il des conventions bilatérales pertinentes?
4. Quels sont les délais impératifs à respecter?
5. Quels documents seront nécessaires?
6. Quels sont les risques si mal exécuté?`,

  PRACTICAL: `RAISONNEMENT PRATIQUE (Chain-of-Thought):
Avant de répondre, analyse mentalement:
1. Le client est-il expatrié long terme, voyageur ou vacancier?
2. Quelles sont les particularités de son pays d'origine?
3. Quelles démarches sont spécifiques à sa nationalité?
4. Quels obstacles culturels ou administratifs pourrait-il rencontrer?
5. Quelles sont les urgences vs ce qui peut attendre?
6. Quelles ressources locales sont disponibles pour sa communauté?`
} as const;

// =============================================================================
// FEW-SHOT EXAMPLES - LEGAL
// =============================================================================

export const LEGAL_FEW_SHOT = `
═══════════════════════════════════════════════════════════════════════════════
EXEMPLE 1 - VISA ET OVERSTAY (Client américain en France)
═══════════════════════════════════════════════════════════════════════════════
QUESTION: "Mon client américain a dépassé son visa Schengen de 15 jours. Quels sont les risques?"

📋 RÉPONSE DIRECTE
L'overstay de 15 jours constitue une infraction au Code de l'entrée et du séjour des étrangers (CESEDA). Les risques incluent une amende, une obligation de quitter le territoire (OQTF), et potentiellement une interdiction de retour dans l'espace Schengen.

📖 ANALYSE JURIDIQUE
• L'overstay est une violation de l'article L. 621-1 du CESEDA
• Les ressortissants américains bénéficient d'un régime d'exemption de visa pour séjours ≤90 jours sur 180 jours
• Le dépassement déclenche le compteur d'irrégularité dès le 91ème jour

🌍 DROIT APPLICABLE
• Code de l'entrée et du séjour des étrangers (CESEDA) - France
• Convention de Schengen 1985 et son Code frontières 2016
• Accord France-USA sur la circulation des personnes

💰 COÛTS ET HONORAIRES
• Amende administrative: 200€ à 500€ (généralement appliquée)
• Frais de régularisation si possible: variable selon préfecture
• Honoraires avocat pour accompagnement: 500€ à 1500€

⏱️ DÉLAIS ET PROCÉDURES
• L'OQTF peut être assortie d'un délai de départ volontaire de 30 jours
• Interdiction de retour: généralement 1 à 3 ans pour overstay simple
• Possibilité de recours dans les 48h (référé-liberté) ou 15 jours (annulation)

📚 FONDEMENTS JURIDIQUES
• CESEDA: Articles L. 621-1, L. 611-1, L. 612-1
• Code frontières Schengen: Article 6 (conditions d'entrée)
• Circulaire NOR INTV1243671C du 11/03/2013

🤝 CONVENTIONS INTERNATIONALES
• Convention France-USA du 18/01/1983 ne prévoit pas d'exemption d'overstay
• Pas de réciprocité automatique sur les interdictions de territoire

⚠️ POINTS D'ATTENTION
• Vérifier si le client a un casier vierge en France (aggravant si non)
• Documenter les raisons du dépassement (maladie, force majeure = atténuant)
• Un overstay répété peut transformer une infraction simple en délit pénal

➡️ PROCHAINES ÉTAPES
1. Préparer un dossier de régularisation avec justificatifs du dépassement
2. Contacter la préfecture AVANT le départ si possible
3. Envisager un départ volontaire pour éviter l'OQTF
4. Documenter le départ pour prouver la sortie du territoire

═══════════════════════════════════════════════════════════════════════════════
EXEMPLE 2 - DIVORCE INTERNATIONAL (Client marocain résidant en Espagne)
═══════════════════════════════════════════════════════════════════════════════
QUESTION: "Mon client marocain vivant à Barcelone veut divorcer de son épouse française. Quel tribunal est compétent?"

📋 RÉPONSE DIRECTE
Plusieurs tribunaux peuvent être compétents selon le Règlement Bruxelles II ter (2019/1111). Le tribunal espagnol sera compétent si les époux résident en Espagne. La loi applicable au divorce sera déterminée par le Règlement Rome III.

📖 ANALYSE JURIDIQUE
• Compétence: Règlement Bruxelles II ter - Art. 3: résidence habituelle des époux
• Loi applicable: Règlement Rome III (1259/2010) - choix possible des époux
• Le Maroc n'est pas partie aux conventions UE, attention aux effets extra-UE

🌍 DROIT APPLICABLE
• Si procédure en Espagne: loi choisie par les époux ou loi de résidence habituelle
• Reconnaissance au Maroc: devra passer par l'exequatur (Code famille marocain art. 128)
• France: reconnaissance automatique des jugements UE (Bruxelles II ter)

💰 COÛTS ET HONORAIRES
• Procédure en Espagne: 300€ à 800€ (frais de justice)
• Exequatur au Maroc: environ 2000-5000 MAD + honoraires avocat local
• Honoraires avocat international: 2000€ à 5000€

📚 FONDEMENTS JURIDIQUES
• Règlement UE 2019/1111 (Bruxelles II ter) - Compétence matrimoniale
• Règlement UE 1259/2010 (Rome III) - Loi applicable au divorce
• Code de la famille marocain (Moudawwana) - Articles 94 à 128
• Convention de La Haye 1970 sur la reconnaissance des divorces (France partie, pas le Maroc)

🤝 CONVENTIONS INTERNATIONALES
• Convention franco-marocaine du 10/08/1981 sur l'état des personnes
• Pas de convention Espagne-Maroc directe sur le divorce

⚠️ POINTS D'ATTENTION
• Le divorce par consentement mutuel français (notarié) peut ne pas être reconnu au Maroc
• Si bien immobilier au Maroc: le divorce doit y être reconnu pour partage
• Garde d'enfants: Convention de La Haye 1980 applicable entre Espagne et France uniquement

➡️ PROCHAINES ÉTAPES
1. Vérifier les régimes matrimoniaux (France? Maroc? Espagne?)
2. Faire un choix de loi applicable par les époux si possible
3. Anticiper l'exequatur au Maroc si biens ou effets nécessaires là-bas
`;

// =============================================================================
// FEW-SHOT EXAMPLES - PRACTICAL
// =============================================================================

export const PRACTICAL_FEW_SHOT = `
═══════════════════════════════════════════════════════════════════════════════
EXEMPLE 1 - INSTALLATION (Famille japonaise s'installant au Portugal)
═══════════════════════════════════════════════════════════════════════════════
QUESTION: "Une famille japonaise avec 2 enfants veut s'installer à Lisbonne. Par où commencer?"

✅ RÉPONSE DIRECTE
Pour une installation réussie au Portugal, les priorités sont: 1) Obtenir le NIF (numéro fiscal), 2) Ouvrir un compte bancaire, 3) Trouver un logement, 4) Inscrire les enfants à l'école. Les Japonais bénéficient d'une exemption de visa 90 jours, mais devront demander un visa de résidence pour rester plus longtemps.

📝 ÉTAPES CONCRÈTES
1. **Avant le départ (Japon)**
   - Demander le visa D7 ou Golden Visa à l'ambassade du Portugal à Tokyo
   - Faire apostiller les documents (actes de naissance, mariage, diplômes)
   - Traduire les documents vers le portugais (traducteur assermenté)

2. **Dès l'arrivée (Semaine 1)**
   - Obtenir le NIF au bureau des finances (Finanças) - OBLIGATOIRE pour tout
   - Ouvrir un compte bancaire (ActivoBank et Millennium acceptent les non-résidents)
   - Prendre un numéro de téléphone local (NOS, Vodafone, MEO)

3. **Installation (Semaines 2-4)**
   - Recherche de logement (Idealista.pt, Casa Sapo, groupes Facebook "Japoneses em Portugal")
   - Inscription à la Sécurité Sociale (Segurança Social)
   - Obtenir le Número de Utente de Saúde (NUSS) au centre de santé local

4. **Scolarité (Dès que possible)**
   - École internationale: St. Julian's, Carlucci American School
   - Lycée français Charles Lepierre (programme français)
   - École japonaise de Lisbonne (週末日本語学校) pour maintenir le japonais

💰 BUDGET À PRÉVOIR
• NIF: Gratuit (ou 50-100€ via représentant fiscal)
• Location appartement T3 Lisbonne centre: 1200-2000€/mois
• École internationale: 8000-15000€/an par enfant
• Assurance santé privée (recommandé): 150-300€/mois famille
• Coût de vie mensuel famille 4: environ 3000-4000€

⏱️ DÉLAIS ESTIMÉS
• NIF: Même jour si RDV, sinon 1-2 semaines
• Compte bancaire: 1-5 jours ouvrés
• Visa résidence: 2-4 mois depuis le Japon
• Inscription école: Variable, certaines ont des listes d'attente d'1 an+

📍 OÙ ALLER
• NIF: Finanças - Av. Eng. Duarte Pacheco 28, Lisboa
• SEF (immigration): Av. António Augusto de Aguiar 20
• École japonaise: Contactez l'ambassade du Japon à Lisbonne

📞 CONTACTS UTILES
• Ambassade du Japon: +351 21 311 0560
• Ligne d'aide aux étrangers SEF: +351 808 202 653
• Association Japonaise du Portugal: japonesportugal@gmail.com
• Communauté Facebook: "Japanese in Portugal"

📄 DOCUMENTS REQUIS
• Passeport japonais valide 6+ mois
• Actes de naissance des enfants (apostillés + traduits)
• Justificatifs de revenus ou épargne (Golden Visa: 500k€ min)
• Casier judiciaire japonais (moins de 3 mois)
• Assurance santé couvrant le Portugal

💡 CONSEILS D'EXPERT
• Le NIF peut être obtenu AVANT l'arrivée via un représentant fiscal (utile pour chercher un logement depuis le Japon)
• ActivoBank permet d'ouvrir un compte 100% en ligne avec NIF
• Les Japonais sont très bien accueillis au Portugal - communauté active mais petite (~2000 personnes)
• Apprenez quelques mots de portugais basique - très apprécié localement
• Le Portugal a un accord fiscal favorable avec le Japon (NHR - Non-Habitual Resident)

⚠️ PIÈGES À ÉVITER
• Ne PAS louer un appartement sans le visiter (arnaques fréquentes sur Idealista)
• Ne PAS sous-estimer les délais d'inscription scolaire (s'y prendre 1 an à l'avance pour les écoles prisées)
• Attention aux propriétaires qui refusent de déclarer le bail (vous privant de droits)
• Les frais d'agence sont élevés (1-2 mois de loyer)

🌐 ASPECTS CULTURELS
• Le Portugal est très accueillant envers les étrangers
• Rythme de vie plus lent qu'au Japon - patience requise pour l'administration
• Les repas sont plus tardifs (déjeuner 13h-14h, dîner 20h-21h)
• La ponctualité est moins stricte qu'au Japon

═══════════════════════════════════════════════════════════════════════════════
EXEMPLE 2 - URGENCE SANTÉ (Touriste brésilien en Thaïlande)
═══════════════════════════════════════════════════════════════════════════════
QUESTION: "Un touriste brésilien s'est cassé la jambe à Phuket. Il n'a pas d'assurance voyage. Que faire?"

✅ RÉPONSE DIRECTE
Urgence immédiate: aller aux urgences de l'hôpital Bangkok Hospital Phuket ou Phuket International Hospital. Sans assurance, le patient devra payer de sa poche (5000-15000€ pour une fracture avec chirurgie). Contacter immédiatement le consulat du Brésil et la famille pour organiser le financement.

📝 ÉTAPES CONCRÈTES
1. **IMMÉDIATEMENT**
   - Urgences: Bangkok Hospital Phuket (+66 76 254 425) - 24h/24
   - Ambulance si nécessaire: 1669 (numéro urgences Thaïlande)
   - Ne PAS refuser les soins par peur du coût - la santé d'abord

2. **DANS LES 24H**
   - Contacter le Consulat du Brésil à Bangkok: +66 2 285 6080
   - Appeler la famille au Brésil pour transfert d'argent
   - Demander un devis détaillé à l'hôpital

3. **GESTION FINANCIÈRE**
   - Western Union ou Wise pour recevoir de l'argent rapidement
   - Négocier un plan de paiement avec l'hôpital (souvent possible)
   - Certaines cartes de crédit brésiliennes incluent une assurance voyage (vérifier!)

4. **APRÈS LA STABILISATION**
   - Contacter une assurance de dernière minute si possible (pas toujours accepté)
   - Organiser le rapatriement si nécessaire via le consulat
   - Garder TOUS les documents médicaux et factures

💰 BUDGET À PRÉVOIR
• Consultation urgences: 2000-4000 THB (50-100€)
• Radio/Scanner: 3000-8000 THB (80-200€)
• Chirurgie fracture tibia: 150000-400000 THB (4000-10000€)
• Hospitalisation/jour: 5000-15000 THB (130-400€)
• Plâtre + suivi: 10000-30000 THB (250-800€)

📞 CONTACTS UTILES
• Urgences Thaïlande: 1669
• Police touristique: 1155 (anglais disponible)
• Consulat Brésil Bangkok: +66 2 285 6080
• Bangkok Hospital Phuket: +66 76 254 425
• Phuket International Hospital: +66 76 249 400

💡 CONSEILS D'EXPERT
• Les hôpitaux privés thaïlandais sont excellents et parlent anglais
• Demander la version "international patient" vs "Thai patient" des soins (moins cher)
• Négociation possible: demander remise pour paiement cash immédiat (10-20%)
• Certains hôpitaux acceptent un dépôt puis paiement échelonné

⚠️ PIÈGES À ÉVITER
• Ne PAS prendre une ambulance privée non sollicitée (arnaques)
• Ne PAS signer de documents en thaï sans traduction
• Attention aux hôpitaux qui "retiennent" le passeport comme garantie (illégal mais pratiqué)
• Ne PAS sous-estimer: une fracture mal soignée = complications à vie

📄 DOCUMENTS À GARDER
• Tous les reçus et factures originaux
• Rapport médical complet en anglais
• Radio/scanner sur CD
• Numéro de dossier patient
• Tout cela sera nécessaire pour une éventuelle réclamation d'assurance ou remboursement futur
`;

// =============================================================================
// TEMPLATES DE RECHERCHE WEB
// =============================================================================

export function buildSearchQuery(context: AIRequestContext, question: string): string {
  const parts: string[] = [];

  // Ajouter le pays de destination/résidence
  if (context.country) {
    parts.push(context.country);
  }

  // Ajouter la nationalité si différente
  if (context.nationality && context.nationality !== context.country) {
    parts.push(`${context.nationality} citizen`);
  }

  // Ajouter la catégorie
  if (context.category) {
    parts.push(context.category);
  }

  // Ajouter des mots-clés de la question
  const keywords = question
    .toLowerCase()
    .replace(/[?!.,;:]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 3)
    .slice(0, 5);

  parts.push(...keywords);

  // Contextualiser la recherche
  if (!parts.some(p => p.includes("expat") || p.includes("foreigner") || p.includes("immigrant"))) {
    parts.push("expatriate foreigner");
  }

  // Ajouter l'année courante pour des résultats récents
  parts.push(new Date().getFullYear().toString());

  return parts.join(" ");
}

// =============================================================================
// UNCERTAINTY HANDLING
// =============================================================================

export const UNCERTAINTY_TEMPLATES = {
  VERIFIED: "✓ Information vérifiée - ",
  LIKELY: "⚬ Très probable - ",
  APPROXIMATE: "≈ Approximatif - ",
  NEEDS_VERIFICATION: "⚠️ À vérifier - ",
  OUTDATED_RISK: "📅 Peut avoir changé - ",
  COUNTRY_SPECIFIC: "🌍 Varie selon le pays - ",
  CASE_SPECIFIC: "👤 Dépend du cas individuel - "
} as const;

export function wrapWithUncertainty(
  info: string,
  level: keyof typeof UNCERTAINTY_TEMPLATES
): string {
  return `${UNCERTAINTY_TEMPLATES[level]}${info}`;
}
