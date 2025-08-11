import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../lib/firebase";

type CountryConfig = {
  id: string;
  name?: string;
  code?: string;
  active?: boolean;
};

export default function Pays() {
  const [items, setItems] = useState<CountryConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, "countryConfigs"), orderBy("name")));
        const rows = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        setItems(rows);
      } catch (e:any) {
        setError(e.message || "Erreur");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-4">Chargement…</div>;
  if (error) return <div className="p-4 text-red-600">Erreur: {error}</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Pays</h1>
      <p className="text-sm text-gray-600">Liste des pays configurés dans <code>countryConfigs</code>.</p>
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Code</th>
              <th className="px-3 py-2 text-left">Nom</th>
              <th className="px-3 py-2 text-left">Actif</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="px-3 py-2">{c.code ?? c.id}</td>
                <td className="px-3 py-2">{c.name ?? "—"}</td>
                <td className="px-3 py-2">{c.active ? "✅" : "❌"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
