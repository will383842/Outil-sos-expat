import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AdminApp from "./admin/AppAdmin";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/admin/*" element={<ProtectedRoute><AdminApp/></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
