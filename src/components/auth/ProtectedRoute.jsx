import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../contexts/useAuth";

export default function ProtectedRoute() {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="screen-loader" role="status" aria-live="polite">
        <div className="loader-ring" />
        <p>Loading SAA Ramp Checklist...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
