/**
 * =============================================================================
 * SOS EXPAT — Export centralisé des Prompts
 * =============================================================================
 */

import type { ProviderType, AIRequestContext } from "../core/types";
import { LAWYER_SYSTEM_PROMPT, buildLawyerPrompt } from "./lawyer";
import { EXPERT_SYSTEM_PROMPT, buildExpertPrompt } from "./expert";

// =============================================================================
// RE-EXPORTS
// =============================================================================

// Templates et utilitaires
export {
  formatContextBlock,
  formatUrgency,
  buildSearchQuery,
  RESPONSE_SECTIONS,
  COMMON_RULES
} from "./templates";

// Prompts Avocats
export {
  LAWYER_SYSTEM_PROMPT,
  LAWYER_SPECIALIZED_PROMPTS,
  LAWYER_SEARCH_PROMPT,
  buildLawyerPrompt
} from "./lawyer";

// Prompts Experts
export {
  EXPERT_SYSTEM_PROMPT,
  EXPERT_SPECIALIZED_PROMPTS,
  EXPERT_SEARCH_PROMPT,
  buildExpertPrompt
} from "./expert";

// =============================================================================
// FONCTION PRINCIPALE DE SÉLECTION DE PROMPT
// =============================================================================

export function getSystemPrompt(providerType: ProviderType | undefined): string {
  return providerType === "lawyer" ? LAWYER_SYSTEM_PROMPT : EXPERT_SYSTEM_PROMPT;
}

export function buildPromptForProvider(
  providerType: ProviderType | undefined,
  context: AIRequestContext
): string {
  if (providerType === "lawyer") {
    return buildLawyerPrompt(context);
  } else {
    return buildExpertPrompt(context);
  }
}
