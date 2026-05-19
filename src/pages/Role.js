import { useNavigate } from "react-router-dom";
import "../App.css";

export default function Role() {
  const navigate = useNavigate();

  return (
    <div className="login-page">
      <div className="modern-login-card">
        <div className="top-design"></div>

        <h1 className="modern-logo">
          Select <span>Role</span>
        </h1>

        <p className="small-text">Choose your dashboard</p>

        <button className="modern-google-btn" onClick={() => navigate("/admin")}>
          Admin
        </button>

        <br /><br />

        <button className="modern-google-btn" onClick={() => navigate("/driver")}>
          Driver
        </button>

        <br /><br />

        <button className="modern-google-btn" onClick={() => navigate("/customer")}>
          Customer
        </button>
      </div>
    </div>
  );
}