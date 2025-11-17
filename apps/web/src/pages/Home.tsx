import { useEffect, useState } from "react";
import axios from "axios";
import { API } from "../lib/api";
import { useAuth } from "../lib/auth";

type HealthAll = {
  gateway:{ok:boolean}; auth:{ok:boolean}; items:{ok:boolean};
};

export default function Home() {
  const { user } = useAuth();
  const token = localStorage.getItem("token") || "";

  const [health, setHealth] = useState<HealthAll | null>(null);
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    const h = await axios.get(API + "/health/all").then(r => r.data);
    setHealth(h);
    if (token) {
      try {
        const r = await axios.get(API + "/api/items", {
          headers: { Authorization: "Bearer " + token }
        });
        setItems(r.data);
      } catch { setItems([]); }
    }
  };

  useEffect(() => { load(); /* eslint-disable-line */ }, []);

  return (
  <div className="container">
    {/* HERO sin cambios */}
    <div className="hero">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:16 }}>
        <div>
          <div style={{ fontSize:14, color:"var(--muted)" }}>Bienvenido{user ? `, ${user.email}` : ""}</div>
          <h1 style={{ margin:"6px 0 0", fontSize:32, letterSpacing:.2 }}>
            Panel de inicio
          </h1>
          <p style={{ margin:"8px 0 0", color:"var(--muted)" }}>
            Gestiona tus recursos y revisa el estado de los servicios.
          </p>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <div className="kpi card">
            <small>Rol</small>
            <strong>{user?.role ?? "visitante"}</strong>
          </div>
          <div className="kpi card" style={{ borderLeftColor:"var(--ok)" }}>
            <small>Servicios OK</small>
            <strong>
              {Number(!!health?.gateway?.ok) + Number(!!health?.auth?.ok) + Number(!!health?.items?.ok)} / 3
            </strong>
          </div>
        </div>
      </div>
    </div>

    {/* GRID apilado: cada bloque ocupa 12 columnas */}
    <div className="grid" style={{ marginTop:18 }}>
      {/* Salud de servicios (arriba) */}
      <div className="col-12">
        <div className="card" style={{ padding:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <h3 style={{ margin:0 }}>Salud de servicios</h3>
            <button className="btn" onClick={load}>Refrescar</button>
          </div>
          <div style={{ display:"grid", gap:10, marginTop:12 }}>
            <ServiceRow name="Gateway" ok={!!health?.gateway?.ok}/>
            <ServiceRow name="Auth" ok={!!health?.auth?.ok}/>
            <ServiceRow name="Items" ok={!!health?.items?.ok}/>
          </div>
        </div>
      </div>

      {/* Items (abajo) */}
      <div className="col-12">
        <div className="card" style={{ padding:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <h3 style={{ margin:0 }}>Items</h3>
            <span style={{ color:"var(--muted)" }}>{items?.length ?? 0} encontrados</span>
          </div>
          <div style={{ marginTop:12 }}>
            {items.length === 0 ? (
              <div style={{ color:"var(--muted)" }}>No hay ítems para mostrar.</div>
            ) : (
              <div style={{ display:"grid", gap:8 }}>
                {items.map((it:any)=>(
                  <div key={it._id} className="link-card">
                    <div style={{ display:"flex", justifyContent:"space-between" }}>
                      <strong>{it.name}</strong>
                      <span>${it.price}</span>
                    </div>
                    <small style={{ color:"var(--muted)" }}>ID: {it._id}</small>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Y opcionalmente ajusta los colores del estado para verse más formales:
function ServiceRow({name, ok}:{name:string; ok:boolean}){
  return (
    <div style={{
      display:"flex", justifyContent:"space-between", alignItems:"center",
      padding:"12px 14px", border:"1px solid var(--border)", borderRadius:12,
      background:"rgba(255,255,255,.02)"
    }}>
      <span>{name}</span>
      <span
        className="badge"
        style={{
          background: ok ? "linear-gradient(135deg,#b7f7c3,#c7d2fe)"
                         : "linear-gradient(135deg,#fecaca,#fca5a5)"
        }}
      >
        <span style={{ width:8, height:8, borderRadius:999, background: ok ? "var(--ok)" : "var(--fail)" }} />
        {ok ? "OK" : "Falla"}
      </span>
    </div>
  );
}
}
