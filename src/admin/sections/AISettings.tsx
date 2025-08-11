import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

type AIConfig = {
  enabled: boolean;
  replyOnBookingCreated: boolean;
  replyOnUserMessage: boolean;
  model: string;
  temperature: number;
  maxOutputTokens: number;
  systemPrompt: string;
};

const DEFAULTS: AIConfig = {
  enabled: true,
  replyOnBookingCreated: true,
  replyOnUserMessage: true,
  model: "gpt-4o-mini",
  temperature: 0.3,
  maxOutputTokens: 800,
  systemPrompt:
    "Tu es l’assistant administratif de SOS Expats. Donne des réponses structurées, claires et actionnables. Mets en avant: Résumé → Étapes → Pièces manquantes → Points d’attention.",
};

export default function AISettings() {
  const [cfg, setCfg] = useState<AIConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ref = doc(db, "config", "ai");
    (async () => {
      try {
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setCfg({ ...DEFAULTS, ...(snap.data() as Partial<AIConfig>) });
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
    try {
      const ref = doc(db, "config", "ai");
      await setDoc(ref, cfg, { merge: true });
      console.debug("[AISettings] saved", cfg);
    } catch (e: any) {
      console.error("[AISettings] save error", e);
      setError(e.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4">Chargement…</div>;

  return (
    <div>
      <h3 className="text-base font-semibold mb-3">IA – Réponses automatiques</h3>
      {error && <div className="mb-3 rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-800">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={cfg.enabled}
              onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })}
            />
            <span>Activer les réponses automatiques</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={cfg.replyOnBookingCreated}
              onChange={(e) => setCfg({ ...cfg, replyOnBookingCreated: e.target.checked })}
            />
            <span>Répondre lors de la création d’une demande</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={cfg.replyOnUserMessage}
              onChange={(e) => setCfg({ ...cfg, replyOnUserMessage: e.target.checked })}
            />
            <span>Répondre aux messages utilisateur</span>
          </label>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Modèle</label>
            <input
              className="w-full rounded-md border p-2"
              value={cfg.model}
              onChange={(e) => setCfg({ ...cfg, model: e.target.value })}
              placeholder="gpt-4o-mini"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Température</label>
            <input
              type="number"
              min={0}
              max={1}
              step={0.05}
              className="w-full rounded-md border p-2"
              value={cfg.temperature}
              onChange={(e) => setCfg({ ...cfg, temperature: Number(e.target.value) })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Max tokens de sortie</label>
            <input
              type="number"
              min={64}
              max={4000}
              step={50}
              className="w-full rounded-md border p-2"
              value={cfg.maxOutputTokens}
              onChange={(e) => setCfg({ ...cfg, maxOutputTokens: Number(e.target.value) })}
            />
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">System prompt</label>
          <textarea
            className="w-full rounded-md border p-2"
            rows={5}
            value={cfg.systemPrompt}
            onChange={(e) => setCfg({ ...cfg, systemPrompt: e.target.value })}
          />
          <p className="text-xs text-gray-500 mt-1">
            Astuce : structure recommandée — <strong>Résumé → Étapes → Pièces manquantes → Points d’attention</strong>.
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-sky-600 text-white disabled:opacity-50"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button
          onClick={() => setCfg(DEFAULTS)}
          className="px-4 py-2 rounded-lg border"
        >
          Réinitialiser
        </button>
      </div>
    </div>
  );
}
