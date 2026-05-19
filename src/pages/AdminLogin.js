import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import "../App.css";

export default function AdminLogin() {
  const navigate = useNavigate();

  const [adminId, setAdminId] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const handleAdminLogin = async () => {
    if (!adminId.trim() || !adminPassword.trim()) {
      alert("Please enter Admin ID and Password.");
      return;
    }

    const { data, error } = await supabase.rpc("login_admin", {
      p_admin_id: adminId.trim(),
      p_password: adminPassword.trim(),
    });

    if (error) {
      alert(error.message);
      return;
    }

    const result = data?.[0];

    if (!result?.success) {
      alert("Invalid Admin ID or Password.");
      return;
    }

    localStorage.setItem("app_role", "admin");
    localStorage.setItem("admin_id", result.admin_id);

    navigate("/admin");
  };

  return (
    <div className="login-page">
      <div className="modern-login-card">
        <div className="top-design"></div>

        <div className="logo-icon">🔐</div>

        <h1 className="modern-logo">
          Admin <span>Login</span>
        </h1>

        <p className="small-text">Private admin access</p>

        <input
          className="input"
          placeholder="Admin ID"
          value={adminId}
          onChange={(e) => setAdminId(e.target.value)}
        />

        <input
          className="input"
          type="password"
          placeholder="Admin Password"
          value={adminPassword}
          onChange={(e) => setAdminPassword(e.target.value)}
        />

        <button className="modern-google-btn" onClick={handleAdminLogin}>
          Login as Admin
        </button>
      </div>
    </div>
  );
}