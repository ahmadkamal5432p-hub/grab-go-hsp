import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import "../App.css";

export default function DriverLogin() {
  const navigate = useNavigate();

  const [driverId, setDriverId] = useState("");
  const [driverPin, setDriverPin] = useState("");

  const handleDriverLogin = async () => {
    if (!driverId.trim() || !driverPin.trim()) {
      alert("Please enter Driver ID and PIN.");
      return;
    }

    const { data, error } = await supabase.rpc("login_driver", {
      p_driver_id: driverId.trim(),
      p_pin: driverPin.trim(),
    });

    if (error) {
      alert(error.message);
      return;
    }

    const result = data?.[0];

    if (!result?.success) {
      alert("Invalid Driver ID or PIN.");
      return;
    }

    localStorage.setItem("app_role", "driver");
    localStorage.setItem("driver_id", result.driver_id);
    localStorage.setItem("driver_name", result.driver_name);
    localStorage.setItem("driver_key", result.driver_key);

    navigate("/driver");
  };

  return (
    <div className="login-page">
      <div className="modern-login-card">
        <div className="top-design"></div>

        <div className="logo-icon">🚚</div>

        <h1 className="modern-logo">
          Driver <span>Login</span>
        </h1>

        <p className="small-text">Private driver access</p>

        <input
          className="input"
          placeholder="Driver ID"
          value={driverId}
          onChange={(e) => setDriverId(e.target.value)}
        />

        <input
          className="input"
          type="password"
          placeholder="Driver PIN"
          value={driverPin}
          onChange={(e) => setDriverPin(e.target.value)}
        />

        <button className="modern-google-btn" onClick={handleDriverLogin}>
          Login as Driver
        </button>
      </div>
    </div>
  );
}