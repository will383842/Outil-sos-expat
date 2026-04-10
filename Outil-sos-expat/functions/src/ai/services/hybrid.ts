/**
 * =============================================================================
 * SOS EXPAT — Service Hybride IA V6.0
 * =============================================================================
 *
 * Orchestration intelligente multi-LLM:
 * - Claude 3.5 Sonnet pour AVOCATS (raisonnement juridique)
 * - GPT-4o pour EXPERTS EXPATRIÉS (conseils pratiques)
 * - Perplexity pour RECHERCHE WEB (questions factuelles)
 * - Fallback automatique entre LLMs
 */

import { logger } from "firebase-functions";
import type { HybridResponse, LLMMessage, ProviderType, AIRequestContext, ConfidenceInfo, ConfidenceLevel, ThinkingCallback, ThinkingLog } from "../core/types";
import { ClaudeProvider } from "../providers/claude";
import { OpenAIProvider } from "../providers/openai";
import { PerplexityProvider, isFactualQuestion } from "../providers/perplexity";
import { getSystemPrompt, buildPromptForProvider } from "../prompts";
import { withExponentialBackoff } from "./utils";

// =============================================================================
// 🆕 DISCLAIMERS PAR NIVEAU DE CONFIANCE
// =============================================================================

const DISCLAIMERS = {
  high: null,  // Pas de disclaimer si confiance haute
  medium: "⚠️ Informations indicatives - vérifiez sur le site officiel du gouvernement concerné.",
  low: "⚠️ Sources non-officielles utilisées - vérifiez impérativement sur les sites gouvernementaux avant d'appliquer.",
};

// =============================================================================
// 🆕 DÉTECTION SOURCES OFFICIELLES (INTERNATIONAL - 197 PAYS)
// =============================================================================

// Patterns génériques pour identifier les sources gouvernementales de N'IMPORTE QUEL pays
const OFFICIAL_DOMAIN_PATTERNS = [
  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAINES GOUVERNEMENTAUX GÉNÉRIQUES (tous pays)
  // ═══════════════════════════════════════════════════════════════════════════
  /\.gov\./i,           // .gov.xx (USA, UK, AU, etc.)
  /\.gouv\./i,          // .gouv.xx (France, Canada FR, etc.)
  /\.gob\./i,           // .gob.xx (Espagne, Mexique, Argentine, etc.)
  /\.gov$/i,            // .gov (USA federal)
  /\.go\./i,            // .go.xx (Japon, Kenya, Thaïlande, etc.)
  /\.govt\./i,          // .govt.xx (NZ, Inde, etc.)
  /\.gc\./i,            // .gc.ca (Canada)
  /\.admin\./i,         // .admin.ch (Suisse)
  /\.bundesregierung/i, // Allemagne
  /\.regierung/i,       // Allemagne/Autriche

  // ═══════════════════════════════════════════════════════════════════════════
  // 🌎 AMÉRIQUE LATINE - Domaines spécifiques (+10% fiabilité)
  // ═══════════════════════════════════════════════════════════════════════════
  /\.gob\.ar/i,         // Argentine
  /\.gov\.br/i,         // Brésil
  /\.gob\.cl/i,         // Chili
  /\.gov\.co/i,         // Colombie
  /\.gob\.mx/i,         // Mexique
  /\.gob\.pe/i,         // Pérou
  /\.gub\.uy/i,         // Uruguay
  /\.gob\.ve/i,         // Venezuela
  /\.gob\.ec/i,         // Équateur
  /\.gob\.bo/i,         // Bolivie
  /\.gob\.py/i,         // Paraguay
  /\.gob\.pa/i,         // Panama
  /\.gob\.gt/i,         // Guatemala
  /\.gob\.hn/i,         // Honduras
  /\.gob\.sv/i,         // El Salvador
  /\.gob\.ni/i,         // Nicaragua
  /\.gob\.cr/i,         // Costa Rica
  /\.gob\.cu/i,         // Cuba
  /\.gob\.do/i,         // République Dominicaine
  /mercosur\.int/i,     // MERCOSUR
  /sica\.int/i,         // SICA (Amérique Centrale)
  /comunidadandina/i,   // Communauté Andine

  // ═══════════════════════════════════════════════════════════════════════════
  // 🌏 ASIE DÉVELOPPÉE - Domaines spécifiques (+10% fiabilité)
  // ═══════════════════════════════════════════════════════════════════════════
  /\.go\.jp/i,          // Japon
  /\.gov\.sg/i,         // Singapour
  /\.go\.kr/i,          // Corée du Sud
  /\.gov\.tw/i,         // Taïwan
  /\.gov\.hk/i,         // Hong Kong
  /\.gov\.mo/i,         // Macao
  /\.gov\.my/i,         // Malaisie
  /\.go\.th/i,          // Thaïlande
  /\.gov\.ph/i,         // Philippines
  /\.gov\.vn/i,         // Vietnam
  /\.gov\.id/i,         // Indonésie
  /asean\.org/i,        // ASEAN
  /apec\.org/i,         // APEC

  // ═══════════════════════════════════════════════════════════════════════════
  // 🌍 AFRIQUE & MOYEN-ORIENT - Domaines spécifiques (+15% fiabilité)
  // ═══════════════════════════════════════════════════════════════════════════
  // Afrique du Nord
  /\.gov\.ma/i,         // Maroc
  /\.gov\.dz/i,         // Algérie
  /\.gov\.tn/i,         // Tunisie
  /\.gov\.eg/i,         // Égypte
  /\.gov\.ly/i,         // Libye
  // Afrique Sub-saharienne
  /\.gov\.za/i,         // Afrique du Sud
  /\.gov\.ng/i,         // Nigeria
  /\.gov\.ke/i,         // Kenya
  /\.gov\.gh/i,         // Ghana
  /\.gov\.et/i,         // Éthiopie
  /\.gov\.tz/i,         // Tanzanie
  /\.gov\.ug/i,         // Ouganda
  /\.gov\.sn/i,         // Sénégal
  /\.gov\.ci/i,         // Côte d'Ivoire
  /\.gov\.cm/i,         // Cameroun
  /\.gov\.rw/i,         // Rwanda
  // Moyen-Orient
  /\.gov\.sa/i,         // Arabie Saoudite
  /\.gov\.ae/i,         // Émirats Arabes Unis
  /\.gov\.qa/i,         // Qatar
  /\.gov\.kw/i,         // Koweït
  /\.gov\.bh/i,         // Bahreïn
  /\.gov\.om/i,         // Oman
  /\.gov\.jo/i,         // Jordanie
  /\.gov\.lb/i,         // Liban
  /\.gov\.il/i,         // Israël
  /\.gov\.tr/i,         // Turquie
  /\.gov\.ir/i,         // Iran
  /\.gov\.iq/i,         // Irak
  // Organisations régionales
  /au\.int/i,           // Union Africaine
  /ecowas\.int/i,       // CEDEAO (Afrique de l'Ouest)
  /gccsg\.org/i,        // GCC (Golfe)
  /arableague/i,        // Ligue Arabe
  /sadc\.int/i,         // SADC (Afrique Australe)
  /comesa\.int/i,       // COMESA (Afrique Est/Sud)
  /igad\.int/i,         // IGAD (Corne de l'Afrique)

  // ═══════════════════════════════════════════════════════════════════════════
  // 🌏 ASIE CENTRALE & SUD - Domaines spécifiques (+15% fiabilité)
  // ═══════════════════════════════════════════════════════════════════════════
  /\.gov\.kz/i,         // Kazakhstan
  /\.gov\.uz/i,         // Ouzbékistan
  /\.gov\.kg/i,         // Kirghizistan
  /\.gov\.tj/i,         // Tadjikistan
  /\.gov\.tm/i,         // Turkménistan
  /\.gov\.az/i,         // Azerbaïdjan
  /\.gov\.ge/i,         // Géorgie
  /\.gov\.am/i,         // Arménie
  /\.gov\.mn/i,         // Mongolie
  /\.gov\.in/i,         // Inde
  /\.gov\.pk/i,         // Pakistan
  /\.gov\.bd/i,         // Bangladesh
  /\.gov\.lk/i,         // Sri Lanka
  /\.gov\.np/i,         // Népal
  /sco\.int/i,          // Shanghai Cooperation Organisation
  /saarc-sec/i,         // SAARC (Asie du Sud)

  // ═══════════════════════════════════════════════════════════════════════════
  // ORGANISATIONS INTERNATIONALES
  // ═══════════════════════════════════════════════════════════════════════════
  /europa\.eu/i,        // Union Européenne
  /eur-lex/i,           // Législation UE
  /un\.org/i,           // Nations Unies
  /ilo\.org/i,          // Organisation Internationale du Travail
  /wto\.org/i,          // OMC
  /oecd\.org/i,         // OCDE
  /who\.int/i,          // OMS
  /imf\.org/i,          // FMI
  /worldbank\.org/i,    // Banque Mondiale
  /unhcr\.org/i,        // HCR (réfugiés)
  /iom\.int/i,          // OIM (migrations)
  /icj-cij\.org/i,      // Cour Internationale de Justice
  /hcch\.net/i,         // Conférence de La Haye

  // ═══════════════════════════════════════════════════════════════════════════
  // AMBASSADES ET CONSULATS (multilingue)
  // ═══════════════════════════════════════════════════════════════════════════
  /embassy/i,
  /consulate/i,
  /ambassade/i,
  /consulat/i,
  /embajada/i,          // Espagnol
  /consulado/i,         // Espagnol/Portugais
  /botschaft/i,         // Allemand
  /konsulat/i,          // Allemand
  /embaixada/i,         // Portugais
  /ambasciata/i,        // Italien
  /سفارة/i,             // Arabe (sifāra)
  /大使馆/i,             // Chinois (dàshǐguǎn)
  /대사관/i,             // Coréen (daesagwan)
];

/**
 * Vérifie si une URL provient d'une source officielle (gouvernement, organisation internationale)
 * Fonctionne pour N'IMPORTE QUEL pays du monde
 */
function isOfficialSource(url: string): boolean {
  return OFFICIAL_DOMAIN_PATTERNS.some(pattern => pattern.test(url));
}

// =============================================================================
// 🆕 CONTEXTE JURIDIQUE RÉGIONAL
// =============================================================================

type LegalSystem = "civil_law" | "common_law" | "islamic_law" | "mixed" | "socialist" | "customary";

interface RegionalContext {
  region: string;
  legalSystem: LegalSystem;
  keyOrganizations: string[];
  searchKeywords: string[];
  citationFormats: string[];
}

/**
 * Retourne le contexte régional pour améliorer les recherches et réponses
 */
function getRegionalContext(country?: string): RegionalContext | null {
  if (!country) return null;

  const countryLower = country.toLowerCase();

  // ═══════════════════════════════════════════════════════════════════════════
  // 🌎 AMÉRIQUE LATINE (Droit civil - tradition espagnole/portugaise)
  // ═══════════════════════════════════════════════════════════════════════════
  const latinAmerica = [
    "argentina", "argentine", "brazil", "brasil", "brésil", "mexico", "mexique",
    "colombia", "colombie", "peru", "pérou", "chile", "chili", "venezuela",
    "ecuador", "équateur", "bolivia", "bolivie", "paraguay", "uruguay",
    "panama", "costa rica", "guatemala", "honduras", "el salvador", "nicaragua",
    "cuba", "dominican republic", "république dominicaine", "puerto rico", "haiti"
  ];

  if (latinAmerica.some(c => countryLower.includes(c))) {
    return {
      region: "latin_america",
      legalSystem: "civil_law",
      keyOrganizations: ["MERCOSUR", "Comunidad Andina", "SICA", "OEA/OAS"],
      searchKeywords: [
        "código civil", "ley de extranjería", "migración",
        "resolución", "decreto", "norma oficial", "trámite",
        "visa de residencia", "permiso de trabajo"
      ],
      citationFormats: [
        "Ley XX/YYYY art. X",
        "Decreto Supremo N° XXX",
        "Resolución N° XXX-YYYY"
      ]
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🌏 ASIE DÉVELOPPÉE (Mix droit civil + influences locales)
  // ═══════════════════════════════════════════════════════════════════════════
  const developedAsia = [
    "japan", "japon", "south korea", "corée du sud", "korea", "corée",
    "singapore", "singapour", "hong kong", "taiwan", "taïwan",
    "malaysia", "malaisie", "thailand", "thaïlande"
  ];

  if (developedAsia.some(c => countryLower.includes(c))) {
    return {
      region: "developed_asia",
      legalSystem: countryLower.includes("singapore") || countryLower.includes("hong kong") ? "common_law" : "civil_law",
      keyOrganizations: ["ASEAN", "APEC"],
      searchKeywords: [
        "immigration law", "work permit", "employment pass",
        "resident visa", "在留資格", "ビザ", "工作签证", "거주비자",
        "visa requirements", "foreign worker"
      ],
      citationFormats: [
        "法律第XX号 (Japan)",
        "Immigration Act Chapter XX (SG/HK)",
        "입국관리법 제X조 (Korea)"
      ]
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🌏 ASIE DU SUD-EST (Mix common law + civil law)
  // ═══════════════════════════════════════════════════════════════════════════
  const southeastAsia = [
    "philippines", "indonesia", "indonésie", "vietnam", "viêtnam",
    "cambodia", "cambodge", "laos", "myanmar", "birmanie"
  ];

  if (southeastAsia.some(c => countryLower.includes(c))) {
    return {
      region: "southeast_asia",
      legalSystem: "mixed",
      keyOrganizations: ["ASEAN"],
      searchKeywords: [
        "immigration bureau", "work permit", "special visa",
        "foreign employment", "KITAS", "work authorization"
      ],
      citationFormats: [
        "Republic Act No. XXXX (Philippines)",
        "Law No. XX/YYYY (Indonesia/Vietnam)"
      ]
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🌍 MOYEN-ORIENT (Droit islamique + civil)
  // ═══════════════════════════════════════════════════════════════════════════
  const middleEast = [
    "saudi arabia", "arabie saoudite", "uae", "emirats", "émirats", "dubai",
    "qatar", "kuwait", "koweït", "bahrain", "bahreïn", "oman",
    "jordan", "jordanie", "lebanon", "liban", "iraq", "irak"
  ];

  if (middleEast.some(c => countryLower.includes(c))) {
    return {
      region: "middle_east",
      legalSystem: "islamic_law",
      keyOrganizations: ["GCC", "Arab League"],
      searchKeywords: [
        "kafala", "iqama", "residency permit", "sponsorship",
        "work visa", "قانون العمل", "إقامة", "تأشيرة",
        "labour law", "ministry of interior"
      ],
      citationFormats: [
        "Royal Decree No. M/XX (Saudi)",
        "Federal Law No. X of YYYY (UAE)",
        "قانون رقم X لسنة YYYY"
      ]
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🌍 AFRIQUE DU NORD (Droit civil + islamique)
  // ═══════════════════════════════════════════════════════════════════════════
  const northAfrica = [
    "morocco", "maroc", "algeria", "algérie", "tunisia", "tunisie",
    "egypt", "égypte", "libya", "libye"
  ];

  if (northAfrica.some(c => countryLower.includes(c))) {
    return {
      region: "north_africa",
      legalSystem: "mixed",
      keyOrganizations: ["Arab League", "African Union", "Union du Maghreb Arabe"],
      searchKeywords: [
        "séjour des étrangers", "carte de résidence", "visa de travail",
        "code de la nationalité", "dahir", "décret", "loi organique",
        "قانون الإقامة", "تصريح العمل"
      ],
      citationFormats: [
        "Dahir n° X-XX-XXX (Morocco)",
        "Loi n° XX-YYYY (Algeria/Tunisia)",
        "Décret présidentiel n° XX-XXX"
      ]
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🌍 AFRIQUE SUB-SAHARIENNE (Mix common law + civil law)
  // ═══════════════════════════════════════════════════════════════════════════
  const subSaharanAfrica = [
    "south africa", "afrique du sud", "nigeria", "nigéria", "kenya",
    "ghana", "ethiopia", "éthiopie", "tanzania", "tanzanie",
    "uganda", "ouganda", "senegal", "sénégal", "ivory coast", "côte d'ivoire",
    "cameroon", "cameroun", "rwanda", "congo", "mali", "niger"
  ];

  if (subSaharanAfrica.some(c => countryLower.includes(c))) {
    // Distinguer common law (anciennes colonies UK) vs civil law (anciennes colonies FR)
    const commonLawAfrica = ["south africa", "nigeria", "kenya", "ghana", "uganda", "tanzania", "rwanda"];
    const isCommonLaw = commonLawAfrica.some(c => countryLower.includes(c));

    return {
      region: "sub_saharan_africa",
      legalSystem: isCommonLaw ? "common_law" : "civil_law",
      keyOrganizations: ["African Union", "ECOWAS", "SADC", "COMESA", "EAC"],
      searchKeywords: isCommonLaw ? [
        "immigration act", "work permit", "residence permit",
        "foreign nationals", "visa requirements", "ministry of home affairs"
      ] : [
        "titre de séjour", "carte de résident", "permis de travail",
        "loi sur l'immigration", "code des étrangers", "visa long séjour"
      ],
      citationFormats: isCommonLaw ? [
        "Act No. XX of YYYY",
        "Immigration Act, Section XX",
        "Statutory Instrument No. XX"
      ] : [
        "Loi n° YYYY-XX",
        "Décret n° YYYY-XXXX",
        "Arrêté n° XXX"
      ]
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🌏 ASIE CENTRALE (Post-soviétique - droit civil)
  // ═══════════════════════════════════════════════════════════════════════════
  const centralAsia = [
    "kazakhstan", "uzbekistan", "ouzbékistan", "kyrgyzstan", "kirghizistan",
    "tajikistan", "tadjikistan", "turkmenistan", "turkménistan",
    "azerbaijan", "azerbaïdjan", "georgia", "géorgie", "armenia", "arménie",
    "mongolia", "mongolie"
  ];

  if (centralAsia.some(c => countryLower.includes(c))) {
    return {
      region: "central_asia",
      legalSystem: "civil_law",
      keyOrganizations: ["SCO", "CIS", "EAEU"],
      searchKeywords: [
        "migration law", "work permit", "residence registration",
        "foreign citizen", "visa regime", "закон о миграции",
        "разрешение на работу", "регистрация иностранцев"
      ],
      citationFormats: [
        "Law No. XXX-Z (Kazakhstan)",
        "Law of the Republic of X, Article XX",
        "Закон № XXX от DD.MM.YYYY"
      ]
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🌏 ASIE DU SUD (Mix common law + traditions locales)
  // ═══════════════════════════════════════════════════════════════════════════
  const southAsia = [
    "india", "inde", "pakistan", "bangladesh", "sri lanka",
    "nepal", "népal", "bhutan", "bhoutan", "maldives"
  ];

  if (southAsia.some(c => countryLower.includes(c))) {
    return {
      region: "south_asia",
      legalSystem: "common_law",
      keyOrganizations: ["SAARC", "BIMSTEC"],
      searchKeywords: [
        "foreigners act", "visa regulations", "work permit",
        "registration of foreigners", "FRRO", "employment visa",
        "overseas citizen", "residence permit"
      ],
      citationFormats: [
        "Foreigners Act, 1946 (India)",
        "Immigration Ordinance YYYY",
        "Section XX of Act YYYY"
      ]
    };
  }

  return null;
}

// =============================================================================
// 🆕 CALCUL DU SCORE DE CONFIANCE
// =============================================================================

function calculateConfidence(params: {
  searchPerformed: boolean;
  officialSourcesUsed: boolean;
  citationsCount: number;
  fallbackUsed: boolean;
  hasCountryContext: boolean;
  regionalContext?: RegionalContext | null;
}): ConfidenceInfo {
  let score = 50;  // Score de base
  const reasons: string[] = [];

  // +15 si recherche web effectuée
  if (params.searchPerformed) {
    score += 15;
    reasons.push("Recherche web effectuée");
  }

  // +25 si sources officielles utilisées
  if (params.officialSourcesUsed) {
    score += 25;
    reasons.push("Sources officielles utilisées");
  } else if (params.searchPerformed) {
    score -= 10;
    reasons.push("Sources non-officielles");
  }

  // +5 par citation (max +15)
  const citationBonus = Math.min(params.citationsCount * 5, 15);
  score += citationBonus;
  if (params.citationsCount > 0) {
    reasons.push(`${params.citationsCount} citation(s) fournie(s)`);
  }

  // -15 si fallback utilisé
  if (params.fallbackUsed) {
    score -= 15;
    reasons.push("LLM de secours utilisé");
  }

  // +10 si contexte pays précis
  if (params.hasCountryContext) {
    score += 10;
    reasons.push("Contexte pays précis");
  }

  // 🆕 +5 si contexte régional détecté (meilleure recherche)
  if (params.regionalContext) {
    score += 5;
    reasons.push(`Contexte régional: ${params.regionalContext.region}`);
  }

  // Normaliser entre 0 et 100
  score = Math.max(0, Math.min(100, score));

  // Déterminer le niveau
  let level: ConfidenceLevel;
  if (score >= 75) {
    level = "high";
  } else if (score >= 50) {
    level = "medium";
  } else {
    level = "low";
  }

  return {
    level,
    score,
    reasons,
    officialSourcesUsed: params.officialSourcesUsed,
    disclaimer: DISCLAIMERS[level] || undefined
  };
}

// =============================================================================
// INTERFACE DE CONFIGURATION
// =============================================================================

export interface HybridServiceConfig {
  openaiApiKey: string;
  claudeApiKey: string;
  perplexityApiKey: string;
  useClaudeForLawyers: boolean;
  usePerplexityForFactual: boolean;
}

// =============================================================================
// CIRCUIT BREAKER - Protection contre pannes LLM
// =============================================================================

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: CircuitState = "CLOSED";
  // AUDIT-FIX P1-d: Aligned threshold with retry.ts (was 5, retry.ts uses 3)
  private readonly failureThreshold = 3;
  private readonly resetTimeoutMs = 60000; // 1 minute

  constructor(private readonly name: string) {}

  isOpen(): boolean {
    if (this.state === "OPEN") {
      // Vérifier si on peut passer en HALF_OPEN
      if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
        this.state = "HALF_OPEN";
        logger.info(`[CircuitBreaker:${this.name}] State: HALF_OPEN (testing recovery)`);
        return false;
      }
      return true;
    }
    return false;
  }

  recordSuccess(): void {
    if (this.state === "HALF_OPEN") {
      logger.info(`[CircuitBreaker:${this.name}] State: CLOSED (recovered)`);
    }
    this.failures = 0;
    this.state = "CLOSED";
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = "OPEN";
      logger.error(`[CircuitBreaker:${this.name}] State: OPEN (${this.failures} failures)`);
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

// Circuit breakers globaux pour chaque provider
const circuitBreakers = {
  claude: new CircuitBreaker("claude"),
  openai: new CircuitBreaker("openai"),
  perplexity: new CircuitBreaker("perplexity"),
};

// =============================================================================
// SERVICE HYBRIDE
// =============================================================================

export class HybridAIService {
  private claude: ClaudeProvider;
  private openai: OpenAIProvider;
  private perplexity: PerplexityProvider;
  private config: HybridServiceConfig;

  constructor(config: HybridServiceConfig) {
    this.config = config;
    this.claude = new ClaudeProvider(config.claudeApiKey);
    this.openai = new OpenAIProvider(config.openaiApiKey);
    this.perplexity = new PerplexityProvider(config.perplexityApiKey);
  }

  /**
   * Point d'entrée principal - route vers le bon LLM selon le contexte
   * @param onThinking - Callback optionnel pour afficher les étapes en temps réel
   */
  async chat(
    messages: LLMMessage[],
    providerType: ProviderType,
    context?: AIRequestContext,
    onThinking?: ThinkingCallback
  ): Promise<HybridResponse> {
    const userMessage = this.getLastUserMessage(messages);
    // AUDIT-FIX P1: Use buildPromptForProvider when context is available
    // to inject booking context (client name, country, subject) into the system prompt
    const systemPrompt = context
      ? buildPromptForProvider(providerType, context)
      : getSystemPrompt(providerType);
    let stepOrder = 0;

    // Helper pour envoyer un log de réflexion
    const sendThinking = async (step: ThinkingLog["step"], message: string, details?: string) => {
      if (onThinking) {
        try {
          await onThinking({
            step,
            message,
            details,
            timestamp: new Date(),
            order: stepOrder++,
          });
        } catch (e) {
          logger.warn("[HybridAI] Erreur envoi thinking log", { error: e });
        }
      }
    };

    logger.info("[HybridAI] Requête entrante", {
      providerType,
      messageLength: userMessage.length,
      isFactual: isFactualQuestion(userMessage)
    });

    // 🆕 Étape 1: Analyse de la question
    await sendThinking("analyzing_question", "📋 Analyse de votre question...");

    // 🆕 Obtenir le contexte régional
    const regionalContext = getRegionalContext(context?.country);

    // Étape 2: Recherche web si question factuelle
    let searchContext = "";
    let citations: string[] | undefined;
    let searchPerformed = false;
    let officialSourcesUsed = false;

    if (this.config.usePerplexityForFactual && isFactualQuestion(userMessage)) {
      try {
        // 🆕 Log: Début de recherche
        await sendThinking("searching_web", "🔍 Recherche d'informations officielles...");

        const searchResult = await this.performWebSearch(userMessage, context, sendThinking);
        searchContext = searchResult.content;
        citations = searchResult.citations;
        searchPerformed = true;
        officialSourcesUsed = searchResult.officialSourcesUsed;

        // 🆕 Log: Résultats trouvés
        const sourcesCount = citations?.length || 0;
        await sendThinking(
          "search_results",
          `📄 ${sourcesCount} source${sourcesCount > 1 ? "s" : ""} ${officialSourcesUsed ? "officielle" : ""}${sourcesCount > 1 ? "s" : ""} trouvée${sourcesCount > 1 ? "s" : ""}`,
          citations?.slice(0, 3).join("\n")
        );

        logger.info("[HybridAI] Recherche web effectuée", {
          citationsCount: citations?.length,
          officialSourcesUsed
        });
      } catch (error) {
        logger.warn("[HybridAI] Recherche web échouée, continue sans", { error });
        await sendThinking("search_results", "⚠️ Recherche web indisponible, analyse directe...");
      }
    }

    // Étape 2: Choisir le LLM principal selon providerType
    const useClaude = providerType === "lawyer" && this.config.useClaudeForLawyers;

    // 🆕 Log: Analyse des sources (si recherche effectuée)
    if (searchPerformed) {
      await sendThinking("analyzing_sources", "📊 Analyse des informations collectées...");
    }

    // 🆕 Log: Génération de la réponse
    await sendThinking(
      "generating_response",
      providerType === "lawyer"
        ? "⚖️ Rédaction de l'analyse juridique..."
        : "✍️ Rédaction de la réponse personnalisée..."
    );

    // Étape 3: Appeler le LLM avec fallback
    try {
      const response = await this.callWithFallback(
        messages,
        systemPrompt,
        searchContext,
        citations,  // Passer les citations pour injection
        useClaude
      );

      // 🆕 Log: Finalisation
      await sendThinking("finalizing", "✅ Finalisation de la réponse...");

      // Déterminer le llmUsed basé sur le provider principal
      const mainProvider = response.provider as "claude" | "gpt";
      let llmUsed: "claude" | "gpt" | "claude+perplexity" | "gpt+perplexity";
      if (searchPerformed) {
        llmUsed = mainProvider === "claude" ? "claude+perplexity" : "gpt+perplexity";
      } else {
        llmUsed = mainProvider;
      }

      // 🆕 Calculer le score de confiance (avec contexte régional)
      const confidence = calculateConfidence({
        searchPerformed,
        officialSourcesUsed,
        citationsCount: citations?.length || 0,
        fallbackUsed: response.fallbackUsed || false,
        hasCountryContext: Boolean(context?.country),
        regionalContext  // 🆕 Ajout du contexte régional
      });

      logger.info("[HybridAI] Confiance calculée", {
        level: confidence.level,
        score: confidence.score,
        reasons: confidence.reasons
      });

      return {
        response: response.content,
        model: response.model,
        provider: response.provider,
        citations,
        searchPerformed,
        llmUsed,
        fallbackUsed: response.fallbackUsed || false,
        confidence,  // 🆕 Ajout du score de confiance
        usage: response.usage, // AUDIT-FIX P1: Propagate token usage for cost tracking
      };
    } catch (error) {
      logger.error("[HybridAI] Tous les LLMs ont échoué", { error });
      throw error;
    }
  }

  // ===========================================================================
  // MÉTHODES PRIVÉES
  // ===========================================================================

  private getLastUserMessage(messages: LLMMessage[]): string {
    const userMessages = messages.filter(m => m.role === "user");
    return userMessages[userMessages.length - 1]?.content || "";
  }

  /**
   * Construit une requête de recherche lisible pour l'affichage au prestataire
   * (sans les termes techniques ajoutés pour optimiser la recherche)
   */
  private buildDisplayQuery(query: string, context?: AIRequestContext): string {
    // Limiter la longueur de la question
    const shortQuery = query.length > 60 ? query.substring(0, 60) + "..." : query;

    // Ajouter le contexte pays si disponible
    if (context?.country) {
      return `${shortQuery} (${context.country})`;
    }

    return shortQuery;
  }

  private async performWebSearch(
    query: string,
    context?: AIRequestContext,
    sendThinking?: (step: ThinkingLog["step"], message: string, details?: string) => Promise<void>
  ): Promise<{ content: string; citations?: string[]; officialSourcesUsed: boolean }> {
    // 🆕 Obtenir le contexte régional pour améliorer la recherche
    const regionalContext = getRegionalContext(context?.country);

    // Construire une requête de recherche ciblée par pays (INTERNATIONAL)
    const searchParts: string[] = [];

    // 1. La question originale
    searchParts.push(query);

    // 2. Contexte pays OBLIGATOIRE et PRÉCIS
    if (context?.country) {
      searchParts.push(`in ${context.country}`);
      searchParts.push(`${context.country} official government laws regulations 2024 2025`);
    }

    // 3. Nationalité si différente du pays
    if (context?.nationality && context.nationality !== context.country) {
      searchParts.push(`${context.nationality} citizen nationals`);
    }

    // 4. Catégorie si disponible
    if (context?.category) {
      searchParts.push(context.category);
    }

    // 5. 🆕 Mots-clés régionaux spécifiques
    if (regionalContext) {
      // Ajouter 2-3 mots-clés régionaux pertinents
      const relevantKeywords = regionalContext.searchKeywords.slice(0, 3);
      searchParts.push(...relevantKeywords);

      // Ajouter les organisations régionales
      if (regionalContext.keyOrganizations.length > 0) {
        searchParts.push(regionalContext.keyOrganizations[0]);
      }
    }

    // 6. Contexte expatrié/voyageur (termes internationaux)
    searchParts.push("official government site requirements foreigners");

    const enrichedQuery = searchParts.join(" ");

    // 🆕 Log: Afficher la requête de recherche (version simplifiée pour le prestataire)
    const displayQuery = this.buildDisplayQuery(query, context);
    if (sendThinking) {
      await sendThinking("search_query", `🔎 « ${displayQuery} »`);
    }

    logger.info("[HybridAI] Recherche internationale", {
      country: context?.country || "non spécifié",
      nationality: context?.nationality || "non spécifiée",
      region: regionalContext?.region || "global",
      legalSystem: regionalContext?.legalSystem || "unknown"
    });

    // 🆕 Prompt de recherche enrichi avec contexte régional
    const regionalInstructions = regionalContext ? `

🌍 REGIONAL CONTEXT (${regionalContext.region.toUpperCase()}):
- Legal System: ${regionalContext.legalSystem}
- Key Organizations: ${regionalContext.keyOrganizations.join(", ")}
- Citation Formats to use: ${regionalContext.citationFormats.join(" | ")}
- Search in local terms: ${regionalContext.searchKeywords.slice(0, 5).join(", ")}` : "";

    // Prompt de recherche INTERNATIONAL pour Perplexity
    const searchSystemPrompt = `You are an expert researcher for international expatriates and travelers.

MISSION: Find PRECISE and CURRENT information for this context:
${context?.country ? `- TARGET COUNTRY: ${context.country} (MANDATORY - ALL information MUST be about THIS specific country)` : ""}
${context?.nationality ? `- CLIENT NATIONALITY: ${context.nationality}` : ""}
${context?.category ? `- DOMAIN: ${context.category}` : ""}
${regionalInstructions}

🔴 PRIORITY SOURCES (MANDATORY):
- Official government websites of the target country (.gov, .gouv, .gob, .go, .govt, etc.)
- Official immigration and visa portals
- Embassy and consulate websites
- Regional organization websites (${regionalContext?.keyOrganizations.join(", ") || "relevant regional bodies"})
- International organizations (UN, ILO, WHO, IOM, etc.) when relevant
- ⚠️ AVOID: blogs, forums, non-official commercial sites

CRITICAL RULES:
1. ONLY provide information from OFFICIAL SOURCES of ${context?.country || "the target country"}
2. CITE local laws with numbers and dates using the country's format
3. ALWAYS include the official source URL
4. Provide CURRENT fees and timelines (2024-2025)
5. If info comes from non-official source, MARK IT with ⚠️
6. NEVER give generic information that doesn't apply to the specific country
7. Consider bilateral agreements between ${context?.nationality || "client's country"} and ${context?.country || "target country"}
8. Search in BOTH English AND local language for better results`;

    const result = await withExponentialBackoff(
      () => this.perplexity.search({
        messages: [{ role: "user", content: enrichedQuery }],
        systemPrompt: searchSystemPrompt,
        returnCitations: true
        // PAS de domainFilter fixe - Perplexity cherche librement dans tous les pays
      }),
      { logContext: `[Perplexity Search] ${context?.country || "global"}` }
    );

    // 🆕 Vérifier si les citations incluent des sources officielles (INTERNATIONAL)
    const officialSourcesUsed = result.citations?.some(url => isOfficialSource(url)) ?? false;

    // Compter les sources officielles vs non-officielles
    const officialCount = result.citations?.filter(url => isOfficialSource(url)).length || 0;
    const totalCount = result.citations?.length || 0;

    logger.info("[HybridAI] Recherche internationale terminée", {
      country: context?.country,
      citationsCount: totalCount,
      officialSourcesCount: officialCount,
      officialSourcesUsed
    });

    return {
      content: result.content,
      citations: result.citations,
      officialSourcesUsed
    };
  }

  private async callWithFallback(
    messages: LLMMessage[],
    systemPrompt: string,
    searchContext: string,
    citations: string[] | undefined,
    preferClaude: boolean
  ): Promise<{ content: string; model: string; provider: "claude" | "gpt"; fallbackUsed: boolean; usage?: { inputTokens: number; outputTokens: number } }> {
    // Injecter le contexte de recherche comme message user (pas dans le system prompt)
    // pour éviter de gonfler le prompt système à chaque requête
    const messagesWithSearch = [...messages];
    if (searchContext) {
      let searchMessage = `[Contexte recherche web — utilise ces informations pour ta réponse]\n${searchContext}`;

      if (citations && citations.length > 0) {
        searchMessage += `\n\nSources:\n`;
        citations.forEach((citation, i) => {
          searchMessage += `[${i + 1}] ${citation}\n`;
        });
        searchMessage += `Cite les numéros [1], [2], etc. quand pertinent.`;
      }

      // Insérer le contexte juste avant le dernier message user
      const lastUserIdx = messagesWithSearch.length - 1;
      messagesWithSearch.splice(lastUserIdx, 0, {
        role: "system" as const,
        content: searchMessage,
      });
    }

    // Ordre de priorité selon le type de provider avec CIRCUIT BREAKER
    const primaryProviderName = preferClaude ? "claude" : "openai";
    const fallbackProviderName = preferClaude ? "openai" : "claude";
    const primaryProvider = preferClaude ? this.claude : this.openai;
    const fallbackProvider = preferClaude ? this.openai : this.claude;
    const primaryCircuit = circuitBreakers[primaryProviderName];
    const fallbackCircuit = circuitBreakers[fallbackProviderName];

    // ==========================================================
    // CIRCUIT BREAKER: Essayer le provider principal
    // ==========================================================
    const PROVIDER_TIMEOUT_MS = 45_000; // 45s max per provider call (includes retries)

    if (primaryProvider.isAvailable() && !primaryCircuit.isOpen()) {
      try {
        logger.info(`[HybridAI] Tentative avec ${primaryProvider.name} (circuit: ${primaryCircuit.getState()})`);
        const result = await Promise.race([
          withExponentialBackoff(
            () => primaryProvider.chat({
              messages: messagesWithSearch,
              systemPrompt,
            }),
            { logContext: `[${primaryProvider.name}] Primary` }
          ),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`${primaryProvider.name} timeout after ${PROVIDER_TIMEOUT_MS}ms`)), PROVIDER_TIMEOUT_MS)
          ),
        ]);
        // SUCCÈS: Fermer le circuit
        primaryCircuit.recordSuccess();
        return {
          content: result.content,
          model: result.model,
          provider: result.provider as "claude" | "gpt",
          fallbackUsed: false,
          usage: result.usage, // AUDIT-FIX P1: Propagate token usage for cost tracking
        };
      } catch (error) {
        // ÉCHEC: Enregistrer dans le circuit breaker
        primaryCircuit.recordFailure();
        logger.warn(`[HybridAI] ${primaryProvider.name} échoué (circuit: ${primaryCircuit.getState()}), fallback`, { error });
      }
    } else if (primaryCircuit.isOpen()) {
      logger.warn(`[HybridAI] ${primaryProvider.name} circuit OPEN, skip vers fallback`);
    }

    // ==========================================================
    // CIRCUIT BREAKER: Fallback sur l'autre provider
    // ==========================================================
    if (fallbackProvider.isAvailable() && !fallbackCircuit.isOpen()) {
      try {
        logger.info(`[HybridAI] Fallback vers ${fallbackProvider.name} (circuit: ${fallbackCircuit.getState()})`);
        const result = await Promise.race([
          withExponentialBackoff(
            () => fallbackProvider.chat({
              messages: messagesWithSearch,
              systemPrompt,
            }),
            { logContext: `[${fallbackProvider.name}] Fallback` }
          ),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`${fallbackProvider.name} timeout after ${PROVIDER_TIMEOUT_MS}ms`)), PROVIDER_TIMEOUT_MS)
          ),
        ]);
        // SUCCÈS: Fermer le circuit
        fallbackCircuit.recordSuccess();
        return {
          content: result.content,
          model: result.model,
          provider: result.provider as "claude" | "gpt",
          fallbackUsed: true,
          usage: result.usage, // AUDIT-FIX P1: Propagate token usage for cost tracking
        };
      } catch (error) {
        // ÉCHEC: Enregistrer dans le circuit breaker
        fallbackCircuit.recordFailure();
        logger.error(`[HybridAI] ${fallbackProvider.name} échoué aussi (circuit: ${fallbackCircuit.getState()})`, { error });
        throw error;
      }
    } else if (fallbackCircuit.isOpen()) {
      logger.error(`[HybridAI] ${fallbackProvider.name} circuit OPEN, aucun LLM disponible`);
    }

    // ==========================================================
    // DERNIER RECOURS: Réponse pré-enregistrée
    // ==========================================================
    logger.error("[HybridAI] Tous les circuits sont ouverts, réponse de secours");
    return {
      content: "Je suis temporairement indisponible en raison d'une maintenance. Veuillez réessayer dans quelques minutes. Si le problème persiste, contactez le support.",
      model: "fallback",
      provider: "gpt",
      fallbackUsed: true
    };
  }

  /**
   * Expose l'état des circuits pour monitoring
   */
  getCircuitStates(): Record<string, CircuitState> {
    return {
      claude: circuitBreakers.claude.getState(),
      openai: circuitBreakers.openai.getState(),
      perplexity: circuitBreakers.perplexity.getState(),
    };
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createHybridService(config: HybridServiceConfig): HybridAIService {
  return new HybridAIService(config);
}
