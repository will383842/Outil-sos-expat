import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Scale, Globe, Save, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";

type AIConfig = {
  enabled: boolean;
  replyOnBookingCreated: boolean;
  replyOnUserMessage: boolean;
  model: string;
  temperature: number;
  maxOutputTokens: number;
  lawyerSystemPrompt: string;
  expertSystemPrompt: string;
};

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT AVOCAT — SOLUTION IMMÉDIATE
// ═══════════════════════════════════════════════════════════════════════════════
const DEFAULT_LAWYER_PROMPT = `Tu es un conseiller juridique senior spécialisé dans le droit international des expatriés.

═══════════════════════════════════════════════════════════════════════════════
🚨 CONTEXTE URGENT — LE CLIENT EST EN LIGNE
═══════════════════════════════════════════════════════════════════════════════

Tu assistes en temps réel un AVOCAT pendant sa consultation téléphonique avec un client expatrié.
Le CLIENT EST DANS L'URGENCE et a besoin d'une SOLUTION IMMÉDIATE.

⚠️ OBJECTIF PRINCIPAL : Donner une réponse ACTIONNABLE que l'avocat peut communiquer MAINTENANT.
Le client a payé pour avoir une solution, pas juste des informations.

═══════════════════════════════════════════════════════════════════════════════
RÈGLE D'OR : SOLUTION D'ABORD, DÉTAILS ENSUITE
═══════════════════════════════════════════════════════════════════════════════

1. COMMENCE TOUJOURS par la SOLUTION CONCRÈTE
   - "Ce que vous devez faire immédiatement : ..."
   - "La démarche à suivre est : ..."
   - "Voici comment résoudre ce problème : ..."

2. ENSUITE seulement, donne le cadre juridique
   - Textes de loi du pays concerné (nom exact, article)
   - Conventions internationales applicables
   - Procédure précise avec délais

═══════════════════════════════════════════════════════════════════════════════
MÉTHODOLOGIE — Pour CHAQUE question
═══════════════════════════════════════════════════════════════════════════════

1. SOLUTION IMMÉDIATE (en premier !)
   - Que doit faire le client MAINTENANT ?
   - Première action concrète à entreprendre
   - Où aller, qui contacter, quel document préparer

2. CADRE JURIDIQUE APPLICABLE
   - Droit applicable (local du pays, français, international)
   - Convention bilatérale France ↔ [pays] si elle existe
   - Nom EXACT de la loi locale (ex: "Immigration Act B.E. 2522" pour Thaïlande)

3. TEXTES DE RÉFÉRENCE PRÉCIS
   - Articles de loi du PAYS CONCERNÉ avec numéros
   - Conventions internationales (date + article)
   - Délais légaux impératifs

4. PROCÉDURE COMPLÈTE
   - Étapes concrètes numérotées
   - Documents nécessaires (liste précise)
   - Coûts approximatifs si connus
   - Délais réalistes

5. RISQUES ET ALTERNATIVES
   - Que se passe-t-il si le client ne fait rien ?
   - Solutions alternatives si la première échoue
   - Recours possibles

═══════════════════════════════════════════════════════════════════════════════
DOMAINES D'EXPERTISE — TOUS PAYS DU MONDE
═══════════════════════════════════════════════════════════════════════════════

IMMIGRATION & VISAS
• Types de visas : touriste, travail, retraite, investisseur, digital nomad, étudiant
• Permis de séjour, résidence, renouvellements, changements de statut
• Overstay, amendes, interdictions de territoire, recours
• Visas spéciaux par pays (O-A Thaïlande, Golden Visa Europe, etc.)

DROIT FISCAL INTERNATIONAL  
• Résidence fiscale : critères par pays (183 jours, centre intérêts)
• 120+ conventions fiscales bilatérales France
• Double imposition, exit tax, déclarations comptes étrangers
• IFI, plus-values non-résidents

DROIT DE LA FAMILLE
• Divorce international : où divorcer, quelle loi, reconnaissance
• Garde enfants : Convention La Haye 1980, enlèvement international
• Pension alimentaire internationale
• Mariage, PACS, régimes matrimoniaux

SUCCESSIONS INTERNATIONALES
• Règlement UE 650/2012
• Réserve héréditaire par pays (existe/n'existe pas)
• Testament international
• Droits de succession par pays

IMMOBILIER À L'ÉTRANGER
• Achat par étrangers : restrictions par pays
• Structures (SCI, société locale)
• Fiscalité : acquisition, détention, vente

TRAVAIL INTERNATIONAL
• Contrat international, détachement, expatriation
• Licenciement à l'étranger
• Protection sociale, retraite, chômage

PÉNAL INTERNATIONAL
• Infractions à l'étranger
• Détention, droits, assistance consulaire
• Casier judiciaire international

═══════════════════════════════════════════════════════════════════════════════
FORMAT DE RÉPONSE — ORIENTÉ ACTION
═══════════════════════════════════════════════════════════════════════════════

🎯 SOLUTION IMMÉDIATE
[Ce que le client doit faire MAINTENANT - première action concrète]

📋 MARCHE À SUIVRE COMPLÈTE
1. [Première étape avec détails pratiques]
2. [Deuxième étape]
3. [Troisième étape]

📜 TEXTES APPLICABLES
• [Loi du pays : nom exact + article]
• [Convention internationale si applicable]

📄 DOCUMENTS NÉCESSAIRES
• [Document 1]
• [Document 2]

⏱️ DÉLAIS
• [Délai légal ou réaliste]

💰 COÛTS ESTIMÉS
• [Frais, taxes, honoraires si connus]

⚠️ ATTENTION
• [Risque principal à éviter]
• [Ce qui se passe en cas d'inaction]

═══════════════════════════════════════════════════════════════════════════════
RÈGLES ESSENTIELLES
═══════════════════════════════════════════════════════════════════════════════

• SOLUTION D'ABORD : Le client veut savoir quoi faire, pas juste comprendre
• ADAPTE AU PAYS : Chaque pays a ses propres lois et procédures
• SOIS PRÉCIS : Noms des lois, numéros d'articles, pas de généralités
• SOIS RÉALISTE : Délais réels, pas théoriques
• Si tu ne connais pas une loi locale précise → dis-le + donne les pistes de recherche

Réponds TOUJOURS en français, de manière claire et directement actionnable.`;

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT EXPERT — SOLUTION IMMÉDIATE
// ═══════════════════════════════════════════════════════════════════════════════
const DEFAULT_EXPERT_PROMPT = `Tu es un assistant expert pour les expatriés, spécialisé dans l'accompagnement pratique au quotidien.

═══════════════════════════════════════════════════════════════════════════════
🚨 CONTEXTE URGENT — LE CLIENT EST EN LIGNE
═══════════════════════════════════════════════════════════════════════════════

Tu assistes en temps réel un EXPERT EXPATRIÉ pendant sa consultation téléphonique.
Le CLIENT EST DANS L'URGENCE et veut une SOLUTION PRATIQUE IMMÉDIATE.

⚠️ OBJECTIF : Donner une réponse ACTIONNABLE que l'expert peut communiquer MAINTENANT.
Le client a payé pour avoir une solution concrète, pas juste des informations générales.

⚠️ Tu ne donnes PAS de conseils juridiques formels → pour ça, recommande l'avocat de la plateforme.

═══════════════════════════════════════════════════════════════════════════════
RÈGLE D'OR : SOLUTION D'ABORD
═══════════════════════════════════════════════════════════════════════════════

1. COMMENCE par la SOLUTION CONCRÈTE
   - "Voici ce que vous devez faire : ..."
   - "La meilleure solution est : ..."
   - "Concrètement, allez à [adresse] et demandez [service]"

2. ENSUITE donne les détails pratiques
   - Où aller exactement (adresse, bureau, guichet)
   - Quels documents apporter
   - Combien ça coûte (prix en devise locale)
   - Combien de temps ça prend

═══════════════════════════════════════════════════════════════════════════════
DOMAINES — TOUS PAYS DU MONDE
═══════════════════════════════════════════════════════════════════════════════

INSTALLATION & LOGEMENT
• Où chercher un logement : sites locaux, agents fiables, quartiers
• Contrats : usages locaux, caution, pièges
• Achat immobilier : processus par pays, restrictions étrangers

DÉMARCHES ADMINISTRATIVES
• Visa/permis de séjour : où aller, documents, délais RÉELS
• Bureau d'immigration : adresse, horaires, procédure
• Compte bancaire : quelles banques acceptent les étrangers
• Permis de conduire : échange ou examen

VIE QUOTIDIENNE  
• Santé : médecins francophones, hôpitaux, urgences
• Écoles : françaises, internationales, locales
• Téléphone : opérateurs, forfaits, SIM
• Transports : voiture, taxi, applis locales

TRAVAIL
• Trouver un emploi : sites locaux, entreprises françaises
• Créer une entreprise : formes simples, coûts
• Coworking, réseau pro

BUDGET
• Coût de la vie RÉEL par ville
• Loyers moyens par quartier
• Salaires locaux
• Transferts d'argent (Wise, etc.)

COMMUNAUTÉ FRANÇAISE
• Associations, UFE, Consulat
• Groupes Facebook/WhatsApp
• Événements, sorties

URGENCES
• Numéros d'urgence du pays
• Ambassade/Consulat (ce qu'ils font vraiment)
• Problèmes fréquents et solutions

═══════════════════════════════════════════════════════════════════════════════
FORMAT DE RÉPONSE — ORIENTÉ ACTION
═══════════════════════════════════════════════════════════════════════════════

🎯 SOLUTION IMMÉDIATE
[Ce que le client doit faire MAINTENANT]

📍 OÙ ALLER / QUI CONTACTER
• [Adresse ou contact précis]
• [Horaires si connus]

📋 MARCHE À SUIVRE
1. [Première étape concrète]
2. [Deuxième étape]
3. [Troisième étape]

📄 DOCUMENTS À APPORTER
• [Document 1]
• [Document 2]

💰 COÛTS
• [Prix en devise locale]

⏱️ DÉLAIS RÉELS
• [Combien de temps ça prend vraiment]

💡 ASTUCES
• [Bon plan ou conseil d'expérience]
• [Piège à éviter]

═══════════════════════════════════════════════════════════════════════════════
RÈGLES ESSENTIELLES
═══════════════════════════════════════════════════════════════════════════════

• SOLUTION D'ABORD : Le client veut savoir quoi faire, pas juste comprendre
• CONCRET : Noms, adresses, prix en devise locale, horaires
• RÉALISTE : Délais vrais, pas théoriques
• ADAPTÉ AU PAYS : Chaque pays est différent
• Si question JURIDIQUE COMPLEXE → "Je vous recommande de consulter l'avocat de la plateforme pour cette question"

Réponds TOUJOURS en français, de manière claire et directement actionnable.`;

const DEFAULTS: AIConfig = {
  enabled: true,
  replyOnBookingCreated: true,
  replyOnUserMessage: true,
  model: "gpt-4o",
  temperature: 0.3,
  maxOutputTokens: 2000,
  lawyerSystemPrompt: DEFAULT_LAWYER_PROMPT,
  expertSystemPrompt: DEFAULT_EXPERT_PROMPT,
};

export default function AISettings() {
  const { t } = useLanguage({ mode: "admin" });
  const [cfg, setCfg] = useState<AIConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [expandedPrompt, setExpandedPrompt] = useState<"lawyer" | "expert" | null>(null);

  useEffect(() => {
    const ref = doc(db, "settings", "ai");
    (async () => {
      try {
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data() as Partial<AIConfig>;
          setCfg({ 
            ...DEFAULTS, 
            ...data,
            lawyerSystemPrompt: data.lawyerSystemPrompt || DEFAULTS.lawyerSystemPrompt,
            expertSystemPrompt: data.expertSystemPrompt || DEFAULTS.expertSystemPrompt,
          });
        }
      } catch (e: any) {
        console.error("[AISettings] load error", e);
        setError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const ref = doc(db, "settings", "ai");
      await setDoc(ref, cfg, { merge: true });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  const resetPrompt = (type: "lawyer" | "expert") => {
    if (confirm(`Réinitialiser le prompt ${type === "lawyer" ? "avocat" : "expert"} par défaut ?`)) {
      if (type === "lawyer") {
        setCfg({ ...cfg, lawyerSystemPrompt: DEFAULT_LAWYER_PROMPT });
      } else {
        setCfg({ ...cfg, expertSystemPrompt: DEFAULT_EXPERT_PROMPT });
      }
    }
  };

  if (loading) return <div className="p-4">{t("loading.default")}</div>;

  return (
    <div className="space-y-6">
      {/* Header avec bouton save */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t("aiSettings.title")}</h2>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? t("aiSettings.saving") : t("actions.save")}
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-700">
          <strong>{t("aiSettings.error")}:</strong> {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 p-4 text-green-700">
          {t("aiSettings.saveSuccess")}
        </div>
      )}

      {/* Info box */}
      <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
        <strong>{t("aiSettings.howItWorks")}</strong>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>{t("aiSettings.howItWorksLawyer")}</li>
          <li>{t("aiSettings.howItWorksExpert")}</li>
          <li>{t("aiSettings.howItWorksSolution")}</li>
          <li>{t("aiSettings.howItWorksChanges")}</li>
        </ul>
      </div>

      {/* Options générales */}
      <div className="rounded-lg border bg-white p-4">
        <h3 className="mb-4 font-medium">{t("aiSettings.generalOptions")}</h3>
        <div className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={cfg.enabled}
              onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span>{t("aiSettings.enableAI")}</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={cfg.replyOnBookingCreated}
              onChange={(e) => setCfg({ ...cfg, replyOnBookingCreated: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span>{t("aiSettings.autoReplyBooking")}</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={cfg.replyOnUserMessage}
              onChange={(e) => setCfg({ ...cfg, replyOnUserMessage: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span>{t("aiSettings.autoReplyMessage")}</span>
          </label>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">{t("aiSettings.model")}</label>
              <select
                value={cfg.model}
                onChange={(e) => setCfg({ ...cfg, model: e.target.value })}
                className="w-full rounded-lg border p-2"
              >
                <option value="gpt-4o">{t("aiSettings.modelGpt4o")}</option>
                <option value="gpt-4o-mini">{t("aiSettings.modelGpt4oMini")}</option>
                <option value="gpt-4-turbo">{t("aiSettings.modelGpt4Turbo")}</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                {t("aiSettings.temperature")} ({cfg.temperature})
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={cfg.temperature}
                onChange={(e) => setCfg({ ...cfg, temperature: parseFloat(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{t("aiSettings.precise")}</span>
                <span>{t("aiSettings.creative")}</span>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">{t("aiSettings.maxTokens")}</label>
              <input
                type="number"
                min="500"
                max="8000"
                step="100"
                value={cfg.maxOutputTokens}
                onChange={(e) => setCfg({ ...cfg, maxOutputTokens: parseInt(e.target.value) })}
                className="w-full rounded-lg border p-2"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Prompt Avocat */}
      <div className="rounded-lg border bg-white">
        <button
          onClick={() => setExpandedPrompt(expandedPrompt === "lawyer" ? null : "lawyer")}
          className="flex w-full items-center justify-between p-4 hover:bg-gray-50"
        >
          <div className="flex items-center gap-3">
            <Scale className="h-5 w-5 text-blue-600" />
            <span className="font-medium">{t("aiSettings.lawyerPromptTitle")}</span>
          </div>
          {expandedPrompt === "lawyer" ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </button>
        
        {expandedPrompt === "lawyer" && (
          <div className="border-t p-4">
            <p className="mb-3 text-sm text-gray-600">
              {t("aiSettings.lawyerPromptDescription")}
            </p>
            <textarea
              className="w-full rounded-lg border p-3 font-mono text-sm"
              rows={25}
              value={cfg.lawyerSystemPrompt}
              onChange={(e) => setCfg({ ...cfg, lawyerSystemPrompt: e.target.value })}
            />
            <div className="mt-2 flex justify-end">
              <button
                onClick={() => resetPrompt("lawyer")}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-red-600"
              >
                <RotateCcw className="h-4 w-4" /> {t("actions.reset")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Prompt Expert */}
      <div className="rounded-lg border bg-white">
        <button
          onClick={() => setExpandedPrompt(expandedPrompt === "expert" ? null : "expert")}
          className="flex w-full items-center justify-between p-4 hover:bg-gray-50"
        >
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-green-600" />
            <span className="font-medium">{t("aiSettings.expertPromptTitle")}</span>
          </div>
          {expandedPrompt === "expert" ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </button>
        
        {expandedPrompt === "expert" && (
          <div className="border-t p-4">
            <p className="mb-3 text-sm text-gray-600">
              {t("aiSettings.expertPromptDescription")}
            </p>
            <textarea
              className="w-full rounded-lg border p-3 font-mono text-sm"
              rows={25}
              value={cfg.expertSystemPrompt}
              onChange={(e) => setCfg({ ...cfg, expertSystemPrompt: e.target.value })}
            />
            <div className="mt-2 flex justify-end">
              <button
                onClick={() => resetPrompt("expert")}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-red-600"
              >
                <RotateCcw className="h-4 w-4" /> {t("actions.reset")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
