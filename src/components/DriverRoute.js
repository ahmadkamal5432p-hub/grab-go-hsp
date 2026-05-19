import { Navigate } from "react-router-dom";

export default function DriverRoute({ children }) {
  const role = localStorage.getItem("app_role");
  const driverKey = localStorage.getItem("driver_key");

  if (role !== "driver" || !driverKey) {
    return <Navigate to="/" replace />;
  }

  return children;
}