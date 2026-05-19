import { supabase } from "../supabase";
import "../App.css";

export default function Login() {
  const handleCustomerGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "http://localhost:3000/customer",
      },
    });

    if (error) {
      alert(error.message);
    }
  };

  return (
    <div className="login-page">
      <div className="modern-login-card">
        <div className="top-design"></div>

        <div className="logo-icon">🚚</div>

        <h1 className="modern-logo">
          GRAB <span>&</span> GO HSP
        </h1>

        <p className="modern-subtitle">Fast • Safe • Reliable</p>
        <p className="small-text">Customer login only</p>

        <button className="modern-google-btn" onClick={handleCustomerGoogleLogin}>
          Continue with Google
        </button>
      </div>
    </div>
  );
}