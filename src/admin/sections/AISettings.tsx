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
  temperature: 0.2,
  maxOutputTokens: 700,
  systemPrompt:
    "Tu es un assistant interne pour SOS Expat. Rédige des réponses professionnelles, concises et actionnables en fr-FR. Si une information manque, propose une courte checklist."
};

export default function AISettings() {
  const [cfg, setCfg] = useState<AIConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const ref = doc(db, "ops", "settings_ai");

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(ref);
        if (snap.exists()) setCfg({ ...DEFAULTS, ...(snap.data() as Partial<AIConfig>) });
      } finally { setLoading(false); }
    })();
  }, []);

  async function save() {
    setSaving(true);
    try { await setDoc(ref, cfg, { merge: true }); setSavedAt(Date.now()); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="rounded-2xl shadow p-4 bg-white">Chargement des paramètres IA…</div>;

  return (
    <div className="rounded-2xl shadow p-4 bg-white">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Paramètres de l’assistant IA</h2>
        {savedAt && <div className="text-xs text-gray-500">Enregistré • {new Date(savedAt).toLocaleTimeString()}</div>}
      </div>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={cfg.enabled} onChange={e=>setCfg({...cfg,enabled:e.target.checked})}/>
          <span className="text-sm">Activer les réponses IA</span>
        </label>
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={cfg.replyOnBookingCreated} onChange={e=>setCfg({...cfg,replyOnBookingCreated:e.target.checked})}/>
          <span className="text-sm">Répondre à la création d’un dossier</span>
        </label>
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={cfg.replyOnUserMessage} onChange={e=>setCfg({...cfg,replyOnUserMessage:e.target.checked})}/>
          <span className="text-sm">Répondre aux nouveaux messages</span>
        </label>
        <div>
          <label className="block text-sm font-medium mb-1">Modèle</label>
          <input className="w-full rounded-md border p-2" value={cfg.model} onChange={e=>setCfg({...cfg,model:e.target.value})}/>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Température (0–1)</label>
          <input type="number" min={0} max={1} step={0.05} className="w-full rounded-md border p-2" value={cfg.temperature} onChange={e=>setCfg({...cfg,temperature:Number(e.target.value)})}/>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Max tokens de sortie</label>
          <input type="number" min={64} max={4000} step={50} className="w-full rounded-md border p-2" value={cfg.maxOutputTokens} onChange={e=>setCfg({...cfg,maxOutputTokens:Number(e.target.value)})}/>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">System prompt</label>
          <textarea className="w-full rounded-md border p-2 h-40" value={cfg.systemPrompt} onChange={e=>setCfg({...cfg,systemPrompt:e.target.value})}/>
          <p className="text-xs text-gray-500 mt-1">Astuce : structure Résumé → Étapes → Pièces manquantes → Points d’attention.</p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-50">{saving?"Enregistrement…":"Enregistrer"}</button>
        <button onClick={()=>setCfg(DEFAULTS)} className="px-4 py-2 rounded-lg border">Réinitialiser</button>
      </div>
    </div>
  );
}
