/**
 * SEO AI Generation — Prompts
 * System and user prompts for Claude Haiku SEO generation
 */

import { SEOGenerationInput } from './seoTypes';

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

export const SEO_SYSTEM_PROMPT = `Tu es un expert SEO international spécialisé dans l'optimisation de fiches professionnelles. Tu génères du contenu SEO pour SOS Expat, une plateforme d'assistance juridique et pratique pour les personnes à l'étranger (expatriés, vacanciers, digital nomades, étudiants internationaux, voyageurs d'affaires, retraités, familles en relocation).

RÈGLES ABSOLUES :
1. Chaque texte doit être rédigé dans la LANGUE CIBLE de manière native (pas de traduction littérale)
2. Les meta titles font MAXIMUM 60 caractères
3. Les meta descriptions font MAXIMUM 155 caractères
4. Les ogTitle et twitterTitle font MAXIMUM 70 caractères
5. Les ogDescription font MAXIMUM 200 caractères
6. Inclure naturellement les mots-clés que les utilisateurs recherchent sur Google
7. Adapter le vocabulaire au pays cible
8. Mentionner le prix et la disponibilité 24/7 quand pertinent
9. Ne JAMAIS inventer de faux avis, faux chiffres ou fausses qualifications
10. Varier les formulations — ne pas générer le même texte pour tous les prestataires
11. Les FAQ doivent répondre aux VRAIES questions que les gens posent pour ce type de service dans ce pays
12. Ne JAMAIS inclure de codes bruts (SCREAMING_SNAKE_CASE) ni de codes pays ISO (TN, TH) dans les textes. Toujours utiliser les noms complets traduits.
13. ATTENTION PAYS SPÉCIAUX : territoires d'outre-mer français (GP, MQ, RE, NC, PF) = territoires français. Zones de conflit = assistance d'urgence. Micro-États = adapter le vocabulaire.
14. Ne JAMAIS retourner de JSON invalide. Si tu n'es pas sûr d'un champ, mettre une valeur par défaut.
15. Retourne UNIQUEMENT du JSON valide, sans commentaires, sans markdown, sans backticks.`;

// ============================================================================
// ANALYSIS PROMPT (description correction — called once per profile)
// ============================================================================

export function buildAnalysisPrompt(input: SEOGenerationInput): string {
  if (!input.description) {
    return '';
  }

  return `Analyse et corrige cette description de prestataire. Détecte la langue automatiquement et corrige DANS LA MÊME LANGUE (ne traduis PAS).

Description originale :
"""
${input.description}
"""

Prestataire : ${input.firstName} ${input.lastName}, ${input.type === 'lawyer' ? 'avocat' : 'expatrié aidant'} en ${input.countryName}.

Retourne UNIQUEMENT ce JSON (pas de markdown, pas de backticks) :
{
  "detectedLanguage": "code ISO 2 lettres de la langue détectée",
  "corrected": "description corrigée dans la même langue (orthographe, grammaire, ponctuation). null si aucune correction nécessaire",
  "qualityScore": 0-100,
  "correctionsMade": ["liste des corrections faites ou ['Aucune correction nécessaire']"]
}`;
}

// ============================================================================
// LOCALE GENERATION PROMPT (called once per locale)
// ============================================================================

export function buildUserPrompt(input: SEOGenerationInput, locale: string): string {
  const localeName = LOCALE_NAMES[locale] || locale;
  const ratingInfo = input.rating && input.reviewCount && input.reviewCount > 0
    ? `${input.rating.toFixed(1)}/5 (${input.reviewCount} avis)`
    : 'Pas encore d\'avis';

  return `Génère les éléments SEO pour ce prestataire dans la langue : ${localeName} (${locale})

## Données du prestataire
- Type : ${input.type === 'lawyer' ? 'Avocat (consultation juridique 20min)' : 'Expatrié aidant (conseil pratique 30min)'}
- Prénom : ${input.firstName}
- Pays d'exercice : ${input.countryName}
${input.city ? `- Ville : ${input.city}` : ''}
- Langues parlées : ${input.languages.join(', ')}
- Spécialités : ${input.specialtiesLabels.join(', ') || 'Non spécifié'}
${input.yearsOfExperience ? `- Années d'expérience : ${input.yearsOfExperience}` : ''}
- Note : ${ratingInfo}
${input.totalCalls ? `- Appels réalisés : ${input.totalCalls}` : ''}
- Prix : ${input.price}
- Disponibilité : 24/7
- URL : ${input.profileUrl}

## Ce que tu dois générer
Retourne UNIQUEMENT un objet JSON valide. Pas de backticks, pas de commentaires, pas de texte avant ou après le JSON. Remplace TOUTES les valeurs d'exemple par du VRAI contenu dans la langue ${localeName}.
{
  "metaTitle": "Max 60 chars. Nom + rôle + pays. Optimisé CTR Google.",
  "metaDescription": "Max 155 chars. Spécialité + pays + langues + prix. Call-to-action.",
  "faqs": [
    {"question": "Question que les gens posent VRAIMENT sur Google", "answer": "Réponse 2-3 phrases, mentionne le prestataire et SOS Expat"},
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."}
  ],
  "ogTitle": "Max 70 chars. Accrocheur pour Facebook/WhatsApp/LinkedIn.",
  "ogDescription": "Max 200 chars. Donne envie de cliquer. Bénéfice clair.",
  "aiSummary": "150-250 chars. Réponse directe à 'Qui est [nom] ?'. Pour ChatGPT/Perplexity/Google AI Overview.",
  "aiKeyFacts": ["5-7 faits clés structurés"],
  "profileDescription": "250-400 chars. Description engageante visible sur la page.",
  "breadcrumbLabel": "Max 30 chars. Ex: 'Avocat immigration Tokyo'.",
  "structuredData": {
    "knowsAbout": ["5-8 sujets d'expertise traduits"],
    "serviceDescription": "Max 200 chars. Description du SERVICE, pas de la personne."
  }
}`;
}

// ============================================================================
// LOCALE NAMES (for prompt context)
// ============================================================================

const LOCALE_NAMES: Record<string, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
  de: 'Deutsch',
  pt: 'Português',
  ru: 'Русский',
  zh: 'Chinese (中文)',
  ar: 'Arabic (العربية)',
  hi: 'Hindi (हिन्दी)',
};
