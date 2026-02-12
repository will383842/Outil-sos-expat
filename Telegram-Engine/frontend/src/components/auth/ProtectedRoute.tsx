import { Navigate, Outlet } from "react-router-dom";

function isAuthenticated(): boolean {
  return !!localStorage.getItem("tg_token");
}

export default function ProtectedRoute() {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
