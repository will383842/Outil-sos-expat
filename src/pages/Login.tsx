import { useState } from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";

export default function Login() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) {
    return (
      <div className="max-w-sm mx-auto mt-20 p-6 rounded-2xl shadow bg-white text-center space-y-3">
        <div className="text-sm text-gray-600">Déjà connecté</div>
        <button onClick={() => nav('/admin')} className="px-4 py-2 rounded-lg bg-black text-white w-full">Aller à la console</button>
        <button onClick={() => signOut(auth)} className="px-4 py-2 rounded-lg border w-full">Se déconnecter</button>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      nav("/admin");
    } catch (e:any) {
      setError(e.message || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-20 p-6 rounded-2xl shadow bg-white">
      <h1 className="text-lg font-semibold mb-4">Connexion</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="w-full border rounded-md p-2" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input type="password" className="w-full border rounded-md p-2" placeholder="Mot de passe" value={password} onChange={e=>setPassword(e.target.value)} />
        {error && <div className="text-sm text-red-600">{error}</div>}
        <button disabled={loading} className="w-full px-4 py-2 rounded-lg bg-black text-white">{loading ? "Connexion…" : "Se connecter"}</button>
      </form>
      <div className="mt-4 text-center text-sm text-gray-600">Besoin d’un compte ? Demande à un administrateur.</div>
      <div className="mt-2 text-center"><Link to="/admin" className="text-xs underline">Accéder quand même à l’interface</Link></div>
    </div>
  );
}
