import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { hasValidOfflineSession } from "@/lib/auth/offlineSession";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(() => hasValidOfflineSession());

  useEffect(() => {
    // Re-check while the app remains open so a session cannot outlive its
    // 30-day expiry merely because the current page was never reloaded.
    const intervalId = window.setInterval(() => {
      setIsLoggedIn(hasValidOfflineSession());
    }, 30_000);
    return () => window.clearInterval(intervalId);
  }, []);

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
