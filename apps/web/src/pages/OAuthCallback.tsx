import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function OAuthCallback() {
  const nav = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const token = params.get("token");
        if (!token) {
          nav("/login", { replace: true });
          return;
        }
        localStorage.setItem("token", token);

        const me = await axios.get(API + "/auth/me", {
          headers: { Authorization: "Bearer " + token },
        });

        setUser(me.data.user);

        if (me.data.user?.role === "admin") {
          nav("/admin", { replace: true });
        } else {
          nav("/", { replace: true });
        }
      } catch (e: any) {
        alert(e?.response?.data?.error || e?.message || "Error en OAuthCallback");
        nav("/login", { replace: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div style={{ padding: 16 }}>Procesando inicio de sesión…</div>;
}
