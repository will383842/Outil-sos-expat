/**
 * =============================================================================
 * MODERATION - Modération de contenu via OpenAI
 * =============================================================================
 */

import axios from 'axios';
import { defineSecret } from "firebase-functions/params";

// Secret OpenAI pour la modération
const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

/**
 * Modère le contenu utilisateur via l'API OpenAI Moderation
 * @param text - Texte à modérer
 * @param openaiKey - Clé API OpenAI (passée par l'appelant qui a accès au secret)
 * @returns {ok: boolean, reason?: string}
 */
export async function moderateInput(
  text: string,
  openaiKey?: string
): Promise<{ ok: boolean; reason?: string }> {
  // Vérification basique
  if (!text || text.trim().length === 0) {
    return { ok: false, reason: 'empty' };
  }

  try {
    // Utiliser la clé passée en paramètre ou tenter le secret
    const apiKey = openaiKey || OPENAI_API_KEY.value();

    if (!apiKey) {
      // SÉCURITÉ: fail-close - pas de modération = blocage
      console.error('[moderation] No API key available, blocking request');
      return { ok: false, reason: 'moderation_not_configured' };
    }

    // Appel API OpenAI Moderation
    const resp = await axios.post(
      'https://api.openai.com/v1/moderations',
      { model: 'omni-moderation-latest', input: text },
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: 5000 // 5s timeout
      }
    );

    const result = resp.data?.results?.[0];
    if (result?.flagged) {
      return { ok: false, reason: 'flagged' };
    }

    return { ok: true };
  } catch (error) {
    // SÉCURITÉ: fail-close en production - en cas d'erreur, on bloque
    // pour éviter que du contenu malveillant passe si l'API est down
    console.error('[moderation] API error, blocking request (fail-close):', error);
    return { ok: false, reason: 'moderation_unavailable' };
  }
}

/**
 * Export du secret pour utilisation dans les Cloud Functions
 * Les fonctions appelantes doivent inclure ce secret dans leur config
 */
export { OPENAI_API_KEY as MODERATION_OPENAI_KEY };
