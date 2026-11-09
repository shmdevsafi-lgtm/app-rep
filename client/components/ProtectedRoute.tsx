import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isSessionValid } from "@/lib/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const location = useLocation();
  const isLoggedIn = isSessionValid();

  if (!isLoggedIn) {
    // Redirect to login but save current location to return after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
