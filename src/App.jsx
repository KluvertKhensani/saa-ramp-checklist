import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import PwaUpdatePrompt from "./components/PwaUpdatePrompt";
import SyncStatusBadge from "./components/SyncStatusBadge";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";
import { registerLifecycleSync } from "./offline/processLifecycleQueue";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";

import "./styles/app.css";

export default function App() {
  useEffect(() => {
    const unregisterLifecycleSync = registerLifecycleSync();

    return () => {
      unregisterLifecycleSync();
    };
  }, []);

  return (
    <AuthProvider>
      <PwaUpdatePrompt />

      <div className="global-sync-status">
        <SyncStatusBadge />
      </div>

      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<DashboardPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}