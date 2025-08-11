import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    console.debug("[Auth] loading… (ProtectedRoute)");
    return <div className="p-6">Chargement…</div>;
  }

  if (!user) {
    console.warn("[Auth] no user → redirect to /login", { from: location.pathname });
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
