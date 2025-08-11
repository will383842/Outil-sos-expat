import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import AdminApp from "./admin/AppAdmin";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import { AuthProvider } from "./contexts/AuthContext";
import { useEffect } from "react";

// Petit ErrorBoundary fonctionnel (affiche un fallback simple)
// NB: pour des erreurs de rendu React, seul un composant *classe* capte réellement.
// Ici on se contente d'un garde-fou runtime minimal.
function RouteLogger() {
  const location = useLocation();
  useEffect(() => {
    console.debug("[Router] path =", location.pathname);
  }, [location.pathname]);
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <RouteLogger />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute>
                <AdminApp />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
