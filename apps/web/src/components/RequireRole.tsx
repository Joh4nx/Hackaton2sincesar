import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function RequireRole({
  children,
  role = "user",
}: {
  children: React.ReactNode;
  role?: "user" | "admin";
}) {
  const { user, loading } = useAuth();
  const hasToken = !!localStorage.getItem("token");

  if (loading) {
    return (
      <div className="container">
        <p>Cargando sesión…</p>
      </div>
    );
  }

  if (!hasToken) return <Navigate to="/login" replace />;
  if (role === "admin" && user?.role !== "admin") return <Navigate to="/" replace />;

  return <>{children}</>;
}
