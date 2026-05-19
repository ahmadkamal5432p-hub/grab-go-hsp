import { Navigate } from "react-router-dom";

export default function AdminRoute({ children }) {
  const role = localStorage.getItem("app_role");

  if (role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
}