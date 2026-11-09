import React, { createContext, useContext, useEffect, useState } from "react";
import { isSessionValid, clearSession } from "@/lib/auth";

interface AuthContextType {
  isAuthenticated: boolean;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(isSessionValid());

  useEffect(() => {
    const refresh = () => setIsAuthenticated(isSessionValid());
    const id = window.setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  const signOut = () => {
    clearSession();
    setIsAuthenticated(false);
  };

  return <AuthContext.Provider value={{ isAuthenticated, signOut }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
