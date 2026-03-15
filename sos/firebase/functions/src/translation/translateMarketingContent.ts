/**
 * translateMarketingContent — Cloud Function for auto-translating marketing resources
 *
 * Uses OpenAI GPT-4o for premium-quality native translations.
 * Preserves {{VARIABLES}} placeholders intact.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { adminConfig } from "../lib/functionConfigs";
import { OPENAI_API_KEY } from "../lib/secrets";

interface TranslateRequest {
  text: string;
  sourceLang: string;
  targetLangs: string[];
  context: string;
  langNames: Record<string, string>;
}

// ── Locale-specific instructions for each target language ──
const LOCALE_GUIDELINES: Record<string, string> = {
  fr: `FRENCH (France & francophonie):
- Use formal "vous" for marketing/press unless source is clearly informal (tu)
- Respect Academie francaise conventions: accents on capitals (A, E), proper ligatures
- Prefer native French words over anglicisms when a natural equivalent exists (ex: "courriel" only if audience is institutional; "email" is fine for tech-savvy B2C)
- Numbers: space as thousands separator (1 000), comma as decimal (9,99 EUR)
- Currency placement after number: 49,99 EUR
- Date format: 15 mars 2026`,

  en: `ENGLISH (International / UK-leaning):
- Use British spelling by default (organise, colour, centre) unless the source explicitly targets US audience
- Prefer active voice, concise sentences — marketing best practices
- Numbers: comma as thousands separator (1,000), period as decimal (9.99)
- Currency: EUR 49.99 or $49.99 before the number
- Tone: professional yet approachable, avoid overly corporate jargon`,

  es: `SPANISH (Neutral Latin American + Spain awareness):
- Use "usted" for formal/press, "tu" for casual marketing
- Prefer Latin American neutral Spanish (avoid heavy peninsular idioms like "vosotros", "mola", "vale")
- Use proper inverted punctuation: Descubra... / Registrese...
- Numbers: period as thousands (1.000), comma as decimal (9,99)
- Gender-inclusive language where natural (use "personas" instead of gendered alternatives when possible)
- Accents are mandatory — never omit tildes or accent marks`,

  pt: `PORTUGUESE (Brazilian Portuguese primary):
- Default to Brazilian Portuguese (voce, not tu; gerund forms: "estou fazendo" not "estou a fazer")
- Use informal-professional tone typical of Brazilian digital marketing
- Numbers: period as thousands (1.000), comma as decimal (9,99)
- Currency: R$ for BRL context, but keep EUR/USD as-is when in source
- Brazilian expressions and cultural references are preferred
- Accents and cedillas are mandatory (caca, nao, servico)`,

  ar: `ARABIC (Modern Standard Arabic — MSA):
- Use MSA (fusha) for maximum reach across all Arab countries
- Right-to-left text — ensure no LTR punctuation leaks
- Use Arabic-Indic numerals (٠١٢٣٤٥٦٧٨٩) for body text OR Western numerals — be consistent within a single translation
- Proper diacritics on ambiguous words if it aids clarity
- Formal register for press releases, slightly warmer for marketing
- Transliterate brand names (SOS-Expat stays as-is in Latin script, do not convert to Arabic script)
- Keep {{VARIABLES}} in their original Latin form`,

  de: `GERMAN (Germany / DACH region):
- Use formal "Sie" for marketing and press communications
- Compound nouns are one word (Rechtsberatung, Expatbetreuung) — do not split
- Numbers: period as thousands (1.000), comma as decimal (9,99)
- Currency after number: 49,99 EUR
- Capitise all nouns as per German grammar
- Be precise and direct — German audiences value clarity over flowery language
- Legal/compliance texts must use legally accurate terminology`,

  zh: `CHINESE (Simplified Chinese — mainland China):
- Use simplified characters (简体中文), never traditional
- Natural Chinese sentence structure — do not calque Western syntax
- Use Chinese punctuation: full-width period (。), comma (，), quotation marks (「」or "")
- Numbers can use Arabic numerals for marketing (SOS-Expat服务超过10,000位客户)
- Formal but warm tone — avoid overly bureaucratic language
- Brand name SOS-Expat stays in Latin script
- Cultural sensitivity: avoid political references, respect Chinese communication norms`,

  ru: `RUSSIAN (Russia & CIS):
- Use formal "Вы" (capitalised) for marketing/press addressing the reader
- Proper Russian Cyrillic — no transliteration of common words
- Numbers: space as thousands separator (1 000), comma as decimal (9,99)
- Gendered forms: use masculine as default generic, or restructure to avoid gender when natural
- Russian marketing tone: informative, trustworthy, slightly formal
- Declension must be grammatically perfect — pay special attention to cases after prepositions
- Brand name SOS-Expat stays in Latin script`,

  hi: `HINDI (India — Devanagari script):
- Use pure Devanagari script (हिन्दी), not Romanised Hindi (Hinglish)
- Formal register: use "आप" (aap), not "तुम" (tum)
- However, some English loanwords are natural in modern Hindi marketing (सर्विस, ऑनलाइन, लिंक) — use them when they feel more natural than pure Hindi equivalents
- Numbers: Indian numbering system awareness (1,00,000 = one lakh) but international format is acceptable for global context
- Respect Devanagari punctuation: purna viram (।) for full stop
- Brand name SOS-Expat stays in Latin script
- Tone: respectful, warm, service-oriented — resonates with Indian communication style`,
};

export const translateMarketingContent = onCall(
  {
    ...adminConfig,
    memory: "512MiB" as const,
    timeoutSeconds: 120,
    secrets: [OPENAI_API_KEY],
  },
  async (request): Promise<{ translations: Record<string, string> }> => {
    // Admin check
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const { text, sourceLang, targetLangs, context, langNames } =
      request.data as TranslateRequest;

    if (!text?.trim() || !sourceLang || !targetLangs?.length) {
      throw new HttpsError(
        "invalid-argument",
        "text, sourceLang, and targetLangs are required"
      );
    }

    const apiKey = OPENAI_API_KEY.value();
    if (!apiKey) {
      throw new HttpsError("internal", "OpenAI API key not configured");
    }

    logger.info("[translateMarketingContent] Translating", {
      sourceLang,
      targetLangs,
      textLength: text.length,
    });

    const translations: Record<string, string> = {};

    // Build per-language guidelines
    const targetLangBlocks = targetLangs
      .map((lang) => {
        const guideline = LOCALE_GUIDELINES[lang] || `${langNames[lang] || lang}: Translate naturally with native fluency.`;
        return `### "${lang}" — ${langNames[lang] || lang}\n${guideline}`;
      })
      .join("\n\n");

    const systemPrompt = `You are a elite-tier multilingual copywriter and certified translator (NAATI / ATA equivalent) with 15+ years of experience in marketing localisation and press communications. You have native or near-native fluency in all 9 target languages.

YOUR MISSION: Produce translations that are INDISTINGUISHABLE from content originally written by a native marketing professional in each target locale. Every translation must feel local — never "translated".

═══════════════════════════════════════
ABSOLUTE RULES (violating any = failure)
═══════════════════════════════════════

1. PLACEHOLDERS: All {{VARIABLE_NAME}} tokens MUST appear in the output EXACTLY as in the source — same casing, same braces, same spelling. Never translate, modify, or omit them.

2. MEANING OVER WORDS: Translate the message, intent, and emotional impact — NOT word-for-word. Restructure sentences if it sounds more natural in the target language.

3. CULTURAL ADAPTATION: Adapt idioms, metaphors, humor, and calls-to-action to what resonates in each culture. A French "Decouvrez" might become a Chinese "立即体验" (experience now) if that converts better.

4. REGISTER CONSISTENCY: Match the formality level of the source. If the source is casual marketing, keep it casual. If it's a formal press release, maintain gravitas.

5. TECHNICAL ACCURACY: Legal, financial, or technical terms must be translated with domain-accurate equivalents — no approximations.

6. BRAND NAMES: "SOS-Expat" and any proper nouns stay as-is (Latin script) in ALL languages, including Arabic, Chinese, Hindi, and Russian.

7. FORMATTING: Preserve line breaks, bullet points, numbering, and paragraph structure from the source.

8. LENGTH: Translations may be up to 20% longer or shorter than the source — prioritise natural expression over matching character count.

═══════════════════════════════════════
LOCALE-SPECIFIC GUIDELINES
═══════════════════════════════════════

${targetLangBlocks}

═══════════════════════════════════════
CONTEXT
═══════════════════════════════════════
${context}

═══════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════
Return ONLY a raw JSON object mapping language codes to translated strings.
No markdown fences, no explanations, no comments.
Example: {"es": "...", "de": "...", "ar": "..."}`;

    const userPrompt = `Translate from ${langNames[sourceLang] || sourceLang}:

"""
${text}
"""

Target languages: ${targetLangs.map((l) => `${l} (${langNames[l] || l})`).join(", ")}`;

    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.2,
            max_tokens: 8000,
            response_format: { type: "json_object" },
          }),
        }
      );

      if (!response.ok) {
        const errorBody = await response.text();
        logger.error("[translateMarketingContent] OpenAI API error", {
          status: response.status,
          body: errorBody,
        });
        throw new HttpsError(
          "internal",
          `OpenAI API error: ${response.status}`
        );
      }

      const data = (await response.json()) as {
        choices: Array<{ message: { content: string } }>;
      };
      const content = data.choices?.[0]?.message?.content?.trim();

      if (!content) {
        throw new HttpsError("internal", "Empty response from OpenAI");
      }

      // Parse JSON response (strip markdown code fences if present as safety net)
      const jsonStr = content
        .replace(/^```json\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      const parsed = JSON.parse(jsonStr) as Record<string, string>;

      for (const lang of targetLangs) {
        if (parsed[lang]) {
          translations[lang] = parsed[lang];
        }
      }

      // Verify all placeholders are preserved
      const sourcePlaceholders = text.match(/\{\{[A-Z_]+\}\}/g) || [];
      if (sourcePlaceholders.length > 0) {
        for (const lang of Object.keys(translations)) {
          const translatedPlaceholders =
            translations[lang].match(/\{\{[A-Z_]+\}\}/g) || [];
          const missing = sourcePlaceholders.filter(
            (p) => !translatedPlaceholders.includes(p)
          );
          if (missing.length > 0) {
            logger.warn(
              `[translateMarketingContent] Missing placeholders in ${lang}:`,
              { missing }
            );
          }
        }
      }

      logger.info("[translateMarketingContent] Success", {
        translatedLangs: Object.keys(translations),
        model: "gpt-4o",
      });

      return { translations };
    } catch (error: unknown) {
      if (error instanceof HttpsError) throw error;
      const message =
        error instanceof Error ? error.message : "Unknown translation error";
      logger.error("[translateMarketingContent] Error:", { error: message });
      throw new HttpsError("internal", `Translation failed: ${message}`);
    }
  }
);
