import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { API } from "../lib/api";
import { useAuth } from "../lib/auth";

declare global {
  interface Window { google?: any; }
}

export default function GoogleLoginButton() {
  const btnRef = useRef<HTMLDivElement | null>(null);
  const { setUser } = useAuth();
  const [embedError, setEmbedError] = useState<string | null>(null);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

    console.log("[GIS] origin:", window.location.origin);
    console.log("[GIS] clientId:", clientId?.slice(0, 8) + "…apps.googleusercontent.com");

    if (!clientId) {
      setEmbedError("VITE_GOOGLE_CLIENT_ID no está definido");
      return;
    }
    if (!window.google) {
      setEmbedError("No cargó el script de Google Identity");
      return;
    }
    if (!btnRef.current) return;

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: any) => {
          try {
            const r = await axios.post(API + "/auth/google", { credential: response.credential });
            const token: string = r.data.token;
            localStorage.setItem("token", token);

            const me = await axios.get(API + "/auth/me", {
              headers: { Authorization: "Bearer " + token },
            });

            setUser(me.data.user);
            if (me.data.user?.role === "admin") {
              window.location.href = "/admin";
            } else {
              window.location.href = "/";
            }
          } catch (e: any) {
            console.error("POST /auth/google falló:", e);
            setEmbedError("No se pudo iniciar sesión con Google (embebido). Usa el botón de redirección.");
          }
        },
        use_fedcm_for_prompt: true,
      });

      window.google.accounts.id.renderButton(btnRef.current, {
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "pill",
      });
    } catch (err: any) {
      console.error("[GIS] init/render error:", err?.message || err);
      setEmbedError("Este origen no está autorizado o el navegador bloqueó el botón embebido.");
    }
  }, []);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* Botón embebido (puede fallar si el origen no está autorizado o hay bloqueo de cookies) */}
      <div ref={btnRef} />

      {/* Mensaje de error si falla el embebido */}
      {embedError && (
        <div style={{ color: "#a50e0e", fontSize: 14 }}>
          {embedError}
        </div>
      )}

      {/* Fallback por redirección: abre Google en top-level y redirige de vuelta a /oauth/callback */}
      <button
        onClick={() => (window.location.href = API + "/auth/google/login")}
        style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #ccc" }}
      >
        Continuar con Google (redirigir)
      </button>
    </div>
  );
}
