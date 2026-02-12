import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import CampaignListPage from "./pages/CampaignListPage";
import CampaignCreatePage from "./pages/CampaignCreatePage";
import CampaignDetailPage from "./pages/CampaignDetailPage";
import TemplatesPage from "./pages/TemplatesPage";
import LogsPage from "./pages/LogsPage";
import QueuePage from "./pages/QueuePage";
import SubscribersPage from "./pages/SubscribersPage";
import TagsPage from "./pages/TagsPage";
import SettingsPage from "./pages/SettingsPage";
import SegmentsPage from "./pages/SegmentsPage";
import AutomationsPage from "./pages/AutomationsPage";
import AutomationDetailPage from "./pages/AutomationDetailPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import HealthPage from "./pages/HealthPage";
import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: "0.75rem",
            background: "#fff",
            color: "#1f2937",
            boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
            padding: "1rem",
          },
          success: { iconTheme: { primary: "#10b981", secondary: "#fff" } },
          error: { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="campaigns" element={<CampaignListPage />} />
            <Route path="campaigns/new" element={<CampaignCreatePage />} />
            <Route path="campaigns/:id" element={<CampaignDetailPage />} />
            <Route path="templates" element={<TemplatesPage />} />
            <Route path="logs" element={<LogsPage />} />
            <Route path="queue" element={<QueuePage />} />
            <Route path="subscribers" element={<SubscribersPage />} />
            <Route path="tags" element={<TagsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="segments" element={<SegmentsPage />} />
            <Route path="automations" element={<AutomationsPage />} />
            <Route path="automations/:id" element={<AutomationDetailPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="health" element={<HealthPage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
