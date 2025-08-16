import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function RegisterView() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to login since we're using Internet Identity
    navigate("/login", { replace: true });
  }, [navigate]);

  return null;
}
