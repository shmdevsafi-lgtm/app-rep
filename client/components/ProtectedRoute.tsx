import React from "react";
import { Navigate, useLocation } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const SESSION_KEY = "shm_session_expiry";

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const location = useLocation();
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const expiry = Number(localStorage.getItem(SESSION_KEY) || 0);
  const expired = expiry > 0 && Date.now() > expiry;

  if (!isLoggedIn || expired) {
    if (expired) {
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem(SESSION_KEY);
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
