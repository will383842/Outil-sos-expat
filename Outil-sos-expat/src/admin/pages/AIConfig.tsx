/**
 * =============================================================================
 * AI CONFIG - Configuration de l'assistant IA
 * =============================================================================
 *
 * Interface simplifiée pour les administrateurs :
 * - 3 toggles : IA activée, auto-réponse booking, auto-réponse messages
 * - 2 prompts : système avocat et système expert
 *
 * Tout le reste (modèles, températures, Perplexity, etc.) est géré en dur
 * dans le code backend pour éviter les erreurs de configuration.
 *
 * =============================================================================
 */

import { useEffect, useState, useCallback, memo } from "react";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { logAuditEntry } from "../../lib/auditLog";
import { useAuth } from "../../contexts/UnifiedUserContext";

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Switch } from "../../components/ui/switch";
import { Skeleton } from "../../components/ui/skeleton";

// Icons
import {
  Sparkles,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Scale,
  Globe,
  MessageSquare,
  MessageCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Search,
  Brain,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface AISettings {
  enabled: boolean;
  autoReplyOnBooking: boolean;
  autoReplyOnMessage: boolean;
  lawyerSystemPrompt: string;
  expertSystemPrompt: string;
}

// =============================================================================
// PROMPTS PAR DÉFAUT (identiques à ceux du backend)
// =============================================================================

const DEFAULT_LAWYER_PROMPT = `Tu es un conseiller juridique senior expert en droit international, spécialisé dans l'assistance aux expatriés, voyageurs et vacanciers de TOUTES nationalités.

MISSION
Assister un avocat EN TEMPS RÉEL pendant sa consultation avec un client international.
L'avocat consulte depuis son interface pendant qu'il échange avec son client.
Tu dois fournir des informations précises, structurées et immédiatement exploitables.

RÈGLES ABSOLUES

1. PRÉCISION PAYS (CRITIQUE):
Ne JAMAIS donner d'info du mauvais pays. Vérifie que CHAQUE information concerne le PAYS EXACT du client. Cite TOUJOURS le pays source.

2. APPROCHE INTERNATIONALE:
Considère les spécificités de la nationalité du client. Mentionne les conventions bilatérales applicables.

3. PRÉCISION JURIDIQUE:
Utilise des chiffres, dates et références PRÉCIS. Cite tes sources. Donne des fourchettes si incertain.

4. TOUJOURS PROPOSER DES SOLUTIONS:
Si tu n'as pas l'info exacte, propose des PISTES : où chercher, qui contacter.

5. LANGUE:
Réponds dans la langue de la question. Par défaut, français.

DOMAINES D'EXPERTISE
• Droit de l'immigration et visas
• Droit du travail international
• Droit de la famille international
• Droit fiscal des non-résidents
• Droit des successions international
• Protection consulaire
• Droit pénal international`;

const DEFAULT_EXPERT_PROMPT = `Tu es un expert senior en accompagnement international avec 15+ ans d'expérience terrain dans plus de 50 pays.

MISSION
Assister un expert expatriation EN TEMPS RÉEL avec un client qui a besoin d'aide IMMÉDIATE.
Tu dois fournir des solutions pratiques, actionnables et adaptées à la situation spécifique.

PUBLIC CIBLE
• Expatriés long terme
• Voyageurs d'affaires
• Vacanciers
• Digital nomads
• Étudiants internationaux
• Retraités à l'étranger

RÈGLES ABSOLUES

1. PRÉCISION PAYS (CRITIQUE):
Ne JAMAIS donner d'info du mauvais pays. Les prix, délais et procédures VARIENT énormément entre pays.

2. SOLUTIONS ACTIONNABLES:
Donne des actions CONCRÈTES que le client peut faire MAINTENANT. Fournis adresses, numéros, liens.

3. PRÉCISION PRATIQUE:
Utilise des chiffres PRÉCIS. Indique "environ" si estimation. Donne les prix en devise locale + EUR.

4. TOUJOURS PROPOSER DES SOLUTIONS:
Ne reste JAMAIS sans proposition d'action concrète.

5. SENSIBILITÉ CULTURELLE:
Respecte les différences culturelles. Adapte les conseils au pays d'origine du client.

DOMAINES D'EXPERTISE
• Installation et logement
• Démarches administratives
• Santé et assurances
• Scolarité et éducation
• Vie quotidienne
• Finances internationales
• Urgences et sécurité
• Culture et intégration`;

const DEFAULT_SETTINGS: AISettings = {
  enabled: true,
  autoReplyOnBooking: true,
  autoReplyOnMessage: true,
  lawyerSystemPrompt: DEFAULT_LAWYER_PROMPT,
  expertSystemPrompt: DEFAULT_EXPERT_PROMPT,
};

// =============================================================================
// COMPOSANTS
// =============================================================================

const ToggleRow = memo(function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
  icon: Icon,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
      <div className="flex items-center gap-3">
        {Icon && <Icon className="w-5 h-5 text-gray-500" />}
        <div>
          <p className="font-medium text-gray-900">{label}</p>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
});

const PromptEditor = memo(function PromptEditor({
  label,
  description,
  icon: Icon,
  iconColor,
  value,
  onChange,
  defaultValue,
  onReset,
}: {
  label: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  value: string;
  onChange: (value: string) => void;
  defaultValue: string;
  onReset: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isModified = value !== defaultValue;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${iconColor}`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">{label}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          {isModified && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="text-gray-500"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Réinitialiser
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={expanded ? 25 : 10}
            className="w-full p-4 border border-gray-200 rounded-xl text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Entrez le prompt système..."
          />
          <button
            onClick={() => setExpanded(!expanded)}
            className="absolute bottom-3 right-3 p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            title={expanded ? "Réduire" : "Agrandir"}
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-600" />
            )}
          </button>
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-gray-500">
            {value.length} caractères
          </p>
          {isModified && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Modifié
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

// =============================================================================
// PAGE PRINCIPALE
// =============================================================================

export default function AIConfig() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [settings, setSettings] = useState<AISettings>(DEFAULT_SETTINGS);

  // Charger les paramètres
  const loadSettings = useCallback(async () => {
    try {
      const settingsDoc = await getDoc(doc(db, "settings", "ai"));
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        setSettings({
          enabled: data.enabled ?? DEFAULT_SETTINGS.enabled,
          autoReplyOnBooking: data.autoReplyOnBooking ?? DEFAULT_SETTINGS.autoReplyOnBooking,
          autoReplyOnMessage: data.autoReplyOnMessage ?? DEFAULT_SETTINGS.autoReplyOnMessage,
          lawyerSystemPrompt: data.lawyerSystemPrompt || DEFAULT_LAWYER_PROMPT,
          expertSystemPrompt: data.expertSystemPrompt || DEFAULT_EXPERT_PROMPT,
        });
      }
    } catch (error) {
      console.error("[AIConfig] Erreur chargement:", error);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadSettings();
      setLoading(false);
    };
    init();
  }, [loadSettings]);

  // Mettre à jour un paramètre
  const updateSetting = useCallback(<K extends keyof AISettings>(key: K, value: AISettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }, []);

  // Sauvegarder
  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "ai"), {
        ...settings,
        updatedAt: Timestamp.now(),
        updatedBy: user?.email || "admin",
      });

      await logAuditEntry({
        action: "ai.settings_change",
        targetType: "ai_settings",
        targetId: "ai",
        details: {
          enabled: settings.enabled,
          autoReplyOnBooking: settings.autoReplyOnBooking,
          autoReplyOnMessage: settings.autoReplyOnMessage,
        },
        severity: "warning",
      });

      setHasChanges(false);
    } catch (error) {
      console.error("[AIConfig] Erreur sauvegarde:", error);
    } finally {
      setSaving(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-purple-600" />
            Configuration IA
          </h1>
          <p className="text-gray-500 mt-1">
            Paramètres de l'assistant IA pour les prestataires
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="text-sm text-amber-600 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              Non sauvegardé
            </span>
          )}
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Enregistrer
          </Button>
        </div>
      </div>

      {/* Architecture info */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Brain className="w-5 h-5 text-purple-600 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-900 mb-2">Architecture Multi-LLM</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="flex items-center gap-2 p-2 bg-white rounded-lg">
                  <Scale className="w-4 h-4 text-blue-600" />
                  <span><strong>Avocats:</strong> Claude 3.5 Sonnet</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-white rounded-lg">
                  <Globe className="w-4 h-4 text-green-600" />
                  <span><strong>Experts:</strong> GPT-4o</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-white rounded-lg">
                  <Search className="w-4 h-4 text-orange-600" />
                  <span><strong>Recherche:</strong> Perplexity</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Perplexity enrichit automatiquement les réponses avec des données web actualisées.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warning if disabled */}
      {!settings.enabled && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">IA désactivée</p>
              <p className="text-sm text-amber-700 mt-1">
                Les réponses automatiques sont suspendues pour tous les prestataires.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success indicator when enabled */}
      {settings.enabled && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium text-green-800">IA active</p>
              <p className="text-sm text-green-700 mt-1">
                L'assistant IA répond aux prestataires selon la configuration ci-dessous.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comportement</CardTitle>
          <CardDescription>Activation et réponses automatiques</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* IA Enabled */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${settings.enabled ? "bg-green-500 animate-pulse" : "bg-gray-300"}`} />
              <div>
                <p className="font-medium text-gray-900">IA activée</p>
                <p className="text-sm text-gray-500">Active l'assistant IA globalement</p>
              </div>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) => updateSetting("enabled", checked)}
            />
          </div>

          <ToggleRow
            label="Auto-réponse aux nouveaux dossiers"
            description="L'IA répond automatiquement quand un client crée un dossier"
            checked={settings.autoReplyOnBooking}
            onCheckedChange={(checked) => updateSetting("autoReplyOnBooking", checked)}
            disabled={!settings.enabled}
            icon={MessageSquare}
          />

          <ToggleRow
            label="Auto-réponse aux messages"
            description="L'IA répond automatiquement aux messages des clients"
            checked={settings.autoReplyOnMessage}
            onCheckedChange={(checked) => updateSetting("autoReplyOnMessage", checked)}
            disabled={!settings.enabled}
            icon={MessageCircle}
          />
        </CardContent>
      </Card>

      {/* Info box */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="font-medium text-blue-800">À propos des prompts</p>
            <p className="text-sm text-blue-700 mt-1">
              Les prompts ci-dessous définissent le comportement et le ton de l'IA.
              Modifiez-les pour ajuster les réponses aux besoins de vos prestataires.
              En cas de doute, utilisez le bouton "Réinitialiser" pour revenir aux valeurs par défaut.
            </p>
          </div>
        </div>
      </div>

      {/* Prompt Avocat */}
      <PromptEditor
        label="Prompt Avocats"
        description="Instructions pour l'assistance juridique (Claude 3.5 Sonnet)"
        icon={Scale}
        iconColor="bg-blue-600"
        value={settings.lawyerSystemPrompt}
        onChange={(value) => updateSetting("lawyerSystemPrompt", value)}
        defaultValue={DEFAULT_LAWYER_PROMPT}
        onReset={() => updateSetting("lawyerSystemPrompt", DEFAULT_LAWYER_PROMPT)}
      />

      {/* Prompt Expert */}
      <PromptEditor
        label="Prompt Experts"
        description="Instructions pour l'accompagnement pratique (GPT-4o)"
        icon={Globe}
        iconColor="bg-green-600"
        value={settings.expertSystemPrompt}
        onChange={(value) => updateSetting("expertSystemPrompt", value)}
        defaultValue={DEFAULT_EXPERT_PROMPT}
        onReset={() => updateSetting("expertSystemPrompt", DEFAULT_EXPERT_PROMPT)}
      />
    </div>
  );
}
