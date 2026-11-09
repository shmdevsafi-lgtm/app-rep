import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { hasValidOfflineSession } from "@/lib/auth/offlineSession";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const location = useLocation();

  if (!hasValidOfflineSession()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
