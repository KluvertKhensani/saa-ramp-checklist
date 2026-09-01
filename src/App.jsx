import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import "./styles/app.css";

export default function App() {
  return (
      <AuthProvider>
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
