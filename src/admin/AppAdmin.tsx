import { Routes, Route, Link, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Dossiers from "./pages/Dossiers";
import Messages from "./pages/Messages";
import Prestataires from "./pages/Prestataires";
import Pays from "./pages/Pays";
import Parametres from "./pages/Parametres";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";

export default function AdminApp() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl p-4 flex gap-6 items-center">
          <Link to="/admin" className="font-semibold">SOS Expats — Admin</Link>
          <nav className="flex gap-4 text-sm">
            <Link to="/admin">Dashboard</Link>
            <Link to="/admin/dossiers">Dossiers</Link>
            <Link to="/admin/messages">Messages</Link>
            <Link to="/admin/prestataires">Prestataires</Link>
            <Link to="/admin/pays">Pays</Link>
            <Link to="/admin/parametres">Paramètres</Link>
          </nav>
          <div className="ml-auto">
            <button
              className="px-3 py-1.5 rounded-lg border"
              onClick={() => {
                console.debug("[Auth] signOut click");
                signOut(auth);
              }}
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="dossiers" element={<Dossiers />} />
          <Route path="messages" element={<Messages />} />
          <Route path="prestataires" element={<Prestataires />} />
          <Route path="pays" element={<Pays />} />
          <Route path="parametres" element={<Parametres />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </main>
    </div>
  );
}
