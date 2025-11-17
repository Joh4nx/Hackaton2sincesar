import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { API } from "../lib/api";

type Overview = { users:{total:number, admins:number}, items:{total:number} };

export default function Admin(){
  const token = localStorage.getItem("token") || "";
  const [ov, setOv] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try{
      const r = await axios.get(API + "/admin/overview", {
        headers:{ Authorization:"Bearer "+token }
      });
      setOv(r.data);
    } finally{ setLoading(false); }
  };

  useEffect(()=>{ load(); /* eslint-disable-line */ }, []);

  return (
    <div className="container">
      <div className="hero">
        <h2 style={{ margin:"0 0 6px" }}>Panel Admin</h2>
        <p style={{ margin:0, color:"var(--muted)" }}>
          Vistas rápidas y accesos de administración.
        </p>
      </div>

      <div className="grid" style={{ marginTop:18 }}>
        <div className="col-4">
          <div className="card kpi">
            <small>Usuarios</small>
            <strong>{ov?.users?.total ?? 0}</strong>
            <small>Admins: {ov?.users?.admins ?? 0}</small>
          </div>
        </div>
        <div className="col-4">
          <div className="card kpi" style={{ borderLeftColor:"rgba(96,165,250,.6)" }}>
            <small>Items</small>
            <strong>{ov?.items?.total ?? 0}</strong>
            <small>Total en el sistema</small>
          </div>
        </div>
        <div className="col-4">
          <div className="card" style={{ padding:16, display:"flex", gap:10, flexDirection:"column" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <h3 style={{ margin:0 }}>Acciones</h3>
              <button className="btn" onClick={load} disabled={loading}>
                {loading ? "…": "Refrescar"}
              </button>
            </div>

            <Link to="/admin/users" className="link-card">
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <strong>Gestionar usuarios</strong>
                <span style={{ opacity:.7 }}>➜</span>
              </div>
              <small style={{ color:"var(--muted)" }}>
                Elevar o quitar admin, deshabilitar cuentas.
              </small>
            </Link>

            {/* Espacio para más accesos (logs, auditoría, etc.) */}
          </div>
        </div>
      </div>
    </div>
  );
}
