import { Route, Routes, useLocation } from "react-router-dom";
import { Navbar } from "../components/Navbar.jsx";
import { ProtectedRoute } from "../auth/ProtectedRoute.jsx";
import { RoleRoute } from "../auth/RoleRoute.jsx";
import { LandingPage } from "../pages/LandingPage.jsx";
import { LoginPage } from "../pages/LoginPage.jsx";
import { CitizenDashboard } from "../pages/CitizenDashboard.jsx";
import { CreateIssuePage } from "../pages/CreateIssuePage.jsx";
import { IssueDetailsPage } from "../pages/IssueDetailsPage.jsx";
import { OfficerDashboard } from "../pages/OfficerDashboard.jsx";
import { AdminDashboard } from "../pages/AdminDashboard.jsx";
import { AdminLayout } from "../pages/admin/AdminLayout.jsx";
import { PublicIssuesPage } from "../pages/PublicIssuesPage.jsx";
import { SwachhaGridPage } from "../pages/SwachhaGridPage.jsx";
import { SimulatorPage } from "../pages/SimulatorPage.jsx";
import { ProfilePage } from "../pages/ProfilePage.jsx";

export function AppRouter() {
  const { pathname } = useLocation();
  const hideNav = pathname === "/" || pathname === "/login" || pathname.startsWith("/admin");


  return (
    <>
      {hideNav ? null : <Navbar />}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/public" element={<PublicIssuesPage />} />
        <Route path="/public/:publicId" element={<IssueDetailsPage publicView />} />
        <Route path="/operations" element={<SwachhaGridPage />} />
        <Route path="/simulator" element={<SimulatorPage />} />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <CitizenDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <CitizenDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/app/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/report"
          element={
            <ProtectedRoute>
              <CreateIssuePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/report"
          element={
            <ProtectedRoute>
              <CreateIssuePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/issues/:issueId"
          element={
            <ProtectedRoute>
              <IssueDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/issues/:issueId"
          element={
            <ProtectedRoute>
              <IssueDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/officer"
          element={
            <RoleRoute roles={["ZONE_OFFICER", "MAIN_AUTHORITY"]}>
              <OfficerDashboard />
            </RoleRoute>
          }
        />
        <Route
          path="/officer/issues/:issueId"
          element={
            <RoleRoute roles={["ZONE_OFFICER", "MAIN_AUTHORITY"]}>
              <IssueDetailsPage officer />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/*"
          element={
            <RoleRoute roles={["MAIN_AUTHORITY", "admin"]}>
              <AdminLayout />
            </RoleRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <RoleRoute roles={["MAIN_AUTHORITY", "admin"]}>
              <AdminLayout />
            </RoleRoute>
          }
        />

      </Routes>
    </>
  );
}
