/**
 * =============================================================================
 * COMPOSANT TELEGRAM TEMPLATE EDITOR
 * Editeur de templates pour les notifications Telegram
 * =============================================================================
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import {
  Save,
  RotateCcw,
  Eye,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Switch } from "../../components/ui/switch";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";

// =============================================================================
// TYPES
// =============================================================================

type EventType =
  | "new_registration"
  | "call_completed"
  | "payment_received"
  | "daily_report";

interface TelegramTemplateEditorProps {
  eventType: EventType;
  onSave?: () => void;
}

interface TemplateConfig {
  enabled: boolean;
  template: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Noms des templates en francais
 */
const TEMPLATE_NAMES: Record<EventType, string> = {
  new_registration: "Nouvelle inscription",
  call_completed: "Appel termine",
  payment_received: "Paiement recu",
  daily_report: "Rapport quotidien",
};

/**
 * Variables disponibles par type de template
 */
const TEMPLATE_VARIABLES: Record<EventType, string[]> = {
  new_registration: [
    "{{USER_NAME}}",
    "{{USER_EMAIL}}",
    "{{USER_PHONE}}",
    "{{REGISTRATION_DATE}}",
    "{{COUNTRY}}",
    "{{SOURCE}}",
  ],
  call_completed: [
    "{{CLIENT_NAME}}",
    "{{PROVIDER_NAME}}",
    "{{PROVIDER_TYPE}}",
    "{{CALL_DURATION}}",
    "{{CALL_DATE}}",
    "{{CALL_TIME}}",
    "{{BOOKING_ID}}",
    "{{RATING}}",
  ],
  payment_received: [
    "{{CLIENT_NAME}}",
    "{{AMOUNT}}",
    "{{CURRENCY}}",
    "{{PAYMENT_METHOD}}",
    "{{PAYMENT_DATE}}",
    "{{TRANSACTION_ID}}",
    "{{SERVICE_TYPE}}",
  ],
  daily_report: [
    "{{DATE}}",
    "{{TOTAL_BOOKINGS}}",
    "{{COMPLETED_CALLS}}",
    "{{PENDING_CALLS}}",
    "{{CANCELLED_CALLS}}",
    "{{TOTAL_REVENUE}}",
    "{{NEW_USERS}}",
    "{{ACTIVE_PROVIDERS}}",
  ],
};

/**
 * Templates par defaut
 */
const DEFAULT_TEMPLATES: Record<EventType, string> = {
  new_registration: `🆕 Nouvelle inscription !

👤 Nom: {{USER_NAME}}
📧 Email: {{USER_EMAIL}}
📱 Telephone: {{USER_PHONE}}
🌍 Pays: {{COUNTRY}}
📅 Date: {{REGISTRATION_DATE}}
🔗 Source: {{SOURCE}}`,

  call_completed: `✅ Appel termine !

👤 Client: {{CLIENT_NAME}}
👨‍💼 Prestataire: {{PROVIDER_NAME}} ({{PROVIDER_TYPE}})
⏱️ Duree: {{CALL_DURATION}}
📅 Date: {{CALL_DATE}} a {{CALL_TIME}}
🎫 Reservation: {{BOOKING_ID}}
⭐ Note: {{RATING}}`,

  payment_received: `💰 Paiement recu !

👤 Client: {{CLIENT_NAME}}
💵 Montant: {{AMOUNT}} {{CURRENCY}}
💳 Methode: {{PAYMENT_METHOD}}
📅 Date: {{PAYMENT_DATE}}
🔖 Transaction: {{TRANSACTION_ID}}
📋 Service: {{SERVICE_TYPE}}`,

  daily_report: `📊 Rapport quotidien - {{DATE}}

📈 Reservations totales: {{TOTAL_BOOKINGS}}
✅ Appels termines: {{COMPLETED_CALLS}}
⏳ En attente: {{PENDING_CALLS}}
❌ Annules: {{CANCELLED_CALLS}}
💰 Chiffre d'affaires: {{TOTAL_REVENUE}}
🆕 Nouveaux utilisateurs: {{NEW_USERS}}
👨‍💼 Prestataires actifs: {{ACTIVE_PROVIDERS}}`,
};

/**
 * Donnees d'exemple pour la preview
 */
const SAMPLE_DATA: Record<EventType, Record<string, string>> = {
  new_registration: {
    "{{USER_NAME}}": "Jean Dupont",
    "{{USER_EMAIL}}": "jean.dupont@email.com",
    "{{USER_PHONE}}": "+33 6 12 34 56 78",
    "{{REGISTRATION_DATE}}": "03/02/2026 14:30",
    "{{COUNTRY}}": "Thailande",
    "{{SOURCE}}": "Google",
  },
  call_completed: {
    "{{CLIENT_NAME}}": "Marie Martin",
    "{{PROVIDER_NAME}}": "Me. Pierre Durand",
    "{{PROVIDER_TYPE}}": "Avocat",
    "{{CALL_DURATION}}": "45 minutes",
    "{{CALL_DATE}}": "03/02/2026",
    "{{CALL_TIME}}": "15:00",
    "{{BOOKING_ID}}": "BK-2026-0203-001",
    "{{RATING}}": "5/5",
  },
  payment_received: {
    "{{CLIENT_NAME}}": "Sophie Bernard",
    "{{AMOUNT}}": "89.00",
    "{{CURRENCY}}": "EUR",
    "{{PAYMENT_METHOD}}": "Carte bancaire",
    "{{PAYMENT_DATE}}": "03/02/2026 16:45",
    "{{TRANSACTION_ID}}": "TXN-ABC123XYZ",
    "{{SERVICE_TYPE}}": "Consultation juridique",
  },
  daily_report: {
    "{{DATE}}": "03/02/2026",
    "{{TOTAL_BOOKINGS}}": "47",
    "{{COMPLETED_CALLS}}": "38",
    "{{PENDING_CALLS}}": "6",
    "{{CANCELLED_CALLS}}": "3",
    "{{TOTAL_REVENUE}}": "4 230.00 EUR",
    "{{NEW_USERS}}": "12",
    "{{ACTIVE_PROVIDERS}}": "8",
  },
};

// =============================================================================
// COMPOSANT
// =============================================================================

export default function TelegramTemplateEditor({
  eventType,
  onSave,
}: TelegramTemplateEditorProps) {
  const { t } = useLanguage({ mode: "admin" });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // State
  const [config, setConfig] = useState<TemplateConfig>({
    enabled: true,
    template: DEFAULT_TEMPLATES[eventType],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Document path in Firestore
  const docPath = `settings/telegram/templates/${eventType}`;

  // =============================================================================
  // DATA FETCHING
  // =============================================================================

  useEffect(() => {
    const loadTemplate = async () => {
      setLoading(true);
      setError(null);
      try {
        const docRef = doc(db, "settings", "telegram", "templates", eventType);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data() as Partial<TemplateConfig>;
          setConfig({
            enabled: data.enabled ?? true,
            template: data.template || DEFAULT_TEMPLATES[eventType],
          });
        } else {
          // Use defaults if no config exists
          setConfig({
            enabled: true,
            template: DEFAULT_TEMPLATES[eventType],
          });
        }
      } catch (err: unknown) {
        console.error("[TelegramTemplateEditor] Load error:", err);
        setError(
          err instanceof Error ? err.message : "Erreur lors du chargement"
        );
      } finally {
        setLoading(false);
      }
    };

    loadTemplate();
  }, [eventType]);

  // =============================================================================
  // HANDLERS
  // =============================================================================

  /**
   * Sauvegarde le template dans Firestore
   */
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const docRef = doc(db, "settings", "telegram", "templates", eventType);
      await setDoc(docRef, config, { merge: true });
      setSuccess(true);
      onSave?.();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      console.error("[TelegramTemplateEditor] Save error:", err);
      setError(
        err instanceof Error ? err.message : "Erreur lors de la sauvegarde"
      );
    } finally {
      setSaving(false);
    }
  };

  /**
   * Reinitialise le template a sa valeur par defaut
   */
  const handleReset = () => {
    if (
      window.confirm(
        "Voulez-vous vraiment reinitialiser ce template a sa valeur par defaut ?"
      )
    ) {
      setConfig({
        ...config,
        template: DEFAULT_TEMPLATES[eventType],
      });
    }
  };

  /**
   * Insere une variable a la position du curseur
   */
  const insertVariable = useCallback((variable: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = textarea.value;

    const newValue =
      currentValue.substring(0, start) +
      variable +
      currentValue.substring(end);

    setConfig((prev) => ({ ...prev, template: newValue }));

    // Restore cursor position after the inserted variable
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + variable.length;
      textarea.selectionEnd = start + variable.length;
    }, 0);
  }, []);

  /**
   * Genere le preview avec les donnees d'exemple
   */
  const renderPreview = useCallback(() => {
    let preview = config.template;
    const sampleValues = SAMPLE_DATA[eventType];

    for (const [variable, value] of Object.entries(sampleValues)) {
      preview = preview.split(variable).join(value);
    }

    return preview;
  }, [config.template, eventType]);

  /**
   * Surligne les variables dans le template
   */
  const highlightVariables = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    const regex = /(\{\{[A-Z_]+\}\})/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      // Add the highlighted variable
      parts.push(
        <span
          key={match.index}
          className="bg-blue-100 text-blue-800 px-1 rounded font-semibold"
        >
          {match[1]}
        </span>
      );

      lastIndex = regex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts;
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Chargement...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {/* Header */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">
          {TEMPLATE_NAMES[eventType]}
        </CardTitle>

        {/* Enable/Disable Toggle */}
        <div className="flex items-center gap-2">
          <Label htmlFor={`toggle-${eventType}`} className="text-sm">
            {config.enabled ? "Active" : "Desactive"}
          </Label>
          <Switch
            id={`toggle-${eventType}`}
            checked={config.enabled}
            onCheckedChange={(checked) =>
              setConfig((prev) => ({ ...prev, enabled: checked }))
            }
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-red-700">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-green-700">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">Template sauvegarde avec succes !</span>
          </div>
        )}

        {/* Template Editor */}
        <div className="space-y-2">
          <Label htmlFor={`template-${eventType}`} className="text-sm font-medium">
            Template du message
          </Label>
          <textarea
            ref={textareaRef}
            id={`template-${eventType}`}
            value={config.template}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, template: e.target.value }))
            }
            disabled={!config.enabled}
            className="w-full min-h-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
            placeholder="Entrez le template du message..."
          />
        </div>

        {/* Available Variables */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Variables disponibles</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Cliquez sur une variable pour l'inserer a la position du curseur
          </p>
          <div className="flex flex-wrap gap-2">
            {TEMPLATE_VARIABLES[eventType].map((variable) => (
              <Badge
                key={variable}
                variant="secondary"
                className="cursor-pointer hover:bg-secondary/80 transition-colors font-mono text-xs"
                onClick={() => insertVariable(variable)}
              >
                {variable}
              </Badge>
            ))}
          </div>
        </div>

        {/* Live Preview */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Apercu en temps reel</Label>
          </div>
          <div className="rounded-lg border bg-muted/50 p-4">
            <pre className="whitespace-pre-wrap font-mono text-sm text-foreground">
              {highlightVariables(renderPreview())}
            </pre>
          </div>
          <p className="text-xs text-muted-foreground italic">
            Les variables sont affichees avec des donnees d'exemple
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={saving || !config.enabled}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reinitialiser
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Enregistrer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
