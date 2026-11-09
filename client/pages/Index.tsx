import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isSessionValid } from "@/lib/auth";

export default function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    const isLoggedIn = isSessionValid();
    if (isLoggedIn) {
      navigate("/dashboard");
    } else {
      navigate("/login");
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#006400]"></div>
    </div>
  );
}
