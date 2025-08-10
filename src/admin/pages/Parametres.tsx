import AISettings from "../sections/AISettings";
export default function Parametres() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl shadow p-4 bg-white">
        <h2 className="text-lg font-semibold">Paramètres généraux</h2>
        <p className="text-sm text-gray-600">Rôles, thèmes, intégrations, journaux…</p>
      </div>
      <AISettings />
    </div>
  );
}
