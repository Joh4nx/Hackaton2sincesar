import React from "react";
import { API } from "../lib/api";

export default function Login() {
  const goGoogle = () => {
    // Redirige al gateway → auth-svc (/google/login)
    window.location.href = `${API}/auth/google/login`;
  };

  return (
    <div style={{ padding: 16, maxWidth: 420 }}>
      <h2>Ingresar</h2>

      {/* ÚNICO método de login: Google (redirigir) */}
      <button
        onClick={goGoogle}
        style={{
          padding: "10px 14px",
          borderRadius: 8,
          border: "1px solid #ccc",
          background: "#fff",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        Continuar con Google 
      </button>
    </div>
  );
}
