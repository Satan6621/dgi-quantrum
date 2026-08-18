import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./lib/useAuth";
import LoginPage from "./pages/LoginPage";
import PublicFunnelPage from "./pages/PublicFunnelPage";
import Shell from "./pages/Shell";
import DashboardPage from "./pages/DashboardPage";
import TwinPage from "./pages/TwinPage";
import LeadsPage from "./pages/LeadsPage";
import ConversationsPage from "./pages/ConversationsPage";
import FollowupsPage from "./pages/FollowupsPage";
import OnboardingPage from "./pages/OnboardingPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import DownlinePage from "./pages/DownlinePage";
import SimulatorPage from "./pages/SimulatorPage";
import AdminOverviewPage from "./pages/admin/AdminOverviewPage";
import AdminBrainPage from "./pages/admin/AdminBrainPage";
import AdminSequencesPage from "./pages/admin/AdminSequencesPage";
import AdminDistributorsPage from "./pages/admin/AdminDistributorsPage";
import AdminBillingPage from "./pages/admin/AdminBillingPage";
import AdminApiKeysPage from "./pages/admin/AdminApiKeysPage";
import AdminWebhooksPage from "./pages/admin/AdminWebhooksPage";
import AdminTeamPage from "./pages/admin/AdminTeamPage";
import AdminAuditPage from "./pages/admin/AdminAuditPage";
import ExportPage from "./pages/admin/ExportPage";
import { Spinner } from "./components/ui";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-ink-950">
        <Spinner className="h-8 w-8 text-brand-400" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const ok = user && (user.role === "ADMIN" || user.role === "MANAGER" || user.role === "PLATFORM");
  if (!ok) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/f/:slug" element={<PublicFunnelPage />} />
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route
        path="/app"
        element={
          <RequireAuth>
            <Shell />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="twin" element={<TwinPage />} />
        <Route path="leads" element={<LeadsPage />} />
        <Route path="conversations" element={<ConversationsPage />} />
        <Route path="followups" element={<FollowupsPage />} />
        <Route path="onboarding" element={<OnboardingPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="downline" element={<DownlinePage />} />
        <Route path="simulator" element={<SimulatorPage />} />
        <Route
          path="admin"
          element={
            <AdminGate>
              <AdminOverviewPage />
            </AdminGate>
          }
        />
        <Route
          path="admin/brain"
          element={
            <AdminGate>
              <AdminBrainPage />
            </AdminGate>
          }
        />
        <Route
          path="admin/sequences"
          element={
            <AdminGate>
              <AdminSequencesPage />
            </AdminGate>
          }
        />
        <Route
          path="admin/distributors"
          element={
            <AdminGate>
              <AdminDistributorsPage />
            </AdminGate>
          }
        />
        <Route
          path="admin/billing"
          element={
            <AdminGate>
              <AdminBillingPage />
            </AdminGate>
          }
        />
        <Route
          path="admin/keys"
          element={
            <AdminGate>
              <AdminApiKeysPage />
            </AdminGate>
          }
        />
        <Route
          path="admin/keys"
          element={
            <AdminGate>
              <AdminApiKeysPage />
            </AdminGate>
          }
        />
        <Route
          path="admin/team"
          element={
            <AdminGate>
              <AdminTeamPage />
            </AdminGate>
          }
        />
        <Route
          path="admin/audit"
          element={
            <AdminGate>
              <AdminAuditPage />
            </AdminGate>
          }
        />
        <Route
          path="admin/webhooks"
          element={
            <AdminGate>
              <AdminWebhooksPage />
            </AdminGate>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}