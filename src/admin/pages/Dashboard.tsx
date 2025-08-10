export default function Dashboard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="rounded-2xl shadow p-4 bg-white">
        <div className="text-sm text-gray-500">Dossiers actifs</div>
        <div className="text-3xl font-semibold">—</div>
      </div>
      <div className="rounded-2xl shadow p-4 bg-white">
        <div className="text-sm text-gray-500">Temps 1ère réponse</div>
        <div className="text-3xl font-semibold">—</div>
      </div>
      <div className="rounded-2xl shadow p-4 bg-white">
        <div className="text-sm text-gray-500">Assistant IA</div>
        <div className="text-xs text-gray-600 mt-1">Réponses automatiques activées (Cloud Functions)</div>
      </div>
    </div>
  );
}
